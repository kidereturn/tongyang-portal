export type QuizQuestion = {
  id: string
  type: 'multiple' | 'subjective'
  question: string
  choices?: string[]
  answer: string
  explanation: string
}

/** 내부회계 빙고퀴즈 문제 은행 (25+ 문제, 난이도 상) */
export const ALL_QUESTIONS: QuizQuestion[] = [
  // 객관식 22문제
  { id: 'q1', type: 'multiple', question: 'COSO 내부통제 프레임워크(2013)의 5가지 구성요소 중 "정보와 의사소통"에 해당하지 않는 항목은?', choices: ['관련성 있는 양질의 정보 확보', '내부통제 관련 정보의 내부 전달', '외부 이해관계자와의 정보 교환', '통제환경의 윤리적 가치 설정'], answer: '통제환경의 윤리적 가치 설정', explanation: '윤리적 가치 설정은 "통제환경" 구성요소에 해당합니다.' },
  { id: 'q2', type: 'multiple', question: '"중요한 취약점"과 "유의적 미비점"을 구분하는 핵심 기준은?', choices: ['발견된 미비점의 개수', '재무제표 중요한 왜곡표시 가능성의 크기와 발생가능성', '미비점이 발견된 계정과목의 수', '통제활동 담당자의 직급'], answer: '재무제표 중요한 왜곡표시 가능성의 크기와 발생가능성', explanation: '중요한 취약점은 중요한 왜곡표시가 적시에 예방·발견되지 못할 합리적 가능성이 있는 경우입니다.' },
  { id: 'q3', type: 'multiple', question: '외감법에 따라 내부회계관리제도 "감사"가 의무화되는 회사 기준은?', choices: ['모든 주식회사', '자산총액 1천억 원 이상 상장회사', '자산총액 5천억 원 이상 상장회사부터 단계적 적용', '코스닥 상장회사 전체'], answer: '자산총액 5천억 원 이상 상장회사부터 단계적 적용', explanation: '외감법 개정에 따라 자산총액 5천억 원 이상부터 단계적으로 감사가 의무화되었습니다.' },
  { id: 'q4', type: 'multiple', question: '재무제표 경영진 주장 중 "발생"과 "완전성"의 관계로 올바른 것은?', choices: ['두 주장은 동일한 방향의 위험을 다룬다', '발생은 과대계상, 완전성은 과소계상 위험과 관련', '완전성은 자산 계정에만 적용', '발생은 부채 계정에만 적용'], answer: '발생은 과대계상, 완전성은 과소계상 위험과 관련', explanation: '발생은 기록된 거래가 실제 발생했는지(과대계상), 완전성은 모든 거래가 기록되었는지(과소계상)를 다룹니다.' },
  { id: 'q6', type: 'multiple', question: '직무분리(SoD)의 3가지 핵심 기능으로 올바르게 짝지어진 것은?', choices: ['기획-실행-보고', '승인(Authorization)-기록(Recording)-보관(Custody)', '계획-조직-통제', '입력-처리-출력'], answer: '승인(Authorization)-기록(Recording)-보관(Custody)', explanation: '직무분리는 거래의 승인, 회계기록, 자산보관 기능을 서로 다른 담당자가 수행하도록 합니다.' },
  { id: 'q7', type: 'multiple', question: 'IT 응용통제 중 "입력통제"에 해당하지 않는 것은?', choices: ['데이터 유효성 검사', '한도 점검', '마스터 데이터 변경 로그 감시', '중복 입력 방지'], answer: '마스터 데이터 변경 로그 감시', explanation: '마스터 데이터 변경 로그 감시는 ITGC 중 변경관리 영역에 해당합니다.' },
  { id: 'q8', type: 'multiple', question: '내부회계관리제도 운영실태 보고에서 경영진이 사용하는 평가 기준은?', choices: ['K-IFRS', '내부회계관리제도 설계 및 운영 개념체계(모범규준)', '기업회계기준서 제1001호', '감사기준서 제315호'], answer: '내부회계관리제도 설계 및 운영 개념체계(모범규준)', explanation: '경영진은 모범규준을 평가 기준으로 사용합니다.' },
  { id: 'q9', type: 'multiple', question: 'Walk-through 테스트의 주된 목적은?', choices: ['통제의 운영 효과성 통계적 검증', '거래 흐름 추적하여 통제 설계 적합성 확인', '재무제표 계정잔액 정확성 확인', '경영진 서면진술 신뢰성 검증'], answer: '거래 흐름 추적하여 통제 설계 적합성 확인', explanation: 'Walk-through는 거래의 개시부터 재무제표 반영까지 추적하여 통제 설계를 확인합니다.' },
  { id: 'q10', type: 'multiple', question: '"예방통제"와 "발견통제"의 조합이 올바른 것은?', choices: ['예방: 승인권한 매트릭스 / 발견: 월말 계정 대사', '예방: 은행잔고 조정표 / 발견: 접근권한 설정', '예방: 이상거래 모니터링 / 발견: 전자결재 승인', '예방: 내부감사 / 발견: 직무분리'], answer: '예방: 승인권한 매트릭스 / 발견: 월말 계정 대사', explanation: '승인권한 매트릭스는 사전 예방, 월말 계정 대사는 사후 발견 통제입니다.' },
  { id: 'q11', type: 'multiple', question: 'Top-down Risk Assessment에서 가장 먼저 수행하는 단계는?', choices: ['개별 통제활동의 운영 효과성 테스트', '유의적 계정과 공시항목 식별', '전표 표본 추출 및 검증', '통제활동 담당자 면담'], answer: '유의적 계정과 공시항목 식별', explanation: 'Top-down 접근법은 유의적 계정 식별 → 주장 파악 → 위험 평가 → 통제 식별 → 테스트 순서입니다.' },
  { id: 'q12', type: 'multiple', question: '부정 삼각형(Fraud Triangle)의 3가지 요소는?', choices: ['동기·기회·정당화', '이익·손실·위험', '계획·실행·은폐', '압력·통제·보상'], answer: '동기·기회·정당화', explanation: '동기/압력, 기회, 정당화/합리화 3요소가 동시에 존재할 때 부정이 발생합니다.' },
  { id: 'q13', type: 'multiple', question: '한국 외감법과 미국 SOX법의 차이점으로 올바른 것은?', choices: ['한국은 외부감사 의무가 없다', '한국은 "감사"로 전환 전까지 "검토" 수준이 허용되었다', 'SOX는 비상장회사에도 전면 적용', '한국은 COSO 사용을 금지'], answer: '한국은 "감사"로 전환 전까지 "검토" 수준이 허용되었다', explanation: '한국은 기존 "검토" 수준에서 단계적으로 "감사" 수준으로 강화되었습니다.' },
  { id: 'q14', type: 'multiple', question: '"경영진 무력화(Management Override)"에 대한 설명으로 가장 적절한 것은?', choices: ['경영진이 통제를 강화하는 행위', '경영진이 자신의 권한으로 기존 통제를 우회하는 위험', '외부감사인이 경영진 판단을 번복하는 상황', '이사회가 경영진을 교체하는 절차'], answer: '경영진이 자신의 권한으로 기존 통제를 우회하는 위험', explanation: '경영진 무력화는 모든 감사에서 유의적 위험으로 추정됩니다.' },
  { id: 'q15', type: 'multiple', question: 'PCAOB AS 2201의 "통합감사(Integrated Audit)"란?', choices: ['내부감사와 외부감사 동시 수행', '재무제표 감사와 내부통제 감사를 하나로 통합 수행', '모든 해외 자회사 포함 연결감사', 'IT 감사와 업무 감사를 통합'], answer: '재무제표 감사와 내부통제 감사를 하나로 통합 수행', explanation: '통합감사는 재무제표 감사와 ICFR 감사를 하나의 프로세스로 수행하는 것입니다.' },
  { id: 'q16', type: 'multiple', question: 'ITGC 4대 영역에 해당하지 않는 것은?', choices: ['프로그램 개발', '프로그램 변경', '데이터 분석', '접근 보안'], answer: '데이터 분석', explanation: 'ITGC 4대 영역은 프로그램 개발, 변경, 컴퓨터 운영, 접근 보안입니다.' },
  { id: 'q17', type: 'multiple', question: '자동화된 통제가 수동통제에 비해 갖는 장점은?', choices: ['설계 변경이 용이', '일관되게 작동하여 인적 오류 위험이 낮다', '별도 ITGC 불필요', '감사 증거 확보 불필요'], answer: '일관되게 작동하여 인적 오류 위험이 낮다', explanation: '자동화 통제는 프로그래밍대로 일관 작동하여 인적 오류가 낮지만, ITGC가 뒷받침되어야 합니다.' },
  { id: 'q18', type: 'multiple', question: '통제 수행 빈도가 "매일 1회"인 경우 일반 권장 최소 표본 크기는?', choices: ['5건', '15건', '25건', '40건'], answer: '25건', explanation: '매일 수행 통제 테스트 표본은 일반적으로 25건이 권장됩니다.' },
  { id: 'q19', type: 'multiple', question: '내부통제 미비점 심각도 평가 시 고려하는 두 가지 핵심 차원은?', choices: ['비용과 효과', '발생가능성과 영향크기', '빈도와 기간', '설계와 운영'], answer: '발생가능성과 영향크기', explanation: '미비점 심각도는 왜곡표시 발생가능성과 영향크기를 종합하여 평가합니다.' },
  { id: 'q20', type: 'multiple', question: 'SOC 1 보고서에 대한 올바른 설명은?', choices: ['보안 취약점 진단 보고서', '서비스 조직 내부통제가 위탁기업 재무보고에 미치는 영향 평가 보고서', '개인정보보호 인증 보고서', 'ESG 평가 보고서'], answer: '서비스 조직 내부통제가 위탁기업 재무보고에 미치는 영향 평가 보고서', explanation: 'SOC 1 보고서는 서비스 조직의 내부통제가 이용기업의 재무보고 내부통제에 미치는 영향을 다룹니다.' },
  { id: 'q21', type: 'multiple', question: '"간접적 기업수준통제(Indirect ELC)"의 특징은?', choices: ['거래수준통제를 완전히 대체', '특정 주장에 직접 대응', '다른 통제의 효과적 운영을 감시하는 역할', '연 1회만 테스트'], answer: '다른 통제의 효과적 운영을 감시하는 역할', explanation: '간접적 ELC는 다른 거래수준통제가 효과적으로 운영되는지 감시·지원합니다.' },
  { id: 'q22', type: 'multiple', question: '통제활동의 "정밀도(Precision)"란?', choices: ['통제 수행 빈도', '왜곡표시를 감지할 수 있는 임계값 수준', '통제 담당자 전문성', '자동/수동 통제 비율'], answer: '왜곡표시를 감지할 수 있는 임계값 수준', explanation: '정밀도가 높을수록 작은 규모의 왜곡표시까지 감지할 수 있습니다.' },
  // 주관식 5문제
  { id: 'sub1', type: 'subjective', question: 'COSO 내부통제 프레임워크의 5가지 구성요소 중 나머지 4개의 기반이 되는 가장 근본적인 구성요소를 한글로 적어주세요. (4글자)', answer: '통제환경', explanation: '통제환경은 조직의 윤리적 가치, 거버넌스 등을 포함하며 나머지 4개 구성요소의 기반입니다.' },
  { id: 'sub2', type: 'subjective', question: '통제 미비점을 보완하기 위해 별도로 설계된 대체 통제를 영문으로 적어주세요. (OO Control, 13자)', answer: 'Compensating Control', explanation: 'Compensating Control(보완통제)은 주요 통제의 부재를 보완하는 대체 통제입니다.' },
  { id: 'sub3', type: 'subjective', question: '일정 주기(일/주/월/분기)마다 수행되는 검토성 통제를 무엇이라 하는가? (한글 5글자)', answer: '주기적통제', explanation: '주기적통제는 정해진 주기로 수행되는 모니터링성 통제입니다.' },
  { id: 'sub4', type: 'subjective', question: '재무제표의 거래에 대한 경영진 주장 중, 기록된 금액이 적절하게 측정되었는지를 다루는 주장은? (한글 3글자)', answer: '정확성', explanation: '정확성(Accuracy) 주장은 거래 금액과 관련 데이터가 정확하게 기록되었는지를 다룹니다.' },
  { id: 'sub5', type: 'subjective', question: '계정잔액에 대한 경영진 주장 중, 자산/부채가 적절한 금액으로 측정되었는지를 다루는 주장은? (한글 2글자)', answer: '평가', explanation: '평가(Valuation)는 자산·부채가 적절한 금액으로 기록되었는지를 다룹니다.' },
]
