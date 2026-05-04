'use client'

import { useState } from 'react'
import { Copy, X, Link, Loader2, FileSpreadsheet, ChevronDown, ChevronRight, Check, ClipboardPaste } from 'lucide-react'
import { useStore } from '@/lib/store'
import { buildScreenSpecPrompt } from '@/lib/prompts-screen'
import { exportScreenSpec, ScreenDef, ScreenSpecData } from '@/lib/excel-screen-export'

export default function ScreenSpecPage() {
  const { settings } = useStore()

  // 노션 연동
  const [notionUrl, setNotionUrl] = useState('')
  const [fetchingNotion, setFetchingNotion] = useState(false)
  const [notionTitle, setNotionTitle] = useState('')

  // 입력
  const [businessName, setBusinessName] = useState('복리후생')
  const [moduleName, setModuleName] = useState('')
  const [requirements, setRequirements] = useState('')
  const [extra, setExtra] = useState('')

  // 문서 메타
  const [docNumber, setDocNumber] = useState('')
  const [version, setVersion] = useState('V 1.0')
  const [authorCompany, setAuthorCompany] = useState('')
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

  // 결과
  const [screens, setScreens] = useState<ScreenDef[]>([])
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleNotionFetch() {
    if (!notionUrl.trim() || !settings.notionToken) {
      setError('설정 페이지에서 노션 Integration Token을 먼저 입력해주세요.')
      return
    }
    setFetchingNotion(true)
    setError('')
    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: notionUrl, token: settings.notionToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRequirements(data.content)
      setNotionTitle(data.title)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '노션 가져오기 실패')
    } finally {
      setFetchingNotion(false)
    }
  }

  function handleCopyPrompt() {
    const { system, user } = buildScreenSpecPrompt({
      projectName: settings.projectName || '미지정',
      moduleName,
      businessName,
      requirements,
      author: settings.pmName,
      date: today,
      extra,
    })
    const fullPrompt = `${system}\n\n---\n\n${user}`
    navigator.clipboard.writeText(fullPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleParseJson() {
    setError('')
    try {
      const stripped = jsonInput.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const jsonMatch = stripped.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('JSON 배열을 찾을 수 없습니다. Claude.ai에서 받은 JSON 응답 전체를 붙여넣어 주세요.')
      let parsed: ScreenDef[]
      try {
        parsed = JSON.parse(jsonMatch[0]) as ScreenDef[]
      } catch {
        throw new Error(
          'JSON 형식이 아닙니다. 여기에는 Claude.ai / Gemini의 JSON 응답만 붙여넣어 주세요.\n' +
          '각사별 특화내용은 [요구사항 취합] 페이지의 텍스트박스에 붙여넣으세요.'
        )
      }
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('빈 배열입니다.')
      // AI JSON의 searchConditions는 무시 (조회조건은 UI에서 설정)
      const cleaned = parsed.map(s => ({ ...s, searchConditions: [] }))
      setScreens(cleaned)
      setExpandedIdx(0)
      setJsonInput('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'JSON 파싱 오류')
    }
  }

  async function handleExport() {
    const data: ScreenSpecData = {
      projectName: settings.projectName || '미지정',
      moduleName,
      authorCompany: authorCompany || settings.clientName || '미지정',
      documentNumber: docNumber,
      version,
      date: today,
      author: settings.pmName || '미지정',
      screens,
    }
    await exportScreenSpec(data)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>🖥</span> 프로그램 화면 정의서 생성
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          노션 회의록 → 프롬프트 복사 → Claude.ai / Gemini 붙여넣기 → JSON 응답 붙여넣기 → Excel 다운로드
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌: 입력 */}
        <div className="w-[42%] flex flex-col gap-3 overflow-auto">

          {/* 문서 정보 */}
          <div className="card p-4 space-y-3">
            <p className="section-title">문서 정보</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">모듈명</label>
                <input value={moduleName} onChange={(e) => setModuleName(e.target.value)}
                  placeholder="예: 복리후생" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">업무명</label>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="예: 학자금관리" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">문서번호</label>
                <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="예: 설계_WLF_01" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">작성자 소속</label>
                <input value={authorCompany} onChange={(e) => setAuthorCompany(e.target.value)}
                  placeholder="예: 이수시스템" className="input-field" />
              </div>
            </div>
          </div>

          {/* 노션 연동 */}
          <div className="card p-4 space-y-2">
            <p className="section-title flex items-center gap-1.5">
              <Link size={13} /> 노션 회의록 연결
            </p>
            <div className="flex gap-2">
              <input type="url" value={notionUrl}
                onChange={(e) => setNotionUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNotionFetch()}
                placeholder="https://www.notion.so/..."
                className="input-field flex-1 text-sm" />
              <button onClick={handleNotionFetch}
                disabled={fetchingNotion || !notionUrl.trim()}
                className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                {fetchingNotion
                  ? <><Loader2 size={13} className="animate-spin" /> 가져오는 중</>
                  : <><Link size={13} /> 불러오기</>}
              </button>
            </div>
            {notionTitle && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                <span>📄</span>
                <span className="font-medium truncate">{notionTitle}</span>
                <button className="ml-auto" onClick={() => { setNotionTitle(''); setRequirements(''); setNotionUrl('') }}>
                  <X size={12} />
                </button>
              </div>
            )}
            {!settings.notionToken && (
              <p className="text-xs text-amber-600">⚠ 설정에서 노션 Token을 먼저 입력해주세요.</p>
            )}
          </div>

          {/* 요구사항 */}
          <div className="card p-4 flex flex-col gap-2 flex-1">
            <p className="section-title">회의록 / 요구사항 내용</p>
            <textarea value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="노션에서 불러오거나 직접 입력하세요."
              className="input-field flex-1 min-h-[140px] resize-none font-mono text-xs" />
          </div>

          <div className="card p-4 space-y-2">
            <p className="section-title">추가 지시사항 <span className="text-gray-400 font-normal normal-case">(선택)</span></p>
            <input value={extra} onChange={(e) => setExtra(e.target.value)}
              placeholder="예: 학자금과 경조금만 먼저 만들어줘"
              className="input-field" />
          </div>

          {/* 프롬프트 복사 */}
          <button
            onClick={handleCopyPrompt}
            disabled={!requirements.trim()}
            className="btn-primary w-full justify-center py-3"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사 완료! Claude.ai 또는 Gemini에 붙여넣으세요' : '프롬프트 복사'}
          </button>

          <p className="text-xs text-gray-400 text-center -mt-1">
            복사 후 → <strong>claude.ai</strong> 또는 <strong>gemini.google.com</strong> (무료) 에 붙여넣기
          </p>
        </div>

        {/* 우: JSON 붙여넣기 → 결과 */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-auto">

          {/* JSON 입력 */}
          {screens.length === 0 && (
            <div className="card p-4 flex flex-col gap-3">
              <p className="section-title flex items-center gap-1.5">
                <ClipboardPaste size={13} /> AI 응답 붙여넣기
              </p>
              <p className="text-xs text-gray-500">Claude.ai / Gemini 에서 받은 JSON 응답 전체를 붙여넣으세요.</p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'[\n  {\n    "screenName": "학자금 조회",\n    "programId": "WLF001",\n    ...\n  }\n]'}
                className="input-field min-h-[180px] resize-none font-mono text-xs"
              />
              <button
                onClick={handleParseJson}
                disabled={!jsonInput.trim()}
                className="btn-primary justify-center"
              >
                <ClipboardPaste size={15} />
                Excel 변환
              </button>
            </div>
          )}

          {screens.length > 0 && (
            <>
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">화면 {screens.length}개 변환 완료</p>
                  <p className="text-xs text-gray-500 mt-0.5">{screens.map(s => s.screenName).join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setScreens([]); setJsonInput('') }} className="btn-secondary text-sm">
                    다시 입력
                  </button>
                  <button onClick={handleExport} className="btn-primary text-sm">
                    <FileSpreadsheet size={15} />
                    Excel 다운로드
                  </button>
                </div>
              </div>

              {screens.map((scr, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                    onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded font-mono">{scr.programId}</span>
                      <span className="font-medium text-sm text-gray-800">{scr.screenName}</span>
                      <span className="text-xs text-gray-400">{scr.businessName}</span>
                    </div>
                    {expandedIdx === idx
                      ? <ChevronDown size={15} className="text-gray-400" />
                      : <ChevronRight size={15} className="text-gray-400" />}
                  </button>

                  {expandedIdx === idx && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3 text-xs">
                      <div>
                        <p className="text-gray-500 mb-1">화면설명</p>
                        <p className="text-gray-800">{scr.screenDesc}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">그리드 컬럼 ({scr.gridColumns.length}개)</p>
                        <div className="flex flex-wrap gap-1">
                          {scr.gridColumns.map((col, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">{col.header}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">TABLE 정의 ({scr.tableColumns.length}개)</p>
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              {['컬럼명', '타입', 'Null', '기본값', '설명'].map(h => (
                                <th key={h} className="border border-gray-200 px-2 py-1 text-left text-gray-600">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {scr.tableColumns.map((col, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-2 py-1 font-mono text-brand-700">{col.columnName}</td>
                                <td className="border border-gray-200 px-2 py-1 font-mono">{col.dataType}</td>
                                <td className="border border-gray-200 px-2 py-1 text-center">{col.nullable}</td>
                                <td className="border border-gray-200 px-2 py-1">{col.defaultVal}</td>
                                <td className="border border-gray-200 px-2 py-1">{col.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {screens.length === 0 && !jsonInput && (
            <div className="card flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center space-y-3">
                <p className="text-4xl">🖥</p>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-600">사용 방법</p>
                  <p>① 노션 회의록 URL 입력 → 불러오기</p>
                  <p>② <strong>프롬프트 복사</strong> 클릭</p>
                  <p>③ claude.ai 또는 gemini.google.com 에 붙여넣기</p>
                  <p>④ AI 응답(JSON)을 위 박스에 붙여넣기</p>
                  <p>⑤ <strong>Excel 다운로드</strong></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
