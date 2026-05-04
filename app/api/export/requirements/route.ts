import { NextRequest } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJS = require('pptxgenjs')

export interface CompanyGroup {
  name: string
  companies: string
  content: string
}

export interface ScreenRequirement {
  sectionId: string
  sectionName: string
  screenId: string
  screenName: string
  pageNum: number
  totalPages: number
  companyGroups: CompanyGroup[]
  toBe: string
  reqClass: string
  reviewNeeded: string
  devType: string
  checkResult: string
  screenImage?: string
  decisionDetail: string
}

export interface RequirementsExportData {
  projectName: string
  module: string
  author: string
  screens: ScreenRequirement[]
}

// ── 슬라이드 크기 ─────────────────────────────────
const W = 10.833
const H = 7.5
const F = 'Malgun Gothic'

// ── 색상 ─────────────────────────────────────────
const C_CYAN     = '1C90B5'
const C_ORANGE   = 'E07A1F'
const C_LB       = 'D9EDF7'
const C_TBL_HDR  = 'CFE3EA'
const C_BORDER   = 'BFBFBF'
const C_GREEN    = '2E7D32'
const C_GREEN_BG = 'E8F5E9'
const C_WHITE    = 'FFFFFF'
const C_HDR_GRAY = 'EEEEEE'
const C_INFO_BG  = 'F4F4F4'
const C_LEFT_BG  = 'F8F8F8'
const C_DARK     = '1A1A1A'
const C_NAVY     = '1A3A5C'
const C_GRAY     = '666666'
const C_LGRAY    = 'AAAAAA'
const C_OPT_DEF  = 'F5F5F5'

// ── 옵션 목록 ────────────────────────────────────
const TYPE_OPTS = ['① 패키지 표준', '② 커스터마이징', '③ 신규 개발', '④ 개발 불가']
const CHK_OPTS  = ['✓ 수용', '개발불가', '정책결정', '범위외']
const TYPE_KEYS = ['패키지 표준', '커스터마이징', '신규 개발', '개발 불가']
const CHK_KEYS  = ['수용', '개발불가', '정책결정', '범위외']

const GROUP_COLORS = ['EBF5FF', 'E8F8F0', 'FDF3E5', 'F0EEFF', 'FFF0F0']

function fmtDate(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

// 사각형 도형
function sh(slide: any, pres: any,
            x: number, y: number, w: number, h: number,
            fill: string, border = C_BORDER, bw = 0.5) {
  slide.addShape(pres.ShapeType.rect, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: border, width: bw },
  })
}

// 텍스트 (줄바꿈 제어 명시)
function tx(slide: any, text: string,
            x: number, y: number, w: number, h: number,
            opts: {
              size?: number; bold?: boolean; italic?: boolean
              color?: string; align?: string; valign?: string
              wrap?: boolean; shrink?: boolean; px?: number
            } = {}) {
  if (text === null || text === undefined || text === '') return
  slide.addText(String(text), {
    x: x + (opts.px ?? 0.06), y,
    w: w - (opts.px != null ? opts.px * 2 : 0.12), h,
    fontFace:   F,
    fontSize:   opts.size ?? 9,
    bold:       opts.bold     ?? false,
    italic:     opts.italic   ?? false,
    color:      opts.color    ?? C_DARK,
    align:      (opts.align   ?? 'left')   as any,
    valign:     (opts.valign  ?? 'middle') as any,
    wrap:       opts.wrap     ?? true,
    charSpacing: 0,
  })
}

// 배경 + 텍스트 셀
function cell(slide: any, pres: any, text: string,
              x: number, y: number, w: number, h: number,
              bg: string, border = C_BORDER, bw = 0.5,
              txOpts: Parameters<typeof tx>[6] = {}) {
  sh(slide, pres, x, y, w, h, bg, border, bw)
  tx(slide, text, x, y, w, h, txOpts)
}

// ── 텍스트 높이 추정 (인치 단위) ──────────────────
// 대략적: 한글 9pt ≈ 0.125인치/줄
function estimateH(text: string, widthIn: number, fontPt: number): number {
  if (!text) return 0
  const lineHIn  = fontPt * 1.5 / 72      // 1줄 높이 (1.5x spacing)
  const charsPerLine = Math.max(8, Math.floor(widthIn / (fontPt * 0.067)))
  const explicitLines = text.split('\n').length
  const wrapLines = text.split('\n').reduce((sum, line) =>
    sum + Math.ceil(Math.max(1, line.length) / charsPerLine), 0)
  return Math.max(explicitLines, wrapLines) * lineHIn
}

// ── 체크박스 옵션 1개 그리기 ──────────────────────
// wrap: false로 단일 행 고정, 아이콘은 작은 사각형
function drawCheckOpt(
  slide: any, pres: any,
  label: string,
  x: number, y: number, w: number, h: number,
  selected: boolean,
  selBg: string, selBorder: string, selTextColor: string
) {
  const bg = selected ? selBg : C_OPT_DEF
  const bc = selected ? selBorder : C_BORDER
  const bw = selected ? 1.0 : 0.5

  // 배경
  sh(slide, pres, x, y, w, h, bg, bc, bw)

  // 체크 아이콘 (작은 사각형)
  const iconSize = 0.13
  const iconX = x + 0.09
  const iconY = y + (h - iconSize) / 2
  if (selected) {
    sh(slide, pres, iconX, iconY, iconSize, iconSize, selBorder, selBorder, 0)
    tx(slide, '✓', iconX, iconY, iconSize, iconSize,
       { size: 7, bold: true, color: C_WHITE, align: 'center', valign: 'middle', wrap: false, px: 0 })
  } else {
    sh(slide, pres, iconX, iconY, iconSize, iconSize, C_WHITE, C_BORDER, 0.75)
  }

  // 텍스트 (wrap:false로 단일행 강제)
  const textColor = selected ? selTextColor : C_GRAY
  slide.addText(label, {
    x: x + 0.09 + iconSize + 0.06, y,
    w: w - 0.09 - iconSize - 0.10, h,
    fontFace: F,
    fontSize: 7.5,
    bold:     selected,
    color:    textColor,
    align:    'left',
    valign:   'middle',
    wrap:     false,      // ← 단일행 강제
  })
}

function buildSlide(pres: any, data: ScreenRequirement, meta: { projectName: string; author: string }) {
  const slide = pres.addSlide()
  slide.background = { color: C_WHITE }
  const dateStr = fmtDate()

  // ── 고정 Y 좌표 ───────────────────────────────────
  const Y_HDR     = 0
  const Y_INFO    = 0.50
  const Y_SEC     = 0.93
  const Y_MAIN    = 1.23   // 메인 콘텐츠 시작
  const Y_MID     = 4.38   // 메인 콘텐츠 끝 / 하단 섹션 시작
  const Y_BOT     = 6.72   // 서명란 직전
  const Y_SIG     = 6.78
  const Y_FOOT    = 7.28

  const LW = 5.2            // 왼쪽 너비
  const RX = 5.32           // 오른쪽 시작 X
  const RW = W - RX         // 오른쪽 너비 ≈ 5.513

  // ── [1] 헤더 ─────────────────────────────────────
  sh(slide, pres, 0,   Y_HDR, 3.2,     0.5, C_CYAN,     C_CYAN, 0)
  sh(slide, pres, 3.2, Y_HDR, W - 3.2, 0.5, C_HDR_GRAY, C_HDR_GRAY, 0)
  sh(slide, pres, 0.1, 0.11, 0.75, 0.27, C_WHITE, C_BORDER, 0.5)
  tx(slide, '분석단계', 0.1, 0.11, 0.75, 0.27, { size: 8, bold: true, color: C_CYAN, align: 'center', px: 0 })
  tx(slide, '요구사항 협의·결정서', 0.95, Y_HDR, 2.1, 0.5, { size: 13, bold: true, color: C_WHITE, valign: 'middle', px: 0 })
  tx(slide, `작성일: ${dateStr}`, 7.5, Y_HDR, 3.0, 0.5, { size: 9, color: C_GRAY, valign: 'middle', align: 'right', px: 0 })
  tx(slide, `${data.pageNum} / ${data.totalPages}`, 10.3, Y_HDR, 0.5, 0.5, { size: 8, color: C_LGRAY, valign: 'middle', align: 'right', px: 0 })

  // ── [2] 정보 행 ──────────────────────────────────
  sh(slide, pres, 0, Y_INFO, W, 0.43, C_INFO_BG, C_INFO_BG, 0)
  const infoCols = [
    { label: '모듈',        value: data.sectionName || '-',  x: 0.1 },
    { label: '기능명',      value: data.screenName  || '-',  x: 2.8 },
    { label: '요구사항 ID', value: data.screenId    || '-',  x: 5.5 },
    { label: '작성자',      value: meta.author      || '-',  x: 8.0 },
  ]
  infoCols.forEach(c => {
    tx(slide, c.label, c.x, 0.54, 2.4, 0.17, { size: 7.5, bold: true, color: C_GRAY, px: 0 })
    tx(slide, c.value, c.x, 0.70, 2.4, 0.20, { size: 9.5, color: C_NAVY, bold: true, px: 0 })
  })

  // ── [3] 섹션 헤더 ────────────────────────────────
  sh(slide, pres, 0,  Y_SEC, LW + 0.12, 0.3, C_CYAN,   C_CYAN,   0)
  sh(slide, pres, RX, Y_SEC, RW,        0.3, C_ORANGE, C_ORANGE, 0)
  tx(slide, '패키지 현재 기능',     0.15, Y_SEC, 4.5, 0.3, { size: 10, bold: true, color: C_WHITE, valign: 'middle', px: 0 })
  tx(slide, '법인별 요구사항 의견', RX + 0.15, Y_SEC, 4.5, 0.3, { size: 10, bold: true, color: C_WHITE, valign: 'middle', px: 0 })

  // ── [4] 왼쪽: 이미지 ─────────────────────────────
  const IMG_H = Y_MID - Y_MAIN
  sh(slide, pres, 0.08, Y_MAIN, LW + 0.04, IMG_H, C_LEFT_BG, C_BORDER, 0.5)

  if (data.screenImage) {
    try {
      slide.addImage({
        data:   data.screenImage,
        x:      0.13, y: Y_MAIN + 0.06,
        w:      LW - 0.1, h: IMG_H - 0.12,
        sizing: { type: 'contain', w: LW - 0.1, h: IMG_H - 0.12 },
      })
    } catch {
      tx(slide, '[이미지 로드 실패]', 0.15, Y_MAIN + IMG_H / 2 - 0.15, LW, 0.3,
         { size: 9, color: C_LGRAY, align: 'center', px: 0 })
    }
  } else {
    tx(slide, '[ 패키지 현재 기능 화면 이미지 ]', 0.15, Y_MAIN + IMG_H / 2 - 0.15, LW, 0.3,
       { size: 9, italic: true, color: C_LGRAY, align: 'center', px: 0 })
  }

  // ── [5] 오른쪽: 법인별 요구사항 테이블 ──────────
  const TBL_MAX_H = Y_MID - Y_MAIN
  const C1W = 0.92, C2W = 0.72, C3W = RW - C1W - C2W
  const HDR_H = 0.28
  const MIN_ROW_H = 0.28
  const FONT_TBL = 9

  // 그룹별 행 데이터 구성
  interface Row {
    grpName: string; grpBg: string; company: string
    content: string; isFirst: boolean; span: number
  }
  const rows: Row[] = []
  const groups = data.companyGroups || []
  groups.forEach((grp, gi) => {
    const cos = grp.companies.split(/[/,]\s*/).map(s => s.trim()).filter(Boolean)
    if (!cos.length) cos.push(grp.companies || '')
    cos.forEach((co, ci) => rows.push({
      grpName: grp.name,
      grpBg:   GROUP_COLORS[gi] ?? 'F0F0F0',
      company: co, content: grp.content || '',
      isFirst: ci === 0, span: cos.length,
    }))
  })

  // 그룹별 최소 필요 높이 계산 (내용 기반)
  const maxTblBody = TBL_MAX_H - HDR_H

  // 각 그룹의 원하는 높이
  interface GrpH { name: string; desired: number; span: number }
  const grpHMap: Record<string, GrpH> = {}
  groups.forEach((grp, gi) => {
    const cos = grp.companies.split(/[/,]\s*/).map(s => s.trim()).filter(Boolean)
    const span = Math.max(1, cos.length)
    const contentH = estimateH(grp.content, C3W - 0.16, FONT_TBL)
    const companyH  = span * MIN_ROW_H
    grpHMap[grp.name] = { name: grp.name, desired: Math.max(contentH, companyH), span }
  })

  // 전체 높이 합산 → 초과 시 비례 축소
  const totalDesired = Object.values(grpHMap).reduce((s, g) => s + g.desired, 0)
  const scale = totalDesired > maxTblBody ? maxTblBody / totalDesired : 1
  const grpH: Record<string, number> = {}
  Object.values(grpHMap).forEach(g => {
    grpH[g.name] = Math.max(MIN_ROW_H * g.span, g.desired * scale)
  })

  // 테이블 헤더
  cell(slide, pres, '계열',          RX,              Y_MAIN, C1W, HDR_H, C_TBL_HDR, C_BORDER, 0.5, { size: 9, bold: true, color: C_NAVY, align: 'center' })
  cell(slide, pres, '법인',          RX + C1W,        Y_MAIN, C2W, HDR_H, C_TBL_HDR, C_BORDER, 0.5, { size: 9, bold: true, color: C_NAVY, align: 'center' })
  cell(slide, pres, '요구사항 내용', RX + C1W + C2W,  Y_MAIN, C3W, HDR_H, C_TBL_HDR, C_BORDER, 0.5, { size: 9, bold: true, color: C_NAVY, align: 'center' })

  // 그룹별 시작 Y
  const grpStartY: Record<string, number> = {}
  let curY = Y_MAIN + HDR_H
  groups.forEach(grp => { grpStartY[grp.name] = curY; curY += grpH[grp.name] })

  // 법인 행별 Y
  const rowStartY: number[] = []
  groups.forEach(grp => {
    const cos = grp.companies.split(/[/,]\s*/).map(s => s.trim()).filter(Boolean)
    if (!cos.length) cos.push(grp.companies || '')
    const rh = grpH[grp.name] / cos.length
    let ry = grpStartY[grp.name]
    cos.forEach(() => { rowStartY.push(ry); ry += rh })
  })

  // 그리기
  rows.forEach((row, ri) => {
    const rowBg = ri % 2 === 0 ? C_WHITE : 'F4FAFD'
    const rh = grpH[row.grpName] / row.span

    // 법인 셀 (매 행)
    cell(slide, pres, row.company, RX + C1W, rowStartY[ri], C2W, rh, rowBg, C_BORDER, 0.5,
         { size: 8.5, color: C_DARK, align: 'center', valign: 'middle' })

    // 계열 + 내용 (첫 행만, span 높이)
    if (row.isFirst) {
      const spanH = grpH[row.grpName]
      cell(slide, pres, row.grpName, RX, grpStartY[row.grpName], C1W, spanH, row.grpBg, C_BORDER, 0.5,
           { size: 8.5, bold: true, color: C_NAVY, align: 'center', valign: 'middle' })
      // 내용: 폰트 크기 자동 축소 (최소 7.5pt)
      const cFontSz = spanH < estimateH(row.content, C3W - 0.16, FONT_TBL) + 0.05 ? 7.5 : FONT_TBL
      cell(slide, pres, row.content, RX + C1W + C2W, grpStartY[row.grpName], C3W, spanH, C_WHITE, C_BORDER, 0.5,
           { size: cFontSz, color: C_DARK, valign: 'top' })
    }
  })

  // ── [6] 최종 의사결정 (오른쪽 하단) ─────────────
  // Y_MID ~ Y_BOT = 4.38 ~ 6.72 = 2.34인치
  const DEC_HDR_H = 0.28
  const OPT_H     = 0.32   // 체크박스 행 높이 (단일행 고정)
  const DEC_DETAIL_Y = Y_MID + DEC_HDR_H + OPT_H * 2
  const DEC_DETAIL_H = Y_BOT - DEC_DETAIL_Y  // ≈ 1.42인치

  // 헤더
  sh(slide, pres, RX, Y_MID, RW, DEC_HDR_H, '333333', '333333', 0)
  tx(slide, '최종 의사결정', RX + 0.12, Y_MID, RW - 0.15, DEC_HDR_H,
     { size: 9.5, bold: true, color: C_WHITE, valign: 'middle', px: 0 })

  const selTypeIdx = TYPE_KEYS.indexOf(data.devType ?? '')
  const selChkIdx  = CHK_KEYS.indexOf(data.checkResult ?? '')
  const activeType = selTypeIdx >= 0 ? selTypeIdx : 1   // 기본: 커스터마이징
  const activeChk  = selChkIdx  >= 0 ? selChkIdx  : 0  // 기본: 수용

  const OPT_W  = RW / 4
  const Y_TYPE = Y_MID + DEC_HDR_H
  const Y_CHK  = Y_TYPE + OPT_H

  // 개발유형 체크박스 행
  TYPE_OPTS.forEach((label, i) => {
    drawCheckOpt(
      slide, pres, label,
      RX + i * OPT_W, Y_TYPE, OPT_W, OPT_H,
      i === activeType,
      'FFF9C4', 'F9A825', '7D5A00'
    )
  })

  // 검토결과 체크박스 행
  CHK_OPTS.forEach((label, i) => {
    drawCheckOpt(
      slide, pres, label,
      RX + i * OPT_W, Y_CHK, OPT_W, OPT_H,
      i === activeChk,
      C_GREEN_BG, C_GREEN, C_GREEN
    )
  })

  // 의사결정 상세 내용 (최소 1.42인치 ≈ 136px 확보)
  sh(slide, pres, RX, DEC_DETAIL_Y, RW, DEC_DETAIL_H, 'FAFAFA', C_BORDER, 0.5)
  if (data.decisionDetail) {
    tx(slide, data.decisionDetail, RX + 0.1, DEC_DETAIL_Y + 0.08, RW - 0.2, DEC_DETAIL_H - 0.12,
       { size: 9, color: C_DARK, valign: 'top', px: 0 })
  } else {
    tx(slide, '최종 협의 내용 입력', RX + 0.1, DEC_DETAIL_Y + 0.08, RW - 0.2, DEC_DETAIL_H - 0.12,
       { size: 8.5, italic: true, color: C_LGRAY, valign: 'top', px: 0 })
  }

  // ── [7] 이수시스템 검토 의견 (왼쪽 하단) ─────────
  // Y_MID ~ Y_BOT = 4.38 ~ 6.72 = 2.34인치
  const REV_HDR_H = 0.30
  const REV_BOT_Y = Y_MID + REV_HDR_H

  sh(slide, pres, 0,    Y_MID, 0.06, Y_BOT - Y_MID, C_CYAN, C_CYAN, 0)
  sh(slide, pres, 0.06, Y_MID, LW + 0.06, REV_HDR_H, C_LB, C_CYAN, 0.5)
  tx(slide, '이수시스템 검토 의견', 0.15, Y_MID, 4.5, REV_HDR_H,
     { size: 9.5, bold: true, color: C_CYAN, valign: 'middle', px: 0 })

  sh(slide, pres, 0.06, REV_BOT_Y, LW + 0.06, Y_BOT - REV_BOT_Y, C_LB, C_BORDER, 0.5)
  tx(slide, data.reviewNeeded || '', 0.18, REV_BOT_Y + 0.06, LW - 0.1, Y_BOT - REV_BOT_Y - 0.1,
     { size: 9.5, color: C_DARK, valign: 'top', px: 0 })

  // ── [8] 서명란 ───────────────────────────────────
  const SIG_H = Y_FOOT - Y_SIG
  sh(slide, pres, 0, Y_SIG, W, SIG_H, C_INFO_BG, C_INFO_BG, 0)
  const sigs = [
    { label: '작성',  name: meta.author || '-',  sub: `이수시스템 · ${dateStr}`, x: 0.18 },
    { label: '검토자', name: '-',                sub: '이수시스템',              x: 3.79 },
    { label: '승인',  name: '______',            sub: '고객사',                  x: 7.40 },
  ]
  sigs.forEach(s => {
    sh(slide, pres, s.x, Y_SIG + 0.08, 0.56, 0.24, C_CYAN, C_CYAN, 0)
    tx(slide, s.label,  s.x,        Y_SIG + 0.08, 0.56, 0.24, { size: 8.5, bold: true, color: C_WHITE, align: 'center', px: 0 })
    tx(slide, s.name,   s.x + 0.64, Y_SIG + 0.05, 2.2,  0.22, { size: 9.5, color: C_DARK, px: 0 })
    tx(slide, s.sub,    s.x + 0.64, Y_SIG + 0.27, 2.5,  0.16, { size: 7.5, color: C_LGRAY, px: 0 })
  })

  // ── [9] 푸터 ─────────────────────────────────────
  sh(slide, pres, 0,       Y_FOOT, W - 2.4, H - Y_FOOT, C_HDR_GRAY, C_HDR_GRAY, 0)
  sh(slide, pres, W - 2.4, Y_FOOT, 2.4,     H - Y_FOOT, C_CYAN,     C_CYAN,     0)
  tx(slide, `${meta.projectName}  |  Ver 1.0`, 0.15, Y_FOOT, W - 2.6, H - Y_FOOT,
     { size: 8, color: C_GRAY, valign: 'middle', px: 0 })
  tx(slide, '이수시스템', W - 2.3, Y_FOOT, 2.1, H - Y_FOOT,
     { size: 8, color: C_WHITE, valign: 'middle', align: 'center', px: 0 })
}

export async function POST(req: NextRequest) {
  try {
    const data: RequirementsExportData = await req.json()
    const pres = new PptxGenJS()
    pres.defineLayout({ name: 'FDR', width: W, height: H })
    pres.layout = 'FDR'

    data.screens.forEach(screen => {
      buildSlide(pres, screen, { projectName: data.projectName, author: data.author })
    })

    const buffer = await pres.write({ outputType: 'nodebuffer' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('요구사항_협의결정서.pptx')}`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PPTX 생성 실패'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
