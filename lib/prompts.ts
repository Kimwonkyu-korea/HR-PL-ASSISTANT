export interface InterviewResultInput {
  projectName: string
  date: string
  location: string
  attendees: string[]
  moderator: string
  recorder: string
  agenda: string
  memo: string
  extra?: string
}

export interface MinutesInput {
  projectName: string
  date: string
  location: string
  attendees: string[]
  memo: string
  extra?: string
}

export interface RequirementsInput {
  minutes?: string
  directInput?: string
  categories: string[]
  extra?: string
  projectName: string
}

export interface TestCasesInput {
  requirements: string
  selectedFunctions: string[]
  caseTypes: string[]
  testEnv?: string
  projectName: string
}

// ─── 회의록 ───────────────────────────────────────────────
export function buildMinutesPrompt(input: MinutesInput) {
  const system = `당신은 HR 시스템 구축 프로젝트 전문 회의록 작성자입니다.
회의 메모를 받아 깔끔하고 구조화된 회의록을 작성합니다.
반드시 마크다운 형식으로 작성하고, 다음 섹션을 포함하세요:
1. 회의 개요 (테이블)
2. 주요 논의사항 (번호 목록)
3. 결정사항 (불릿)
4. 액션아이템 (| 담당자 | 내용 | 기한 | 완료여부 | 테이블)
HR 도메인 용어를 정확하게 사용하세요.`

  const user = `다음 회의 정보로 회의록을 작성해주세요.

**프로젝트:** ${input.projectName || '미지정'}
**일시:** ${input.date}
**장소:** ${input.location}
**참석자:** ${input.attendees.join(', ')}

**회의 메모:**
${input.memo}

${input.extra ? `**추가 지시사항:** ${input.extra}` : ''}`

  return { system, user }
}

// ─── 요구사항 정의서 ──────────────────────────────────────
// ─── 인터뷰결과서 (Excel 양식 출력용) ────────────────────────
export function buildInterviewResultPrompt(input: InterviewResultInput) {
  const system = `당신은 HR 시스템 구축 프로젝트 전문 분석가입니다.
인터뷰/회의 내용을 받아 인터뷰결과서 본문을 작성합니다.

다음 규칙을 반드시 따르세요:
- 번호가 붙은 항목별로 내용을 정리하세요 (예: 1. 학자금, 2. 급여 등)
- 각 항목 내에서 지급대상, 지급방식, 지급금액, 조건 등을 들여쓰기로 정리
- 확인사항은 마지막에 [확인사항] 으로 별도 정리
- HR 도메인 용어를 정확히 사용
- 원본 내용을 최대한 보존하되 누락 없이 구조화
- 마크다운 사용 금지, 순수 텍스트와 들여쓰기(탭, 화살표 →, >) 만 사용`

  const user = `다음 인터뷰/회의 내용을 인터뷰결과서 본문으로 정리해주세요.

**프로젝트:** ${input.projectName || '미지정'}
**일시:** ${input.date}
**장소:** ${input.location}
**안건:** ${input.agenda}
**참석자:** ${input.attendees.join(', ')}

**인터뷰 내용:**
${input.memo}

${input.extra ? `**추가 지시사항:** ${input.extra}` : ''}`

  return { system, user }
}

export function buildRequirementsPrompt(input: RequirementsInput) {
  const categoryList = input.categories.join(', ')

  const system = `당신은 HR 시스템 구축 프로젝트 전문 BA(비즈니스 분석가)입니다.
입력된 내용을 분석하여 ${categoryList} 요구사항 정의서를 작성합니다.
마크다운 형식으로 작성하며, 각 카테고리별로 다음 테이블 형식을 사용하세요:
| 요구사항ID | 구분 | 요구사항명 | 상세 설명 | 우선순위 | 비고 |
요구사항ID는 기능: F-001, 비기능: N-001, 인터페이스: I-001, 데이터: D-001 형식으로 부여하세요.
우선순위는 상/중/하로 표기하세요.
HR 도메인(인사, 급여, 근태, 평가, 채용, 복리후생 등)에 특화된 요구사항을 도출하세요.`

  const source = input.minutes
    ? `**이전 회의록:**\n${input.minutes}`
    : `**직접 입력 내용:**\n${input.directInput}`

  const user = `다음 내용을 기반으로 요구사항 정의서를 작성해주세요.

**프로젝트:** ${input.projectName || '미지정'}
**작성할 카테고리:** ${categoryList}

${source}

${input.extra ? `**추가 요구사항:** ${input.extra}` : ''}`

  return { system, user }
}

// ─── 테스트 케이스 ────────────────────────────────────────
export function buildTestCasesPrompt(input: TestCasesInput) {
  const system = `당신은 HR 시스템 구축 프로젝트 QA 전문가입니다.
요구사항을 분석하여 ${input.caseTypes.join(', ')} 테스트 케이스를 작성합니다.
마크다운 테이블 형식으로 작성하며, 다음 컬럼을 사용하세요:
| TC-ID | 요구사항ID | 테스트 항목 | 테스트 유형 | 사전 조건 | 입력값/실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail |
실제 결과와 Pass/Fail은 빈 칸으로 두세요 (테스터가 기입).
TC-ID는 TC-001 형식으로 순번 부여하세요.
HR 시스템 특성(권한별 접근, 기간 계산, 이력 관리 등)을 고려한 케이스를 포함하세요.`

  const user = `다음 요구사항을 기반으로 테스트 케이스를 작성해주세요.

**프로젝트:** ${input.projectName || '미지정'}
**테스트 대상 기능:** ${input.selectedFunctions.join(', ')}
**테스트 케이스 유형:** ${input.caseTypes.join(', ')}
${input.testEnv ? `**테스트 환경:** ${input.testEnv}` : ''}

**요구사항 정의서:**
${input.requirements}`

  return { system, user }
}
