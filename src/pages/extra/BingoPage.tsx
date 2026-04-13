import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Gamepad2, Gift, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type QuizQuestion = {
  id: string
  type: 'multiple' | 'subjective'
  question: string
  choices?: string[]
  answer: string
  explanation: string
}

const QUIZ_BANK: QuizQuestion[][] = [
  // 세트 1 — COSO 프레임워크 & 내부통제 심화
  [
    {
      id: 'q1-1', type: 'multiple',
      question: 'COSO 내부통제 프레임워크(2013)에서 제시하는 5가지 구성요소 중 "정보와 의사소통(Information & Communication)"에 해당하지 않는 항목은?',
      choices: ['관련성 있는 양질의 정보 식별 및 확보', '내부통제 관련 정보의 내부 전달', '외부 이해관계자와의 정보 교환', '통제환경의 윤리적 가치 설정', '재무보고 목적에 부합하는 정보체계 구축', '규제기관 보고 의무 이행', '정보시스템의 적정성 평가'],
      answer: '통제환경의 윤리적 가치 설정',
      explanation: '윤리적 가치 설정은 "통제환경(Control Environment)" 구성요소에 해당합니다. 정보와 의사소통은 관련 정보의 식별·확보·전달에 초점을 맞춥니다.',
    },
    {
      id: 'q1-2', type: 'multiple',
      question: '외부감사인이 내부회계관리제도를 감사할 때, "중요한 취약점(Material Weakness)"과 "유의적 미비점(Significant Deficiency)"을 구분하는 핵심 기준은?',
      choices: ['발견된 미비점의 개수', '재무제표 중요한 왜곡표시 가능성의 크기와 발생가능성', '미비점이 발견된 계정과목의 수', '통제활동 담당자의 직급', '미비점 보고 시점의 적시성', '내부감사팀의 독립성 수준', '경영진 서면진술서 포함 여부'],
      answer: '재무제표 중요한 왜곡표시 가능성의 크기와 발생가능성',
      explanation: '중요한 취약점은 재무제표에 중요한 왜곡표시가 적시에 예방·발견되지 못할 합리적 가능성이 있는 경우이며, 유의적 미비점은 그보다 경미하지만 주의가 필요한 수준입니다.',
    },
    {
      id: 'q1-3', type: 'multiple',
      question: '주식회사 등의 외부감사에 관한 법률(외감법)에 따라 내부회계관리제도에 대한 "감사"가 의무화되는 회사의 기준으로 올바른 것은?',
      choices: ['모든 주식회사', '자산총액 1천억 원 이상 상장회사', '자산총액 5천억 원 이상 상장회사부터 단계적 적용', '코스닥 상장회사 전체', '매출액 500억 원 이상 회사', '종업원 300명 이상 회사', '자본금 100억 원 이상 회사'],
      answer: '자산총액 5천억 원 이상 상장회사부터 단계적 적용',
      explanation: '외감법 개정에 따라 자산총액 5천억 원 이상 상장회사부터 단계적으로 내부회계관리제도에 대한 감사(검토→감사)가 의무화되었습니다. 2024년부터는 자산 1천억 원 이상까지 확대됩니다.',
    },
    {
      id: 'q1-4', type: 'multiple',
      question: 'RCM(Risk Control Matrix)에서 하나의 통제활동이 여러 경영진 주장(Assertion)에 대응할 수 있을 때, 이를 무엇이라 하는가?',
      choices: ['보완통제(Compensating Control)', '복합통제(Multi-assertion Control)', '예방통제(Preventive Control)', '자동통제(Automated Control)', '직접통제(Direct Control)', '모니터링 통제(Monitoring Control)', '전사수준통제(Entity Level Control)'],
      answer: '복합통제(Multi-assertion Control)',
      explanation: '하나의 통제가 발생(Occurrence), 완전성(Completeness), 정확성(Accuracy) 등 복수의 경영진 주장에 동시에 대응하는 경우 복합통제라 합니다.',
    },
    {
      id: 'q1-5', type: 'subjective',
      question: 'COSO 내부통제 프레임워크의 5가지 구성요소 중, 나머지 4개 구성요소의 기반이 되는 가장 근본적인 구성요소를 한글로 적어주세요. (4글자)',
      answer: '통제환경',
      explanation: '통제환경(Control Environment)은 조직의 윤리적 가치, 거버넌스, 인적자원 등을 포함하며 나머지 4개 구성요소(위험평가, 통제활동, 정보와 의사소통, 모니터링)의 기반입니다.',
    },
  ],
  // 세트 2 — 경영진 주장 & 테스트 기법 심화
  [
    {
      id: 'q2-1', type: 'multiple',
      question: '재무제표 경영진 주장(Assertion) 중 "발생(Occurrence)"과 "완전성(Completeness)"의 관계에 대한 설명으로 올바른 것은?',
      choices: ['두 주장은 동일한 방향의 위험을 다룬다', '발생은 과대계상 위험, 완전성은 과소계상 위험과 관련된다', '완전성은 자산 계정에만 적용된다', '발생은 부채 계정에만 적용된다', '두 주장은 기말잔액에만 해당하는 개념이다', '발생은 IT통제에서만 검증 가능하다', '완전성 테스트는 외부확인서로만 가능하다'],
      answer: '발생은 과대계상 위험, 완전성은 과소계상 위험과 관련된다',
      explanation: '발생(Occurrence)은 기록된 거래가 실제 발생했는지(과대계상 위험), 완전성(Completeness)은 발생한 모든 거래가 빠짐없이 기록되었는지(과소계상 위험)를 다룹니다.',
    },
    {
      id: 'q2-2', type: 'multiple',
      question: '통제 테스트에서 "재수행(Reperformance)"과 "관찰(Observation)"의 가장 중요한 차이는 무엇인가?',
      choices: ['재수행이 비용이 더 저렴하다', '관찰은 과거 시점의 통제 운영을 확인할 수 있다', '재수행은 감사인이 직접 통제를 실행하여 독립적 증거를 확보한다', '관찰은 문서화가 불필요하다', '재수행은 IT 통제에만 적용된다', '관찰은 경영진 주장 전체를 충족한다', '재수행은 표본추출이 불필요하다'],
      answer: '재수행은 감사인이 직접 통제를 실행하여 독립적 증거를 확보한다',
      explanation: '재수행은 감사인이 통제활동을 직접 다시 수행하여 동일한 결과가 나오는지 확인하는 방법으로, 가장 강력한 감사증거를 제공합니다. 관찰은 특정 시점의 수행만 확인 가능합니다.',
    },
    {
      id: 'q2-3', type: 'multiple',
      question: '직무분리(Segregation of Duties)의 3가지 핵심 기능으로 올바르게 짝지어진 것은?',
      choices: ['기획-실행-보고', '승인(Authorization)-기록(Recording)-보관(Custody)', '계획-조직-통제', '입력-처리-출력', '발주-검수-지급', '설계-개발-운영', '수주-생산-출하'],
      answer: '승인(Authorization)-기록(Recording)-보관(Custody)',
      explanation: '직무분리의 핵심은 거래의 승인, 회계기록, 자산보관 기능을 서로 다른 담당자가 수행하도록 하여 부정과 오류를 예방하는 것입니다.',
    },
    {
      id: 'q2-4', type: 'multiple',
      question: 'IT 응용통제(Application Control) 중 "입력통제(Input Control)"에 해당하지 않는 것은?',
      choices: ['데이터 유효성 검사(Validation Check)', '한도 점검(Limit Check)', '일련번호 연속성 검사(Sequence Check)', '배치 합계 대사(Batch Total Reconciliation)', '마스터 데이터 변경 로그 감시', '중복 입력 방지(Duplicate Check)', '필수 입력 필드 점검(Completeness Check)'],
      answer: '마스터 데이터 변경 로그 감시',
      explanation: '마스터 데이터 변경 로그 감시는 IT 일반통제(ITGC) 중 변경관리(Change Management) 영역에 해당합니다. 입력통제는 데이터 입력 시점에서의 정확성·완전성을 확보하는 통제입니다.',
    },
    {
      id: 'q2-5', type: 'subjective',
      question: '내부통제에서 하나의 통제 미비점을 보완하기 위해 별도로 설계된 대체 통제를 무엇이라 하는가? (영문 약자 2단어, 예: XX Control)',
      answer: 'Compensating Control',
      explanation: 'Compensating Control(보완통제)은 주요 통제가 부재하거나 미비할 때 그 위험을 보완하기 위해 설계된 대체 통제활동입니다.',
    },
  ],
  // 세트 3 — K-SOX 법규 & 실무 심화
  [
    {
      id: 'q3-1', type: 'multiple',
      question: '내부회계관리제도 운영실태 보고에서 경영진이 사용하는 평가 기준으로 가장 적절한 것은?',
      choices: ['한국채택국제회계기준(K-IFRS)', '내부회계관리제도 설계 및 운영 개념체계(모범규준)', '기업회계기준서 제1001호', '감사기준서 제315호', '공정거래법 시행령', 'ISO 27001', 'COBIT 2019'],
      answer: '내부회계관리제도 설계 및 운영 개념체계(모범규준)',
      explanation: '경영진은 내부회계관리제도 모범규준(한국공인회계사회 제정)을 평가 기준으로 사용하여 설계 및 운영 실태를 보고합니다.',
    },
    {
      id: 'q3-2', type: 'multiple',
      question: 'Walk-through 테스트의 주된 목적으로 가장 적절한 것은?',
      choices: ['통제의 운영 효과성을 통계적으로 검증', '거래 흐름을 처음부터 끝까지 추적하여 통제의 설계 적합성을 확인', '재무제표 계정잔액의 정확성을 확인', '경영진 서면진술의 신뢰성을 검증', '부정위험요소를 계량적으로 측정', 'IT 시스템의 가용성을 평가', '내부감사인의 독립성을 확인'],
      answer: '거래 흐름을 처음부터 끝까지 추적하여 통제의 설계 적합성을 확인',
      explanation: 'Walk-through는 거래의 개시부터 재무제표 반영까지 전 과정을 추적하여 통제가 설계대로 존재하고 적합하게 배치되어 있는지 확인하는 절차입니다.',
    },
    {
      id: 'q3-3', type: 'multiple',
      question: '다음 중 "예방통제(Preventive Control)"와 "발견통제(Detective Control)"의 조합이 올바른 것은?',
      choices: [
        '예방: 승인권한 매트릭스 / 발견: 월말 계정 대사',
        '예방: 은행잔고 조정표 / 발견: 접근권한 설정',
        '예방: 이상거래 모니터링 / 발견: 전자결재 승인',
        '예방: 내부감사 / 발견: 직무분리',
        '예방: 분산분석 / 발견: 입력값 검증',
        '예방: 재고실사 / 발견: 발주 승인',
        '예방: 경영진 검토 / 발견: 시스템 접근 차단',
      ],
      answer: '예방: 승인권한 매트릭스 / 발견: 월말 계정 대사',
      explanation: '승인권한 매트릭스는 부적절한 거래가 사전에 발생하지 못하도록 예방하고, 월말 계정 대사는 이미 발생한 오류나 이상을 사후에 발견하는 통제입니다.',
    },
    {
      id: 'q3-4', type: 'multiple',
      question: '내부회계관리제도 평가 시 "Top-down Risk Assessment" 접근법에서 가장 먼저 수행해야 하는 단계는?',
      choices: ['개별 통제활동의 운영 효과성 테스트', '유의적 계정과 공시항목 식별', '전표 표본 추출 및 검증', '통제활동 담당자 면담', '감사위원회 보고', 'IT 시스템 취약점 스캔', '전사수준통제 운영 효과성 테스트'],
      answer: '유의적 계정과 공시항목 식별',
      explanation: 'Top-down 접근법은 ① 유의적 계정과 공시항목 식별 → ② 관련 경영진 주장 파악 → ③ 중요한 왜곡표시 위험 평가 → ④ 대응 통제활동 식별 → ⑤ 테스트 순서로 진행합니다.',
    },
    {
      id: 'q3-5', type: 'subjective',
      question: '통제활동의 발생빈도에 따른 분류 중, 매 거래마다 수행되는 통제를 "거래수준통제"라 하고, 일정 주기(일/주/월/분기)마다 수행되는 검토성 통제를 무엇이라 하는가? (한글 5글자)',
      answer: '주기적통제',
      explanation: '주기적통제(Periodic Control)는 일별·주별·월별·분기별 등 정해진 주기로 수행되는 모니터링성 통제로, 계정 대사, 분산분석, 경영진 검토 등이 해당합니다.',
    },
  ],
  // 세트 4 — 부정위험 & SOX 비교 심화
  [
    {
      id: 'q4-1', type: 'multiple',
      question: '부정 삼각형(Fraud Triangle) 이론에서 제시하는 부정 발생의 3가지 요소로 올바른 것은?',
      choices: ['동기·기회·정당화', '이익·손실·위험', '계획·실행·은폐', '압력·통제·보상', '탐욕·공포·무관심', '권한·접근·기록', '인센티브·능력·공모'],
      answer: '동기·기회·정당화',
      explanation: '부정 삼각형(Fraud Triangle)은 동기/압력(Incentive/Pressure), 기회(Opportunity), 정당화/합리화(Rationalization) 3가지 요소가 동시에 존재할 때 부정이 발생한다고 설명합니다.',
    },
    {
      id: 'q4-2', type: 'multiple',
      question: '미국 SOX법(Sarbanes-Oxley Act) Section 404와 한국 외감법상 내부회계관리제도의 차이점으로 올바른 것은?',
      choices: ['한국은 외부감사 의무가 없다', '미국은 경영진 평가만 요구하고 감사인 감사는 불필요하다', '한국은 "감사"로 전환하기 전까지 "검토" 수준이 허용되었다', 'SOX는 비상장회사에도 전면 적용된다', '한국은 COSO 프레임워크 사용을 금지한다', 'SOX는 IT 통제를 평가대상에서 제외한다', '한국은 CEO/CFO 인증이 불필요하다'],
      answer: '한국은 "감사"로 전환하기 전까지 "검토" 수준이 허용되었다',
      explanation: '한국은 기존에 내부회계관리제도에 대해 "검토(Review)" 수준만 요구했으나, 외감법 개정으로 단계적으로 "감사(Audit)" 수준으로 강화되었습니다. 미국 SOX 404(b)는 처음부터 감사를 요구했습니다.',
    },
    {
      id: 'q4-3', type: 'multiple',
      question: '내부회계관리제도에서 "경영진 무력화(Management Override)"에 대한 설명으로 가장 적절한 것은?',
      choices: ['경영진이 통제활동을 강화하는 행위', '일반 직원이 승인 없이 거래를 처리하는 행위', '경영진이 자신의 권한을 이용하여 기존 통제를 우회하는 위험', '외부감사인이 경영진의 판단을 번복하는 상황', '이사회가 경영진을 교체하는 절차', '내부감사팀이 경영진 지시를 거부하는 행위', '감사위원회가 외부감사인을 선임하는 절차'],
      answer: '경영진이 자신의 권한을 이용하여 기존 통제를 우회하는 위험',
      explanation: '경영진 무력화는 아무리 잘 설계된 내부통제라도 경영진이 의도적으로 우회할 수 있는 고유한 위험으로, 모든 감사에서 유의적 위험으로 추정됩니다.',
    },
    {
      id: 'q4-4', type: 'multiple',
      question: 'PCAOB AS 2201(구 AS5)에서 요구하는 "통합감사(Integrated Audit)"의 의미로 올바른 것은?',
      choices: ['내부감사와 외부감사를 동시에 수행', '재무제표 감사와 내부통제 감사를 하나의 통합된 감사로 수행', '모든 해외 자회사를 포함한 연결감사', 'IT 감사와 업무 감사를 통합', '분기감사와 연간감사를 결합', '경영진 평가와 감사위원회 평가를 통합', '세무감사와 회계감사를 병행'],
      answer: '재무제표 감사와 내부통제 감사를 하나의 통합된 감사로 수행',
      explanation: '통합감사란 재무제표에 대한 감사와 내부회계관리제도(ICFR)에 대한 감사를 하나의 통합된 감사 프로세스로 수행하는 것을 의미합니다.',
    },
    {
      id: 'q4-5', type: 'subjective',
      question: '감사기준서에서 재무제표의 거래와 사건에 대한 경영진 주장 중, 기록된 금액이 적절하게 측정되었는지를 다루는 주장을 한글로 적어주세요. (3글자)',
      answer: '정확성',
      explanation: '정확성(Accuracy) 주장은 거래와 사건의 금액 및 관련 데이터가 정확하게 기록되었는지를 다루는 경영진 주장입니다. 평가(Valuation)와 구분되는 거래 수준의 주장입니다.',
    },
  ],
  // 세트 5 — IT통제 & 모니터링 심화
  [
    {
      id: 'q5-1', type: 'multiple',
      question: 'IT 일반통제(ITGC) 4대 영역에 해당하지 않는 것은?',
      choices: ['프로그램 개발(Program Development)', '프로그램 변경(Program Changes)', '컴퓨터 운영(Computer Operations)', '데이터 분석(Data Analytics)', '접근 보안(Access to Programs and Data)', '프로그램 변경관리', '시스템 소프트웨어 관리'],
      answer: '데이터 분석(Data Analytics)',
      explanation: 'ITGC 4대 영역은 ① 프로그램 개발 ② 프로그램 변경 ③ 컴퓨터 운영 ④ 프로그램 및 데이터 접근 보안입니다. 데이터 분석은 감사기법이지 ITGC 영역이 아닙니다.',
    },
    {
      id: 'q5-2', type: 'multiple',
      question: '자동화된 통제(Automated Control)가 수동통제(Manual Control)에 비해 갖는 장점으로 가장 적절한 것은?',
      choices: ['설계 변경이 용이하다', '일단 올바르게 설계되면 일관되게 작동하여 인적 오류 위험이 낮다', '별도의 ITGC가 필요 없다', '감사 증거 확보가 불필요하다', '경영진 판단이 개입되어 유연하다', '구축 비용이 항상 저렴하다', '외부감사 대상에서 제외된다'],
      answer: '일단 올바르게 설계되면 일관되게 작동하여 인적 오류 위험이 낮다',
      explanation: '자동화된 통제는 프로그래밍된 대로 일관되게 작동하므로 피로·실수 등 인적 오류 위험이 낮습니다. 단, 올바른 작동을 보장하기 위해 ITGC(특히 변경관리, 접근통제)가 반드시 뒷받침되어야 합니다.',
    },
    {
      id: 'q5-3', type: 'multiple',
      question: '내부회계관리제도에서 "기업수준통제(Entity Level Control)" 중 "간접적 기업수준통제(Indirect ELC)"의 특징으로 올바른 것은?',
      choices: ['거래수준통제를 완전히 대체할 수 있다', '특정 경영진 주장에 직접 대응한다', '다른 통제의 효과적 운영을 감시하는 역할을 한다', '외부감사인만 평가할 수 있다', '재무보고와 무관한 운영 통제이다', '연 1회만 테스트하면 된다', 'IT 통제에만 적용된다'],
      answer: '다른 통제의 효과적 운영을 감시하는 역할을 한다',
      explanation: '간접적 ELC(예: 내부감사, 자체모니터링)는 특정 주장에 직접 대응하지는 않지만, 다른 거래수준통제가 효과적으로 운영되고 있는지를 감시·지원하는 역할을 합니다.',
    },
    {
      id: 'q5-4', type: 'multiple',
      question: '통제활동의 "정밀도(Precision)"에 대한 설명으로 올바른 것은?',
      choices: ['통제가 수행되는 빈도를 의미한다', '통제가 왜곡표시를 감지할 수 있는 임계값의 수준을 의미한다', '통제 담당자의 전문성 수준을 의미한다', '자동통제와 수동통제의 비율을 의미한다', '통제 문서화의 상세 정도를 의미한다', '통제 예외사항의 허용 범위를 의미한다', '통제 비용 대비 효과를 의미한다'],
      answer: '통제가 왜곡표시를 감지할 수 있는 임계값의 수준을 의미한다',
      explanation: '통제의 정밀도(Precision/Level of Precision)는 통제가 얼마나 작은 규모의 왜곡표시까지 감지할 수 있는지의 수준입니다. 정밀도가 높을수록 작은 오류도 발견할 수 있습니다.',
    },
    {
      id: 'q5-5', type: 'subjective',
      question: '외감법에서 내부회계관리자가 매 사업연도마다 이사회 및 감사(감사위원회)에 보고해야 하는 보고서의 정식 명칭에서 빈칸을 채우세요: "내부회계관리제도 운영실태 ____서" (2글자)',
      answer: '보고',
      explanation: '"내부회계관리제도 운영실태 보고서"는 내부회계관리자가 매 사업연도 이사회와 감사(위원회)에 보고하는 법정 보고서입니다.',
    },
  ],
  // 세트 6 — 표본추출 & 문서화 심화
  [
    {
      id: 'q6-1', type: 'multiple',
      question: '통제 테스트 시 표본 크기를 결정할 때, 통제 수행 빈도가 "일 1회(매일)"인 경우 일반적으로 권장되는 최소 표본 크기는?',
      choices: ['1건', '5건', '15건', '25건', '40건', '60건', '100건'],
      answer: '25건',
      explanation: '일반적으로 매일 수행 통제의 테스트 표본은 25건이 권장됩니다. (연 1회: 1건, 분기 1회: 2건, 월 1회: 2~5건, 주 1회: 5~15건, 일 1회: 25건, 다수: 25~60건)',
    },
    {
      id: 'q6-2', type: 'multiple',
      question: '내부회계관리제도 문서화에서 "프로세스 서술서(Process Narrative)"에 반드시 포함되어야 하는 항목으로 가장 거리가 먼 것은?',
      choices: ['거래의 개시부터 재무제표 반영까지의 흐름', '각 단계의 통제활동 및 담당자', '사용되는 IT 시스템과 보고서', '직무분리 현황', '외부감사인의 감사의견 초안', '주요 위험과 대응 통제의 매핑', '예외사항 처리 절차'],
      answer: '외부감사인의 감사의견 초안',
      explanation: '프로세스 서술서는 내부 통제활동의 설계를 문서화하는 것이며, 외부감사인의 감사의견은 감사 완료 후 발행되는 별도 문서입니다.',
    },
    {
      id: 'q6-3', type: 'multiple',
      question: '내부통제 미비점의 심각도를 평가할 때 고려해야 하는 두 가지 핵심 차원(Dimension)은?',
      choices: ['비용과 효과', '발생가능성(Likelihood)과 영향크기(Magnitude)', '빈도와 기간', '원인과 결과', '설계와 운영', '예방과 발견', '정량적 분석과 정성적 분석'],
      answer: '발생가능성(Likelihood)과 영향크기(Magnitude)',
      explanation: '미비점의 심각도는 ① 왜곡표시가 발생할 가능성(Likelihood)과 ② 발생 시 재무제표에 미치는 영향의 크기(Magnitude)를 종합하여 평가합니다.',
    },
    {
      id: 'q6-4', type: 'multiple',
      question: '다음 중 "SOC 1 보고서(Service Organization Control 1 Report)"에 대한 설명으로 올바른 것은?',
      choices: ['보안 취약점 진단 보고서이다', '서비스 조직의 내부통제가 위탁기업의 재무보고에 미치는 영향을 평가한 보고서이다', '개인정보보호 인증 보고서이다', '환경·사회·거버넌스(ESG) 평가 보고서이다', '기업 신용등급 평가 보고서이다', 'ISO 인증 감사 보고서이다', '세무조사 결과 보고서이다'],
      answer: '서비스 조직의 내부통제가 위탁기업의 재무보고에 미치는 영향을 평가한 보고서이다',
      explanation: 'SOC 1 보고서(SSAE 18/ISAE 3402)는 서비스 조직(예: 급여대행, 클라우드 ERP)의 내부통제가 이용기업의 재무보고 내부통제에 미치는 영향을 다룹니다.',
    },
    {
      id: 'q6-5', type: 'subjective',
      question: '내부회계관리제도에서 계정잔액에 대한 경영진 주장 중, 자산과 부채가 재무제표에 적절한 금액으로 측정되었는지를 다루는 주장을 한글로 적어주세요. (2글자)',
      answer: '평가',
      explanation: '평가(Valuation) 주장은 자산·부채·자본이 적절한 금액으로 기록되어 있는지, 관련 평가조정이 적절히 반영되었는지를 다룹니다.',
    },
  ],
]

function getTodayQuizSet(): QuizQuestion[] {
  // 날짜 기반으로 세트 선택 (매일 다른 세트)
  const today = new Date()
  const dayIndex = Math.floor(today.getTime() / 86400000) % QUIZ_BANK.length
  return QUIZ_BANK[dayIndex]
}

function checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
  const normalizedUser = userAnswer.trim().toLowerCase().replace(/\s+/g, '')
  const normalizedCorrect = question.answer.trim().toLowerCase().replace(/\s+/g, '')
  // 주관식은 부분 매칭도 허용
  if (question.type === 'subjective') {
    return normalizedUser === normalizedCorrect || normalizedCorrect.includes(normalizedUser) || normalizedUser.includes(normalizedCorrect)
  }
  return normalizedUser === normalizedCorrect
}

export default function BingoPage() {
  const { profile } = useAuth()
  const [questions] = useState<QuizQuestion[]>(getTodayQuizSet)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, { correct: boolean }>>({})
  const [showCelebration, setShowCelebration] = useState(false)
  const notifiedRef = useRef(false)

  const activeQuestion = useMemo(
    () => questions.find(q => q.id === activeId) ?? null,
    [activeId, questions]
  )

  const correctCount = Object.values(answers).filter(a => a.correct).length
  const totalAnswered = Object.keys(answers).length
  const allCompleted = totalAnswered === questions.length
  const allCorrect = correctCount === questions.length

  // 만점 달성 시 축하 효과 + 관리자 알림
  useEffect(() => {
    if (allCorrect && allCompleted && !notifiedRef.current) {
      notifiedRef.current = true
      setShowCelebration(true)
      notifyAdminPerfectScore()
    }
  }, [allCorrect, allCompleted])

  async function notifyAdminPerfectScore() {
    try {
      const userName = profile?.full_name ?? '알 수 없음'
      const employeeId = profile?.employee_id ?? ''
      const dept = profile?.department ?? ''
      const today = new Date().toLocaleDateString('ko-KR')

      // 1) notifications 테이블에 알림 삽입 (모든 admin에게)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: admins } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)

      if (admins && admins.length > 0) {
        const notifications = admins.map((a: { id: string }) => ({
          recipient_id: a.id,
          sender_id: profile?.id ?? null,
          title: `🏆 빙고퀴즈 만점자 발생! - ${userName} (${employeeId})`,
          body: `${today} 빙고퀴즈에서 만점자가 나왔습니다.\n\n• 이름: ${userName}\n• 사번: ${employeeId}\n• 부서: ${dept}\n\n선물 지급을 검토해 주세요.`,
          is_read: false,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('notifications').insert(notifications)
      }

      // 2) 관리자 이메일로 알림 (Edge Function이 있을 경우)
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: 'junghoon.ha@tongyanginc.co.kr',
            subject: `[동양 LMS] 🏆 빙고퀴즈 만점자 발생 - ${userName}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                <h2 style="color:#1e40af;">🏆 빙고퀴즈 만점자 알림</h2>
                <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">이름</td><td style="padding:8px;border:1px solid #e2e8f0;">${userName}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">사번</td><td style="padding:8px;border:1px solid #e2e8f0;">${employeeId}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">부서</td><td style="padding:8px;border:1px solid #e2e8f0;">${dept}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">달성일</td><td style="padding:8px;border:1px solid #e2e8f0;">${today}</td></tr>
                </table>
                <p style="color:#64748b;font-size:14px;">선물 지급을 검토해 주세요.</p>
              </div>
            `,
          },
        })
      } catch {
        // Edge Function 미배포 시 무시 — notifications 테이블에는 이미 저장됨
        console.log('Email edge function not available, notification saved to DB')
      }
    } catch (err) {
      console.error('Failed to notify admin:', err)
    }
  }

  function submitAnswer() {
    if (!activeQuestion) return
    const answer = activeQuestion.type === 'subjective' ? subjectiveAnswer : selectedChoice
    if (!answer.trim()) return

    const correct = checkAnswer(activeQuestion, answer)

    setAnswers(prev => ({ ...prev, [activeQuestion.id]: { correct } }))
    setMessage(
      correct
        ? '정답입니다! ' + activeQuestion.explanation
        : `틀렸습니다. 정답은 "${activeQuestion.answer}" 입니다. ${activeQuestion.explanation}`
    )

    setActiveId(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
  }

  function resetQuiz() {
    setAnswers({})
    setActiveId(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
    setMessage(null)
    setShowCelebration(false)
    notifiedRef.current = false
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-brand-700 via-indigo-700 to-slate-900 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-brand-100/70">DAILY QUIZ</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <Gamepad2 size={28} className="text-brand-200" />
          빙고퀴즈
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-50/90">
          매일 5문제의 내부회계 심화 퀴즈를 풀어보세요. 4문제는 7지선다 객관식, 1문제는 주관식입니다.
          <span className="mt-1 block font-bold text-yellow-300">🎁 전문 만점 달성 시 축하와 함께 선물을 증정합니다!</span>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">오늘의 문제</span>
              <span className="text-sm text-slate-500">
                {correctCount}/{questions.length} 정답
              </span>
            </div>
            <button onClick={resetQuiz} className="btn-secondary py-2 text-xs">
              <RefreshCw size={14} />
              다시 풀기
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {questions.map((question, index) => {
              const answerState = answers[question.id]
              return (
                <button
                  key={question.id}
                  onClick={() => {
                    if (!answerState) {
                      setActiveId(question.id)
                      setMessage(null)
                      setSelectedChoice('')
                      setSubjectiveAnswer('')
                    }
                  }}
                  disabled={Boolean(answerState)}
                  className={clsx(
                    'aspect-square rounded-[22px] border p-3 text-left transition',
                    answerState?.correct
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : answerState
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : activeId === question.id
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40'
                  )}
                  style={{ minHeight: '76px' }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="text-[11px] font-semibold">문제 {index + 1}</span>
                    <span className="text-sm font-black">
                      {answerState ? (answerState.correct ? '정답' : '오답') : question.type === 'multiple' ? '객관식' : '주관식'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {allCompleted && allCorrect && (
            <div className={clsx(
              'relative overflow-hidden rounded-[28px] border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-6 shadow-xl',
              showCelebration && 'animate-bounce-once'
            )}>
              {/* 축하 배경 효과 */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-4 -top-4 text-6xl opacity-20">🎉</div>
                <div className="absolute -bottom-2 -left-4 text-5xl opacity-20">🎊</div>
                <div className="absolute right-1/3 top-1/4 text-4xl opacity-15">⭐</div>
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/30">
                    <Trophy size={24} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-900">🎉 축하합니다!</p>
                    <p className="text-sm font-semibold text-amber-700">오늘의 5문제를 모두 맞혔습니다!</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-yellow-200 bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <Gift size={22} className="mt-0.5 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-base font-black text-slate-800">🎁 선물을 보내드립니다!</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        내부회계관리에 대한 뛰어난 이해력을 보여주셨습니다.<br />
                        만점 달성 기념 선물이 준비되어 있으니, 곧 개별 안내드리겠습니다.
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        ※ 관리자에게 만점 달성 알림이 전송되었습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <p className="text-xs font-medium text-amber-600">
                    {profile?.full_name ?? '사용자'}님, 정말 대단합니다! 앞으로도 내부회계 학습에 힘써주세요. 💪
                  </p>
                </div>
              </div>
            </div>
          )}

          {allCompleted && !allCorrect && (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <p className="text-lg font-black">오늘의 퀴즈를 완료했습니다!</p>
              </div>
              <p className="mt-2 text-sm">
                {questions.length}문제 중 {correctCount}문제를 맞혔습니다.
                "다시 풀기"를 눌러 다시 도전해 보세요!
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
          {activeQuestion ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">QUESTION</p>
                <h2 className="mt-2 text-xl font-black leading-8 text-slate-900">
                  {activeQuestion.question}
                </h2>
              </div>

              {activeQuestion.type === 'multiple' ? (
                <div className="grid gap-2">
                  {activeQuestion.choices?.map(choice => (
                    <button
                      key={choice}
                      onClick={() => setSelectedChoice(choice)}
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                        selectedChoice === choice
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 hover:border-brand-100 hover:bg-slate-50'
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={subjectiveAnswer}
                  onChange={e => setSubjectiveAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  className="form-input"
                  placeholder="정답을 입력해 주세요."
                />
              )}

              <button
                onClick={submitAnswer}
                disabled={!selectedChoice && !subjectiveAnswer.trim()}
                className="btn-primary w-full justify-center py-3"
              >
                <CheckCircle2 size={16} />
                답안 제출
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <Gamepad2 size={36} className="text-slate-300" />
              <p className="mt-4 text-lg font-bold text-slate-700">
                {allCompleted ? '오늘의 퀴즈를 모두 완료했습니다!' : '왼쪽 빙고칸을 눌러 문제를 선택해 주세요.'}
              </p>
              <p className="mt-2 text-sm leading-6">
                {allCompleted ? '"다시 풀기" 버튼으로 재도전할 수 있습니다.' : '5문제를 풀고 빙고를 완성하세요!'}
              </p>
            </div>
          )}

          {message && (
            <div className={clsx(
              'mt-5 rounded-2xl border px-4 py-3 text-sm leading-6',
              message.startsWith('정답')
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            )}>
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
