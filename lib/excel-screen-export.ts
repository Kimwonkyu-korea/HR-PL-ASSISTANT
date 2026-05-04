import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export interface GridColumn {
  header: string      // 화면 컬럼명 (* = 필수)
  subHeader?: string  // 복합 헤더 2행
  dataType: string    // Number / text / popup / YYYY-MM-DD / sabun/name 등
  dbField: string     // DB 필드명
}

export interface TableColumn {
  columnName: string
  dataType: string
  nullable: 'Y' | 'N'
  defaultVal: string
  description: string
}

export interface SearchCondition {
  label: string       // 조회조건명 (예: 사업장)
  dataType: string    // popup / text / date / sabun/name
  required: boolean   // 필수 여부 (* 표시)
  dbField: string     // DB 컬럼명
}

export interface ScreenDef {
  businessName: string
  screenName: string
  sourceNm: string
  programId: string
  screenDesc: string
  detailDesc: string
  gridTitle: string
  gridColumns: GridColumn[]
  relatedObjects: string
  tableName: string
  tableColumns: TableColumn[]
  searchConditions?: SearchCondition[]
}

export interface ScreenSpecData {
  projectName: string
  moduleName: string
  authorCompany: string
  documentNumber: string
  version: string
  date: string
  author: string
  screens: ScreenDef[]
}

// ── 헬퍼 ────────────────────────────────────────────────────
function sc(ws: XLSX.WorkSheet, r: number, c: number, v: string | number) {
  ws[XLSX.utils.encode_cell({ r, c })] = { v, t: typeof v === 'number' ? 'n' : 's' }
}
function m(r1: number, c1: number, r2: number, c2: number): XLSX.Range {
  return { s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }
}
function initWs(rows: number, cols: number): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows, c: cols } })
  ws['!merges'] = []
  return ws
}

// ── 표지 ─────────────────────────────────────────────────────
function buildCover(d: ScreenSpecData): XLSX.WorkSheet {
  const ws = initWs(22, 8)
  const M = ws['!merges']!
  sc(ws, 9, 0, '프로그램 화면 정의서');  M.push(m(9, 0, 9, 7))
  sc(ws, 12, 0, '프로젝트 명'); sc(ws, 12, 2, d.projectName); M.push(m(12, 2, 12, 7))
  sc(ws, 13, 0, '모듈명');      sc(ws, 13, 2, d.moduleName);  M.push(m(13, 2, 13, 7))
  sc(ws, 14, 0, '작업명');                                      M.push(m(14, 2, 14, 7))
  sc(ws, 15, 0, '작성자 소속'); sc(ws, 15, 2, d.authorCompany); M.push(m(15, 2, 15, 7))
  sc(ws, 16, 0, '작성자 성명'); sc(ws, 16, 2, d.author);        M.push(m(16, 2, 16, 7))
  sc(ws, 17, 0, '문서번호');    sc(ws, 17, 2, d.documentNumber); M.push(m(17, 2, 17, 7))
  sc(ws, 18, 0, '버전');        sc(ws, 18, 2, d.version);        M.push(m(18, 2, 18, 7))
  sc(ws, 19, 0, '작성 일자');   sc(ws, 19, 2, d.date);           M.push(m(19, 2, 19, 7))
  ws['!cols'] = Array(8).fill({ wch: 16 })
  return ws
}

// ── 문서정보 ─────────────────────────────────────────────────
function buildDocInfo(d: ScreenSpecData): XLSX.WorkSheet {
  const ws = initWs(18, 25)
  const M = ws['!merges']!
  sc(ws, 1, 1, d.moduleName);       M.push(m(1, 1, 1, 8))
  sc(ws, 1, 9, d.projectName);      M.push(m(1, 9, 1, 25))
  sc(ws, 3, 1, '문  서  정  보');   M.push(m(3, 1, 3, 25))
  sc(ws, 5, 1, '구분'); sc(ws, 5, 2, '소속'); M.push(m(5, 2, 5, 3))
  sc(ws, 5, 4, '이름'); sc(ws, 5, 5, '일자'); sc(ws, 5, 6, '서명')
  sc(ws, 6, 1, '작성'); sc(ws, 6, 2, d.authorCompany); M.push(m(6, 2, 6, 3))
  sc(ws, 6, 4, d.author); sc(ws, 6, 5, d.date)
  sc(ws, 7, 1, '검토'); sc(ws, 8, 1, '승인')
  sc(ws, 11, 1, '제·개정 이력');    M.push(m(11, 1, 11, 25))
  sc(ws, 13, 1, '제·개정일'); sc(ws, 13, 2, 'Version')
  sc(ws, 13, 3, '제·개정 내용');    M.push(m(13, 3, 13, 4))
  sc(ws, 13, 5, '개정위치'); sc(ws, 13, 6, '작성자'); sc(ws, 13, 7, '검토자'); sc(ws, 13, 8, '승인자')
  sc(ws, 14, 1, d.date); sc(ws, 14, 2, d.version); sc(ws, 14, 3, '최초작성'); sc(ws, 14, 6, d.author)
  ws['!cols'] = Array(26).fill({ wch: 12 })
  return ws
}

// ── 화면 시트 ────────────────────────────────────────────────
function buildScreen(scr: ScreenDef, d: ScreenSpecData): XLSX.WorkSheet {
  const GS = 7   // Grid Start column
  const LE = 6   // Left End column
  const GC = scr.gridColumns.length
  const lastCol = Math.max(LE, GS + GC - 1)

  // 행 위치 계산
  const R_TITLE   = 0
  const R_MODULE  = 1
  const R_BUSI    = 2
  const R_AUTHOR  = 3
  const R_DESC    = 4
  // R_5 empty
  const R_DETAIL  = 6
  const R_GTITLE  = R_DETAIL
  const R_GCOL1   = R_DETAIL + 1
  const R_GCOL2   = R_DETAIL + 2
  const R_GDATA   = R_DETAIL + 3   // 샘플 데이터 3행
  const R_GTYPE   = R_GDATA + 3
  const R_GFIELD  = R_GTYPE + 1
  const DETAIL_END = R_GFIELD + 5  // 상세설명 세로 병합 끝

  const R_OBJ     = DETAIL_END + 3
  const R_TBL     = R_OBJ + 5
  const lastRow   = R_TBL + 1 + scr.tableColumns.length + 2

  const ws = initWs(lastRow, lastCol)
  const M = ws['!merges']!

  // ─ 헤더 행들
  sc(ws, R_TITLE, 0, '프 로 그 램  설 계 서');  M.push(m(R_TITLE, 0, R_TITLE, 3))
  sc(ws, R_TITLE, 4, '프로젝트명');              sc(ws, R_TITLE, 5, d.projectName); M.push(m(R_TITLE, 5, R_TITLE, LE))
  sc(ws, R_TITLE, GS, '[ 화면설계 ]');          M.push(m(R_TITLE, GS, R_TITLE, lastCol))

  sc(ws, R_MODULE, 4, '모듈명');                sc(ws, R_MODULE, 5, d.moduleName); M.push(m(R_MODULE, 5, R_MODULE, LE))
  sc(ws, R_MODULE, lastCol - 1, '* 필수입력항목')

  sc(ws, R_BUSI, 0, '업무명');   sc(ws, R_BUSI, 1, scr.businessName)
  sc(ws, R_BUSI, 2, '화면명');   sc(ws, R_BUSI, 3, scr.screenName);  M.push(m(R_BUSI, 3, R_BUSI, 3))
  sc(ws, R_BUSI, 4, '소스명');   sc(ws, R_BUSI, 5, scr.sourceNm);    M.push(m(R_BUSI, 5, R_BUSI, LE))

  sc(ws, R_AUTHOR, 0, '작  성 자'); sc(ws, R_AUTHOR, 1, d.author)
  sc(ws, R_AUTHOR, 2, '작성일');    sc(ws, R_AUTHOR, 3, d.date)
  sc(ws, R_AUTHOR, 4, '프로그램ID'); sc(ws, R_AUTHOR, 5, scr.programId); M.push(m(R_AUTHOR, 5, R_AUTHOR, LE))

  sc(ws, R_DESC, 0, '화면설명');  sc(ws, R_DESC, 1, scr.screenDesc); M.push(m(R_DESC, 1, R_DESC, LE))

  // ─ 상세설명 (좌측 병합)
  sc(ws, R_DETAIL, 0, '상세설명')
  sc(ws, R_DETAIL, 1, scr.detailDesc)
  M.push(m(R_DETAIL, 0, DETAIL_END, 0))
  M.push(m(R_DETAIL, 1, DETAIL_END, LE))

  // ─ 그리드 제목
  sc(ws, R_GTITLE, GS, scr.gridTitle)
  M.push(m(R_GTITLE, GS, R_GTITLE, lastCol))

  // ─ 그리드 컬럼 헤더
  scr.gridColumns.forEach((col, i) => {
    sc(ws, R_GCOL1, GS + i, col.header)
    if (col.subHeader) {
      sc(ws, R_GCOL2, GS + i, col.subHeader)
    } else {
      M.push(m(R_GCOL1, GS + i, R_GCOL2, GS + i))
    }
  })

  // ─ 샘플 데이터
  const SAMPLES: Record<string, string[]> = {
    number:    ['1', '2', '3'],
    varchar4:  ['2025', '2025', '2025'],
    text:      ['샘플값', '샘플값', '샘플값'],
    popup:     ['선택값A', '선택값B', '선택값A'],
    sabun:     ['100001 홍길동', '100002 김영희', '100003 이철수'],
    date:      ['2025-01-01', '2025-02-15', '2025-03-01'],
    money:     ['1,000,000', '2,500,000', '3,200,000'],
  }
  scr.gridColumns.forEach((col, i) => {
    const t = col.dataType.toLowerCase()
    const key = t.includes('sabun') ? 'sabun'
      : t.includes('date') || t.includes('yyyy') ? 'date'
      : t.includes('number(,)') || t.includes('money') ? 'money'
      : t.includes('number') ? 'number'
      : t.includes('popup') ? 'popup'
      : 'text'
    const s = SAMPLES[key]
    for (let row = 0; row < 3; row++) {
      sc(ws, R_GDATA + row, GS + i, s[row])
    }
  })

  // ─ 데이터 타입 / DB 필드명
  scr.gridColumns.forEach((col, i) => {
    sc(ws, R_GTYPE,  GS + i, col.dataType)
    sc(ws, R_GFIELD, GS + i, col.dbField)
  })

  // ─ 관련 Object
  sc(ws, R_OBJ, 0, '관련 Object')
  sc(ws, R_OBJ, 1, scr.relatedObjects)
  M.push(m(R_OBJ, 0, R_OBJ + 3, 0))
  M.push(m(R_OBJ, 1, R_OBJ + 3, LE))

  // ─ TABLE 정의
  sc(ws, R_TBL, 0, 'TABLE 정의\n(필요시 작성)')
  sc(ws, R_TBL, 1, scr.tableName)
  M.push(m(R_TBL, 0, R_TBL + scr.tableColumns.length, 0))
  M.push(m(R_TBL, 1, R_TBL, LE))
  scr.tableColumns.forEach((col, i) => {
    const r = R_TBL + 1 + i
    sc(ws, r, 1, col.columnName)
    sc(ws, r, 2, col.dataType)
    sc(ws, r, 3, col.nullable)
    sc(ws, r, 4, col.defaultVal)
    sc(ws, r, 5, col.description)
  })

  // ─ 열/행 크기
  const cols: XLSX.ColInfo[] = [
    { wch: 12 }, { wch: 24 }, { wch: 8 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 10 },
    ...scr.gridColumns.map(() => ({ wch: 16 })),
  ]
  ws['!cols'] = cols
  const rowHeights: XLSX.RowInfo[] = Array(lastRow + 1).fill({ hpt: 18 })
  rowHeights[R_DETAIL] = { hpt: 130 }
  rowHeights[R_OBJ]    = { hpt: 80 }
  ws['!rows'] = rowHeights

  return ws
}

// ── 메인 export (ExcelJS API route 사용) ─────────────────────
export async function exportScreenSpec(data: ScreenSpecData) {
  const res = await fetch('/api/export/screen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Excel 생성 실패')
  }
  const blob = await res.blob()
  saveAs(blob, `프로그램 화면 정의서_${data.moduleName}_${data.date}.xlsx`)
}
