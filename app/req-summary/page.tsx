'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, FileDown, ChevronDown, ChevronRight, X, Copy, Check, Monitor, ClipboardPaste, FileSpreadsheet, ImageIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { saveAs } from 'file-saver'
import type { ScreenDef, ScreenSpecData } from '@/lib/excel-screen-export'

interface CompanyGroup {
  name: string
  companies: string
  content: string
}

type CondType = 'combo' | 'popup' | 'text' | 'date' | 'date-range' | 'sabun/name'

interface SearchCond {
  label: string
  dataType: CondType
  required: boolean
  dbField: string
}

interface ScreenReq {
  id: string
  sectionId: string
  sectionName: string
  screenId: string
  screenName: string
  companyGroups: CompanyGroup[]
  toBe: string
  reqClass: string
  reviewNeeded: string
  searchConditions: SearchCond[]
  devType: string
  checkResult: string
  screenImage: string | null   // base64 data URL
  decisionDetail: string
}

const COND_TYPE_LABELS: Record<CondType, string> = {
  'combo': '콤보박스',
  'popup': '팝업',
  'text': '텍스트',
  'date': '날짜(단일)',
  'date-range': '날짜범위(from~to)',
  'sabun/name': '사번/이름',
}

const DEFAULT_CONDITIONS: SearchCond[] = []

const DEFAULT_GROUPS: CompanyGroup[] = [
  { name: 'PHC발레오', companies: 'PHC Valeo / VPHe', content: '' },
  { name: '평화발레오', companies: 'VPH / VPHC / VPHM / VPHT', content: '' },
  { name: '카펙발레오', companies: 'KV', content: '' },
]

const REQ_CLASSES = ['기본', '추가', '이슈', '논의']
const DEV_TYPES   = ['패키지 표준', '커스터마이징', '신규 개발', '개발 불가']
const CHK_RESULTS = ['수용', '개발불가', '정책결정', '범위외']

function newScreen(idx: number): ScreenReq {
  return {
    id: `screen-${Date.now()}-${idx}`,
    sectionId: 'E-HR.8',
    sectionName: '복리후생',
    screenId: '',
    screenName: '',
    companyGroups: DEFAULT_GROUPS.map(g => ({ ...g })),
    toBe: '',
    reqClass: '기본',
    reviewNeeded: '',
    searchConditions: DEFAULT_CONDITIONS.map(c => ({ ...c })),
    devType: '커스터마이징',
    checkResult: '수용',
    screenImage: null,
    decisionDetail: '',
  }
}

export default function ReqSummaryPage() {
  const { settings } = useStore()
  const [screens, setScreens] = useState<ScreenReq[]>([newScreen(0)])
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['screen-0']))
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // 화면정의서 JSON (per-screen)
  const [jsonInputs, setJsonInputs] = useState<Record<string, string>>({})
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})
  const [jsonExporting, setJsonExporting] = useState<string | null>(null)
  const [jsonGenerating, setJsonGenerating] = useState<string | null>(null)
  const [showJsonInput, setShowJsonInput] = useState<string | null>(null)
  const jsonPasteRefs  = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // 프로젝트 레벨 설정
  const [groupDefs, setGroupDefs] = useState<{ name: string; companies: string }[]>(
    DEFAULT_GROUPS.map(g => ({ name: g.name, companies: g.companies }))
  )
  const [showGroupEdit, setShowGroupEdit] = useState(false)

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addScreen() {
    const s = newScreen(screens.length)
    s.companyGroups = groupDefs.map(g => ({ name: g.name, companies: g.companies, content: '' }))
    // 이전 화면의 sectionId/sectionName 복사
    if (screens.length > 0) {
      const last = screens[screens.length - 1]
      s.sectionId = last.sectionId
      s.sectionName = last.sectionName
    }
    setScreens(prev => [...prev, s])
    setExpanded(prev => new Set([...prev, s.id]))
  }

  function removeScreen(id: string) {
    setScreens(prev => prev.filter(s => s.id !== id))
  }

  function updateScreen(id: string, field: keyof ScreenReq, value: string) {
    setScreens(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function handleImageUpload(screenId: string, file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setScreens(prev => prev.map(s => s.id !== screenId ? s : { ...s, screenImage: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  function addCondition(screenId: string) {
    setScreens(prev => prev.map(s => s.id !== screenId ? s : {
      ...s,
      searchConditions: [...s.searchConditions, { label: '', dataType: 'text' as CondType, required: false, dbField: '' }],
    }))
  }

  function removeCondition(screenId: string, idx: number) {
    setScreens(prev => prev.map(s => s.id !== screenId ? s : {
      ...s,
      searchConditions: s.searchConditions.filter((_, i) => i !== idx),
    }))
  }

  function updateCondition(screenId: string, idx: number, field: keyof SearchCond, value: string | boolean) {
    setScreens(prev => prev.map(s => s.id !== screenId ? s : {
      ...s,
      searchConditions: s.searchConditions.map((c, i) => i !== idx ? c : { ...c, [field]: value }),
    }))
  }

  function updateGroupContent(screenId: string, groupIdx: number, value: string) {
    setScreens(prev => prev.map(s => {
      if (s.id !== screenId) return s
      const groups = [...s.companyGroups]
      groups[groupIdx] = { ...groups[groupIdx], content: value }
      return { ...s, companyGroups: groups }
    }))
  }

  function applyGroupDefs() {
    setScreens(prev => prev.map(s => ({
      ...s,
      companyGroups: groupDefs.map((g, i) => ({
        name: g.name,
        companies: g.companies,
        content: s.companyGroups[i]?.content ?? '',
      }))
    })))
    setShowGroupEdit(false)
  }

  async function handleExport() {
    setGenerating(true)
    setError('')
    try {
      const payload = {
        projectName: settings.projectName || '미지정',
        module: screens[0]?.sectionName || '복리후생',
        author: settings.pmName || '',
        screens: screens.map((s, i) => ({
          ...s,
          pageNum: i + 1,
          totalPages: screens.length,
          devType:        s.devType,
          checkResult:    s.checkResult,
          screenImage:    s.screenImage,
          decisionDetail: s.decisionDetail,
        })),
      }
      const res = await fetch('/api/export/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'PPTX 생성 실패')
      }
      const blob = await res.blob()
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const module = screens[0]?.sectionName || '복리후생'
      saveAs(blob, `요구사항정의_${module}_v1.0_${today}.pptx`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '생성 실패')
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  function buildScreenSpecPrompt(scr: ScreenReq): string {
    const reqText = scr.companyGroups
      .map(g => `[${g.name} (${g.companies})]\n${g.content || '(없음)'}`)
      .join('\n\n')

    return `당신은 HR 시스템 구축 프로젝트의 시니어 프로그램 설계 전문가입니다.
아래 요구사항을 분석하여 프로그램 화면 정의서를 JSON 배열로 작성하세요.

【출력 규칙】
- JSON 배열만 출력. 설명 문장·\`\`\`json 태그 절대 금지.
- 예시는 형식 참고용입니다. 실제 업무 내용으로 새로 작성하세요.

【JSON 필드 설명】
- businessName: 업무 분류명
- screenName: 실제 화면명
- sourceNm: 모듈약어_업무약어 (예: WLF_SCHFEE)
- programId: 모듈약어+3자리숫자 (예: WLF001)
- screenDesc: 화면 한 줄 설명
- detailDesc: "* 조회 조건\\n○ 필수선택: 항목명\\n\\n* 항목정의\\n - 컬럼명: 설명\\n\\n* 이벤트\\n  - 조회/저장 동작"
- gridTitle: "● 화면명 목록"
- gridColumns: 최소 6개 이상 (실제 업무 항목)
  { "header": "컬럼명(*=필수)", "dataType": "Number/VARCHAR(n)/DATE/popup/checkbox", "dbField": "DB컬럼명" }
- relatedObjects: 관련 테이블/공통코드/Procedure 목록
- tableName: "테이블명 / 설명"
- tableColumns: 반드시 12개 이상 (업무 컬럼 + 마지막에 공통 3개)
  { "columnName": "DB컬럼명", "dataType": "타입", "nullable": "N또는Y", "defaultVal": "기본값", "description": "설명" }
  ※ ENTER_CD는 반드시 NOT NULL("N"), 항상 PK에 포함
  ※ 마지막 3개 필수: ENTER_CD(VARCHAR(10)/N/회사구분-PK), CHKDATE(DATE/N/SYSDATE/최종수정시간), CHKID(VARCHAR2(13)/N/최종수정자)
※ searchConditions 필드는 출력하지 마세요. 조회조건은 별도로 관리됩니다.

【참고 예시 - 학자금기준관리 화면 (이 예시 수준으로 상세히 작성할 것)】
[
  {
    "businessName": "학자금관리",
    "screenName": "학자금기준관리",
    "sourceNm": "WLF_SCHFEE",
    "programId": "WLF001",
    "screenDesc": "회사별 학교급별 학자금 지급기준 및 금액을 관리하는 화면",
    "detailDesc": "* 조회 조건\\n○ 필수선택: 기준년도, 회사코드\\n○ 선택: 학교급구분\\n\\n* 항목정의\\n - 기준년도: 학자금 지급 기준 연도\\n - 학교급구분: 유치원/중고등/대학교\\n - 지급유형: 실비/정액/학력증진\\n - 지급금액: 회사별 기준금액\\n - 지급주기: 월/분기/반기\\n\\n* 이벤트\\n  - 조회: 기준년도+회사코드로 목록 조회\\n  - 저장: 신규/수정 기준 저장\\n  - 삭제: 선택 기준 삭제",
    "gridTitle": "● 학자금 지급기준 목록",
    "gridColumns": [
      { "header": "No", "dataType": "Number", "dbField": "NO" },
      { "header": "*기준년도", "dataType": "VARCHAR(4)", "dbField": "BASE_YEAR" },
      { "header": "*학교급구분", "dataType": "popup", "dbField": "SCHOOL_GBN" },
      { "header": "지급유형", "dataType": "popup", "dbField": "PAY_TYPE" },
      { "header": "지급금액", "dataType": "Number(,)", "dbField": "PAY_AMT" },
      { "header": "지급주기", "dataType": "popup", "dbField": "PAY_CYCLE" },
      { "header": "지급월", "dataType": "VARCHAR(20)", "dbField": "PAY_MONTH" },
      { "header": "근속기준(년)", "dataType": "Number", "dbField": "SERVICE_YEAR" },
      { "header": "비고", "dataType": "text", "dbField": "REMARK" }
    ],
    "relatedObjects": "[테이블]\\n - WLF_SCHFEE_STD: 학자금기준\\n\\n[공통코드]\\n - SCHOOL_GBN: 학교급구분\\n - PAY_TYPE: 지급유형\\n\\n[Procedure]\\n - SP_WLF_SCHFEE_STD_S: 학자금기준 조회",
    "tableName": "WLF_SCHFEE_STD / 학자금지급기준",
    "tableColumns": [
      { "columnName": "BASE_YEAR", "dataType": "VARCHAR(4)", "nullable": "N", "defaultVal": "", "description": "기준년도" },
      { "columnName": "SCHOOL_GBN", "dataType": "VARCHAR(2)", "nullable": "N", "defaultVal": "", "description": "학교급구분" },
      { "columnName": "PAY_TYPE", "dataType": "VARCHAR(2)", "nullable": "N", "defaultVal": "", "description": "지급유형" },
      { "columnName": "PAY_AMT", "dataType": "NUMBER(15,2)", "nullable": "Y", "defaultVal": "0", "description": "지급금액" },
      { "columnName": "PAY_CYCLE", "dataType": "VARCHAR(2)", "nullable": "Y", "defaultVal": "", "description": "지급주기" },
      { "columnName": "PAY_MONTH", "dataType": "VARCHAR(20)", "nullable": "Y", "defaultVal": "", "description": "지급월" },
      { "columnName": "SERVICE_YEAR", "dataType": "NUMBER(2)", "nullable": "Y", "defaultVal": "2", "description": "최소근속년수" },
      { "columnName": "DOMESTIC_YN", "dataType": "VARCHAR(1)", "nullable": "Y", "defaultVal": "Y", "description": "국내여부" },
      { "columnName": "MAX_AMT", "dataType": "NUMBER(15,2)", "nullable": "Y", "defaultVal": "", "description": "지급한도금액" },
      { "columnName": "REMARK", "dataType": "VARCHAR2(500)", "nullable": "Y", "defaultVal": "", "description": "비고" },
      { "columnName": "USE_YN", "dataType": "VARCHAR(1)", "nullable": "N", "defaultVal": "Y", "description": "사용여부" },
      { "columnName": "ENTER_CD", "dataType": "VARCHAR(10)", "nullable": "N", "defaultVal": "", "description": "회사구분" },
      { "columnName": "CHKDATE", "dataType": "DATE", "nullable": "N", "defaultVal": "SYSDATE", "description": "최종수정시간" },
      { "columnName": "CHKID", "dataType": "VARCHAR2(13)", "nullable": "N", "defaultVal": "", "description": "최종수정자" }
    ]
  }
]

---

**화면ID:** ${scr.screenId || '(미입력)'}
**화면명:** ${scr.screenName || '(미입력)'}
**섹션:** ${scr.sectionId} ${scr.sectionName}

**TO-BE 설계 / 종합의견:**
${scr.toBe || '(없음)'}

**각사별 특화 요구사항:**
${reqText}

위 예시 수준의 상세도로 실제 요구사항에 맞는 화면을 설계하고 JSON 배열로 응답하세요.`
  }

  async function generateScreenSpecJson(scr: ScreenReq) {
    const prompt = buildScreenSpecPrompt(scr)
    const hasApi = !!(settings.claudeApiKey || settings.apiKey)

    // Claude API 키가 있으면 자동 생성, 없으면 클립보드 복사 후 수동 입력
    if (!settings.claudeApiKey) {
      navigator.clipboard.writeText(prompt)
      setCopied(`spec-${scr.id}`)
      setTimeout(() => setCopied(null), 2000)
      setShowJsonInput(scr.id)
      setJsonErrors(prev => ({ ...prev, [scr.id]: '' }))
      setTimeout(() => {
        const ta = jsonPasteRefs.current[scr.id]
        if (ta) { ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); ta.focus() }
      }, 100)
      return
    }

    // Claude API 자동 생성
    setJsonGenerating(scr.id)
    setJsonErrors(prev => ({ ...prev, [scr.id]: '' }))
    setShowJsonInput(scr.id)
    setJsonInputs(prev => ({ ...prev, [scr.id]: '' }))

    try {
      const res = await fetch('/api/generate/screen-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, claudeApiKey: settings.claudeApiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '생성 실패')
      setJsonInputs(prev => ({ ...prev, [scr.id]: data.json }))
      await handleScreenSpecExcel(scr, data.json)
    } catch (e: unknown) {
      navigator.clipboard.writeText(prompt).catch(() => {})
      setJsonErrors(prev => ({
        ...prev,
        [scr.id]: `생성 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}\n프롬프트가 클립보드에 복사되었습니다.`,
      }))
    } finally {
      setJsonGenerating(null)
    }
  }

  async function handleScreenSpecExcel(scr: ScreenReq, rawOverride?: string) {
    const raw = rawOverride ?? jsonInputs[scr.id] ?? ''
    setJsonErrors(prev => ({ ...prev, [scr.id]: '' }))
    let parsed: ScreenDef[]
    try {
      const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const match = stripped.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('JSON 배열을 찾을 수 없습니다.')
      parsed = JSON.parse(match[0]) as ScreenDef[]
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('빈 배열입니다.')
    } catch (e: unknown) {
      setJsonErrors(prev => ({
        ...prev,
        [scr.id]: e instanceof Error ? e.message : 'JSON 파싱 오류',
      }))
      return
    }

    // UI에서 설정한 조회조건으로 강제 교체 + detailDesc 조회조건 섹션 갱신
    const uiConds = scr.searchConditions
    const condDetailLine = uiConds.length > 0
      ? '* 조회 조건\n' +
        uiConds.map(c => `○ ${c.required ? '[필수] ' : ''}${c.label}`).join('\n')
      : ''

    const screensWithUiConds = parsed.map(s => {
      // detailDesc에서 기존 "* 조회 조건" 섹션을 UI 조건으로 교체
      let detail = s.detailDesc || ''
      if (condDetailLine) {
        // 기존 조회조건 섹션 제거 후 맨 앞에 삽입
        detail = detail.replace(/\*\s*조회\s*조건[\s\S]*?(?=\n\*|\n\n\*|$)/, '').trim()
        detail = condDetailLine + '\n\n' + detail
      }
      return {
        ...s,
        detailDesc: detail,
        searchConditions: uiConds,  // AI JSON의 searchConditions 완전 무시
      }
    })

    setJsonExporting(scr.id)
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.')
      const data: ScreenSpecData = {
        projectName: settings.projectName || '미지정',
        moduleName: scr.sectionName || '복리후생',
        authorCompany: settings.clientName || '',
        documentNumber: '',
        version: 'V 1.0',
        date: today,
        author: settings.pmName || '',
        screens: screensWithUiConds,
      }
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
      saveAs(blob, `프로그램 화면 정의서_${data.moduleName}_${today}.xlsx`)
      setJsonInputs(prev => ({ ...prev, [scr.id]: '' }))
      setShowJsonInput(null)
    } catch (e: unknown) {
      setJsonErrors(prev => ({
        ...prev,
        [scr.id]: e instanceof Error ? e.message : 'Excel 생성 실패',
      }))
    } finally {
      setJsonExporting(null)
    }
  }

  const groupCount = groupDefs.length

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span> 요구사항 취합 & 종합의견
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            각사별 특화내용과 종합의견을 입력하면 PPTX로 자동 생성합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGroupEdit(v => !v)} className="btn-secondary text-sm">
            회사그룹 설정
          </button>
          <button onClick={handleExport} disabled={generating || screens.length === 0}
            className="btn-primary text-sm">
            <FileDown size={15} />
            {generating ? 'PPTX 생성 중...' : 'PPTX 다운로드'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* 회사 그룹 설정 */}
      {showGroupEdit && (
        <div className="card p-4 space-y-3 bg-blue-50 border border-blue-200">
          <p className="section-title text-blue-700">회사 그룹 설정</p>
          <p className="text-xs text-blue-600">그룹명과 소속사를 수정하면 모든 화면에 적용됩니다.</p>
          {groupDefs.map((g, i) => (
            <div key={i} className="flex gap-2">
              <input value={g.name} onChange={e => setGroupDefs(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="그룹명" className="input-field w-40 text-sm" />
              <input value={g.companies} onChange={e => setGroupDefs(prev => prev.map((x, j) => j === i ? { ...x, companies: e.target.value } : x))}
                placeholder="소속사" className="input-field flex-1 text-sm" />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={applyGroupDefs} className="btn-primary text-sm">적용</button>
            <button onClick={() => setShowGroupEdit(false)} className="btn-secondary text-sm">취소</button>
          </div>
        </div>
      )}

      {/* 화면 목록 */}
      <div className="flex-1 overflow-auto space-y-3">
        {screens.map((scr, idx) => (
          <div key={scr.id} className="card overflow-hidden">
            {/* 화면 헤더 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <button onClick={() => toggleExpand(scr.id)} className="text-gray-400 hover:text-gray-600">
                {expanded.has(scr.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
              <input
                value={scr.screenId}
                onChange={e => updateScreen(scr.id, 'screenId', e.target.value)}
                placeholder="화면ID (예: E-HR.8.2.1)"
                className="input-field text-sm font-mono w-44 py-1"
              />
              <input
                value={scr.screenName}
                onChange={e => updateScreen(scr.id, 'screenName', e.target.value)}
                placeholder="화면명 (예: 학자금기준관리)"
                className="input-field text-sm flex-1 py-1"
              />
              <select
                value={scr.reqClass}
                onChange={e => updateScreen(scr.id, 'reqClass', e.target.value)}
                className="input-field text-sm w-20 py-1"
              >
                {REQ_CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={() => removeScreen(scr.id)} className="text-gray-300 hover:text-red-500 ml-1">
                <Trash2 size={15} />
              </button>
            </div>

            {/* 화면 상세 */}
            {expanded.has(scr.id) && (
              <div className="p-4 space-y-4">
                {/* 섹션 정보 */}
                <div className="flex gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">섹션ID</label>
                    <input value={scr.sectionId} onChange={e => updateScreen(scr.id, 'sectionId', e.target.value)}
                      placeholder="E-HR.8.2" className="input-field text-sm font-mono w-32" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">섹션명</label>
                    <input value={scr.sectionName} onChange={e => updateScreen(scr.id, 'sectionName', e.target.value)}
                      placeholder="복리후생" className="input-field text-sm" />
                  </div>
                </div>

                {/* 회사그룹별 특화내용 */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">각사별 특화내용</p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${groupCount}, 1fr)` }}>
                    {scr.companyGroups.map((grp, gi) => (
                      <div key={gi} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{grp.name}</span>
                          <span className="text-xs text-gray-400">{grp.companies}</span>
                        </div>
                        <div className="relative">
                          <textarea
                            value={grp.content}
                            onChange={e => updateGroupContent(scr.id, gi, e.target.value)}
                            placeholder={`${grp.name} 특화내용 붙여넣기`}
                            className="input-field min-h-[140px] resize-y font-mono text-xs w-full"
                          />
                          <button
                            onClick={() => copyToClipboard(grp.content, `${scr.id}-${gi}`)}
                            className="absolute top-1 right-1 p-1 text-gray-300 hover:text-gray-600"
                          >
                            {copied === `${scr.id}-${gi}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 조회조건 설정 */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-600">조회조건 설정
                      <span className="ml-2 font-normal text-gray-400">(Excel에 자동 반영)</span>
                    </p>
                    <button onClick={() => addCondition(scr.id)}
                      className="text-xs btn-secondary py-0.5 px-2 flex items-center gap-1">
                      <Plus size={11} /> 추가
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {scr.searchConditions.map((cond, ci) => (
                      <div key={ci} className="flex items-center gap-1.5">
                        {/* 타입 뱃지 */}
                        <select
                          value={cond.dataType}
                          onChange={e => updateCondition(scr.id, ci, 'dataType', e.target.value)}
                          className="input-field text-xs py-1 w-32 flex-shrink-0"
                        >
                          {(Object.entries(COND_TYPE_LABELS) as [CondType, string][]).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        {/* 레이블 */}
                        <input
                          value={cond.label}
                          onChange={e => updateCondition(scr.id, ci, 'label', e.target.value)}
                          placeholder="조건명 (예: 사업장)"
                          className="input-field text-xs py-1 w-28 flex-shrink-0"
                        />
                        {/* 필수 */}
                        <label className="flex items-center gap-1 text-xs text-gray-600 flex-shrink-0 cursor-pointer">
                          <input type="checkbox" checked={cond.required}
                            onChange={e => updateCondition(scr.id, ci, 'required', e.target.checked)}
                            className="w-3 h-3" />
                          필수
                        </label>
                        {/* 미리보기 뱃지 */}
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          cond.dataType === 'combo' ? 'bg-blue-100 text-blue-700' :
                          cond.dataType === 'popup' || cond.dataType === 'sabun/name' ? 'bg-purple-100 text-purple-700' :
                          cond.dataType === 'date' || cond.dataType === 'date-range' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {cond.dataType === 'combo' ? '▼' :
                           cond.dataType === 'popup' || cond.dataType === 'sabun/name' ? '🔍' :
                           cond.dataType === 'date' ? '📅' :
                           cond.dataType === 'date-range' ? '📅~📅' : 'T'}
                        </span>
                        <button onClick={() => removeCondition(scr.id, ci)}
                          className="text-gray-300 hover:text-red-500 flex-shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    {scr.searchConditions.length === 0 && (
                      <p className="text-xs text-gray-400 py-1">조회조건 없음 (+ 추가 버튼으로 추가)</p>
                    )}
                  </div>
                </div>

                {/* TO-BE / 종합의견 + 검토필요 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      패키지 현재 기능 (PPTX 좌측 이미지)
                    </label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center justify-center min-h-[100px] cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors relative overflow-hidden"
                      onClick={() => imageInputRefs.current[scr.id]?.click()}
                    >
                      {scr.screenImage ? (
                        <>
                          <img src={scr.screenImage} alt="screen" className="max-h-[140px] object-contain" />
                          <button
                            onClick={e => { e.stopPropagation(); setScreens(prev => prev.map(s => s.id !== scr.id ? s : { ...s, screenImage: null })) }}
                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 text-gray-400 hover:text-red-500 shadow"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={24} className="text-gray-300 mb-1" />
                          <span className="text-xs text-gray-400">클릭하여 이미지 첨부</span>
                        </>
                      )}
                      <input
                        ref={el => { imageInputRefs.current[scr.id] = el }}
                        type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(scr.id, f) }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      이수시스템 검토 의견 (PPTX 하단 좌측)
                    </label>
                    <textarea
                      value={scr.reviewNeeded}
                      onChange={e => updateScreen(scr.id, 'reviewNeeded', e.target.value)}
                      placeholder="이수시스템 검토 의견을 입력하세요."
                      className="input-field min-h-[100px] resize-none text-sm w-full"
                    />
                  </div>
                </div>

                {/* 최종 의사결정 선택 */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">최종 의사결정 <span className="font-normal text-gray-400">(PPTX 우측 하단에 반영)</span></p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">개발유형 (1개 선택)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DEV_TYPES.map(t => (
                          <label key={t} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                            scr.devType === t
                              ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                              : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                          }`}>
                            <input type="radio" name={`devType-${scr.id}`} value={t}
                              checked={scr.devType === t}
                              onChange={() => setScreens(prev => prev.map(s => s.id !== scr.id ? s : { ...s, devType: t }))}
                              className="hidden" />
                            {scr.devType === t && <Check size={10} />}
                            {t}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">검토결과 (1개 선택)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CHK_RESULTS.map(t => (
                          <label key={t} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                            scr.checkResult === t
                              ? 'bg-green-600 border-green-600 text-white font-semibold'
                              : 'bg-white border-gray-300 text-gray-600 hover:border-green-400'
                          }`}>
                            <input type="radio" name={`checkResult-${scr.id}`} value={t}
                              checked={scr.checkResult === t}
                              onChange={() => setScreens(prev => prev.map(s => s.id !== scr.id ? s : { ...s, checkResult: t }))}
                              className="hidden" />
                            {scr.checkResult === t && <Check size={10} />}
                            {t}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 mb-1 block">최종 의사결정 상세 의견</label>
                    <textarea
                      value={scr.decisionDetail}
                      onChange={e => setScreens(prev => prev.map(s => s.id !== scr.id ? s : { ...s, decisionDetail: e.target.value }))}
                      placeholder="최종 협의 내용, 추가 결정사항, 개발 범위 메모 등을 입력하세요."
                      className="input-field min-h-[72px] resize-none text-sm w-full"
                    />
                  </div>
                </div>

                {/* TO-BE는 숨김 (기존 데이터 유지용) */}

                {/* 화면정의서 자동생성 → Excel */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateScreenSpecJson(scr)}
                      disabled={
                        !scr.companyGroups.some(g => g.content.trim()) ||
                        jsonGenerating === scr.id
                      }
                      className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
                    >
                      <FileSpreadsheet size={13} />
                      {jsonGenerating === scr.id
                        ? <span className="animate-pulse">JSON 생성 중...</span>
                        : settings.claudeApiKey
                          ? '화면정의서 자동생성 → Excel'
                          : '프롬프트 복사 → JSON 붙여넣기 → Excel'}
                    </button>
                    {!settings.claudeApiKey && (
                      <span className="text-xs text-amber-600">Claude API 키 설정 시 자동생성</span>
                    )}
                    {showJsonInput === scr.id && (
                      <button
                        onClick={() => { setShowJsonInput(null); setJsonErrors(prev => ({ ...prev, [scr.id]: '' })) }}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {showJsonInput === scr.id && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                      {jsonGenerating === scr.id ? (
                        <p className="text-xs text-blue-600 animate-pulse">AI가 화면정의서를 설계하는 중입니다...</p>
                      ) : (
                        <p className="text-xs text-blue-700">
                          {(settings.claudeApiKey || settings.apiKey)
                            ? 'JSON이 자동으로 채워집니다. 내용 확인 후 Excel 다운로드하세요.'
                            : 'Claude.ai에서 받은 JSON 응답을 붙여넣고 Excel 다운로드하세요.'}
                        </p>
                      )}
                      <textarea
                        ref={el => { jsonPasteRefs.current[scr.id] = el }}
                        value={jsonInputs[scr.id] || ''}
                        onChange={e => setJsonInputs(prev => ({ ...prev, [scr.id]: e.target.value }))}
                        placeholder={jsonGenerating === scr.id ? '생성 중...' : '[\n  {\n    "screenName": "학자금기준관리",\n    ...\n  }\n]'}
                        readOnly={jsonGenerating === scr.id}
                        className="input-field min-h-[120px] resize-y font-mono text-xs w-full"
                      />
                      {jsonErrors[scr.id] && (
                        <p className="text-xs text-red-600 whitespace-pre-line">{jsonErrors[scr.id]}</p>
                      )}
                      <button
                        onClick={() => handleScreenSpecExcel(scr)}
                        disabled={!jsonInputs[scr.id]?.trim() || jsonExporting === scr.id || jsonGenerating === scr.id}
                        className="btn-primary text-sm w-full justify-center py-2 flex items-center gap-2"
                      >
                        <FileSpreadsheet size={15} />
                        {jsonExporting === scr.id ? 'Excel 생성 중...' : 'Excel 다운로드'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <button onClick={addScreen} className="btn-secondary w-full justify-center py-3 border-dashed">
          <Plus size={16} />
          화면 추가
        </button>
      </div>
    </div>
  )
}
