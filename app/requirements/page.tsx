'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { generateWithClaude } from '@/lib/claude'
import { buildRequirementsPrompt } from '@/lib/prompts'
import { DocumentResult } from '@/components/DocumentResult'
import { ContextBanner } from '@/components/ContextBanner'

const CATEGORIES = [
  { value: '기능 요구사항', label: '기능 요구사항' },
  { value: '비기능 요구사항', label: '비기능 요구사항' },
  { value: '인터페이스 요구사항', label: '인터페이스 요구사항' },
  { value: '데이터 요구사항', label: '데이터 요구사항' },
]

export default function RequirementsPage() {
  const router = useRouter()
  const { settings, documents, setDocument } = useStore()

  const [useMinutes, setUseMinutes] = useState(true)
  const [directInput, setDirectInput] = useState('')
  const [extra, setExtra] = useState('')
  const [categories, setCategories] = useState(['기능 요구사항', '비기능 요구사항'])
  const [minutesDismissed, setMinutesDismissed] = useState(false)

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasMinutes = !!documents.minutes && !minutesDismissed

  function toggleCategory(val: string) {
    setCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    )
  }

  async function handleGenerate() {
    if (!settings.apiKey) {
      setError('API Key가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.')
      return
    }
    if (!hasMinutes && !directInput.trim()) return

    setLoading(true)
    setError('')
    setResult('')

    try {
      const { system, user } = buildRequirementsPrompt({
        minutes: useMinutes && hasMinutes ? documents.minutes! : undefined,
        directInput: !useMinutes || !hasMinutes ? directInput : undefined,
        categories,
        extra,
        projectName: settings.projectName,
      })

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
    setDocument('requirements', result)
    router.push('/test-cases')
  }

  const canGenerate =
    !loading &&
    categories.length > 0 &&
    ((useMinutes && hasMinutes) || directInput.trim().length > 0)

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>📄</span> 요구사항 정의서 생성
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">회의록 또는 직접 입력을 기반으로 요구사항 정의서를 생성합니다.</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌: 입력 */}
        <div className="w-[45%] flex flex-col gap-4 overflow-auto">
          {/* 이전 문서 배너 */}
          {hasMinutes && (
            <ContextBanner
              label="이전 단계의 회의록이 연결되어 있습니다."
              onDismiss={() => setMinutesDismissed(true)}
            />
          )}

          <div className="card p-4 space-y-3">
            <p className="section-title">입력 방식</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  checked={useMinutes && hasMinutes}
                  onChange={() => setUseMinutes(true)}
                  disabled={!hasMinutes}
                  className="accent-brand-600"
                />
                <span className={`text-sm ${!hasMinutes ? 'text-gray-400' : 'text-gray-700'}`}>
                  회의록 기반 생성
                  {!hasMinutes && <span className="text-xs text-gray-400 ml-1">(회의록 없음)</span>}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  checked={!useMinutes || !hasMinutes}
                  onChange={() => setUseMinutes(false)}
                  className="accent-brand-600"
                />
                <span className="text-sm text-gray-700">직접 입력</span>
              </label>
            </div>

            {(!useMinutes || !hasMinutes) && (
              <textarea
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                placeholder="요구사항 도출에 필요한 내용을 자유롭게 입력하세요."
                className="input-field min-h-[150px] resize-none font-mono text-xs"
              />
            )}
          </div>

          <div className="card p-4 space-y-3">
            <p className="section-title">카테고리 선택</p>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat.value)}
                    onChange={() => toggleCategory(cat.value)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm text-gray-700">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <p className="section-title">추가 요구사항 메모 <span className="text-gray-400 font-normal normal-case">(선택)</span></p>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="회의록에 없는 추가 요구사항을 입력하세요."
              className="input-field min-h-[80px] resize-none text-sm"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary w-full justify-center py-3"
          >
            <Sparkles size={16} />
            요구사항 생성
          </button>
        </div>

        {/* 우: 결과 */}
        <div className="flex-1 card p-4 flex flex-col min-h-0">
          <p className="section-title mb-3">생성 결과</p>
          <DocumentResult
            content={result}
            filename="요구사항_정의서"
            isLoading={loading}
            onChange={setResult}
            extraActions={
              result
                ? [
                    {
                      label: '테스트 케이스로 이어서',
                      onClick: handleNext,
                      variant: 'primary',
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
