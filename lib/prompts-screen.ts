export interface ScreenSpecInput {
  projectName: string
  moduleName: string
  businessName: string
  requirements: string
  author: string
  date: string
  extra?: string
}

export function buildScreenSpecPrompt(input: ScreenSpecInput) {
  const system = `당신은 HR 시스템 구축 프로젝트의 시니어 프로그램 설계 전문가입니다.
아래 요구사항을 분석하여 프로그램 화면 정의서를 JSON 배열로 작성하세요.

【출력 규칙】
- JSON 배열만 출력. 설명 문장·\`\`\`json 태그 절대 금지.
- 예시는 형식 참고용입니다. 실제 업무 내용으로 새로 작성하세요.

【JSON 필드 설명】
- businessName: 업무 분류명 (예: 학자금관리)
- screenName: 실제 화면명 (예: 학자금기준관리)
- sourceNm: 모듈약어_업무약어 (예: WLF_SCHFEE)
- programId: 모듈약어+3자리숫자 (예: WLF001)
- screenDesc: 화면 한 줄 설명
- detailDesc: 상세설명 (아래 형식 준수)
  * 조회 조건
  ○ 필수선택: 항목명
  ○ 선택: 항목명

  * 항목정의
   - 컬럼명: 설명

  * 이벤트
    - 조회: 동작설명
    - 저장: 동작설명
- gridTitle: 그리드 제목 (예: ● 학자금기준 목록)
- gridColumns: 그리드 컬럼 배열 (최소 6개 이상, 실제 업무 항목으로)
  - header: 컬럼명 (* 붙이면 필수)
  - subHeader: 2행 헤더 (없으면 생략)
  - dataType: Number / VARCHAR(n) / DATE / popup / sabun/name / checkbox / Number(,) 중 선택
  - dbField: DB 컬럼명 (영문 대문자)
- relatedObjects: 관련 오브젝트 목록
- tableName: 주 테이블명과 설명
- tableColumns: DB 컬럼 배열 (반드시 12개 이상. 업무 컬럼 + 공통 컬럼 포함)
  - columnName: DB 컬럼명 (영문 대문자)
  - dataType: VARCHAR(n) / VARCHAR2(n) / NUMBER / DATE / NUMBER(p,s) 중 선택
  - nullable: PK·NOT NULL 항목은 "N", 선택 항목은 "Y"
  - defaultVal: 기본값 (없으면 "")
  - description: 한글 설명
  ※ ENTER_CD는 반드시 nullable="N" (PK 포함), 항상 마지막에 ENTER_CD / CHKDATE / CHKID 3개 추가
※ searchConditions 필드는 출력 금지. 조회조건은 별도 관리됩니다.

【참고 예시 - 학자금기준관리 화면】
아래는 참고용 예시입니다. 실제 요구사항에 맞게 컬럼을 새로 설계하세요.
[
  {
    "businessName": "학자금관리",
    "screenName": "학자금기준관리",
    "sourceNm": "WLF_SCHFEE",
    "programId": "WLF001",
    "screenDesc": "회사별 학교급별 학자금 지급기준 및 금액을 관리하는 화면",
    "detailDesc": "* 조회 조건\\n○ 필수선택: 기준년도, 회사코드\\n○ 선택: 학교급구분\\n\\n* 항목정의\\n - 기준년도: 학자금 지급 기준 연도\\n - 학교급구분: 유치원/초등/중고등/대학교\\n - 지급유형: 실비/정액/학력증진\\n - 지급금액: 회사별 지급 기준금액\\n - 지급주기: 월/분기/반기\\n - 지급월: 실제 지급 발생 월\\n\\n* 이벤트\\n  - 조회: 기준년도+회사코드로 기준 목록 조회\\n  - 저장: 신규/수정 기준 저장\\n  - 삭제: 선택 기준 삭제",
    "gridTitle": "● 학자금 지급기준 목록",
    "gridColumns": [
      { "header": "No", "dataType": "Number", "dbField": "NO" },
      { "header": "*기준년도", "dataType": "VARCHAR(4)", "dbField": "BASE_YEAR" },
      { "header": "*회사코드", "dataType": "popup", "dbField": "ENTER_CD" },
      { "header": "*학교급구분", "dataType": "popup", "dbField": "SCHOOL_GBN" },
      { "header": "지급유형", "dataType": "popup", "dbField": "PAY_TYPE" },
      { "header": "지급금액", "dataType": "Number(,)", "dbField": "PAY_AMT" },
      { "header": "지급주기", "dataType": "popup", "dbField": "PAY_CYCLE" },
      { "header": "지급월", "dataType": "VARCHAR(10)", "dbField": "PAY_MONTH" },
      { "header": "근속기준(년)", "dataType": "Number", "dbField": "SERVICE_YEAR" },
      { "header": "비고", "dataType": "text", "dbField": "REMARK" }
    ],
    "relatedObjects": "[테이블]\\n - WLF_SCHFEE_STD: 학자금기준\\n\\n[공통코드]\\n - SCHOOL_GBN: 학교급구분\\n - PAY_TYPE: 지급유형\\n - PAY_CYCLE: 지급주기\\n\\n[Procedure]\\n - SP_WLF_SCHFEE_STD_S: 학자금기준 조회",
    "tableName": "WLF_SCHFEE_STD / 학자금지급기준",
    "tableColumns": [
      { "columnName": "BASE_YEAR", "dataType": "VARCHAR(4)", "nullable": "N", "defaultVal": "", "description": "기준년도" },
      { "columnName": "ENTER_CD", "dataType": "VARCHAR(10)", "nullable": "N", "defaultVal": "", "description": "회사코드" },
      { "columnName": "SCHOOL_GBN", "dataType": "VARCHAR(2)", "nullable": "N", "defaultVal": "", "description": "학교급구분(01:유치원,02:중고,03:대학)" },
      { "columnName": "PAY_TYPE", "dataType": "VARCHAR(2)", "nullable": "N", "defaultVal": "", "description": "지급유형(01:실비,02:정액,03:학력증진)" },
      { "columnName": "PAY_AMT", "dataType": "NUMBER(15,2)", "nullable": "Y", "defaultVal": "0", "description": "지급금액" },
      { "columnName": "PAY_CYCLE", "dataType": "VARCHAR(2)", "nullable": "Y", "defaultVal": "", "description": "지급주기(01:월,02:분기,03:반기)" },
      { "columnName": "PAY_MONTH", "dataType": "VARCHAR(20)", "nullable": "Y", "defaultVal": "", "description": "지급월(복수: 콤마구분)" },
      { "columnName": "SERVICE_YEAR", "dataType": "NUMBER(2)", "nullable": "Y", "defaultVal": "2", "description": "지급대상 최소근속년수" },
      { "columnName": "DOMESTIC_YN", "dataType": "VARCHAR(1)", "nullable": "Y", "defaultVal": "Y", "description": "국내여부(Y:국내, N:해외)" },
      { "columnName": "MAX_AMT", "dataType": "NUMBER(15,2)", "nullable": "Y", "defaultVal": "", "description": "지급한도금액" },
      { "columnName": "REMARK", "dataType": "VARCHAR2(500)", "nullable": "Y", "defaultVal": "", "description": "비고" },
      { "columnName": "USE_YN", "dataType": "VARCHAR(1)", "nullable": "N", "defaultVal": "Y", "description": "사용여부" },
      { "columnName": "ENTER_CD", "dataType": "VARCHAR(10)", "nullable": "N", "defaultVal": "", "description": "회사구분" },
      { "columnName": "CHKDATE", "dataType": "DATE", "nullable": "N", "defaultVal": "SYSDATE", "description": "최종수정시간" },
      { "columnName": "CHKID", "dataType": "VARCHAR2(13)", "nullable": "N", "defaultVal": "", "description": "최종수정자" }
    ]
  }
]

위 예시 수준의 상세도로 실제 요구사항에 맞는 화면을 설계하세요.`

  const user = `아래 요구사항을 분석하여 프로그램 화면 정의서 JSON 배열을 작성해주세요.

**프로젝트:** ${input.projectName}
**모듈:** ${input.moduleName}
**업무:** ${input.businessName}

**요구사항:**
${input.requirements}

${input.extra ? `**추가 지시사항:** ${input.extra}\n` : ''}
JSON 배열로만 응답하세요. 각 요구사항 항목마다 화면을 생성하고 gridColumns·tableColumns를 실제 업무에 맞게 상세히 작성하세요.`

  return { system, user }
}
