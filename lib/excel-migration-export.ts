import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { MigrationOutput } from './prompts-migration'

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

function buildCover(projectName: string, sourceSystem: string, targetSystem: string, moduleName: string, author: string, date: string): XLSX.WorkSheet {
  const ws = initWs(22, 7)
  const M = ws['!merges']!
  sc(ws, 8, 0, '데 이 터 마 이 그 레 이 션 설 계 서'); M.push(m(8, 0, 8, 7))
  sc(ws, 11, 0, '프로젝트명');   sc(ws, 11, 2, projectName);   M.push(m(11, 2, 11, 7))
  sc(ws, 12, 0, '모듈명');       sc(ws, 12, 2, moduleName);    M.push(m(12, 2, 12, 7))
  sc(ws, 13, 0, '소스 시스템');  sc(ws, 13, 2, sourceSystem);  M.push(m(13, 2, 13, 7))
  sc(ws, 14, 0, '타겟 시스템');  sc(ws, 14, 2, targetSystem);  M.push(m(14, 2, 14, 7))
  sc(ws, 15, 0, '작성자');       sc(ws, 15, 2, author);        M.push(m(15, 2, 15, 7))
  sc(ws, 16, 0, '작성 일자');    sc(ws, 16, 2, date);          M.push(m(16, 2, 16, 7))
  ws['!cols'] = Array(8).fill({ wch: 16 })
  return ws
}

function buildOverview(data: MigrationOutput): XLSX.WorkSheet {
  const ws = initWs(20, 7)
  const M = ws['!merges']!
  sc(ws, 1, 0, '1. 마이그레이션 개요'); M.push(m(1, 0, 1, 7))
  sc(ws, 3, 0, data.overview); M.push(m(3, 0, 5, 7))
  sc(ws, 8, 0, '2. 전환 전략'); M.push(m(8, 0, 8, 7))
  sc(ws, 10, 0, data.strategy); M.push(m(10, 0, 15, 7))
  ws['!cols'] = Array(8).fill({ wch: 20 })
  ws['!rows'] = [
    { hpt: 6 }, { hpt: 22 }, { hpt: 6 }, { hpt: 60 }, { hpt: 18 }, { hpt: 18 },
    { hpt: 6 }, { hpt: 6 }, { hpt: 22 }, { hpt: 6 }, { hpt: 80 },
  ]
  return ws
}

function buildMapping(data: MigrationOutput): XLSX.WorkSheet {
  const rows = data.mappings
  const ws = initWs(rows.length + 4, 7)
  const M = ws['!merges']!

  sc(ws, 1, 0, '3. 필드 매핑 정의서'); M.push(m(1, 0, 1, 7))

  const HEADERS = ['소스 테이블', '소스 필드명', '소스 타입', '타겟 테이블', '타겟 필드명', '타겟 타입', '변환 규칙', '비고']
  HEADERS.forEach((h, c) => sc(ws, 3, c, h))

  rows.forEach((row, i) => {
    const r = 4 + i
    sc(ws, r, 0, row.sourceTable)
    sc(ws, r, 1, row.sourceField)
    sc(ws, r, 2, row.sourceType)
    sc(ws, r, 3, row.targetTable)
    sc(ws, r, 4, row.targetField)
    sc(ws, r, 5, row.targetType)
    sc(ws, r, 6, row.transformRule)
    sc(ws, r, 7, row.note)
  })

  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 16 },
    { wch: 20 }, { wch: 20 }, { wch: 16 },
    { wch: 30 }, { wch: 20 },
  ]
  return ws
}

function buildCleansing(data: MigrationOutput): XLSX.WorkSheet {
  const rows = data.cleansingRules
  const ws = initWs(rows.length + 4, 3)
  const M = ws['!merges']!

  sc(ws, 1, 0, '4. 데이터 클렌징 규칙'); M.push(m(1, 0, 1, 3))
  const HEADERS = ['대상 필드', '클렌징 조건', '처리 방법', '예시']
  HEADERS.forEach((h, c) => sc(ws, 3, c, h))

  rows.forEach((row, i) => {
    const r = 4 + i
    sc(ws, r, 0, row.targetField)
    sc(ws, r, 1, row.condition)
    sc(ws, r, 2, row.action)
    sc(ws, r, 3, row.example)
  })

  ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 24 }]
  return ws
}

function buildPhases(data: MigrationOutput): XLSX.WorkSheet {
  const rows = data.phases
  const ws = initWs(rows.length + 4, 3)
  const M = ws['!merges']!

  sc(ws, 1, 0, '5. 전환 단계 계획'); M.push(m(1, 0, 1, 3))
  const HEADERS = ['단계', '수행 업무', '담당', '비고']
  HEADERS.forEach((h, c) => sc(ws, 3, c, h))

  rows.forEach((row, i) => {
    const r = 4 + i
    sc(ws, r, 0, row.phase)
    sc(ws, r, 1, row.task)
    sc(ws, r, 2, row.responsible)
    sc(ws, r, 3, row.note)
  })

  ws['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 24 }]
  return ws
}

export async function exportMigrationDesign(
  data: MigrationOutput,
  projectName: string,
  sourceSystem: string,
  targetSystem: string,
  moduleName: string,
  author: string,
  date: string
) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildCover(projectName, sourceSystem, targetSystem, moduleName, author, date), '표지')
  XLSX.utils.book_append_sheet(wb, buildOverview(data), '개요_전략')
  XLSX.utils.book_append_sheet(wb, buildMapping(data), '필드매핑')
  XLSX.utils.book_append_sheet(wb, buildCleansing(data), '클렌징규칙')
  XLSX.utils.book_append_sheet(wb, buildPhases(data), '전환단계')

  const blob = new Blob(
    [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  )
  saveAs(blob, `마이그레이션설계서_${moduleName}_${date}.xlsx`)
}
