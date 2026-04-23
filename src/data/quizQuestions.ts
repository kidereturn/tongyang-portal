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
  // 추가 객관식 30문제 (pool 확대)
  { id: 'q23', type: 'multiple', question: '내부회계관리제도 운영보고서의 작성·제출 의무자는?', choices: ['외부감사인', '이사회 의장', '대표이사(CEO)', '내부감사팀장'], answer: '대표이사(CEO)', explanation: '외감법에 따라 대표이사가 운영실태 보고서를 주주총회에 보고합니다.' },
  { id: 'q24', type: 'multiple', question: '다음 중 "예방통제"에 해당하는 것은?', choices: ['월말 계정 조정', '사후 감사', '시스템 접근권한 통제', '결산 후 분석'], answer: '시스템 접근권한 통제', explanation: '접근권한 통제는 사전에 오류/부정을 예방하는 통제입니다.' },
  { id: 'q25', type: 'multiple', question: 'RCM(Risk Control Matrix)의 주요 구성요소가 아닌 것은?', choices: ['프로세스', '위험', '통제활동', '회계장부 번호'], answer: '회계장부 번호', explanation: 'RCM 은 프로세스·위험·통제·주장·빈도·유형 등으로 구성됩니다.' },
  { id: 'q26', type: 'multiple', question: '"유의적 계정(Significant Account)" 선정 기준에 해당하지 않는 것은?', choices: ['계정잔액의 크기', '거래량과 복잡성', '주관적 판단 개입', '담당자 나이'], answer: '담당자 나이', explanation: '유의적 계정은 계정 특성·위험성 기반으로 선정합니다.' },
  { id: 'q27', type: 'multiple', question: '다음 중 "자동화된 통제"에 해당하는 것은?', choices: ['월별 팀장 승인서명', '시스템 자동 한도 점검', '수기 계정 대사', '구두 승인'], answer: '시스템 자동 한도 점검', explanation: '자동화 통제는 시스템이 규칙에 따라 자동 실행하는 통제입니다.' },
  { id: 'q28', type: 'multiple', question: 'COSO Cube 의 3축 중 가장 하단에 위치한 축은?', choices: ['조직 단위', '통제목적', '구성요소', '업무주기'], answer: '조직 단위', explanation: 'COSO Cube는 통제목적(상), 구성요소(측), 조직단위(하) 3축 입체구조입니다.' },
  { id: 'q29', type: 'multiple', question: '중요한 취약점(Material Weakness) 발견 시 외부감사인의 의견으로 올바른 것은?', choices: ['적정의견', '한정의견', '부적정의견', '의견거절'], answer: '부적정의견', explanation: '중요한 취약점이 존재하면 내부회계관리제도 감사의견은 "부적정"이 됩니다.' },
  { id: 'q30', type: 'multiple', question: '다음 중 "전사수준통제(ELC)"에 해당하지 않는 것은?', choices: ['이사회 감독', '윤리강령 운영', '개별 전표 증빙 확인', '위험평가 체계'], answer: '개별 전표 증빙 확인', explanation: '개별 전표 증빙은 거래수준통제(TLC)에 해당합니다.' },
  { id: 'q31', type: 'multiple', question: '모집단(Population)과 표본(Sample)의 관계로 올바른 것은?', choices: ['모집단 = 표본', '표본은 모집단의 일부', '표본은 모집단과 무관', '표본이 모집단보다 크다'], answer: '표본은 모집단의 일부', explanation: '모집단 전수검증이 어려워 표본을 추출하여 테스트합니다.' },
  { id: 'q32', type: 'multiple', question: '통제 유효성 평가 시 "설계의 효과성"과 "운영의 효과성" 중 먼저 평가하는 것은?', choices: ['운영의 효과성', '설계의 효과성', '동시에 평가', '고객사 선택'], answer: '설계의 효과성', explanation: '설계가 부적절하면 운영 테스트가 의미 없으므로 설계를 먼저 평가합니다.' },
  { id: 'q33', type: 'multiple', question: '내부회계관리자(CFO 등)의 책임이 아닌 것은?', choices: ['내부회계관리규정 제·개정', '외부감사인 선임', '운영실태 보고', '감사기구 보고'], answer: '외부감사인 선임', explanation: '외부감사인 선임은 감사위원회 또는 이사회의 책임입니다.' },
  { id: 'q34', type: 'multiple', question: '"업무분장(Segregation of Duties)"의 주 목적은?', choices: ['업무 효율 향상', '부정·오류 예방', '인건비 절감', '교육 강화'], answer: '부정·오류 예방', explanation: '한 사람이 승인·기록·보관을 모두 하지 못하게 하여 부정·오류를 예방합니다.' },
  { id: 'q35', type: 'multiple', question: 'ITGC 의 "접근보안" 영역에서 가장 중요한 원칙은?', choices: ['최대권한 원칙', '최소권한 원칙', '공유권한 원칙', '자동권한 원칙'], answer: '최소권한 원칙', explanation: '업무 수행에 필요한 최소한의 권한만 부여해야 합니다.' },
  { id: 'q36', type: 'multiple', question: '"Key Control"과 "Non-key Control"의 차이는?', choices: ['수행 빈도', '중요 주장을 다루는지 여부', '담당자 직급', '문서화 수준'], answer: '중요 주장을 다루는지 여부', explanation: 'Key Control 은 중요 재무보고 주장을 직접적으로 다루는 통제입니다.' },
  { id: 'q37', type: 'multiple', question: 'CoCo / COSO / CobIT 중 내부통제 프레임워크가 아닌 것은?', choices: ['COSO', 'CoCo', 'CobIT', 'ISO 27001'], answer: 'ISO 27001', explanation: 'ISO 27001은 정보보안관리 인증이며, 내부통제 프레임워크로는 COSO, CoCo, CobIT 등이 있습니다.' },
  { id: 'q38', type: 'multiple', question: '부정(Fraud)의 3대 유형에 해당하지 않는 것은?', choices: ['자산 횡령', '재무보고 부정', '부패', '직무 태만'], answer: '직무 태만', explanation: 'ACFE 는 부정을 자산 횡령, 재무보고 부정, 부패 3유형으로 구분합니다.' },
  { id: 'q39', type: 'multiple', question: '"Entity-Level Control" 의 예시로 가장 적절한 것은?', choices: ['매출 인식 통제', '급여 계산 통제', '윤리강령 및 내부고발 시스템', '재고 실사'], answer: '윤리강령 및 내부고발 시스템', explanation: 'ELC는 조직 전반의 통제환경·거버넌스 관련 통제입니다.' },
  { id: 'q40', type: 'multiple', question: '감사인이 통제 테스트에서 표본을 추출할 때 사용하지 않는 방법은?', choices: ['무작위 추출', '체계적 추출', '판단적 추출', '선호 기반 추출'], answer: '선호 기반 추출', explanation: '선호 기반 추출은 편향을 만들어 감사 원칙에 부적합합니다.' },
  { id: 'q41', type: 'multiple', question: '"Audit Trail"(감사증적)의 주요 목적은?', choices: ['사용자 편의', '거래의 추적 및 검증 가능성 확보', '시스템 속도 향상', '데이터 압축'], answer: '거래의 추적 및 검증 가능성 확보', explanation: '감사증적은 거래가 누구에 의해 언제 어떻게 처리되었는지 추적 가능하게 합니다.' },
  { id: 'q42', type: 'multiple', question: '재무보고의 신뢰성에 가장 직접적 영향을 주는 통제 유형은?', choices: ['운영 통제', '준법 통제', '재무보고 통제', '전략 통제'], answer: '재무보고 통제', explanation: '재무보고 통제(ICFR)가 재무제표 신뢰성을 직접 담보합니다.' },
  { id: 'q43', type: 'multiple', question: '"Top-down Approach" 에서 위험평가 대상으로 가장 중점을 두는 계정은?', choices: ['모든 계정 동일', '유의적 계정과 공시', '당기순이익', '현금'], answer: '유의적 계정과 공시', explanation: 'Top-down 접근은 유의적 계정과 공시에 집중해 위험을 평가합니다.' },
  { id: 'q44', type: 'multiple', question: '아래 중 "모니터링(Monitoring)" 활동의 예시는?', choices: ['승인권한 설정', '내부감사팀의 정기 점검', '업무 매뉴얼 작성', '시스템 구축'], answer: '내부감사팀의 정기 점검', explanation: '모니터링은 통제가 지속적으로 효과적인지 평가하는 활동입니다.' },
  { id: 'q45', type: 'multiple', question: '경영진이 작성하는 "내부회계관리제도 운영실태보고서" 의 보고 대상은?', choices: ['이사회·감사위원회·주주총회', '금융감독원', '국세청', '외부감사인만'], answer: '이사회·감사위원회·주주총회', explanation: '외감법에 따라 이사회·감사·주주총회에 보고합니다.' },
  { id: 'q46', type: 'multiple', question: '"SOC 2" 보고서의 주요 평가 기준(TSC) 에 해당하지 않는 것은?', choices: ['보안(Security)', '가용성(Availability)', '수익성(Profitability)', '기밀성(Confidentiality)'], answer: '수익성(Profitability)', explanation: 'SOC 2 TSC 5원칙은 Security, Availability, Processing Integrity, Confidentiality, Privacy 입니다.' },
  { id: 'q47', type: 'multiple', question: '"Root Cause Analysis" 의 목적은?', choices: ['형식적 보고서 작성', '미비점의 근본 원인 규명', '담당자 징계', '외부감사 비용 절감'], answer: '미비점의 근본 원인 규명', explanation: '미비점의 근본 원인을 규명하여 재발 방지 대책을 수립합니다.' },
  { id: 'q48', type: 'multiple', question: '외감법상 "중요성(Materiality)" 의 일반적 수치 기준은?', choices: ['매출액의 0.1%', '세전이익의 5%', '자산총액의 10%', '순자산의 20%'], answer: '세전이익의 5%', explanation: '일반적으로 연속기업의 세전이익 5% 또는 자산총액 0.5~1% 를 중요성 기준으로 사용합니다.' },
  { id: 'q49', type: 'multiple', question: '"Management Override" 위험에 대한 감사인의 대응으로 가장 적절한 것은?', choices: ['경영진에게 자체 점검 요청', '수정분개 테스트 및 비정상 거래 조사', '감사 생략', '외부 컨설턴트 고용'], answer: '수정분개 테스트 및 비정상 거래 조사', explanation: '감사인은 수정분개 테스트, 추정 편향 분석, 비정상 거래 조사로 대응합니다.' },
  { id: 'q50', type: 'multiple', question: '"Deficiency", "Significant Deficiency", "Material Weakness" 중 가장 심각한 것은?', choices: ['Deficiency', 'Significant Deficiency', 'Material Weakness', '세 가지 모두 동일'], answer: 'Material Weakness', explanation: 'Material Weakness(중요한 취약점) 가 가장 심각하며 감사의견에 직접 영향을 줍니다.' },
  { id: 'q51', type: 'multiple', question: '부정 위험 요소 중 "압력/동기" 에 해당하지 않는 것은?', choices: ['재무 목표 달성 압박', '개인 재정 문제', '보상 구조의 과도한 성과 연동', '충분한 내부 통제'], answer: '충분한 내부 통제', explanation: '내부 통제는 부정 기회를 차단하는 요소이지 압력이 아닙니다.' },
  { id: 'q52', type: 'multiple', question: '내부회계관리제도 평가 시 "Roll-forward" 테스트의 목적은?', choices: ['전년도 재무제표 재작성', '중간시점 테스트 결과를 기말까지 연장하여 결론', '표본 수 절감', '외부감사 비용 절감만'], answer: '중간시점 테스트 결과를 기말까지 연장하여 결론', explanation: '중간시점 테스트 이후 기말까지의 통제 유효성을 확인하는 절차입니다.' },
  // 주관식 5문제 (bingo 에서는 제거, 강좌 퀴즈에서 활용 가능)
  { id: 'sub1', type: 'subjective', question: 'COSO 내부통제 프레임워크의 5가지 구성요소 중 나머지 4개의 기반이 되는 가장 근본적인 구성요소를 한글로 적어주세요. (4글자)', answer: '통제환경', explanation: '통제환경은 조직의 윤리적 가치, 거버넌스 등을 포함하며 나머지 4개 구성요소의 기반입니다.' },
  { id: 'sub2', type: 'subjective', question: '통제 미비점을 보완하기 위해 별도로 설계된 대체 통제를 영문으로 적어주세요. (OO Control, 13자)', answer: 'Compensating Control', explanation: 'Compensating Control(보완통제)은 주요 통제의 부재를 보완하는 대체 통제입니다.' },
  { id: 'sub3', type: 'subjective', question: '일정 주기(일/주/월/분기)마다 수행되는 검토성 통제를 무엇이라 하는가? (한글 5글자)', answer: '주기적통제', explanation: '주기적통제는 정해진 주기로 수행되는 모니터링성 통제입니다.' },
  { id: 'sub4', type: 'subjective', question: '재무제표의 거래에 대한 경영진 주장 중, 기록된 금액이 적절하게 측정되었는지를 다루는 주장은? (한글 3글자)', answer: '정확성', explanation: '정확성(Accuracy) 주장은 거래 금액과 관련 데이터가 정확하게 기록되었는지를 다룹니다.' },
  { id: 'sub5', type: 'subjective', question: '계정잔액에 대한 경영진 주장 중, 자산/부채가 적절한 금액으로 측정되었는지를 다루는 주장은? (한글 2글자)', answer: '평가', explanation: '평가(Valuation)는 자산·부채가 적절한 금액으로 기록되었는지를 다룹니다.' },
]
