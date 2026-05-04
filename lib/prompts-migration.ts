export interface MigrationInput {
  projectName: string
  sourceSystem: string
  targetSystem: string
  moduleName: string
  requirements: string
  extra?: string
}

export interface MappingRow {
  sourceTable: string
  sourceField: string
  sourceType: string
  targetTable: string
  targetField: string
  targetType: string
  transformRule: string
  note: string
}

export interface CleansingRule {
  targetField: string
  condition: string
  action: string
  example: string
}

export interface MigrationPhase {
  phase: string
  task: string
  responsible: string
  note: string
}

export interface MigrationOutput {
  overview: string
  strategy: string
  mappings: MappingRow[]
  cleansingRules: CleansingRule[]
  phases: MigrationPhase[]
}

export function buildMigrationPrompt(input: MigrationInput) {
  const system = `당신은 HR 시스템 구축 프로젝트의 시니어 데이터 마이그레이션 전문가입니다.
요구사항과 시스템 정보를 분석하여 데이터 마이그레이션 설계서를 JSON 형식으로 작성합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력합니다.

{
  "overview": "마이그레이션 개요 (2-3문장)",
  "strategy": "전환 전략 설명 (단계별 전환 방식, 검증 방법 등)",
  "mappings": [
    {
      "sourceTable": "소스 테이블명",
      "sourceField": "소스 필드명",
      "sourceType": "VARCHAR(50)",
      "targetTable": "타겟 테이블명",
      "targetField": "타겟 필드명",
      "targetType": "VARCHAR(100)",
      "transformRule": "직접이관 또는 변환규칙 설명",
      "note": "특이사항"
    }
  ],
  "cleansingRules": [
    {
      "targetField": "대상 필드명",
      "condition": "클렌징 조건",
      "action": "처리 방법",
      "example": "예시"
    }
  ],
  "phases": [
    {
      "phase": "1단계",
      "task": "수행 업무",
      "responsible": "담당",
      "note": "비고"
    }
  ]
}

작성 규칙:
- HR 도메인 특화: 사원번호(EMPNO/EMP_ID), 부서코드(DEPT_CD), 급여(SAL), 입사일(HIRE_DT) 등 현업 필드명 사용
- mappings: 최소 15개 이상의 핵심 필드 매핑 포함
- transformRule: "직접이관", "코드변환(A→1)", "날짜형식변환(YYYYMMDD→YYYY-MM-DD)", "NULL처리(공백→'N')" 등 구체적으로
- cleansingRules: 최소 5개 이상
- phases: 분석→매핑검증→테스트이관→본이관→검증 5단계 이상
- 복리후생 모듈이면 학자금, 경조금, 건강검진, 장기근속 등 관련 테이블 포함`

  const user = `아래 정보를 바탕으로 데이터 마이그레이션 설계서 JSON을 작성해주세요.

**프로젝트:** ${input.projectName}
**소스 시스템:** ${input.sourceSystem}
**타겟 시스템:** ${input.targetSystem}
**모듈:** ${input.moduleName}

**요구사항 및 참고사항:**
${input.requirements}

${input.extra ? `**추가 지시사항:** ${input.extra}` : ''}

소스→타겟 필드 매핑을 최대한 상세하게 작성하고, 데이터 클렌징 규칙과 전환 단계를 포함해주세요.`

  return { system, user }
}
