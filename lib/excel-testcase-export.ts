import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

function parseMarkdownTable(markdown: string): { headers: string[]; rows: string[][] } {
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean)
  const tableLines = lines.filter(l => l.startsWith('|'))

  if (tableLines.length < 2) return { headers: [], rows: [] }

  const parseCells = (line: string) =>
    line.split('|').slice(1, -1).map(c => c.trim())

  const headers = parseCells(tableLines[0])
  const rows = tableLines
    .slice(1)
    .filter(l => !/^\|[-:| ]+\|$/.test(l))
    .map(parseCells)

  return { headers, rows }
}

function sc(ws: XLSX.WorkSheet, r: number, c: number, v: string | number) {
  ws[XLSX.utils.encode_cell({ r, c })] = { v, t: typeof v === 'number' ? 'n' : 's' }
}

function buildCover(projectName: string, date: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 20, c: 6 } })
  ws['!merges'] = [
    { s: { r: 8, c: 0 }, e: { r: 8, c: 6 } },
    { s: { r: 11, c: 2 }, e: { r: 11, c: 6 } },
    { s: { r: 12, c: 2 }, e: { r: 12, c: 6 } },
  ]
  sc(ws, 8, 0, '테 스 트 케 이 스')
  sc(ws, 11, 0, '프로젝트명')
  sc(ws, 11, 2, projectName || '미지정')
  sc(ws, 12, 0, '작성 일자')
  sc(ws, 12, 2, date)
  ws['!cols'] = Array(7).fill({ wch: 16 })
  return ws
}

function buildTestSheet(
  headers: string[],
  rows: string[][],
  projectName: string,
  date: string
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  const totalCols = Math.max(headers.length, 1)
  const totalRows = rows.length + 3
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows, c: totalCols - 1 } })
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
  ]

  sc(ws, 0, 0, `테스트 케이스 | ${projectName || '미지정'} | ${date}`)

  // 헤더 행
  headers.forEach((h, c) => sc(ws, 2, c, h))

  // 데이터 행
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      sc(ws, 3 + ri, ci, cell)
    })
  })

  // 열 너비
  const colWidths: XLSX.ColInfo[] = headers.map((h, i) => {
    if (h.includes('절차') || h.includes('결과') || h.includes('조건')) return { wch: 36 }
    if (h.includes('항목') || h.includes('설명')) return { wch: 28 }
    if (h.includes('ID')) return { wch: 12 }
    if (h.includes('유형') || h.includes('Pass') || h.includes('우선')) return { wch: 12 }
    return { wch: 18 }
  })
  ws['!cols'] = colWidths

  // 행 높이 (내용이 긴 행은 높이 키움)
  const rowHeights: XLSX.RowInfo[] = [{ hpt: 28 }, { hpt: 6 }, { hpt: 22 }]
  rows.forEach(() => rowHeights.push({ hpt: 40 }))
  ws['!rows'] = rowHeights

  return ws
}

export function exportTestCasesToExcel(
  markdown: string,
  projectName: string,
  date: string
) {
  const { headers, rows } = parseMarkdownTable(markdown)

  if (headers.length === 0) {
    alert('테스트 케이스 테이블을 찾을 수 없습니다.')
    return
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildCover(projectName, date), '표지')
  XLSX.utils.book_append_sheet(wb, buildTestSheet(headers, rows, projectName, date), '테스트케이스')

  const blob = new Blob(
    [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  )
  saveAs(blob, `테스트케이스_${projectName || '미지정'}_${date}.xlsx`)
}
