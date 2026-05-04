import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export interface InterviewExportData {
  // 표지 / 문서정보
  projectName: string
  documentNumber: string
  version: string
  date: string
  authorCompany: string
  authorName: string

  // 인터뷰결과서
  meetingDate: string
  meetingLocation: string
  nextMeetingDate: string
  nextMeetingLocation: string
  moderator: string
  recorder: string
  attendees: { company: string; name: string }[]
  agenda: string
  content: string // AI가 생성한 본문 (개조식 텍스트)

  // 인터페이스 목록
  interfaces: {
    no: number | string
    system: string
    businessFunction: string
    description: string
    period: string
    method: string
    apiType: string
    note: string
    hrAnswer: string
  }[]
}

type CellAddress = { r: number; c: number }
type MergeRange = { s: CellAddress; e: CellAddress }

function cell(r: number, c: number): CellAddress {
  return { r, c }
}

function merge(r1: number, c1: number, r2: number, c2: number): MergeRange {
  return { s: cell(r1, c1), e: cell(r2, c2) }
}

function set(ws: XLSX.WorkSheet, r: number, c: number, value: string | number, bold = false) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = {
    v: value,
    t: typeof value === 'number' ? 'n' : 's',
    s: bold ? { font: { bold: true } } : undefined,
  }
}

// ─── 시트1: 표지 ─────────────────────────────────────────
function buildCoverSheet(data: InterviewExportData): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const merges: MergeRange[] = []

  set(ws, 0, 0, '인터뷰결과서', true)
  merges.push(merge(0, 0, 0, 7))

  set(ws, 3, 0, '프로젝트   명')
  set(ws, 3, 2, data.projectName)
  merges.push(merge(3, 0, 3, 1))
  merges.push(merge(3, 2, 3, 7))

  set(ws, 4, 0, '작성자   소속')
  set(ws, 4, 2, data.authorCompany)
  merges.push(merge(4, 0, 4, 1))
  merges.push(merge(4, 2, 4, 7))

  set(ws, 5, 0, '작성자   성명')
  set(ws, 5, 2, data.authorName)
  merges.push(merge(5, 0, 5, 1))
  merges.push(merge(5, 2, 5, 7))

  set(ws, 6, 0, '문 서   번 호')
  set(ws, 6, 2, data.documentNumber)
  merges.push(merge(6, 0, 6, 1))
  merges.push(merge(6, 2, 6, 7))

  set(ws, 7, 0, '버         전')
  set(ws, 7, 2, data.version)
  merges.push(merge(7, 0, 7, 1))
  merges.push(merge(7, 2, 7, 7))

  set(ws, 8, 0, '작 성   일 자')
  set(ws, 8, 2, data.date)
  merges.push(merge(8, 0, 8, 1))
  merges.push(merge(8, 2, 8, 7))

  ws['!merges'] = merges
  ws['!ref'] = XLSX.utils.encode_range({ s: cell(0, 0), e: cell(10, 7) })
  ws['!cols'] = Array(8).fill({ wch: 15 })
  return ws
}

// ─── 시트2: 문서정보 ──────────────────────────────────────
function buildDocInfoSheet(data: InterviewExportData): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const merges: MergeRange[] = []

  set(ws, 0, 0, data.projectName)
  set(ws, 0, 7, '인터뷰결과서', true)
  merges.push(merge(0, 0, 0, 6))

  set(ws, 2, 0, '문  서  정  보', true)
  merges.push(merge(2, 0, 2, 7))

  // 작성/검토/승인 헤더
  set(ws, 4, 0, '구분', true)
  set(ws, 4, 1, '소속', true)
  merges.push(merge(4, 1, 4, 2))
  set(ws, 4, 3, '이름', true)
  set(ws, 4, 4, '일자', true)
  set(ws, 4, 5, '서명', true)
  merges.push(merge(4, 5, 4, 7))

  set(ws, 5, 0, '작성')
  set(ws, 5, 1, data.authorCompany)
  merges.push(merge(5, 1, 5, 2))
  set(ws, 5, 3, data.authorName)
  set(ws, 5, 4, data.date)
  merges.push(merge(5, 5, 5, 7))

  set(ws, 6, 0, '검토')
  merges.push(merge(6, 1, 6, 2))
  merges.push(merge(6, 5, 6, 7))

  set(ws, 7, 0, '승인')
  merges.push(merge(7, 1, 7, 2))
  merges.push(merge(7, 5, 7, 7))

  // 제·개정 이력
  set(ws, 10, 0, '제·개정 이력', true)
  merges.push(merge(10, 0, 10, 7))

  set(ws, 12, 0, '제·개정일', true)
  set(ws, 12, 1, 'Version', true)
  set(ws, 12, 2, '제·개정 내용', true)
  merges.push(merge(12, 2, 12, 3))
  set(ws, 12, 4, '개정위치', true)
  set(ws, 12, 5, '작성자', true)
  set(ws, 12, 6, '검토자', true)
  set(ws, 12, 7, '승인자', true)

  set(ws, 13, 0, data.date)
  set(ws, 13, 1, data.version)
  set(ws, 13, 2, '최초작성')
  merges.push(merge(13, 2, 13, 3))
  set(ws, 13, 5, data.authorName)

  ws['!merges'] = merges
  ws['!ref'] = XLSX.utils.encode_range({ s: cell(0, 0), e: cell(15, 7) })
  ws['!cols'] = Array(8).fill({ wch: 15 })
  return ws
}

// ─── 시트3: 인터뷰결과서 ──────────────────────────────────
function buildInterviewSheet(data: InterviewExportData): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const merges: MergeRange[] = []
  const COLS = 10

  set(ws, 0, 0, '업무 회의록', true)
  merges.push(merge(0, 0, 0, COLS))

  set(ws, 2, 0, `프로젝트명 : ${data.projectName}`)
  merges.push(merge(2, 0, 2, COLS))

  // 일시/장소
  const dateLocationText = `일시 : ${data.meetingDate}\n장소 : ${data.meetingLocation}`
  const nextMeetingText = `다음 회의 예정\n일시 : ${data.nextMeetingDate || '미정'}\n장소 : ${data.nextMeetingLocation || '미정'}`
  set(ws, 3, 0, dateLocationText)
  merges.push(merge(3, 0, 3, 5))
  set(ws, 3, 6, nextMeetingText)
  merges.push(merge(3, 6, 3, COLS))

  // 주관자 / 기록자
  set(ws, 5, 0, `주관자(부서) : ${data.moderator}`)
  merges.push(merge(5, 0, 5, 5))
  set(ws, 5, 6, `기록자 : ${data.recorder}`)
  merges.push(merge(5, 6, 5, COLS))

  // 참석자 헤더
  set(ws, 6, 0, '참석자', true)
  merges.push(merge(6, 0, 6, COLS))

  set(ws, 7, 0, '회사(부서)', true)
  merges.push(merge(7, 0, 7, 1))
  set(ws, 7, 2, '성명', true)
  merges.push(merge(7, 2, 7, 3))
  set(ws, 7, 4, '서명', true)
  merges.push(merge(7, 4, 7, 5))
  set(ws, 7, 6, '회사(부서)', true)
  merges.push(merge(7, 6, 7, 7))
  set(ws, 7, 8, '성명', true)
  merges.push(merge(7, 8, 7, 9))
  set(ws, 7, 10, '서명')

  // 참석자 데이터 (2열 배치)
  const half = Math.ceil(data.attendees.length / 2)
  data.attendees.forEach((att, idx) => {
    if (idx < half) {
      const r = 8 + idx
      set(ws, r, 0, att.company)
      merges.push(merge(r, 0, r, 1))
      set(ws, r, 2, att.name)
      merges.push(merge(r, 2, r, 3))
      merges.push(merge(r, 4, r, 5))
    } else {
      const r = 8 + (idx - half)
      set(ws, r, 6, att.company)
      merges.push(merge(r, 6, r, 7))
      set(ws, r, 8, att.name)
      merges.push(merge(r, 8, r, 9))
    }
  })

  const attendeeRows = Math.max(half, 1)
  let curRow = 8 + attendeeRows + 1

  // 안건
  set(ws, curRow, 0, `안건 : ${data.agenda}`)
  merges.push(merge(curRow, 0, curRow, COLS))
  curRow++

  // 본문 내용
  set(ws, curRow, 0, data.content)
  merges.push(merge(curRow, 0, curRow + 30, COLS))
  curRow += 31

  ws['!merges'] = merges
  ws['!ref'] = XLSX.utils.encode_range({ s: cell(0, 0), e: cell(curRow, COLS) })
  ws['!cols'] = Array(COLS + 1).fill({ wch: 12 })
  ws['!rows'] = Array(curRow + 1).fill({ hpt: 20 })

  return ws
}

// ─── 시트4: 인터페이스 목록 ───────────────────────────────
function buildInterfaceSheet(data: InterviewExportData): XLSX.WorkSheet {
  const headers = [
    'No', '관련 시스템', 'Business Function', '내용',
    '주기', '연계방식', 'HTTP API 제공\nJSON TYPE 정보', '비고', 'HR 운영자 답변',
  ]

  const rows = data.interfaces.map((i) => [
    i.no, i.system, i.businessFunction, i.description,
    i.period, i.method, i.apiType, i.note, i.hrAnswer,
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 20 }, { wch: 40 },
    { wch: 8 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 30 },
  ]
  return ws
}

// ─── 메인 export 함수 ─────────────────────────────────────
export async function exportInterviewResultExcel(data: InterviewExportData) {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, buildCoverSheet(data), '표지')
  XLSX.utils.book_append_sheet(wb, buildDocInfoSheet(data), '문서정보')
  XLSX.utils.book_append_sheet(wb, buildInterviewSheet(data), '인터뷰결과서')
  XLSX.utils.book_append_sheet(wb, buildInterfaceSheet(data), '인터페이스 목록')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const safeName = data.projectName.replace(/[\\/:*?"<>|]/g, '_')
  saveAs(blob, `인터뷰결과서_${safeName}_${data.date}.xlsx`)
}
