'use client'

import { useState } from 'react'
import { Copy, X, FileSpreadsheet, Loader2, Link, Check, ClipboardPaste } from 'lucide-react'
import { useStore } from '@/lib/store'
import { buildMigrationPrompt, MigrationOutput } from '@/lib/prompts-migration'
import { exportMigrationDesign } from '@/lib/excel-migration-export'

export default function MigrationPage() {
  const { settings } = useStore()

  const [sourceSystem, setSourceSystem] = useState('')
  const [targetSystem, setTargetSystem] = useState('')
  const [moduleName, setModuleName] = useState('복리후생')
  const [requirements, setRequirements] = useState('')
  const [extra, setExtra] = useState('')

  // 노션 연동
  const [notionUrl, setNotionUrl] = useState('')
  const [fetchingNotion, setFetchingNotion] = useState(false)
  const [notionTitle, setNotionTitle] = useState('')

  const [error, setError] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [result, setResult] = useState<MigrationOutput | null>(null)
  const [copied, setCopied] = useState(false)

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

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
    const { system, user } = buildMigrationPrompt({
      projectName: settings.projectName || '미지정',
      sourceSystem,
      targetSystem,
      moduleName,
      requirements,
      extra,
    })
    navigator.clipboard.writeText(`${system}\n\n---\n\n${user}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleParseJson() {
    setError('')
    try {
      const jsonMatch = jsonInput.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON을 찾을 수 없습니다. AI 응답 전체를 붙여넣어 주세요.')
      const parsed = JSON.parse(jsonMatch[0]) as MigrationOutput
      setResult(parsed)
      setJsonInput('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'JSON 파싱 오류')
    }
  }

  async function handleExport() {
    if (!result) return
    await exportMigrationDesign(result, settings.projectName || '미지정', sourceSystem, targetSystem, moduleName, settings.pmName || '미지정', today)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>🔄</span> 마이그레이션 설계서 생성
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

          <div className="card p-4 space-y-3">
            <p className="section-title">시스템 정보</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">소스 시스템 (구)</label>
                <input value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)}
                  placeholder="예: 더존 iCube" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">타겟 시스템 (신)</label>
                <input value={targetSystem} onChange={(e) => setTargetSystem(e.target.value)}
                  placeholder="예: E-HR" className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600 mb-1 block">모듈명</label>
                <input value={moduleName} onChange={(e) => setModuleName(e.target.value)}
                  placeholder="예: 복리후생" className="input-field" />
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <p className="section-title flex items-center gap-1.5">
              <Link size={13} /> 노션 페이지 연결
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
          </div>

          <div className="card p-4 flex flex-col gap-2 flex-1">
            <p className="section-title">마이그레이션 대상 내용</p>
            <textarea value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="노션에서 불러오거나 직접 입력하세요."
              className="input-field flex-1 min-h-[140px] resize-none font-mono text-xs" />
          </div>

          <div className="card p-4 space-y-2">
            <p className="section-title">추가 지시사항 <span className="text-gray-400 font-normal normal-case">(선택)</span></p>
            <input value={extra} onChange={(e) => setExtra(e.target.value)}
              placeholder="예: 학자금과 경조금 매핑만 먼저"
              className="input-field" />
          </div>

          <button onClick={handleCopyPrompt}
            disabled={!requirements.trim()}
            className="btn-primary w-full justify-center py-3">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '복사 완료! Claude.ai 또는 Gemini에 붙여넣으세요' : '프롬프트 복사'}
          </button>
          <p className="text-xs text-gray-400 text-center -mt-1">
            복사 후 → <strong>claude.ai</strong> 또는 <strong>gemini.google.com</strong> (무료) 에 붙여넣기
          </p>
        </div>

        {/* 우: JSON 붙여넣기 → 결과 */}
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-auto">

          {!result && (
            <div className="card p-4 flex flex-col gap-3">
              <p className="section-title flex items-center gap-1.5">
                <ClipboardPaste size={13} /> AI 응답 붙여넣기
              </p>
              <p className="text-xs text-gray-500">Claude.ai / Gemini 에서 받은 JSON 응답 전체를 붙여넣으세요.</p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'{\n  "overview": "...",\n  "mappings": [...],\n  ...\n}'}
                className="input-field min-h-[200px] resize-none font-mono text-xs"
              />
              <button onClick={handleParseJson} disabled={!jsonInput.trim()} className="btn-primary justify-center">
                <ClipboardPaste size={15} />
                Excel 변환
              </button>
            </div>
          )}

          {result && (
            <>
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">변환 완료</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    매핑 {result.mappings?.length ?? 0}개 · 클렌징 {result.cleansingRules?.length ?? 0}개 · {result.phases?.length ?? 0}단계
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setResult(null)} className="btn-secondary text-sm">다시 입력</button>
                  <button onClick={handleExport} className="btn-primary text-sm">
                    <FileSpreadsheet size={15} />
                    Excel 다운로드
                  </button>
                </div>
              </div>

              <div className="card p-4 space-y-2">
                <p className="section-title">개요</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.overview}</p>
              </div>

              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="section-title">필드 매핑 ({result.mappings?.length ?? 0}개)</p>
                </div>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['소스 테이블', '소스 필드', '타겟 테이블', '타겟 필드', '변환 규칙'].map(h => (
                          <th key={h} className="border border-gray-200 px-2 py-1.5 text-left text-gray-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.mappings?.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-2 py-1 font-mono text-gray-700">{row.sourceTable}</td>
                          <td className="border border-gray-200 px-2 py-1 font-mono text-brand-700">{row.sourceField}</td>
                          <td className="border border-gray-200 px-2 py-1 font-mono text-gray-700">{row.targetTable}</td>
                          <td className="border border-gray-200 px-2 py-1 font-mono text-green-700">{row.targetField}</td>
                          <td className="border border-gray-200 px-2 py-1">{row.transformRule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="section-title">전환 단계</p>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['단계', '수행 업무', '담당', '비고'].map(h => (
                        <th key={h} className="border border-gray-200 px-2 py-1.5 text-left text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.phases?.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-2 py-1 font-medium whitespace-nowrap">{row.phase}</td>
                        <td className="border border-gray-200 px-2 py-1">{row.task}</td>
                        <td className="border border-gray-200 px-2 py-1 whitespace-nowrap">{row.responsible}</td>
                        <td className="border border-gray-200 px-2 py-1 text-gray-500">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!result && !jsonInput && (
            <div className="card flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center space-y-3">
                <p className="text-4xl">🔄</p>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-600">사용 방법</p>
                  <p>① 소스/타겟 시스템 입력 + 노션 연결</p>
                  <p>② <strong>프롬프트 복사</strong> 클릭</p>
                  <p>③ claude.ai 또는 gemini.google.com에 붙여넣기</p>
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
