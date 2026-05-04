'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Download } from 'lucide-react'

// ─── 타입 ─────────────────────────────────────────────────────────
type ScreenType = '신청서' | '그리드'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  span: number   // 차지할 열 수 (1 ~ maxCols)
}

interface GridCol {
  id: string
  name: string
  type: string
  width: number
  required: boolean
}

const FIELD_TYPES = [
  { value: 'text',     label: '텍스트' },
  { value: 'number',   label: '숫자' },
  { value: 'date',     label: '날짜' },
  { value: 'select',   label: '선택(콤보)' },
  { value: 'textarea', label: '장문' },
  { value: 'file',     label: '파일첨부' },
  { value: 'readonly', label: '조회전용' },
]

const GRID_COL_TYPES = [
  { value: 'text',     label: '텍스트' },
  { value: 'number',   label: '숫자' },
  { value: 'date',     label: '날짜' },
  { value: 'select',   label: '콤보' },
  { value: 'checkbox', label: '체크박스' },
  { value: 'readonly', label: '조회전용' },
]

const TOOLBAR_BTNS = [
  { key: '대상자생성',   label: '대상자생성',   primary: true,  group: 'A' },
  { key: '양식다운로드', label: '양식다운로드', primary: false, group: 'A' },
  { key: '업로드',       label: '업로드',       primary: false, group: 'A' },
  { key: '입력',         label: '입력',         primary: false, group: 'B' },
  { key: '복사',         label: '복사',         primary: false, group: 'B' },
  { key: '저장',         label: '저장',         primary: true,  group: 'B' },
  { key: '다운로드',     label: '다운로드',     primary: false, group: 'B' },
]

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─── 레이아웃 셀 계산 ─────────────────────────────────────────────
function buildCells(fields: FormField[], maxCols: number) {
  const cells: { field: FormField | null; span: number; key: string }[] = []
  let usedInRow = 0

  for (const field of fields) {
    const span = Math.min(field.span, maxCols)
    if (usedInRow + span > maxCols) {
      const rem = maxCols - usedInRow
      if (rem > 0) cells.push({ field: null, span: rem, key: `fill-${field.id}` })
      usedInRow = 0
    }
    cells.push({ field, span, key: field.id })
    usedInRow += span
    if (usedInRow >= maxCols) usedInRow = 0
  }
  if (usedInRow > 0 && usedInRow < maxCols)
    cells.push({ field: null, span: maxCols - usedInRow, key: 'fill-end' })
  return cells
}

// 셀 배열을 행 단위로 묶음 (행 간 border 처리용)
function buildRows(cells: ReturnType<typeof buildCells>, maxCols: number) {
  const rows: (typeof cells)[] = []
  let row: typeof cells = []
  let filled = 0
  for (const cell of cells) {
    row.push(cell)
    filled += cell.span
    if (filled >= maxCols) { rows.push(row); row = []; filled = 0 }
  }
  if (row.length > 0) rows.push(row)
  return rows
}

// ─── 입력 요소 모형 (IDS 스타일) ─────────────────────────────────
function InputEl({ type }: { type: string }) {
  const base: React.CSSProperties = {
    height: 34, borderRadius: 6, border: '1px solid #d4d9e8',
    background: 'white', fontSize: 12, fontFamily: 'inherit',
    padding: '0 10px', color: '#1a2040',
    display: 'flex', alignItems: 'center', boxSizing: 'border-box',
  }
  switch (type) {
    case 'date':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ ...base, width: 112, color: '#8892aa', flexShrink: 0 }}>2025-01-01</div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8892aa" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      )
    case 'select':
      return (
        <div style={{ ...base, width: 150, justifyContent: 'space-between', cursor: 'default', color: '#aab0c0' }}>
          <span>선택하세요</span>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 3L5 7L9 3" stroke="#8892aa" strokeWidth="1.5" fill="none" /></svg>
        </div>
      )
    case 'textarea':
      return <div style={{ border: '1px solid #d4d9e8', background: 'white', borderRadius: 6, width: '100%', height: 62 }} />
    case 'file':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ ...base, background: '#f5f6fa', color: '#5c6680', padding: '0 12px', flexShrink: 0, cursor: 'default' }}>파일 선택</div>
          <div style={{ ...base, flex: 1, color: '#bbb', minWidth: 80 }}>선택된 파일 없음</div>
        </div>
      )
    case 'readonly':
      return <div style={{ ...base, background: '#f5f6fa', color: '#8892aa', cursor: 'default', width: 150 }}>조회전용</div>
    default:
      return <div style={{ ...base, width: '100%' }} />
  }
}

// ─── 신청서 미리보기 (IDS ids-form-list 스타일) ───────────────────
function FormPreview({ title, fields, maxCols }: { title: string; fields: FormField[]; maxCols: 2 | 3 }) {
  const src = fields.length > 0 ? fields : [{ id: 'ph', label: '항목을 추가하세요', type: 'text', required: false, span: 1 }]
  const rows = buildRows(buildCells(src, maxCols), maxCols)

  return (
    <div style={{
      fontFamily: '"Noto Sans KR","Apple SD Gothic Neo",sans-serif',
      fontSize: 12, userSelect: 'none',
      background: 'white', borderRadius: 12,
      border: '1px solid #dde2ec', overflow: 'hidden',
    }}>
      {/* 타이틀 */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid #dde2ec',
        fontSize: 13, fontWeight: 600, color: '#1a2040',
      }}>
        {title || '신청서'}
      </div>
      {/* 행 단위 렌더링 — 행 간 border-top, 셀 간 border-left */}
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
            borderTop: rowIdx > 0 ? '1px solid #dde2ec' : undefined,
          }}
        >
          {row.map((cell, cellIdx) => (
            <div
              key={cell.key}
              style={{
                gridColumn: `span ${cell.span}`,
                display: 'flex', minHeight: 46,
                padding: '6px 16px', gap: 12, alignItems: 'center',
                borderLeft: cellIdx > 0 ? '1px solid #dde2ec' : undefined,
              }}
            >
              <div style={{
                fontSize: 12, fontWeight: 500, color: '#5c6680',
                flexShrink: 0, minWidth: 72,
                display: 'flex', alignItems: 'center', gap: 2,
              }}>
                {cell.field?.required && <span style={{ color: '#e84040' }}>*</span>}
                <span>{cell.field?.label ?? ''}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {cell.field && <InputEl type={cell.field.type} />}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── 그리드 미리보기 (IDS ids-list-container + IBSheet 스킨) ────────
function GridPreview({ title, cols, buttons }: { title: string; cols: GridCol[]; buttons: string[] }) {
  const MOCK_ROWS = 5
  const displayCols = cols.length > 0 ? cols : [{ id: 'ph', name: '컬럼을 추가하세요', type: 'text', width: 200, required: false }]

  const Btn = ({ label, primary }: { label: string; primary?: boolean }) => (
    <div style={{
      height: 22, padding: '0 10px', borderRadius: 6, cursor: 'default',
      border: `1px solid ${primary ? '#1d56e7' : '#e1e1e1'}`,
      background: primary ? '#1d56e7' : '#ffffff',
      color: primary ? '#ffffff' : '#363b3f',
      fontSize: 11, fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0,
    }}>{label}</div>
  )

  const activeA = TOOLBAR_BTNS.filter(b => b.group === 'A' && buttons.includes(b.key))
  const activeB = TOOLBAR_BTNS.filter(b => b.group === 'B' && buttons.includes(b.key))
  const showDivider = activeA.length > 0 && activeB.length > 0

  return (
    <div style={{
      fontFamily: '"Noto Sans KR","Apple SD Gothic Neo",sans-serif',
      fontSize: 12, userSelect: 'none',
      border: '1px solid #e1e1e1', borderRadius: 8,
      background: '#ffffff', overflow: 'hidden',
    }}>
      {/* 헤더: 제목 좌측 / 버튼 우측 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', borderBottom: '1px solid #eeeeee',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#363b3f' }}>{title || ''}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeA.map(b => <Btn key={b.key} label={b.label} primary={b.primary} />)}
          {showDivider && <div style={{ width: 1, height: 14, background: '#e1e1e1', flexShrink: 0 }} />}
          {activeB.map(b => <Btn key={b.key} label={b.label} primary={b.primary} />)}
        </div>
      </div>
      {/* IBSheet 그리드 — border-top: 1px solid #123690 (primary-30) */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%', borderTop: '1px solid #123690' }}>
          <thead>
            <tr style={{ height: 28 }}>
              <th style={{
                background: '#e8eefd', color: '#40484d',
                borderRight: '1px solid #ffffff', borderBottom: '1px solid #123690',
                padding: '0 6px', textAlign: 'center', width: 36,
                fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
              }}>No</th>
              {displayCols.map(col => (
                <th key={col.id} style={{
                  background: '#e8eefd', color: '#40484d',
                  borderRight: '1px solid #ffffff', borderBottom: '1px solid #123690',
                  padding: '0 8px', textAlign: 'center',
                  width: col.width, minWidth: col.width,
                  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {col.required && <span style={{ color: '#e2465d', marginRight: 2 }}>*</span>}
                  {col.name || '컬럼'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MOCK_ROWS }).map((_, ri) => (
              <tr key={ri} style={{ height: 28, background: ri % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                <td style={{ borderRight: '1px solid #e3e3e3', borderBottom: '1px solid #e3e3e3', padding: '0 6px', textAlign: 'center', color: '#a6aeb1', fontSize: 11 }}>{ri + 1}</td>
                {displayCols.map(col => (
                  <td key={col.id} style={{ borderRight: '1px solid #e3e3e3', borderBottom: '1px solid #e3e3e3', padding: '0 6px' }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 건수 표시줄 */}
      <div style={{
        borderTop: '1px solid #eeeeee', padding: '3px 8px',
        display: 'flex', justifyContent: 'flex-end',
        fontSize: 11, color: '#7b858e',
      }}>
        [0 / 0]
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────
export default function ScreenPreviewPage() {
  const [screenTitle, setScreenTitle] = useState('')
  const [screenType, setScreenType] = useState<ScreenType>('신청서')
  const [maxCols, setMaxCols] = useState<2 | 3>(2)
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: uid(), label: '', type: 'text', required: false, span: 1 },
  ])
  const [gridCols, setGridCols] = useState<GridCol[]>([
    { id: uid(), name: '', type: 'text', width: 120, required: false },
  ])
  const [gridBtns, setGridBtns] = useState<string[]>(TOOLBAR_BTNS.map(b => b.key))
  const previewRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  // maxCols 변경 시 span 범위 초과 항목 보정
  function changeMaxCols(n: 2 | 3) {
    setMaxCols(n)
    setFormFields(p => p.map(f => ({ ...f, span: Math.min(f.span, n) })))
  }

  // 신청서 항목 핸들러
  function addField() { setFormFields(p => [...p, { id: uid(), label: '', type: 'text', required: false, span: 1 }]) }
  function removeField(id: string) { setFormFields(p => p.filter(f => f.id !== id)) }
  function updateField<K extends keyof FormField>(id: string, key: K, val: FormField[K]) {
    setFormFields(p => p.map(f => f.id === id ? { ...f, [key]: val } : f))
  }

  // 그리드 컬럼 핸들러
  function addCol() { setGridCols(p => [...p, { id: uid(), name: '', type: 'text', width: 120, required: false }]) }
  function removeCol(id: string) { setGridCols(p => p.filter(c => c.id !== id)) }
  function updateCol<K extends keyof GridCol>(id: string, key: K, val: GridCol[K]) {
    setGridCols(p => p.map(c => c.id === id ? { ...c, [key]: val } : c))
  }
  function toggleBtn(key: string) {
    setGridBtns(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  }

  // 이미지 저장
  async function downloadImage() {
    if (!previewRef.current || downloading) return
    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })
      const a = document.createElement('a')
      a.download = `${screenTitle || '화면미리보기'}.png`
      a.href = dataUrl
      a.click()
    } catch (e) {
      console.error('이미지 저장 실패:', e)
    } finally {
      setDownloading(false)
    }
  }

  // 열 수 옵션
  const spanOptions = Array.from({ length: maxCols }, (_, i) => ({
    value: i + 1,
    label: i + 1 === maxCols ? `전체행(${maxCols}칸)` : `${i + 1}칸`,
  }))

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>🖥️</span> 화면 미리보기
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          신청서(AppDet) · 그리드(IBSheet) 화면 구조를 실시간으로 미리 확인하고 이미지로 저장합니다.
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ── 좌: 빌더 ── */}
        <div className="w-[42%] flex flex-col gap-3 overflow-auto">

          {/* 기본 정보 */}
          <div className="card p-4 space-y-3">
            <p className="section-title">기본 정보</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">화면명</label>
              <input
                type="text" value={screenTitle}
                onChange={e => setScreenTitle(e.target.value)}
                placeholder="예: 학자금 신청"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">구분</label>
              <div className="flex gap-2">
                {(['신청서', '그리드'] as ScreenType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setScreenType(t)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      screenType === t
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                    }`}
                  >
                    {t === '신청서' ? '📋 신청서 (AppDet)' : '📊 그리드 (IBSheet)'}
                  </button>
                ))}
              </div>
            </div>
            {/* 신청서일 때만 열 수 선택 */}
            {screenType === '신청서' && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">폼 열 수</label>
                <div className="flex gap-2">
                  {([2, 3] as (2 | 3)[]).map(n => (
                    <button
                      key={n}
                      onClick={() => changeMaxCols(n)}
                      className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        maxCols === n
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                      }`}
                    >
                      {n}열 폼
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 신청서 항목 편집 */}
          {screenType === '신청서' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-title">항목 구성</p>
                <span className="text-xs text-gray-400">
                  <span className="text-red-500">*</span> 필수항목
                </span>
              </div>
              <div className="space-y-1.5">
                {/* 헤더 */}
                <div
                  className="grid text-xs text-gray-500 font-medium px-1 pb-1 border-b border-gray-100"
                  style={{ gridTemplateColumns: '1fr 88px 80px 32px 24px' }}
                >
                  <span>항목명</span>
                  <span className="text-center">입력유형</span>
                  <span className="text-center">열 차지</span>
                  <span className="text-center text-red-500">필수*</span>
                  <span />
                </div>
                {formFields.map(f => (
                  <div
                    key={f.id}
                    className="grid items-center gap-1"
                    style={{ gridTemplateColumns: '1fr 88px 80px 32px 24px' }}
                  >
                    <input
                      type="text" value={f.label}
                      onChange={e => updateField(f.id, 'label', e.target.value)}
                      placeholder="항목명"
                      className="input-field text-xs py-1"
                    />
                    <select
                      value={f.type}
                      onChange={e => updateField(f.id, 'type', e.target.value)}
                      className="input-field text-xs py-1"
                    >
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <select
                      value={f.span}
                      onChange={e => updateField(f.id, 'span', Number(e.target.value))}
                      className="input-field text-xs py-1"
                    >
                      {spanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="flex justify-center">
                      <input
                        type="checkbox" checked={f.required}
                        onChange={e => updateField(f.id, 'required', e.target.checked)}
                        className="accent-red-500 w-4 h-4"
                      />
                    </div>
                    <button onClick={() => removeField(f.id)} className="text-gray-300 hover:text-red-400 flex justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addField}
                className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600 flex items-center justify-center gap-1"
              >
                <Plus size={12} /> 항목 추가
              </button>
            </div>
          )}

          {/* 그리드 컬럼 편집 */}
          {screenType === '그리드' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-title">컬럼 구성</p>
                <span className="text-xs text-gray-400">
                  <span className="text-yellow-500">*</span> 필수컬럼
                </span>
              </div>
              <div className="space-y-1.5">
                {/* 헤더 */}
                <div
                  className="grid text-xs text-gray-500 font-medium px-1 pb-1 border-b border-gray-100"
                  style={{ gridTemplateColumns: '1fr 72px 56px 32px 24px' }}
                >
                  <span>컬럼명</span>
                  <span className="text-center">유형</span>
                  <span className="text-center">폭(px)</span>
                  <span className="text-center text-yellow-500">필수*</span>
                  <span />
                </div>
                {gridCols.map(c => (
                  <div
                    key={c.id}
                    className="grid items-center gap-1"
                    style={{ gridTemplateColumns: '1fr 72px 56px 32px 24px' }}
                  >
                    <input
                      type="text" value={c.name}
                      onChange={e => updateCol(c.id, 'name', e.target.value)}
                      placeholder="컬럼명"
                      className="input-field text-xs py-1"
                    />
                    <select
                      value={c.type}
                      onChange={e => updateCol(c.id, 'type', e.target.value)}
                      className="input-field text-xs py-1"
                    >
                      {GRID_COL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input
                      type="number" value={c.width}
                      onChange={e => updateCol(c.id, 'width', Number(e.target.value))}
                      min={40} max={400}
                      className="input-field text-xs py-1 text-center"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox" checked={c.required}
                        onChange={e => updateCol(c.id, 'required', e.target.checked)}
                        className="accent-yellow-500 w-4 h-4"
                      />
                    </div>
                    <button onClick={() => removeCol(c.id)} className="text-gray-300 hover:text-red-400 flex justify-center">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addCol}
                className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600 flex items-center justify-center gap-1"
              >
                <Plus size={12} /> 컬럼 추가
              </button>
            </div>
          )}

          {/* 그리드 툴바 버튼 선택 */}
          {screenType === '그리드' && (
            <div className="card p-4 space-y-2">
              <p className="section-title">툴바 버튼</p>
              <div className="flex flex-wrap gap-2">
                {TOOLBAR_BTNS.map(b => {
                  const active = gridBtns.includes(b.key)
                  return (
                    <button
                      key={b.key}
                      onClick={() => toggleBtn(b.key)}
                      className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                        active
                          ? b.primary
                            ? 'bg-[#1d56e7] text-white border-[#1d56e7]'
                            : 'bg-brand-50 text-brand-700 border-brand-300'
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400">클릭하여 미리보기에 표시할 버튼을 선택하세요</p>
            </div>
          )}

          {/* 범례 */}
          <div className="card p-3">
            <p className="text-xs text-gray-500 font-medium mb-2">참고</p>
            {screenType === '신청서' ? (
              <ul className="space-y-1 text-xs text-gray-500">
                <li><span className="text-red-500 font-bold">*</span> 필수 체크 시 레이블에 빨간 별표 표시</li>
                <li>열 차지: 해당 항목이 가로로 몇 칸을 차지할지 설정</li>
                <li>예) 3열 폼에서 "전체행" 선택 → 한 행을 독점</li>
              </ul>
            ) : (
              <ul className="space-y-1 text-xs text-gray-500">
                <li><span className="text-red-500 font-bold">*</span> 필수 체크 시 컬럼 헤더에 빨간 별표 표시</li>
                <li>폭(px): 미리보기에 실제 반영됨</li>
                <li>툴바 버튼은 위 "툴바 버튼" 섹션에서 선택</li>
              </ul>
            )}
          </div>
        </div>

        {/* ── 우: 미리보기 ── */}
        <div className="flex-1 card p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">
              미리보기
              {screenTitle && <span className="ml-2 text-gray-400 font-normal text-xs">— {screenTitle}</span>}
            </p>
            <button
              onClick={downloadImage}
              disabled={downloading}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Download size={13} />
              {downloading ? '저장 중...' : '이미지 저장 (.png)'}
            </button>
          </div>
          {/* 미리보기 영역 — 회색 배경으로 화면처럼 연출 */}
          <div className="flex-1 overflow-auto bg-[#d8dde8] rounded-lg p-5">
            <div className="min-w-[480px]" ref={previewRef}>
              {screenType === '신청서'
                ? <FormPreview title={screenTitle} fields={formFields} maxCols={maxCols} />
                : <GridPreview title={screenTitle} cols={gridCols} buttons={gridBtns} />
              }
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">
            항목 입력 시 즉시 반영 · "이미지 저장" 버튼으로 PNG 다운로드
          </p>
        </div>
      </div>
    </div>
  )
}
