'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, FileSpreadsheet, Upload, Link, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { generateWithClaude } from '@/lib/claude'
import { buildMinutesPrompt, buildInterviewResultPrompt } from '@/lib/prompts'
import { DocumentResult } from '@/components/DocumentResult'
import { parseExcelToText } from '@/lib/excel-parser'
import { exportInterviewResultExcel } from '@/lib/excel-interview-export'

type Mode = 'minutes' | 'interview'

export default function MinutesPage() {
  const router = useRouter()
  const { settings, setDocument } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.')

  // 공통
  const [mode, setMode] = useState<Mode>('interview')
  const [date, setDate] = useState(today)
  const [location, setLocation] = useState('')
  const [attendeeInput, setAttendeeInput] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [extra, setExtra] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [parsingFile, setParsing] = useState(false)

  // 노션 연동
  const [notionUrl, setNotionUrl] = useState('')
  const [fetchingNotion, setFetchingNotion] = useState(false)
  const [notionPageTitle, setNotionPageTitle] = useState('')

  // 인터뷰결과서 전용
  const [documentNumber, setDocumentNumber] = useState('')
  const [version, setVersion] = useState('V 1.0')
  const [authorCompany, setAuthorCompany] = useState(settings.clientName || '')
  const [authorName, setAuthorName] = useState(settings.pmName || '')
  const [moderator, setModerator] = useState('')
  const [recorder, setRecorder] = useState('')
  const [agenda, setAgenda] = useState('')
  const [nextMeetingDate, setNextMeetingDate] = useState('')
  const [nextMeetingLocation, setNextMeetingLocation] = useState('')

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addAttendee() {
    const names = attendeeInput.split(',').map((s) => s.trim()).filter(Boolean)
    setAttendees((prev) => Array.from(new Set([...prev, ...names])))
    setAttendeeInput('')
  }

  function handleAttendeeKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addAttendee()
    }
  }

  async function handleNotionFetch() {
    if (!notionUrl.trim()) return
    if (!settings.notionToken) {
      setError('노션 Integration Token이 설정되지 않았습니다. 설정 페이지에서 입력해주세요.')
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
      setMemo(data.content)
      setNotionPageTitle(data.title)
      setUploadedFileName('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '노션 페이지 가져오기 실패')
    } finally {
      setFetchingNotion(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError('')
    try {
      const text = await parseExcelToText(file)
      setMemo(text)
      setUploadedFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel 파일 파싱 실패')
    } finally {
      setParsing(false)
      e.target.value = ''
    }
  }

  async function handleGenerate() {
    if (!memo.trim()) return
    if (!settings.apiKey) {
      setError('API Key가 설정되지 않았습니다. 설정 페이지에서 Gemini API Key를 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      let system: string
      let user: string

      if (mode === 'interview') {
        const p = buildInterviewResultPrompt({
          projectName: settings.projectName,
          date,
          location,
          attendees,
          moderator,
          recorder,
          agenda,
          memo,
          extra,
        })
        system = p.system
        user = p.user
      } else {
        const p = buildMinutesPrompt({
          projectName: settings.projectName,
          date,
          location,
          attendees,
          memo,
          extra,
        })
        system = p.system
        user = p.user
      }

      let accumulated = ''
      await generateWithClaude({
        apiKey: settings.apiKey,
        model: settings.geminiModel,
        systemPrompt: system,
        userPrompt: user,
        onChunk: (chunk) => {
          accumulated += chunk
          setResult(accumulated)
        },
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    setDocument('minutes', result)
    router.push('/requirements')
  }

  async function handleExcelDownload() {
    await exportInterviewResultExcel({
      projectName: settings.projectName || '미지정',
      documentNumber: documentNumber || '분석_HR_인터뷰결과서',
      version,
      date,
      authorCompany: authorCompany || settings.clientName || '미지정',
      authorName: authorName || settings.pmName || '미지정',
      meetingDate: date,
      meetingLocation: location,
      nextMeetingDate,
      nextMeetingLocation,
      moderator,
      recorder,
      attendees: attendees.map((name) => ({ company: '', name })),
      agenda,
      content: result,
      interfaces: [],
    })
  }

  const canGenerate = memo.trim().length > 0 && !loading && !parsingFile

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📋</span> 회의록 / 인터뷰결과서 생성
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">인터뷰 내용을 입력하면 AI가 정리하여 Excel 양식으로 출력합니다.</p>
        </div>

        {/* 모드 전환 탭 */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setMode('interview')}
            className={`px-4 py-2 ${mode === 'interview' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            인터뷰결과서
          </button>
          <button
            onClick={() => setMode('minutes')}
            className={`px-4 py-2 ${mode === 'minutes' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            일반 회의록
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌: 입력 */}
        <div className="w-[45%] flex flex-col gap-3 overflow-auto">

          {/* 인터뷰결과서 전용: 문서 메타정보 */}
          {mode === 'interview' && (
            <div className="card p-4 space-y-3">
              <p className="section-title">문서 정보</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">문서번호</label>
                  <input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="예: 분석_EHR_04" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">버전</label>
                  <input value={version} onChange={(e) => setVersion(e.target.value)}
                    placeholder="V 1.0" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">작성자 소속</label>
                  <input value={authorCompany} onChange={(e) => setAuthorCompany(e.target.value)}
                    placeholder="예: 이수시스템" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">작성자 성명</label>
                  <input value={authorName} onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="예: 김원규" className="input-field" />
                </div>
              </div>
            </div>
          )}

          {/* 회의 정보 */}
          <div className="card p-4 space-y-3">
            <p className="section-title">회의 정보</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">회의 일시</label>
                <input type="text" value={date} onChange={(e) => setDate(e.target.value)}
                  placeholder="2026.04.10" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">회의 장소</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 3회의실" className="input-field" />
              </div>
            </div>

            {mode === 'interview' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">주관자(부서)</label>
                    <input value={moderator} onChange={(e) => setModerator(e.target.value)}
                      placeholder="예: 이수시스템" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">기록자</label>
                    <input value={recorder} onChange={(e) => setRecorder(e.target.value)}
                      placeholder="예: 김원규" className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">다음 회의 일시 <span className="text-gray-400">(선택)</span></label>
                    <input value={nextMeetingDate} onChange={(e) => setNextMeetingDate(e.target.value)}
                      placeholder="미정" className="input-field" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">다음 회의 장소 <span className="text-gray-400">(선택)</span></label>
                    <input value={nextMeetingLocation} onChange={(e) => setNextMeetingLocation(e.target.value)}
                      placeholder="미정" className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">안건</label>
                  <input value={agenda} onChange={(e) => setAgenda(e.target.value)}
                    placeholder="예: 복리후생 모듈 1차 인터뷰(KV)" className="input-field" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs text-gray-600 mb-1 block">참석자</label>
              <input type="text" value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={handleAttendeeKey}
                onBlur={addAttendee}
                placeholder="이름 입력 후 Enter (쉼표로 구분)"
                className="input-field" />
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {attendees.map((name) => (
                    <span key={name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">
                      {name}
                      <button onClick={() => setAttendees((p) => p.filter((n) => n !== name))}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 노션 URL 입력 */}
          <div className="card p-4 space-y-2">
            <p className="section-title flex items-center gap-1.5">
              <Link size={13} /> 노션 페이지 연결
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={notionUrl}
                onChange={(e) => setNotionUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNotionFetch()}
                placeholder="https://www.notion.so/..."
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={handleNotionFetch}
                disabled={fetchingNotion || !notionUrl.trim()}
                className="btn-primary text-xs px-3 py-2 whitespace-nowrap"
              >
                {fetchingNotion
                  ? <><Loader2 size={13} className="animate-spin" /> 가져오는 중</>
                  : <><Link size={13} /> 불러오기</>}
              </button>
            </div>
            {notionPageTitle && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                <span>📄</span>
                <span className="font-medium truncate">{notionPageTitle}</span>
                <button className="ml-auto" onClick={() => { setNotionPageTitle(''); setMemo(''); setNotionUrl('') }}>
                  <X size={12} />
                </button>
              </div>
            )}
            {!settings.notionToken && (
              <p className="text-xs text-amber-600">
                ⚠ 설정 페이지에서 노션 Integration Token을 먼저 입력해주세요.
              </p>
            )}
          </div>

          {/* 인터뷰/회의 내용 */}
          <div className="card p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <p className="section-title">인터뷰 / 회의 내용</p>
              <button onClick={() => fileRef.current?.click()} disabled={parsingFile}
                className="btn-secondary text-xs py-1">
                <FileSpreadsheet size={13} />
                {parsingFile ? '파싱 중...' : 'Excel 불러오기'}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                className="hidden" onChange={handleFileUpload} />
            </div>

            {uploadedFileName && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                <FileSpreadsheet size={13} />
                <span className="truncate">{uploadedFileName}</span>
                <button className="ml-auto" onClick={() => { setMemo(''); setUploadedFileName('') }}>
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex-1 relative" onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  const fakeEv = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
                  handleFileUpload(fakeEv)
                }
              }}>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
                placeholder="인터뷰 내용을 자유롭게 입력하거나 Excel 파일을 드래그&드롭 하세요."
                className="input-field w-full h-full min-h-[180px] resize-none font-mono text-xs"
                disabled={parsingFile} />
              {!memo && !parsingFile && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-25">
                  <Upload size={22} className="mb-1 text-gray-400" />
                  <span className="text-xs text-gray-400">드래그&드롭</span>
                </div>
              )}
            </div>
          </div>

          <div className="card p-4 space-y-2">
            <p className="section-title">추가 지시사항 <span className="text-gray-400 font-normal normal-case">(선택)</span></p>
            <input type="text" value={extra} onChange={(e) => setExtra(e.target.value)}
              placeholder="예: 확인사항을 별도로 정리해줘"
              className="input-field" />
          </div>

          <button onClick={handleGenerate} disabled={!canGenerate}
            className="btn-primary w-full justify-center py-3">
            <Sparkles size={16} />
            {mode === 'interview' ? '인터뷰결과서 내용 생성' : '회의록 생성'}
          </button>
        </div>

        {/* 우: 결과 */}
        <div className="flex-1 card p-4 flex flex-col min-h-0">
          <p className="section-title mb-3">생성 결과</p>
          <DocumentResult
            content={result}
            filename={`인터뷰결과서_${date}`}
            isLoading={loading}
            onChange={setResult}
            extraActions={
              result
                ? [
                    ...(mode === 'interview'
                      ? [{
                          label: 'Excel 다운로드 (인터뷰결과서 양식)',
                          icon: <FileSpreadsheet size={13} />,
                          onClick: handleExcelDownload,
                          variant: 'secondary' as const,
                        }]
                      : []),
                    {
                      label: '요구사항 정의서로 이어서',
                      onClick: handleNext,
                      variant: 'primary' as const,
                    },
                  ]
                : []
            }
          />
        </div>
      </div>
    </div>
  )
}
