import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import type { ScreenSpecData, TableColumn, SearchCondition } from '@/lib/excel-screen-export'

// ── 헬퍼: tableColumns 정렬 ──────────────────────────────────
// 순서: ENTER_CD → 필수(N) → 선택(Y) → CHKDATE → CHKID
function sortTableColumns(cols: TableColumn[]): TableColumn[] {
  const FIRST = ['ENTER_CD']
  const LAST  = ['CHKDATE', 'CHKID']
  // ENTER_CD → 항상 NOT NULL(PK), CHKDATE/CHKID → nullable
  const normalized = cols.map(c => {
    if (c.columnName === 'ENTER_CD') return { ...c, nullable: 'N' as const }
    if (c.columnName === 'CHKDATE' || c.columnName === 'CHKID') return { ...c, nullable: 'Y' as const }
    return c
  })
  const first    = normalized.filter(c => FIRST.includes(c.columnName))
  const last     = normalized.filter(c => LAST.includes(c.columnName))
  const middle   = normalized.filter(c => !FIRST.includes(c.columnName) && !LAST.includes(c.columnName))
  const required = middle.filter(c => c.nullable === 'N')
  const optional = middle.filter(c => c.nullable !== 'N')
  return [...first, ...required, ...optional, ...last]
}

// ── 헬퍼: 그리드 dataType 단순화 ─────────────────────────────
// NUMBER(15,2) → NUMBER, NUMBER(5) → NUMBER
function simplifyGridType(dt: string): string {
  if (/^NUMBER\s*\(/i.test(dt)) return 'NUMBER'
  return dt
}

// ── 상수 ─────────────────────────────────────────────────────
const F = 'Malgun Gothic'
const GRID_BLUE  = 'FFC1E4F5'
const BORDER_BLUE= 'FF0070C0'
const LABEL_GRAY = 'FFD9E1F2'
const SECTION_BG = 'FF1F4E79'
const TYPE_GRAY  = 'FFF2F2F2'
const DATE_BG    = 'FFFFFDE7'  // 날짜 입력 연노랑
const COMBO_BG   = 'FFE8F4FD'  // 콤보박스 연파랑
const BTN_BG     = 'FF4472C4'  // 조회버튼 파랑

type BorderStyle = 'thin' | 'medium' | 'thick'

function bdr(style: BorderStyle = 'thin', color = 'FF000000') {
  return { style, color: { argb: color } } as ExcelJS.Border
}
const thinBdr  = { top: bdr(), left: bdr(), bottom: bdr(), right: bdr() }
const medBdr   = { top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('medium') }
const blueBdr  = { top: bdr('thin', BORDER_BLUE), left: bdr('thin', BORDER_BLUE), bottom: bdr('thin', BORDER_BLUE), right: bdr('thin', BORDER_BLUE) }

function setCell(
  ws: ExcelJS.Worksheet,
  row: number, col: number,
  value: ExcelJS.CellValue,
  opts: {
    bold?: boolean
    size?: number
    color?: string
    bgColor?: string
    border?: Partial<ExcelJS.Borders>
    hAlign?: ExcelJS.Alignment['horizontal']
    vAlign?: ExcelJS.Alignment['vertical']
    wrap?: boolean
    italic?: boolean
  } = {}
) {
  const cell = ws.getCell(row, col)
  cell.value = value
  cell.font = {
    name: F,
    size: opts.size ?? 9,
    bold: opts.bold ?? false,
    color: { argb: opts.color ?? 'FF000000' },
    italic: opts.italic ?? false,
  }
  cell.alignment = {
    horizontal: opts.hAlign ?? 'center',
    vertical: opts.vAlign ?? 'middle',
    wrapText: opts.wrap ?? false,
    readingOrder: 'ltr',
  }
  if (opts.bgColor) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bgColor } }
  }
  if (opts.border !== undefined) {
    cell.border = opts.border as ExcelJS.Borders
  }
}

// ── 조회조건 셀 1개 렌더링 ───────────────────────────────────
// 필수: 라벨 연분홍+빨간글씨+* / 값셀 왼쪽 굵은 빨간테두리
function renderCondCell(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  startCol: number,
  endCol: number,
  cond: SearchCondition,
) {
  const isReq = cond.required
  const labelText = (isReq ? '*' : '') + cond.label
  const reqValBorder: Partial<ExcelJS.Borders> = isReq
    ? { top: bdr('thin'), left: bdr('medium', 'FFCC0000'), bottom: bdr('thin'), right: bdr('thin') }
    : thinBdr

  // 라벨 셀 (1칸)
  setCell(ws, rowNum, startCol, labelText, {
    bold: true,
    bgColor: isReq ? 'FFFFF0F0' : LABEL_GRAY,
    color: isReq ? 'FFCC0000' : 'FF000000',
    border: thinBdr, hAlign: 'left', size: 9,
  })

  if (endCol <= startCol) return
  const valStart = startCol + 1

  switch (cond.dataType) {
    case 'combo': {
      // 흰 입력 영역(병합) + ▼ 1칸 (회색 배경, 검정 글씨)
      const arrowCol = endCol
      const valEnd   = endCol - 1
      if (valEnd >= valStart) {
        if (valEnd > valStart) ws.mergeCells(rowNum, valStart, rowNum, valEnd)
        setCell(ws, rowNum, valStart, '', { border: reqValBorder, bgColor: 'FFFFFFFF' })
        if (valEnd > valStart) fillBorder(ws, rowNum, valStart, rowNum, valEnd, reqValBorder, 'FFFFFFFF')
      }
      // ▼ 는 좁은 셀에 진하게
      setCell(ws, rowNum, arrowCol, '\u25BC', {
        bgColor: 'FFD6DCE4', border: thinBdr, hAlign: 'center', size: 7, bold: true, color: 'FF333333',
      })
      break
    }
    case 'popup': {
      // 팝업: 흰 입력 영역만 (필수 테두리로 구분)
      if (endCol > valStart) ws.mergeCells(rowNum, valStart, rowNum, endCol)
      setCell(ws, rowNum, valStart, '', { border: reqValBorder, bgColor: 'FFFFFFFF' })
      if (endCol > valStart) fillBorder(ws, rowNum, valStart, rowNum, endCol, reqValBorder, 'FFFFFFFF')
      break
    }
    case 'date': {
      // 연노랑 + 날짜 힌트
      if (endCol > valStart) ws.mergeCells(rowNum, valStart, rowNum, endCol)
      setCell(ws, rowNum, valStart, 'YYYY-MM-DD', {
        bgColor: DATE_BG, border: reqValBorder, italic: true, size: 8, color: 'FFAAAAAA',
      })
      if (endCol > valStart) fillBorder(ws, rowNum, valStart, rowNum, endCol, reqValBorder, DATE_BG)
      break
    }
    case 'date-range': {
      // [From 노랑] ~ [To 노랑]
      const totalVal = endCol - valStart + 1
      const half     = Math.max(1, Math.floor((totalVal - 1) / 2))
      const sepCol   = valStart + half
      const toStart  = sepCol + 1

      const fromEnd = sepCol - 1
      if (fromEnd >= valStart) {
        if (fromEnd > valStart) ws.mergeCells(rowNum, valStart, rowNum, fromEnd)
        setCell(ws, rowNum, valStart, 'YYYY-MM-DD', { bgColor: DATE_BG, border: reqValBorder, italic: true, size: 8, color: 'FFAAAAAA' })
        if (fromEnd > valStart) fillBorder(ws, rowNum, valStart, rowNum, fromEnd, reqValBorder, DATE_BG)
      }
      setCell(ws, rowNum, sepCol, '~', { hAlign: 'center', size: 9, bold: true })
      if (toStart <= endCol) {
        if (endCol > toStart) ws.mergeCells(rowNum, toStart, rowNum, endCol)
        setCell(ws, rowNum, toStart, 'YYYY-MM-DD', { bgColor: DATE_BG, border: thinBdr, italic: true, size: 8, color: 'FFAAAAAA' })
        if (endCol > toStart) fillBorder(ws, rowNum, toStart, rowNum, endCol, thinBdr, DATE_BG)
      }
      break
    }
    default: {
      // 텍스트: 흰 빈 입력칸
      if (endCol > valStart) ws.mergeCells(rowNum, valStart, rowNum, endCol)
      setCell(ws, rowNum, valStart, '', { border: reqValBorder, bgColor: 'FFFFFFFF' })
      if (endCol > valStart) fillBorder(ws, rowNum, valStart, rowNum, endCol, reqValBorder, 'FFFFFFFF')
    }
  }
}

// 셀 범위 전체에 테두리 채우기 (병합된 영역의 내부 셀들)
function fillBorder(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number, border: Partial<ExcelJS.Borders>, bgColor?: string) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c)
      cell.border = border as ExcelJS.Borders
      if (bgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
    }
  }
}

// ── 표지 ─────────────────────────────────────────────────────
function buildCover(wb: ExcelJS.Workbook, d: ScreenSpecData) {
  const ws = wb.addWorksheet('표지')
  ws.columns = Array(9).fill(null).map(() => ({ width: 16 }))

  // 타이틀
  ws.mergeCells(9, 1, 9, 9)
  setCell(ws, 9, 1, '프  로  그  램  화  면  정  의  서', {
    bold: true, size: 22, bgColor: 'FFFFFFFF', border: medBdr,
  })

  // 정보 테이블
  const rows: [string, string][] = [
    ['프로젝트명', d.projectName],
    ['모듈명', d.moduleName],
    ['작성자 소속', d.authorCompany],
    ['작성자 성명', d.author],
    ['문서번호', d.documentNumber],
    ['버전', d.version],
    ['작성 일자', d.date],
  ]
  rows.forEach(([label, value], i) => {
    const r = 11 + i
    ws.mergeCells(r, 3, r, 9)
    setCell(ws, r, 1, label, { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
    ws.mergeCells(r, 1, r, 2)
    setCell(ws, r, 3, value, { hAlign: 'left', border: thinBdr })
    fillBorder(ws, r, 3, r, 9, thinBdr)
  })

  ws.getRow(9).height = 60
  for (let i = 11; i <= 17; i++) ws.getRow(i).height = 22
}

// ── 문서정보 ──────────────────────────────────────────────────
function buildDocInfo(wb: ExcelJS.Workbook, d: ScreenSpecData) {
  const ws = wb.addWorksheet('문서정보')
  ws.columns = Array(12).fill(null).map(() => ({ width: 14 }))

  ws.mergeCells(2, 1, 2, 12)
  setCell(ws, 2, 1, `${d.moduleName}    ${d.projectName}`, { bold: true, size: 11 })

  ws.mergeCells(4, 1, 4, 12)
  setCell(ws, 4, 1, '문  서  정  보', { bold: true, size: 13, bgColor: SECTION_BG, color: 'FFFFFFFF', border: medBdr })

  // 작성/검토/승인 행
  const infoHeaders = ['구분', '소속', '이름', '일자', '서명']
  infoHeaders.forEach((h, i) => setCell(ws, 6, i + 1, h, { bold: true, bgColor: LABEL_GRAY, border: thinBdr }))
  setCell(ws, 7, 1, '작성', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  setCell(ws, 7, 2, d.authorCompany, { border: thinBdr })
  setCell(ws, 7, 3, d.author, { border: thinBdr })
  setCell(ws, 7, 4, d.date, { border: thinBdr })

  ws.mergeCells(10, 1, 10, 12)
  setCell(ws, 10, 1, '제·개정 이력', { bold: true, bgColor: SECTION_BG, color: 'FFFFFFFF', border: medBdr })

  const histHeaders = ['제·개정일', 'Version', '제·개정 내용', '개정위치', '작성자', '검토자', '승인자']
  histHeaders.forEach((h, i) => setCell(ws, 12, i + 1, h, { bold: true, bgColor: LABEL_GRAY, border: thinBdr }))
  setCell(ws, 13, 1, d.date, { border: thinBdr })
  setCell(ws, 13, 2, d.version, { border: thinBdr })
  setCell(ws, 13, 3, '최초작성', { border: thinBdr })
  setCell(ws, 13, 5, d.author, { border: thinBdr })
  ;[4,6,7].forEach(c => setCell(ws, 13, c, '', { border: thinBdr }))

  ws.getRow(4).height = 28
  ws.getRow(10).height = 24
}

// ── 화면 시트 ────────────────────────────────────────────────
function buildScreen(wb: ExcelJS.Workbook, scr: ReturnType<typeof getScreenDef>, d: ScreenSpecData) {
  const name = (scr.screenName || '화면').slice(0, 31)
  const ws = wb.addWorksheet(name)

  // null safety + 정렬
  const gridColumns = scr.gridColumns ?? []
  const tableColumns = sortTableColumns(scr.tableColumns ?? [])
  const searchConditions: SearchCondition[] = (scr as { searchConditions?: SearchCondition[] }).searchConditions ?? []

  // 왼쪽 패널: cols 1-7 (A-G), 스페이서: 8-9 (H-I), 그리드: 10+ (J+)
  const GC = gridColumns.length
  const GRID_START = 10  // J열 (1-indexed)
  const LAST_GRID = Math.max(GRID_START + GC - 1, GRID_START + 8)  // 최소 9cols 확보(조회조건용)

  // 조회조건 행 수 계산 (행당 3개)
  const COND_PER_ROW = 3
  const condRows = searchConditions.length > 0 ? Math.ceil(searchConditions.length / COND_PER_ROW) : 0
  const searchSectionRows = condRows > 0 ? 1 + condRows : 0  // 제목행 + 조건행

  // 컬럼 너비 설정
  ws.columns = [
    { width: 2.5 },   // A - 마진
    { width: 9 },     // B - 라벨
    { width: 24 },    // C - 값 (넓은 병합용)
    { width: 9 },     // D - 라벨
    { width: 18 },    // E - 값
    { width: 9 },     // F - 라벨
    { width: 18 },    // G - 값
    { width: 2.5 },   // H - 스페이서
    { width: 3 },     // I - 스페이서
    ...(GC > 0 ? gridColumns.map((col) => {
      const t = col.header.length
      return { width: Math.max(10, Math.min(20, t * 2 + 4)) }
    }) : [{ width: 14 }])
  ]

  // ── Row 1: 섹션 타이틀 행 ──────────────────────────────────
  ws.getRow(1).height = 22
  ws.mergeCells(1, 2, 1, 7)
  setCell(ws, 1, 2, '프  로  그  램  설  계  서', {
    bold: true, size: 13, bgColor: SECTION_BG, color: 'FFFFFFFF',
    border: { top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('medium') }
  })
  fillBorder(ws, 1, 2, 1, 7, { top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('medium') }, SECTION_BG)

  if (GC > 0) {
    ws.mergeCells(1, GRID_START, 1, LAST_GRID)
    setCell(ws, 1, GRID_START, '[ 화면설계 ]', {
      bold: true, size: 11, bgColor: LABEL_GRAY,
      border: { top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('medium') }
    })
    fillBorder(ws, 1, GRID_START, 1, LAST_GRID, { top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('medium') }, LABEL_GRAY)
  }

  // ── Rows 2-3: 프로젝트명, 모듈명 ────────────────────────────
  ws.getRow(2).height = 20
  ws.getRow(3).height = 20

  setCell(ws, 2, 4, '프로젝트명', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  ws.mergeCells(2, 5, 2, 7)
  setCell(ws, 2, 5, d.projectName, { hAlign: 'left', border: thinBdr })
  fillBorder(ws, 2, 5, 2, 7, thinBdr)
  ws.mergeCells(2, 2, 2, 3)
  fillBorder(ws, 2, 2, 2, 3, thinBdr)

  setCell(ws, 3, 4, '모듈명', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  ws.mergeCells(3, 5, 3, 7)
  setCell(ws, 3, 5, d.moduleName, { hAlign: 'left', border: thinBdr })
  fillBorder(ws, 3, 5, 3, 7, thinBdr)
  ws.mergeCells(3, 2, 3, 3)
  fillBorder(ws, 3, 2, 3, 3, thinBdr)

  if (GC > 0) {
    setCell(ws, 2, LAST_GRID, '* 필수입력항목', { size: 8, hAlign: 'right', color: 'FFFF0000' })
  }

  // ── Row 4: 업무명 화면명 소스명 ─────────────────────────────
  ws.getRow(4).height = 20
  setCell(ws, 4, 2, '업  무  명', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  setCell(ws, 4, 3, scr.businessName, { border: thinBdr, hAlign: 'left' })
  setCell(ws, 4, 4, '화  면  명', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  setCell(ws, 4, 5, scr.screenName, { border: thinBdr, hAlign: 'left' })
  setCell(ws, 4, 6, '소  스  명', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  setCell(ws, 4, 7, scr.sourceNm, { border: thinBdr, hAlign: 'left' })

  // ── Row 5: 작성자 작성일 프로그램ID ─────────────────────────
  ws.getRow(5).height = 20
  setCell(ws, 5, 2, '작  성  자', { bold: true, bgColor: LABEL_GRAY, border: { ...thinBdr, bottom: bdr('medium') } })
  setCell(ws, 5, 3, d.author, { border: { ...thinBdr, bottom: bdr('medium') }, hAlign: 'left' })
  setCell(ws, 5, 4, '작  성  일', { bold: true, bgColor: LABEL_GRAY, border: { ...thinBdr, bottom: bdr('medium') } })
  setCell(ws, 5, 5, d.date, { border: { ...thinBdr, bottom: bdr('medium') } })
  setCell(ws, 5, 6, '프로그램ID', { bold: true, bgColor: LABEL_GRAY, border: { ...thinBdr, bottom: bdr('medium') } })
  setCell(ws, 5, 7, scr.programId, { border: { ...thinBdr, bottom: bdr('medium') }, hAlign: 'left' })

  // ── Row 6: 화면설명 ──────────────────────────────────────────
  ws.getRow(6).height = 22
  setCell(ws, 6, 2, '화  면  설  명', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  ws.mergeCells(6, 3, 6, 7)
  setCell(ws, 6, 3, scr.screenDesc, { hAlign: 'left', border: thinBdr, wrap: true })
  fillBorder(ws, 6, 3, 6, 7, thinBdr)

  // ── Row 7: 구분선 ───────────────────────────────────────────
  ws.getRow(7).height = 4

  // ── Rows 8~: 상세설명 (좌) + 조회조건+그리드 (우) ────────────
  // 조회조건이 있으면 그리드 행이 아래로 밀림
  const R_DETAIL    = 8
  const R_GTITLE    = 8 + searchSectionRows
  const R_GHDR1     = R_GTITLE + 1
  const R_GHDR2     = R_GHDR1 + 1
  const R_GDATA     = R_GHDR2 + 1   // 3행
  const R_GTYPE     = R_GDATA + 3
  const R_GFIELD    = R_GTYPE + 1
  const DETAIL_END  = Math.max(R_GFIELD + 3, 17)  // 상세설명 세로 병합 끝

  const R_OBJ = DETAIL_END + 3
  const R_TBL = R_OBJ + 5

  // 상세설명 라벨 (세로 병합)
  ws.mergeCells(R_DETAIL, 2, DETAIL_END, 2)
  setCell(ws, R_DETAIL, 2, '상  세  설  명', {
    bold: true, bgColor: LABEL_GRAY,
    border: thinBdr, vAlign: 'top',
  })
  fillBorder(ws, R_DETAIL, 2, DETAIL_END, 2, thinBdr, LABEL_GRAY)

  // 상세설명 내용 (세로 병합)
  ws.mergeCells(R_DETAIL, 3, DETAIL_END, 7)
  setCell(ws, R_DETAIL, 3, scr.detailDesc, {
    hAlign: 'left', vAlign: 'top', wrap: true, border: thinBdr,
  })
  fillBorder(ws, R_DETAIL, 3, DETAIL_END, 7, thinBdr)
  ws.getRow(R_DETAIL).height = 90

  // ── 조회조건 섹션 (그리드 오른쪽 상단) ─────────────────────
  if (searchConditions.length > 0 && GC > 0) {
    const availCols = LAST_GRID - GRID_START + 1
    // 각 조건 = label(좁음) + value(넓음), 행당 3개
    const colsPerCond = Math.max(3, Math.floor(availCols / COND_PER_ROW))

    // 조회조건 레이아웃:
    // 제목행: [조회조건 라벨 .............. ] [조회 버튼 2칸]
    // 조건행: [cond1] [cond2] [cond3]  (조회 버튼 열 포함 풀너비)
    const R_SEARCH_TITLE = 8
    const BTN_COLS = 2
    const titleEnd   = LAST_GRID - BTN_COLS   // 라벨 끝 열
    const btnStart   = titleEnd + 1

    // 제목 행: 라벨
    ws.mergeCells(R_SEARCH_TITLE, GRID_START, R_SEARCH_TITLE, titleEnd)
    setCell(ws, R_SEARCH_TITLE, GRID_START, '조  회  조  건', {
      bold: true, size: 9, bgColor: LABEL_GRAY, hAlign: 'left',
      border: { top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('thin') },
    })
    fillBorder(ws, R_SEARCH_TITLE, GRID_START, R_SEARCH_TITLE, titleEnd, {
      top: bdr('medium'), left: bdr('medium'), bottom: bdr('medium'), right: bdr('thin'),
    }, LABEL_GRAY)

    // 제목 행: 조회 버튼 (오른쪽 2칸, 1행 높이만)
    ws.mergeCells(R_SEARCH_TITLE, btnStart, R_SEARCH_TITLE, LAST_GRID)
    setCell(ws, R_SEARCH_TITLE, btnStart, '조회', {
      bold: true, bgColor: BTN_BG, color: 'FFFFFFFF', size: 9,
      border: { top: bdr('medium'), left: bdr('thin'), bottom: bdr('medium'), right: bdr('medium') },
    })
    ws.getRow(R_SEARCH_TITLE).height = 20

    // 조건 행 렌더링 (풀너비 LAST_GRID까지)
    const condColsPerCond = Math.max(3, Math.floor((LAST_GRID - GRID_START + 1) / COND_PER_ROW))

    for (let row = 0; row < condRows; row++) {
      const rowConds = searchConditions.slice(row * COND_PER_ROW, (row + 1) * COND_PER_ROW)
      const R_THIS = R_SEARCH_TITLE + 1 + row
      ws.getRow(R_THIS).height = 20

      rowConds.forEach((cond, ci) => {
        const startCol = GRID_START + ci * condColsPerCond
        const endCol   = Math.min(startCol + condColsPerCond - 1, LAST_GRID)
        renderCondCell(ws, R_THIS, startCol, endCol, cond)
      })

      // 남은 셀 채우기
      const filledEnd = GRID_START + rowConds.length * condColsPerCond - 1
      if (filledEnd < LAST_GRID) fillBorder(ws, R_THIS, filledEnd + 1, R_THIS, LAST_GRID, thinBdr)
    }
  }

  // 그리드 타이틀
  if (GC > 0) {
    ws.mergeCells(R_GTITLE, GRID_START, R_GTITLE, LAST_GRID)
    setCell(ws, R_GTITLE, GRID_START, scr.gridTitle, {
      bold: true, size: 10, hAlign: 'left',
      border: { top: bdr('medium'), left: bdr('medium'), bottom: bdr('thin'), right: bdr('medium') }
    })
    fillBorder(ws, R_GTITLE, GRID_START, R_GTITLE, LAST_GRID, {
      top: bdr('medium'), left: bdr('medium'), bottom: bdr('thin'), right: bdr('medium')
    })
    ws.getRow(R_GTITLE).height = 20

    // 그리드 헤더 1행
    ws.getRow(R_GHDR1).height = 20
    gridColumns.forEach((col, i) => {
      setCell(ws, R_GHDR1, GRID_START + i, col.header, {
        bold: true, bgColor: GRID_BLUE, border: blueBdr,
      })
    })

    // 그리드 헤더 2행 (subHeader 있으면 표시, 없으면 병합)
    ws.getRow(R_GHDR2).height = 18
    const hasSubHeader = gridColumns.some(c => c.subHeader)
    if (hasSubHeader) {
      gridColumns.forEach((col, i) => {
        if (col.subHeader) {
          setCell(ws, R_GHDR2, GRID_START + i, col.subHeader, { bold: true, bgColor: GRID_BLUE, border: blueBdr })
        } else {
          ws.mergeCells(R_GHDR1, GRID_START + i, R_GHDR2, GRID_START + i)
          setCell(ws, R_GHDR2, GRID_START + i, '', { bgColor: GRID_BLUE, border: blueBdr })
        }
      })
    } else {
      gridColumns.forEach((col, i) => {
        ws.mergeCells(R_GHDR1, GRID_START + i, R_GHDR2, GRID_START + i)
      })
    }

    // 샘플 데이터 3행
    const SAMPLES: Record<string, string[]> = {
      number:  ['1', '2', '3'],
      varchar4: ['2025', '2025', '2025'],
      text:    ['샘플값', '샘플값', '샘플값'],
      popup:   ['선택값A', '선택값B', '선택값A'],
      sabun:   ['100001 홍길동', '100002 김영희', '100003 이철수'],
      date:    ['2025-01-01', '2025-02-15', '2025-03-01'],
      money:   ['1,000,000', '2,500,000', '3,200,000'],
    }
    for (let rowOff = 0; rowOff < 3; rowOff++) {
      ws.getRow(R_GDATA + rowOff).height = 18
      gridColumns.forEach((col, i) => {
        const t = col.dataType.toLowerCase()
        const key = t.includes('sabun') ? 'sabun'
          : (t.includes('date') || t.includes('yyyy')) ? 'date'
          : (t.includes('number(,)') || t.includes('money')) ? 'money'
          : t.includes('number') ? 'number'
          : t.includes('popup') ? 'popup'
          : t.startsWith('varchar(4)') ? 'varchar4'
          : 'text'
        setCell(ws, R_GDATA + rowOff, GRID_START + i, SAMPLES[key][rowOff], {
          size: 9, border: thinBdr, hAlign: 'center',
          bgColor: rowOff % 2 === 0 ? 'FFFFFFFF' : 'FFF8F8F8'
        })
      })
    }

    // 데이터타입 행 (NUMBER(15,2) → NUMBER 등 단순화)
    ws.getRow(R_GTYPE).height = 17
    gridColumns.forEach((col, i) => {
      setCell(ws, R_GTYPE, GRID_START + i, simplifyGridType(col.dataType), {
        size: 8, bgColor: TYPE_GRAY, border: thinBdr, italic: true,
      })
    })

    // DB 필드명 행
    ws.getRow(R_GFIELD).height = 17
    gridColumns.forEach((col, i) => {
      setCell(ws, R_GFIELD, GRID_START + i, col.dbField, {
        size: 8, bgColor: TYPE_GRAY, border: thinBdr, color: 'FF0070C0',
      })
    })
  }

  // ── 관련 Object ──────────────────────────────────────────────
  ws.mergeCells(R_OBJ, 2, R_OBJ + 3, 2)
  setCell(ws, R_OBJ, 2, '관련 Object', { bold: true, bgColor: LABEL_GRAY, border: thinBdr, vAlign: 'top' })
  fillBorder(ws, R_OBJ, 2, R_OBJ + 3, 2, thinBdr, LABEL_GRAY)
  ws.mergeCells(R_OBJ, 3, R_OBJ + 3, 7)
  setCell(ws, R_OBJ, 3, scr.relatedObjects, { hAlign: 'left', vAlign: 'top', wrap: true, border: thinBdr })
  fillBorder(ws, R_OBJ, 3, R_OBJ + 3, 7, thinBdr)
  ws.getRow(R_OBJ).height = 55

  // ── TABLE 정의 ────────────────────────────────────────────────
  setCell(ws, R_TBL, 2, 'TABLE 정의', { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  ws.mergeCells(R_TBL, 3, R_TBL, 7)
  setCell(ws, R_TBL, 3, scr.tableName, { hAlign: 'left', bold: true, border: thinBdr })
  fillBorder(ws, R_TBL, 3, R_TBL, 7, thinBdr)

  const TBL_HDRS = ['컬럼명', '데이터타입', 'Null', '기본값', '설명']
  const TBL_COLS = [3, 4, 5, 6, 7]
  ws.getRow(R_TBL + 1).height = 18
  TBL_HDRS.forEach((h, i) => {
    setCell(ws, R_TBL + 1, TBL_COLS[i], h, { bold: true, bgColor: LABEL_GRAY, border: thinBdr })
  })

  tableColumns.forEach((col, i) => {
    const r = R_TBL + 2 + i
    ws.getRow(r).height = 18
    setCell(ws, r, 3, col.columnName, { border: thinBdr, color: 'FF0070C0', hAlign: 'left' })
    setCell(ws, r, 4, /^NUMBER\s*\(/i.test(col.dataType) ? 'NUMBER' : col.dataType, { border: thinBdr, hAlign: 'center' })
    setCell(ws, r, 5, col.nullable, { border: thinBdr, hAlign: 'center' })
    setCell(ws, r, 6, col.defaultVal, { border: thinBdr, hAlign: 'center' })
    setCell(ws, r, 7, col.description, { border: thinBdr, hAlign: 'left' })
  })

  // 병합된 행들 높이 맞춤
  for (let r = R_DETAIL + 1; r <= DETAIL_END; r++) ws.getRow(r).height = 18
}

function getScreenDef(scr: ScreenSpecData['screens'][0]) { return scr }

// ── Oracle CREATE TABLE SQL 생성 ──────────────────────────────
function buildCreateTableSql(scr: ReturnType<typeof getScreenDef>): string {
  const tableColumns = sortTableColumns(scr.tableColumns ?? [])
  if (!scr.tableName || tableColumns.length === 0) return ''

  const tableName = scr.tableName.split('/')[0].trim().toUpperCase()

  // PK: ENTER_CD 항상 포함 + nullable='N'인 업무 컬럼 최대 2개
  const AUDIT_COLS = ['CHKDATE', 'CHKID']
  const businessPkCols = tableColumns
    .filter(c => c.nullable === 'N' && c.columnName !== 'ENTER_CD' && !AUDIT_COLS.includes(c.columnName))
    .slice(0, 2)
    .map(c => c.columnName)
  const pkCols = ['ENTER_CD', ...businessPkCols]

  const colDefs = tableColumns.map(col => {
    const notNull = col.nullable === 'N' ? ' NOT NULL' : ''
    const def = col.defaultVal ? ` DEFAULT ${col.defaultVal}` : ''
    const dt = /^NUMBER\s*\(/i.test(col.dataType) ? 'NUMBER' : col.dataType
    return `    ${col.columnName.padEnd(25)} ${dt}${def}${notNull}`
  })

  const lines = [
    `-- ${scr.screenName} (${scr.screenDesc ?? ''})`,
    `CREATE TABLE ${tableName}`,
    '(',
    colDefs.join(',\n'),
    pkCols.length > 0
      ? `,\n    CONSTRAINT PK_${tableName} PRIMARY KEY (${pkCols.join(', ')})`
      : '',
    ');',
    '',
    `COMMENT ON TABLE ${tableName} IS '${scr.screenName}';`,
    ...tableColumns.map(col =>
      `COMMENT ON COLUMN ${tableName}.${col.columnName} IS '${col.description}';`
    ),
  ]
  return lines.filter(l => l !== '').join('\n')
}

// ── DDL 시트 (전체 화면 CREATE TABLE 모음) ───────────────────
function buildDdlSheet(wb: ExcelJS.Workbook, data: ScreenSpecData) {
  const ws = wb.addWorksheet('DDL_CreateTable')
  ws.columns = [{ width: 120 }]

  setCell(ws, 1, 1, 'Oracle DDL — CREATE TABLE', {
    bold: true, size: 12, bgColor: SECTION_BG, color: 'FFFFFFFF',
    border: medBdr,
  })
  ws.getRow(1).height = 24

  let row = 3
  data.screens.forEach(scr => {
    const sql = buildCreateTableSql(getScreenDef(scr))
    if (!sql) return

    const lines = sql.split('\n')
    lines.forEach(line => {
      const cell = ws.getCell(row, 1)
      cell.value = line
      cell.font = { name: 'Courier New', size: 9, color: { argb: line.startsWith('--') ? 'FF008000' : 'FF000000' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
      ws.getRow(row).height = 15
      row++
    })
    row++  // 빈 행 구분
  })
}

// ── 메인 POST handler ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const data: ScreenSpecData = await req.json()
    const wb = new ExcelJS.Workbook()
    wb.creator = data.author || 'HR PL Assistant'
    wb.created = new Date()

    buildCover(wb, data)
    buildDocInfo(wb, data)
    data.screens.forEach(scr => buildScreen(wb, getScreenDef(scr), data))
    buildDdlSheet(wb, data)

    const buffer = await wb.xlsx.writeBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="screen-spec.xlsx"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '엑셀 생성 실패'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
