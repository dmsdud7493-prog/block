# 블록으로 설계하고 Claude와 성찰하는 가상실험실 청사진

**핵심 결론.** 사용자가 보유한 HTML 프로토타입 6종은 이미 "블록 조립 → 순수 로직 시뮬레이터 → 모니터 재생 → 오류 블록 깜빡임 → 챗봇"이라는 핵심 루프를 라이브러리 없이 구현해 두었으므로, 새 앱은 이를 **공통 엔진(블록 DSL + 결정론적 상태 머신 + 튜터 프롬프트)**으로 통합하고, 그 위에 프로토타입에 전혀 없는 네 가지(계산값 학생 입력·검증, 그래프 전 예측 게이트, 탐구 보고서·성찰·제출, 교사 대시보드)를 얹는 방식으로 만드는 것이 가장 빠르고 안전하다. 교육과정 측면에서 이 앱은 2022 개정 중학교 과학 **(8) 물질의 특성, 성취기준 [9과08-01]~[9과08-03]**(과학 2, 2026학년도 중2부터 적용)을 겨냥하며, 고시문이 탐구 활동으로 명시한 "혼합물 분리 실험을 설계하고 수행하기"가 곧 요구사항 (2)(4)(5)의 근거다 ([나무위키 과학 2](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90/%EA%B3%BC%ED%95%99%202)). 교수학습 근거는 명확하다: 답을 주는 AI는 시험 성적을 **17% 떨어뜨렸지만** 힌트형 가드레일은 이를 대부분 상쇄했고 ([Bastani et al. 2024](https://papers.ssrn.com/abstract=4895486)), 가상실험 리뷰는 "결과를 예측한 뒤 비교하게 하라"를 권장 전략으로, 안내 설계를 "가장 결정적인 변수"로 꼽는다 ([de Jong, Linn & Zacharia 2013](https://users.gw.utwente.nl/jong/dejonglinnzacharia%20science.pdf)). 기술 스택은 Next.js(Vercel, 서울 `icn1`) + Supabase(서울, RLS) + Claude **Haiku 5.5**($0.10/$0.50 per MTok) 기본·Sonnet 5.5 평가용 2티어로 구성하면 30명×6실험×20턴 한 학급 운영비가 **수 달러** 수준이고 ([Pricing](https://platform.claude.com/docs/en/about-claude/pricing)), 프로토타입이 브라우저에서 직접 호출하던 Anthropic API는 반드시 서버 라우트로 옮겨야 한다. 요구사항 (16)의 통치 문서인 **「과학 탐구 지원 AI 에이전트의 설계원리 및 지침(안)」(6원리 × 4지침 = 24지침)**은 사용자가 제공했으며, 본 보고서는 24개 지침 각각을 앱 기능과 연구 근거에 매핑한다. 다만 그 문서 스스로 "원문과의 문장 단위 일치는 확인되지 않은 재구성안"이며 전문가 타당화가 필요하다고 밝히므로, 앱은 지침의 실행 가능성을 검증하는 **타당화 도구**로도 설계해야 한다. 미성년자 직접 사용 제품이므로 Anthropic의 미성년자 가이드라인(연령 확인, 필터링, 모니터링, "AI와 대화 중" 고지)과 개인정보보호법의 만 14세 미만 법정대리인 동의·국외 이전 고지를 설계 초기부터 내장해야 한다.

---

## 1. 요약 및 핵심 권고: 프로토타입을 버리지 말고 엔진으로 승격하라

이 보고서는 7개 연구 노트(기존 프로토타입 분석, 2022 교육과정, 교수학습·AI 튜터, 블록코딩·시뮬레이션, 기술 아키텍처, 교사 대시보드·컴플라이언스, 하네스 엔지니어링)를 종합해 PRD의 연구 기반으로 쓰이도록 작성했다. 각 절에서 **출처가 있는 사실**은 인라인 링크로 표시하고, 조사자의 설계 제안은 "[제안]" 또는 "추론"으로 구분했다. 아래 10가지가 핵심 결정 사항이다.

| # | 결정 | 근거 요약 | 확신도 |
|---|---|---|---|
| 1 | 6개 HTML을 하나의 **공통 엔진**(블록 정의 JSON + `applyStep` 리듀서 + 실험별 spec)으로 리팩터링 | 프로토타입이 이미 동일 3단 구조·동일 상태 머신 패턴을 6번 복제 | 높음 |
| 2 | 블록 편집기는 **Blockly core + 자체 React 래퍼** (react-blockly 비사용) | Blockly v13(2026-06) 키보드·스크린리더 기본, `msg/ko`, JSON 직렬화, `setWarningText` | 높음 |
| 3 | 튜터는 **적응형 4단 힌트 사다리**(L0 재진술→L1 개념→L2 부분예시→L3 바닥힌트+자기설명) | Bastani 2024, Tutor CoPilot, Bisra 2018(g=0.55), 소크라테스식 단독의 효율 저하 증거 | 높음 |
| 4 | 그래프·결과 공개 전 **예측 게이트**(객관식+근거 1줄)를 UI 레벨에서 잠금 | de Jong 2013 권장 전략, POE 준실험들 | 높음 |
| 5 | 계산값 채점은 **코드가 수행**, 모델은 `error_type`만 받아 힌트 생성 | 아첨 연구(학생 반박 시 최대 18.8% 정답 번복) | 높음 |
| 6 | 모델: Haiku 5.5 기본, Sonnet 5.5는 보고서 피드백·오개념 진단 | 가격 20배 차, Start 티어 한도 충분 | 중간(한국어 품질 실측 필요) |
| 7 | Claude 호출은 **Next.js Route Handler(Node, `icn1`)**, Supabase Edge Function은 웹훅·PDF용 | Edge Function CPU 2초/256MB 제한, AI SDK `useChat` 통합 | 높음 |
| 8 | 교사 대시보드는 **불변 이벤트 로그**를 접어서(fold) "막힘/미제출/플래그/공통 오답" 4카드로 시작 | Verbert 2013, Jivet 2017(사회적 비교 함정) | 중간 |
| 9 | 학생 계정은 학급 코드+학번/닉네임, **보호자 동의는 학교 서면**, 처리방침에 국외 이전 5항목 | 개인정보보호법 22조의2·28조의8 해설, Anthropic 미성년자 가이드 | 중간(법률 자문 필요) |
| 10 | `설계원리.md`(24지침)를 **CLAUDE.md 필수 읽기 문서**로 등록하고, 지침 번호를 스프린트 계약·verify 검사 항목에 연결 | 문서는 재구성안이라 타당화 필요 → 앱 로그가 타당화 증거 | 확정 |

---

## 2. 기존 프로토타입은 핵심 루프를 갖췄지만 저장·보고서·교사 기능이 0이다

사용자 폴더 `D:\agent\block`의 HTML 6종(밀도, 용해도, 녹는점, 끓는점, 혼합물 분리 1·2, 각 110~136KB)은 모두 "중2 과학 · 블록코딩으로 실험 순서 조립하기"라는 부제를 공유하며, 동일한 3단 레이아웃을 쓴다. 왼쪽은 준비물(equip)/용량·수치(quant)/행동(action) 탭의 블록 팔레트와 작업공간이고, 행동 블록의 "노란 구멍(slot)"에 준비물·수치 블록을 끼우는 구조다. 드래그앤드롭은 Blockly나 Scratch 없이 **순수 HTML5 DnD로 직접 구현**되어 있고, 복사/붙여넣기와 다중 선택까지 지원한다. 가운데 "가상 실험 모니터"는 [▶ 실험 실행하기]를 누르면 블록을 순서대로 읽어(`readStepsFromElements`) 순수 로직 상태 머신(`newState/applyStep/simulate`)으로 프레임을 만들고 0.5×/1×/2× 속도로 재생한다. 오류 검출은 두 층이다. `checkSlots`가 빈 구멍·잘못된 종류를 잡고, `applyStep`이 순서 오류(질량 재기 전에 물에 넣음, 장치 미완성 상태에서 가열)를 잡아 해당 블록을 빨간색으로 깜빡이며 모니터 배너에 이유를 띄운다. 블록을 고치면 `onWorkspaceEdited`가 오류를 해제하고 "다시 실행"을 안내한다. 이것이 요구사항 (6) "실시간으로 틀린 것 확인"의 원형이며, 새 앱은 이 규칙 엔진을 버릴 이유가 없다.

오른쪽 상단 챗봇은 교수 원칙 면에서 이미 상당히 성숙하다. 시스템 프롬프트는 "다정한 반말, 3~5문장, 막혔을 때 다음 한 단계만 안내, 결과 숫자는 먼저 알려주지 않음, 참고 자료(KNOWLEDGE_BASE)의 비유 우선" 규칙을 담고 있고, 작업공간의 블록 상태를 문장으로 직렬화해 매 턴 주입한다. 40초 무조작 시 먼저 말을 거는 넛지(IDLE_NUDGE_MS, 90초 간격, 최대 2회)와 API 실패 시 로컬 규칙 폴백도 있다. 용해도 실험2 프롬프트는 "각 단계에서 어떤 변화가 생길지 학생이 먼저 예상하게" 하여 POE의 원형을 보여준다. 그러나 `fetch('https://api.anthropic.com/v1/messages')`를 **브라우저에서 직접 호출**하며(모델 `claude-sonnet-4-6`), 헤더에 키가 없어 동작하려면 키 노출이 불가피하다. Anthropic TypeScript SDK는 바로 이 이유로 브라우저 사용을 기본 차단한다 ([anthropic-sdk-typescript README](https://github.com/anthropics/anthropic-sdk-typescript)).

요구사항 대비 갭을 정리하면 아래와 같다.

| 요구사항 | 프로토타입 현황 | 갭 |
|---|---|---|
| (1)(3) 챗봇 개념 학습·막힘 도움 | 있음(프롬프트·넛지·상태 주입) | 백엔드 이전, 힌트 사다리 구조화, 구조화 출력 |
| (4)(5)(6) 블록 가상실험·순서·실시간 오류 | 있음(DnD·상태 머신·블록 깜빡임) | 6개 파일에 중복 → 공통 엔진, 접근성·터치 |
| (7)(8) 결과 데이터·그래프 | 데이터 표 생성, 녹는점·끓는점·분리1·2에 SVG 그래프, 밀도·용해도는 그래프 없음 | 밀도 질량–부피 그래프, 용해도 곡선 추가 |
| (10) 계산값 학생 입력·오답 도움 | **없음**(밀도는 블록이 자동 계산) | 입력 셀 + 코드 채점 + error_type 힌트 |
| (11)(12)(14) 보고서·성찰·제출 | **없음**("보고서" 0회) | 보고서 화면·템플릿·제출 워크플로 |
| (13) 그래프 전 예측 | 챗봇 프롬프트 수준(용해도만), UI 게이트 없음 | 예측 게이트 UI |
| (15) 학생/교사 화면 구분, 로그인, 저장 | **없음**(메모리 상태, 새로고침 시 소실) | Auth·DB·대시보드 |

시뮬레이션 데이터는 재사용 가치가 높다. 밀도 실험은 물 1.0, 식용유 0.92 g/mL, 큰 철조각 79 g/10 mL, 작은 철조각 39.5 g/5 mL(밀도 7.9로 동일)로 "양과 무관한 특성"을 드러내도록 설계됐고, 비커 120 g·눈금실린더 90 g을 두어 영점조정의 필요성을 구현했다. 혼합물 분리2는 붕산/황산구리 온도별 용해도 표(10~80℃)를 내장한다. 이 수치들은 6절의 참조 물성 표와 대조해 `TEXTBOOK_MODE` 상수로 정리하면 된다.

설계원리 관점에서 보면 프로토타입의 가장 큰 구조적 공백은 **변인 블록의 부재**다. 블록 카테고리는 준비물/수치/행동(/위치)뿐이어서 독립·종속·통제변인, 실험 집단·비교 집단을 명시하는 요소가 없고, 실험 설계가 곧 "절차 조립"에 그친다. 또한 실행 결과가 메모리에만 있어 "이전 시도와 변경 내역"이 보존되지 않는다. 이 두 공백은 다음 절의 지침 2.1과 3.4에 직접 대응한다.

---

## 3. 설계원리 24지침 ↔ 앱 기능·연구 근거 매핑: 문서는 재구성안이고, 앱이 그 타당화 도구다

사용자가 제공한 「과학 탐구 지원 AI 에이전트의 설계원리 및 지침(안)」은 6개 원리(탐구 과정의 외적 표상, 블록 기반 실험 설계, 시뮬레이션 기반 예측·검증, 적응적 스캐폴딩, 대화형 탐구 지원, 탐구보고서 작성·성찰 연계) 아래 각 4개, 총 24개 지침으로 구성되며, 이론적 근거로 외적 표상·구성주의·POE·비계 설정·자기설명·자기조절학습을 든다. 문서는 머리말에서 "확인 가능한 연구 구상을 토대로 재구성한 안이며 원문과의 문장 단위 일치는 확인되지 않았다"고 밝히고, 말미의 전문가 타당화 메모에서 "내용타당도 검토와 표현 정제", "지침별 평정과 서술형 의견 수집", "낮은 평정 지침의 수정·통합·삭제"를 예고한다. 따라서 이 문서는 요구사항 (16)이 요구하는 통치 문서이되 **확정본이 아니다**. [제안] 앱은 각 지침을 구현한 기능에 지침 번호를 태그로 붙이고(예: `events.payload.guideline = "3.1"`), 파일럿 로그(예측 입력률, 힌트 단계 분포, 변인 블록 수정 횟수, 성찰 항목 작성률)를 지침별로 집계해 타당화 평정의 실증 근거로 제공할 수 있다. 이렇게 하면 "지침의 실행 가능성"이라는 타당화 항목이 전문가 의견이 아니라 데이터로 답해진다.

아래 표는 24개 지침을 앱 기능·구현 결정·연구 근거에 매핑한 것이다. "프로토타입" 열은 2절 분석 기준이다.

| 지침 | 요지 | 앱 기능 / 구현 결정 [제안] | 프로토타입 | 연구 근거 |
|---|---|---|---|---|
| 1.1 | 탐구 문제·가설·변인·절차·예상 결과를 구분된 시각 요소로 | 학생 화면 상단에 "탐구 카드" 5칸(문제/가설/변인/절차=블록/예상); 각 칸이 DB 필드(`sessions`+`predictions`+`block_programs`)와 1:1 | 절차(블록)만 있음 | 외적 표상; de Jong 2013의 "자신의 생각과 조사 결과를 구분하게 돕는 워크시트" |
| 1.2 | 요소 간 관계를 연결선·순서·조건으로 | 변인 블록이 행동 블록의 수치 슬롯을 참조(조작변인 → 바뀌는 수치, 통제변인 → 고정 수치)하도록 Blockly value input 연결; 절차는 블록 순서 | 슬롯 끼우기만 | Blockly 타입 체크 |
| 1.3 | 입력이 바뀌면 관련 요소·결과 표시가 함께 갱신 | 워크스페이스 변경 리스너(디바운스) → dry-run → 탐구 카드·점검 패널·예상 그래프 축 범위 동시 갱신 | 오류 해제만 갱신 | Blockly Events |
| 1.4 | 한 화면에서 전체 흐름과 현재 단계 | 상단 단계 스테퍼(설계→예측→수행→해석→보고서, `aria-current`) + 3단 레이아웃 유지 | 3단 레이아웃 | 하네스 edu-design(LessonList `aria-current`) |
| 2.1 | 독립·종속·통제변인, 실험·비교 집단, 측정 방법 블록 | **'변인 설계' 카테고리 신설**: `독립변인[ ]`, `종속변인[ ]`, `통제변인[ ]…`, `실험 집단/비교 집단` 컨테이너 블록, `측정 방법[기구][간격]` 블록; 교과서 대조 실험(3 g vs 6 g)은 두 집단 블록으로 표현 | **없음** | 고시 고려사항 "변인 통제·설계"; SERC 토의 질문(질량 변화 시 어는점) |
| 2.2 | 블록 배치·연결로 절차 순서와 조건 명시 | 행동 블록 순차 스택 + `~가 될 때까지 가열` 조건 블록(온도/시간) | 순차 스택 있음 | 프로토타입 상태 머신 |
| 2.3 | 누락·모순 설계 요소를 시각 표시, 수정 기회 | 6절 2계층 검증: 빈 슬롯·범위는 즉시, 모순(통제변인으로 선언한 값이 두 집단에서 다름, 종속변인 측정 블록 없음)은 dry-run 진단으로 블록 경고+패널 | 빈 슬롯·순서 오류만 | Blockly validation codelab |
| 2.4 | 자동 완성보다 설계 근거 설명 유도 | 자동 완성 없음; "예시 순서 3단계만" 유지; 실행 전 "이 변인을 고른 이유" 1줄 입력(선택적 게이트, 교사 설정) | 예시 3단계 힌트 | 자기 설명 g=0.55(Bisra 2018) |
| 3.1 | 실행 전 예상 결과와 이유 기록 | **POE 예측 게이트**: 실행·그래프 버튼 잠금, 객관식 모양 + "왜냐하면" → `predictions` | 프롬프트 수준(용해도) | de Jong 2013 권장 전략; POE 준실험 |
| 3.2 | 시뮬레이션이 학습자가 구성한 변인·조건·절차를 반영 | `applyStep` 리듀서가 블록 JSON만 입력으로 받음(정답 경로 하드코딩 금지); 변인 블록의 값이 시뮬 파라미터가 됨 | 블록→상태 머신 | 결정론적 리듀서 설계 |
| 3.3 | 일치 여부뿐 아니라 차이 원인 확인 | 결과 공개 후 "예측과 같았어? 달랐다면 왜?" 설명 입력 → `predictions.matched`, `rationale_after`; 튜터는 P3 반례 힌트 | 없음 | POE 'Explain', 개념 변화 |
| 3.4 | 조건을 바꿔 재실행, 이전 시도·변경 내역 보존 | **`runs` 테이블**(session_id, run_no, program_version, seed, params, result_summary) + `block_programs.version`; "이전 실행과 비교" 그래프 오버레이 | 메모리 상태, 새로고침 시 소실 | Labster 재개·반복; 교육과정 "데이터 공유" |
| 4.1 | 단계·오류 유형별로 질문·단서·예시·절차 안내를 단계적으로 | 4단 힌트 사다리(L0 질문→L1 단서→L2 예시→L3 절차) × `error_type`(swapped/unit/meniscus/plateau/solvent_basis/order) 매트릭스 | "다음 한 단계만"(L3) | Bastani 2024; Tutor CoPilot |
| 4.2 | 먼저 점검 질문, 필요할 때만 구체 단서 | L0부터 시작, "내 생각 입력 → 힌트" UI, 시도 없이 재요청 시 같은 단계 반복 | 질문 1회 후 답 | Help abuse 36%; 소크라테스식 단독의 한계 |
| 4.3 | 반복 오류·장시간 정체 시 개념과 수행 예시 | 2회 실패 또는 3분 정체 → L2로 자동 하강; `idle_seconds`·`fail_count` 상태 주입; 120초 넛지 1회 | 40초 넛지 | SIGCSE 2026, Blasco 2024(효율·만족 저하) |
| 4.4 | 설명·수정이 개선되면 안내 빈도·구체성 축소 | 페이딩: 같은 유형 2회차부터 L0만 선제 제공; 학생별 `scaffold_level` 프로파일 저장 | 없음 | 페이딩+추가 g=0.590(Educ Psychol Rev 2018) |
| 5.1 | 질문·피드백이 현재 단계·블록·시뮬 결과를 참조 | `<상태>` XML 매 턴 주입(단계, 블록 요약, check, 예측 여부) | 블록 직렬화 주입 있음 | Claude 모범사례(XML 분리); de Jong 로그 기반 안내 |
| 5.2 | 가설·변인·절차·해석 선택의 이유를 설명하게 | 프롬프트 규칙 "질문은 하나, 근거를 묻는다"; 변인 블록 변경 시 "왜 바꿨어?" | 예상 질문 일부 | 자기 설명; Learning mode 질문 |
| 5.3 | 오류 지적 시 수정 지점과 근거 제시, 학생이 직접 수정 | 코드 채점 → `error_type` → 셀/블록 지목("부피 칸"), 값·블록을 고쳐 주지 않음 | 블록 깜빡임+배너 | 아첨 연구(Arvin 2025) |
| 5.4 | 도움 수준 조절하되 완성 설계·결론 대신 작성 금지 | 구조화 출력에 `hint_level` 필드, "보고서 써 줘" 전환 규칙; 자동 완성 블록 기능 없음 | "결과 숫자 먼저 안 알려줌" | Bastani 2024(-17%); Study Mode |
| 6.1 | 문제·가설·변인·방법·결과·해석·결론 구분 보고서 틀 | 5절 9항목 템플릿(지침 6.1의 7항목 + 준비물·성찰) | **없음** | 2022 평가 방향(실험 노트·보고서) |
| 6.2 | 블록 구성·예측·결과·수정 내역을 보고서 작성 중 참고 | 보고서 화면 우측에 "내 기록" 패널: 최종 블록, `runs` 비교, `predictions`, 변경 내역 diff; 자동 전사는 초안 표시 | 없음 | 포트폴리오형 평가 |
| 6.3 | 가설–증거 관계, 오차·한계 설명 | 결론 섹션에 "가설은 (지지/기각), 근거는 표 __행/그래프 __" 빈칸 시작어; 오차 원인·개선안 필수 필드 | 없음 | 감점 기준(오차 분석 생략) |
| 6.4 | 제출 전 설계 변경 이유, 예측–결과 차이, 개선점 성찰 | 성찰 섹션 4질문 + 제출 전 체크리스트 게이트(세 항목 미작성 시 제출 버튼 비활성·안내) | 없음 | 메타인지 비계 g=0.384; Bisra 2018 |

표에서 드러나는 결론은 세 가지다. 첫째, 원리 1·2·3·5는 프로토타입에 부분적 원형이 있지만 원리 4(적응적 스캐폴딩의 사다리·페이딩)와 원리 6(보고서·성찰)은 거의 전부 신규다. 둘째, 지침 2.1(변인 블록)과 3.4(시도 보존)는 데이터 모델을 바꾸는 요구이므로 스프린트 1에서 결정해야 한다. 셋째, 지침 2.4·5.4의 "자동 완성 금지·대신 작성 금지"는 5절의 연구 증거(답을 주는 AI의 학습 저하)와 정확히 일치하므로 하네스의 CRITICAL 검사 항목으로 격상할 가치가 있다.

---

## 4. 2022 개정 교육과정 정합성: 세 개의 성취기준과 하나의 설계형 탐구

### 성취기준과 적용 시점

'물질의 특성'은 2022 개정 중학교 과학에서 단원 (8), 과학 2(중학교 2학년) 1학기 첫 단원이며 '물질(화학)' 영역에 속한다. 단원 순서는 (8) 물질의 특성 → (9) 지권의 변화 → (10) 빛과 파동 → (11) 물질의 구성 → … 으로, 2015 개정 대비 '물질의 구성'과 순서가 바뀌었고 **크로마토그래피가 삭제**되었다 ([나무위키 과학 2](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90/%EA%B3%BC%ED%95%99%202)). 천재교육의 2022 개정 과학 2 연간 교재도 "I 물질의 특성(01 물질의 특성, 02 혼합물의 분리)"을 첫 단원으로 배치한다 ([천재교육 (22개정) 체크연간서 과학2](https://cdata2.chunjae.co.kr/webdata_110/chunjae/_CMS/BookData/Solution/2025/11/(22%EA%B0%9C%EC%A0%95)%EC%B2%B4%ED%81%AC%EC%97%B0%EA%B0%84%EC%84%9C_%EA%B3%BC%ED%95%992_%EC%A0%95%EB%8B%B54%EB%8F%84.pdf)).

| 코드 | 성취기준 (2차 출처 인용, 고시 원문 대조 필요) | 앱 기능 연결 |
|---|---|---|
| [9과08-01] | 물질의 특성의 의미를 알고, 실험을 통해 밀도, 용해도, 녹는점, 끓는점 등을 설명할 수 있다. | 실험 4종(밀도·용해도·녹는점·끓는점) + "양을 바꿔도 값은 같다" 대조 실험 |
| [9과08-02] | 물질의 특성을 근거로 우리 주변의 물질을 순물질과 혼합물로 분류할 수 있다. | 가열 곡선에서 평탄 구간 유무로 순물질/혼합물 판별(끓는점·분리1) |
| [9과08-03] | 물질의 특성을 이용하여 혼합물이 분리되는 원리를 이해하고, 이를 이용한 사례를 주변에서 찾을 수 있다. | 혼합물 분리 1(증류)·2(재결정) + 보고서 "실생활 연결" 항목 |

출처는 [나무위키 과학 2](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90/%EA%B3%BC%ED%95%99%202)이며, 교육용 사이트 wonedu는 [9과08-01]을 "물질의 양과 관계없이 일정한 값을 가지는 물질의 고유한 특성임을 이해하고, 이를 이용해 물질을 구별할 수 있다"로 달리 표기해 두 출처가 상충한다 ([wonedu](https://www.wonedu.org/ms-science/%EA%B3%BC%ED%95%99%E2%91%A1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1%EC%9D%98%20%EC%9D%98%EB%AF%B8/)). 고시문 hwp와 "(중)2022 개정 교육과정에 따른 성취수준(과학).hwp"는 교사 블로그에서 재배포되고 있으므로 PRD 확정 전 글자 단위로 대조해야 한다 ([sciencelove.com/2674](https://sciencelove.com/2674)). 적용 시점은 "1학년은 2025년, 2학년은 2026년, 3학년은 2027년부터 순차 적용"이므로 ([나무위키 중학교](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90)), 조사 시점(2026-10) 기준 이 단원은 2022 과정으로 한 차례(2026년 1학기) 운영됐고 앱의 주 대상은 2027학년도 이후 중2다.

고시문의 해설과 적용 고려사항은 앱 설계에 직접적 함의를 준다. 해설은 "물질의 특성이 특정 조건에서 일정한 값을 가지며 물질의 양과 무관하다"는 점을 이해시키라 하고, 고려사항은 "여러 모둠의 실험 데이터를 공유하며 탐구", "혼합물 분리 실험은 구성 순물질의 특성을 조사한 자료를 근거로 설계하고 계획을 공유"를 요구한다 ([나무위키 과학 2](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90/%EA%B3%BC%ED%95%99%202)). 따라서 [추론] 앱은 (a) 특성값 측정 모듈, (b) 측정 데이터의 모둠 간 공유·비교(교사 대시보드의 학급 데이터 뷰), (c) 분리 실험 **설계 단계**(순물질 특성값 조회 → 분리 방법 선택 → 블록 조립 → 계획 공유)를 핵심 기능으로 갖춰야 한다. 2022 과정에서 '물질의 구성'(원자·분자)이 이 단원 뒤에 오므로 학생은 입자 개념을 정식으로 배우기 전에 이 단원을 만난다. 튜터의 설명 층위를 1학년 상태 변화(입자 운동) 수준으로 제한하는 규칙이 필요하다[추론].

### 실험 6종 매핑과 평가 방향

2022 천재 교재의 탐구 체크 항목(황산 구리(Ⅱ)·질산 칼륨 용해도 비교, 끓는점이 다른 액체의 가열 곡선, 물–식용유 밀도차 분리, NaCl–KNO₃ 재결정)은 프로토타입 6종이 여전히 현행 교과서 실험 세트와 일치함을 보여준다 ([천재교육 체크연간서](https://cdata2.chunjae.co.kr/webdata_110/chunjae/_CMS/BookData/Solution/2025/11/(22%EA%B0%9C%EC%A0%95)%EC%B2%B4%ED%81%AC%EC%97%B0%EA%B0%84%EC%84%9C_%EA%B3%BC%ED%95%992_%EC%A0%95%EB%8B%B54%EB%8F%84.pdf)). 2015 개정 9개 출판사 탐구 목록에는 "밀도 측정, 질산 칼륨의 용해도 측정, 끓는점 측정, 녹는점과 어는점, 물과 에탄올 혼합물의 분리, 염화 나트륨과 붕산 분리" 등이 있고, 출판사마다 '용해도 석출량 계산', '온도와 밀도' 등을 다루는 범위가 갈렸다 ([비상 오투 교과서별 개념 비교](https://cdn.visang.com/contents/162msco2/html/data/152%ec%98%a4%ed%88%ac%ec%a4%91%eb%93%b1%ea%b3%bc%ed%95%99%e2%91%a1/%ec%a4%91%eb%93%b1%ec%98%a4%ed%88%ac%e2%91%a1-2(15)%ea%b5%90%ea%b3%bc%ec%84%9c%eb%b3%84%ea%b0%9c%eb%85%90pdf.pdf)).

| 프로토타입 | 성취기준 | 조작/종속 변인 | 기대 그래프 | 학생 계산값(요구 10) |
|---|---|---|---|---|
| 밀도 | 08-01 | 물질 종류·크기 / 질량, 부피 | 질량–부피 산점도(원점 지나는 직선, 기울기=밀도) | 밀도 = 질량÷부피 |
| 용해도 | 08-01 | 온도·용질 / 녹은 양 | 온도–용해도 곡선 | 물 100 g 기준 환산값 |
| 녹는점 | 08-01 | 물질·질량 / 온도(시간) | 시간–온도 가열(냉각) 곡선 | 평탄 구간 온도 읽기 |
| 끓는점 | 08-01, 08-02 | 물질·양·가열 세기 / 온도 | 시간–온도 가열 곡선 | 평탄 구간 온도 읽기 |
| 분리1(증류) | 08-03 | 혼합물 조성 / 온도, 증류액 | 두 개의 평탄 구간 | 1차 증류액 끓는점 |
| 분리2(재결정) | 08-03 | 냉각 온도 / 석출량 | 용해도 곡선 위 석출량 | 석출량 = 녹인 양 − S(T_low)×물/100 |

녹는점 실험의 1차 자료로는 서울대 과학교육연구소의 라우르산/팔미트산 냉각 곡선 지도자료가 있다. 시료 3 g/6 g을 물중탕으로 녹인 뒤 **1분마다 15분간** 온도를 기록해 그래프를 그리고 "어는 동안 일정한 온도"를 읽으며, 토의 질문은 "질량을 다르게 하면 어는 온도가 달라지는가", "어는 온도로 물질의 종류를 구별할 수 있는가"다 ([SERC (08)](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(08)1_3_4_%EB%81%93%EB%8A%94%EC%A0%90%EA%B3%BC_%EB%85%B9%EB%8A%94%EC%A0%90_%EA%B5%90%EA%B3%BC%EC%84%9C%ED%83%90%EA%B5%AC.pdf)). 채점 기준에 "같은 축의 눈금 간격을 동일하게 하고 측정값을 정확한 위치에 기록하여 그래프로 변환"이 포함되므로 ([SERC (09)](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(09)1_3_3_%EB%81%93%EB%8A%94%EC%A0%90%EA%B3%BC_%EB%85%B9%EB%8A%94%EC%A0%90_%EA%B5%90%EA%B3%BC%EC%84%9C%ED%83%90%EA%B5%AC.pdf)), 요구사항 (8)의 그래프 기능은 "자동 생성"뿐 아니라 축 선택·눈금 결정을 학생이 하는 모드를 두는 편이 교과서 평가와 맞는다[추론].

평가 방향은 2022 개정에서 "단편적 성취 수준 측정에서 학습의 전 과정을 기록하고 피드백하는 평가로 전환", 프로젝트 보고서·실험 노트·자기/동료 평가 결합을 권고하며, 「제5차 과학교육 종합계획(2025~2029)」은 '1학생 1탐구'를 과제로 제시한다 ([사이언스타임즈](https://sciencetimes.co.kr/news/sn/261565)). 요구사항 (11)(12)의 보고서·성찰 기능은 이 평가 방향과 정확히 정합하며, [추론] 측정값·그래프·예측·성찰이 세션 로그로 누적되는 포트폴리오형 구조가 지필식 채점보다 적합하다.

### 겨냥해야 할 오개념

서울대 과학교육연구소의 오개념 지도자료는 이 단원의 전형적 오개념을 열거한다: "끓는점에서도 불꽃을 크게 하면 온도가 올라간다", "물질의 양이 변하면 끓는점·녹는점이 변한다", "설탕이 녹는 것은 상태 변화", "포화 용액에 용질을 더 넣으면 진해진다", "용해도는 온도에 따라 변하므로 특성이 아니다", "밀도는 부피나 질량과 비슷한 개념", "좁은 그릇에 담으면 밀도가 커진다" ([SERC (04) 오개념](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(04)1_3_1_%EC%98%A4%EA%B0%9C%EB%85%90.pdf)). 인천 중3 98명 연구에서는 밀도 분리 문항 응답 63명 중 19명(약 30%)이 "밀도가 크면 뜬다", "설탕과 모래를 밀도차로 분리" 같은 오개념을 보였고, 우수 학생도 정의 수준의 오개념을 가졌다 ([koreascience JAKO201610236160131](https://koreascience.kr/article/JAKO201610236160131.pdf)). 해외 연구에서도 7학년의 **44%**가 같은 질량의 두 원기둥 중 큰 것을 밀도가 높다고 답했고, 절반가량이 물 치환으로 부피를 구하지 못했으며, 정성 비교를 정량 계산보다 먼저 가르치는 것이 효과적이었다 ([Hashweh 2015](https://fada.birzeit.edu/jspui/bitstream/20.500.11889/2503/1/The%20complexity%20of%20teaching%20density%20in%20middle%20school%281%29.pdf)).

[제안] 가상실험실은 오개념을 직접 겨냥하는 **대조 실험 프리셋**을 제공해야 한다: ① 시료 양 2배(3 g vs 6 g) → 평탄 구간 온도 동일, ② 가열 세기 슬라이더 → 끓는점 불변·도달 시간만 단축, ③ 그릇 바꾸기 → 밀도 불변, ④ 포화 후 용질 추가 → 침전만 증가, ⑤ 설탕+모래처럼 밀도차로 분리 불가한 과제로 방법 선택 오류 피드백. 뜨고 가라앉음 장면에서는 질량·부피·밀도 세 값을 항상 동시에 표시해 밀도와 무게의 혼동을 끊는다.

---

## 5. 교수학습 설계: 답을 보류하고, 예측을 강제하고, 채점은 코드가 한다

### 힌트 사다리는 4단, 2회 실패 시 자동 하강

증거는 "즉답"도 "질문만"도 아닌 적응형 사다리를 가리킨다. 터키 고교생 약 1,000명 현장실험에서 ChatGPT 모방형은 연습 성적을 48% 올렸지만 접근 차단 후 시험에서 **17% 낮은** 성적을 냈고, 힌트 위주 'GPT Tutor'는 연습 성적 127% 향상에 시험 저하를 대부분 상쇄했다 ([Bastani et al. 2024](https://papers.ssrn.com/abstract=4895486)). Stanford Tutor CoPilot RCT(튜터 700명+, 학생 1,000명+)는 AI 제안이 학생 숙달률을 +4%p, 저평가 튜터 담당 학생은 최대 +9%p 올렸고, 튜터가 "생각을 설명해 보라"고 요구할 확률이 10%p 증가하며 일반적 칭찬은 감소했다 ([Stanford NSSA](https://nssa.stanford.edu/studies/tutor-copilot-human-ai-approach-scaling-real-time-expertise)). 반면 순수 소크라테스식 힌트는 CS1 178명 RCT에서 풀이 시간·반복 오류를 늘렸고 ([SIGCSE TS 2026](https://sigcse2026.sigcse.org/details/sigcse-ts-2026-posters/161/To-Tell-or-to-Ask-Comparing-the-Effects-of-Targeted-vs-Socratic-AI-Hints)), 14~18세 122명 RCT에서는 참여는 높였지만 학습 이득이 유의하지 않았고 더 많은 학생이 "덜 도움된다"고 평가했다 ([Blasco & Charisi 2024](https://scale.stanford.edu/ai/repository/impact-large-language-models-students-randomised-study-socratic-vs-non-socratic-ai)). 자기 설명 프롬프트는 64개 연구 메타분석에서 **g = 0.55**였고 "개념을 설명하라"형이 메타인지 계획형보다 효과적이었다 ([Bisra 2018](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/CHU-KR-25_ENG_Bisra_2018_Selbsterklaerungen.pdf)). 힌트 남용도 실재한다. 기하 Cognitive Tutor에서 학생 행동의 36%가 힌트 남용이었고, 앞 힌트를 읽지 않고 바닥 힌트로 직행하는 경향이 있었다 ([LearnLab Help abuse](https://learnlab.org/research/wiki/index.php/Help_abuse)).

[제안] 이를 종합한 설계는 **L0 재진술("지금 뭘 구하려는 건지 한 문장으로") → L1 개념 지목(공식 의미만) → L2 부분 예시(예시 숫자로 첫 단계) → L3 바닥 힌트 + 자기 설명 요구**의 4단이다. 한 턴에 한 단계만, 시도 입력 없이는 같은 단계를 다른 표현으로 반복, 2회 틀리거나 3분 정체 시 자동 하강, 두 번째 같은 유형 과제부터는 L0만 먼저 주는 페이딩(컴퓨터 비계 메타분석에서 페이딩+추가 조합 g=0.590 ([Educ Psychol Rev 2018](https://link.springer.com/10.1007/s10648-017-9419-1)))을 적용한다. UI는 "힌트 더 보기" 버튼 대신 **"내 생각 입력 → 힌트"** 흐름이 남용을 막는다. 프로토타입의 "다음 한 단계만 안내" 규칙은 L3에 해당하므로, 새 앱은 그 앞에 L0~L2를 추가하는 셈이다.

### 예측 게이트는 UI가 잠그고, 예측 실패 시 정답 대신 선택지를 좁힌다

가상실험 표준 리뷰는 가상과 실물 실험의 개념 이해 효과가 다수 연구에서 차이가 없고, "결과를 예측하고 결과와 비교하게 하라"를 권장 전략으로 제시하며, 로그로 무작위 실험을 탐지해 성찰을 촉구할 수 있다고 본다 ([de Jong, Linn & Zacharia 2013](https://users.gw.utwente.nl/jong/dejonglinnzacharia%20science.pdf)). POE 준실험들은 성취·태도·파지에서 일관되게 긍정적이나 효과크기 보고가 부실하다 ([Özcan & Uyanık 2022](https://unis.kastamonu.edu.tr/yayin-detay/2_CZGuC3a_60/the-effects-of-the-predict-observe-explain-poe-strategy-on-academic-achievement-attitude-and-retention-in-science-learning); [IJMSS 2024](https://systems.enpress-publisher.com/index.php/IJMSS/article/view/5518/0)).

[제안] 요구사항 (13)의 POE 흐름: ① 변인 설정 완료 → ② "결과 공개"/"그래프 그리기" 버튼 **잠금** → ③ 예측 입력(그래프 모양 3~4지선다 + "왜냐하면…" 1줄; 가열 곡선은 점을 끌어 예측 곡선을 직접 그리는 위젯도 가능) → ④ 실행·관찰 → ⑤ "예측과 같았어? 달랐다면 왜?" → ⑥ 다음 변인. 예측을 못 하면 P1 선택지 축소("계속 오를까, 어디선가 멈출까"), P2 극단 비교("얼음 녹을 때 온도계는?"), P3 오개념 겨냥 반례("불꽃을 2배로 올려 평평한 구간을 비교해 보자")로 돕되 정답 예측은 주지 않는다. 예측이 틀려도 "틀렸다"가 아니라 "예측과 결과가 다른 것이 탐구의 핵심"으로 프레이밍한다. 변인을 동시에 2개 이상 바꾸면 "어느 변인 때문인지 알 수 있을까?"를 묻는다(de Jong의 로그 기반 안내를 상태 주입으로 구현).

### 계산값 검증: 모델이 아니라 코드가 채점한다

요구사항 (10)은 아첨(sycophancy) 문제와 직결된다. MMLU 14,042문항 실험에서 학생이 오답을 제시하면 정확도가 최대 15점 떨어졌고, GPT-4.1은 6.2%, GPT-4.1-nano는 **18.8%** 빈도로 사용자 제안에 따라 답을 바꿨다 ([Arvin 2025](https://arxiv.org/pdf/2506.10297)). Stanford SCALE는 "교정 용기(corrective courage)"를 안전 요건으로 취급하라고 권고하며, 권위 압력·사회정서 압력에서 모델이 정답을 철회하는 벤치마크(EduFrameTrap)를 제안했다 ([Stanford SCALE](https://scale.stanford.edu/ai/repository/sycophancy-educational-safety-risk-why-llm-tutors-need-sycophancy-benchmarks)). 따라서 [제안] 정답은 학생별 시뮬레이션 데이터에서 서버 코드가 재계산하고, 모델은 `<상태>`의 `check` 결과(`correct`, `error_type`)를 받아 힌트만 생성한다. 허용오차는 1차 연구가 없어 설계 제안으로 둔다: 밀도 ±2~3% 또는 소수 둘째 자리 반올림 차이까지 정답, 오류 진단 우선순위는 (1) 값이 부피÷질량과 일치 → `swapped`, (2) 단위 누락·혼동 → `unit`, (3) 부피 ±0.5 mL → `meniscus`, (4) 10배 차이 → `decimal`; 용해도는 물 100 g 환산 누락 → `solvent_basis`; 가열 곡선은 평탄 구간 ±1℃ 정답, 상승 구간 값 → `plateau`. 이 오류 코드들은 서울대 오개념 자료("용액 100 g 기준", "세게 가열하면 온도 상승")를 직접 반영한다 ([SERC 오개념](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(04)1_3_1_오개념_수정본(오타,_띄어쓰기).pdf)). 13~14세용 교정 문구 원칙[추론]: 틀린 부분을 '행동'으로 지목("부피 칸"), 한 가지만, 학생 데이터로 되돌림("네 표 3행 값으로"), 감정어 최소, 성공 시 다음 행동으로 즉시 이동.

### 탐구 보고서·성찰 템플릿과 루브릭

공식 교육청 루브릭 1차 자료는 확보하지 못했다. 교사·사교육 자료가 공통으로 지적하는 감점 요소는 "신기했고 재미있었다"식 감상, 변인 통제 설명 누락, 예상과 다른 결과를 '실패'로 쓰고 오차 분석을 생략하는 것이며, 상위권은 원인-결과형 가설·조작/통제변인 명시·오차 원인과 개선안을 쓴다 ([내일신문 2025](https://www.localnaeil.com/News/View/654832) — 학원 홍보성 기사로 독립 검증되지 않음). [제안] 보고서 템플릿(9항목): ① 제목("~에 따른 ~의 변화"), ② 탐구 목표("~일까?"), ③ 가설(POE 예측 자동 전사), ④ 변인(조작/종속/통제), ⑤ 준비물(블록에서 자동), ⑥ 실험 과정(블록 로그 기반 초안 + 학생 수정), ⑦ 결과(표: 측정값 제시 + 계산값 학생 기입, 그래프), ⑧ 해석·결론(경향, 가설 지지/기각, 오차·한계), ⑨ 느낀 점·성찰(예상과 결과가 달랐던 점과 이유 / 가장 어려웠던 부분과 해결 / 더 알아보고 싶은 점 / 실생활 연결). 요구사항 (12)의 성찰은 감상이 아니라 이 네 질문으로 구조화한다.

| 항목 | 상 | 중 | 하 |
|---|---|---|---|
| 가설·변인 | 원인-결과형 가설 + 조작/통제변인 명시 | 가설은 있으나 변인 일부 누락 | 가설 없음/변인 미구분 |
| 자료 정리 | 표+그래프+단위 정확 | 표만, 단위 일부 누락 | 서술만 |
| 해석·결론 | 경향+가설 판단+오차 원인+개선안 | 경향+가설 판단 | 결과 재진술 |
| 성찰 | 네 질문 모두 | 2개 | 감상만 |

(위 루브릭은 제안이며 학교 평가 기준과 대조가 필요하다.) AI 지원은 "쓰지 않고 돕기"로 제한한다: 섹션별 안내 질문 1개, 빈칸 문장 시작어 1개, 초안에 대해 루브릭 항목 이름으로 부족한 점 1가지만 지적. 제출 시 "AI 도움 받은 부분" 체크박스를 두어 교육부 윤리원칙 ⑨ 투명성과 전북교육청 가이드라인의 "AI 사용 시 서비스·목적·범위 공개"에 정렬한다 ([스마트투데이 2022](https://www.smarttoday.co.kr/ko-kr/articles/24171); [한국교육신문 2026](https://hangyo.com/mobile/article.html?no=108725)).

### 한국어 시스템 프롬프트 규칙 예시

Claude 프롬프트 모범사례는 규칙의 **이유를 설명**하고, XML로 지시·맥락·입력을 분리하며, 3~5개 예시를 두고, "CRITICAL/NEVER" 같은 과도한 강조를 피하고, "하지 말 것"보다 "할 것"으로 쓰며, LaTeX 기본 출력이므로 UI가 지원하지 않으면 평문 수식을 지시하라고 한다 ([Claude prompting best practices](https://platform.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices)). Anthropic의 Learning mode는 "How would you approach this problem?", "What evidence supports your conclusion?" 같은 안내 질문을 핵심으로 한다 ([Anthropic 2025](https://www.anthropic.com/news/introducing-claude-for-education)). 말투는 10대의 약 97%가 AI에게 반말을 쓰지만 이는 사용자 발화 데이터이므로 ([유니콘팩토리 2024](https://www.unicornfactory.co.kr/article/2024103111050573207)), [제안] 해요체 기본에 교사 설정으로 반말 허용이 보수적이다. 프로토타입은 반말을 쓰고 있으므로 교사가 선택하게 한다.

```
<역할>
너는 중학교 2학년 '물질의 특성' 가상실험실의 과학 탐구 도우미야. 학생이 스스로 실험을 설계하고,
결과를 예측·해석하고, 탐구 보고서를 자기 힘으로 쓰도록 돕는다. 답을 대신 내주는 것이 아니라
학생의 생각을 끌어내는 것이 네 역할이다.
</역할>
<상태>  ← 앱이 매 턴 갱신 (JSON)
단원, 단계{설계|예측|수행|해석|보고서}, prediction_submitted, 작업공간 블록 요약,
학생 입력값, check{correct, error_type}, hint_level{0-3}, idle_seconds, 시뮬레이션 정답값(비공개)
</상태>
<힌트_규칙>
- 막혔을 때 정답이나 완성된 식을 바로 주지 않는다. 이유: 답을 먼저 받으면 추론 연습이 사라진다.
- hint_level에 맞는 힌트 하나만, 질문은 한 응답에 하나만.
  0: 지금 하려는 것을 한 문장으로 다시 말하게 한다.
  1: 관련 개념 하나만 떠올리게 한다(공식의 의미를 묻되 공식은 쓰지 않는다).
  2: 첫 계산 단계를 예시 숫자로 보여 주고 학생 값으로 이어 하게 한다.
  3: 다음 한 단계를 명시하되, 왜 그런지 학생 말로 설명하면 다음으로 넘어간다.
- 시도 없이 다시 요청하면 같은 단계를 다른 말로 반복하고 "먼저 네 생각을 한 줄만 적어 줘"라고 한다.
</힌트_규칙>
<예측_규칙>
- prediction_submitted가 false이면 결과(그래프 모양, 뜨고 가라앉음, 녹는 양)를 말하지 않고
  "먼저 네 예측을 적어 보자"로 응답한다.
- 예측을 못 하면 결과를 두 가지로 좁혀 고르게 하고, 비슷한 경험을 떠올리게 하고,
  그래도 어려우면 "틀려도 괜찮아, 그게 더 좋은 공부야"라며 선택을 받는다.
</예측_규칙>
<검증_규칙>
- 계산값의 정오는 네가 판단하지 않는다. <상태>의 check를 그대로 따른다. 이유: 학생이 우겨도
  데이터가 기준이어야 한다. 반박하면 사과하지 않고 표의 질량·부피 셀을 함께 다시 읽자고 한다.
- 녹는점·끓는점·용해도 수치는 <상태>에 있는 값만 쓴다. 없으면 "시뮬레이션에서 직접 재 보자".
</검증_규칙>
<보고서_규칙>
- 어떤 섹션도 학생 대신 문장을 완성하지 않는다. 할 수 있는 것: 안내 질문 1개, 빈칸 문장 시작어 1개,
  루브릭 항목 이름으로 부족한 점 1가지.
- 느낀 점이 "재미있었다/신기했다"로 끝나면 예상-결과 차이, 어려웠던 순간, 바꿔 보고 싶은 변인 중 하나를 더 묻는다.
- "실패"라는 말 대신 오차 원인 1가지와 개선안 1가지를 쓰도록 돕는다.
</보고서_규칙>
<참여_규칙>
- idle_seconds ≥ 120이고 아직 넛지를 보내지 않았으면 한 번만 짧게 묻는다. 연속 넛지는 하지 않는다.
- 무관한 대화가 3턴 이상이면 한 문장으로 받고 현재 단계의 다음 행동을 제안한다.
- 칭찬은 행동을 특정해 한 문장만("단위를 챙긴 게 좋았어"). 이모지는 응답당 최대 1개, 오답·안전 상황에서는 0개.
- 위험 신호(자해·폭력·괴롭힘)가 보이면 공감 한 문장 후 선생님께 알리도록 안내하고 flag_teacher=true.
- 수식은 평문으로(27 ÷ 10 = 2.7 g/mL). 학생 이름·학교·연락처를 묻거나 저장하지 않는다.
</참여_규칙>
<출력_형식>
JSON: {"reply": "...", "hint_level": 0-3, "next_step": "...", "flag_teacher": false}
</출력_형식>
```

Khanmigo의 가드레일(주제 이탈 재유도, 부적절 대화 중단·보호자 통지, 심각 주제 이모지 금지)과 OpenAI Study Mode의 "DO NOT DO THE USER'S WORK FOR THEM", 짧은 응답 원칙도 위 규칙에 반영했다 ([Khan Academy](https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo); [Simon Willison 2025](https://simonwillison.net/2025/Jul/29/openai-introducing-study-mode)).

---

## 6. 블록코딩·시뮬레이션·그래프: Blockly 위에 결정론적 리듀서를 올린다

### Blockly core + 자체 래퍼를 권고한다

Blockly는 2025-11-10 Google에서 Raspberry Pi Foundation으로 이관됐지만 "계속 무료·오픈소스"이며 기존 프로젝트는 변경이 필요 없다 ([Google Open Source Blog](https://opensource.googleblog.com/2025/10/blockly-graduates-from-google.html)). **v13.0.0(2026-06-15)**은 키보드 내비게이션과 스크린리더 접근성을 기본 활성화하고, 기본 렌더러를 thrasos로 바꿨으며, 최소 Safari 15.4를 요구하고, 커스텀 블록·필드에 ARIA 갱신을 요구한다 ([blockly-announce v13.0.0](https://groups.google.com/g/blockly-announce/c/U9-gdZN5NvM)). 한국어는 `import * as Ko from 'blockly/msg/ko'; Blockly.setLocale(Ko);`를 워크스페이스 생성 전에 호출하고 커스텀 블록 메시지는 `%{BKY_...}` 토큰으로 넣는다 ([Blockly Translations](https://docs.blockly.com/guides/configure/translations/)). React 래퍼 `react-blockly`(9.0.0)는 저자가 "더 이상 유지보수하지 않음"을 명시했으므로 ([GitHub nbudin/react-blockly](https://github.com/nbudin/react-blockly)) `useEffect`에서 `Blockly.inject/dispose`를 호출하고 `addChangeListener`로 JSON을 끌어올리는 50~100줄 자체 래퍼를 쓰고, Next.js에서는 `next/dynamic({ssr:false})`로 로드한다[제안].

대안 검토 결과, scratch-blocks 2.0은 Blockly v12 위에 "라이브러리로 의존"하는 구조로 바뀌었지만 scratch-gui/vm은 **AGPL-3.0**이라 소스 공개 의무가 생길 수 있고 ([GitHub scratch-blocks](https://github.com/scratchfoundation/scratch-blocks); [scratch-editor](https://github.com/RaspberryPiFoundation/scratch-editor)), 엔트리 entryjs는 Apache-2.0이지만 jQuery·CreateJS 등 레거시 의존성이 많아 Next.js 통합 비용이 크다 ([GitHub entrylabs/entryjs](https://github.com/entrylabs/entryjs)). 커스텀 DnD(dnd-kit 6.x, 주간 ~2.8M 다운로드, 코어 ~6KB, 접근성 우수)는 프로토타입의 자연스러운 진화 경로이지만 스냅·중첩·복붙·다중선택·실행취소·직렬화를 전부 직접 만들어야 한다 ([pkgpulse 2026](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026)). 프로토타입은 이미 HTML5 DnD로 그 대부분을 구현했으므로 "블록 종류 10개 이내의 선형 절차"라면 dnd-kit 이식도 가능하지만, 혼합물 분리1의 '위치' 탭처럼 블록 종류와 슬롯 중첩이 늘고 접근성(KWCAG)을 충족해야 하므로 **Blockly가 1순위**다. 슬롯 타입 체크(`check: ['재료'|'수치']`)로 "준비물/수치 블록만 끼워짐"을 엔진 수준에서 보장하고, Blockly JSON 직렬화가 곧 시뮬레이터 DSL의 중간표현이 된다. 다중선택 플러그인 `@mit-app-inventor/blockly-plugin-workspace-multiselect`의 v13 호환은 미확인이므로 도입 전 로컬 테스트가 필요하다 ([jsDelivr](https://www.jsdelivr.com/package/npm/@mit-app-inventor/blockly-plugin-workspace-multiselect)).

### 실시간 검증은 2계층, 편집 중 힌트 수준은 교사가 정한다

Blockly 공식 codelab의 권장 순서는 "명백한 값은 validator로 자동 교정 → 모호하면 `setWarningText`로 블록 경고 배지 → 코드 생성이 무의미할 때만 `setDisabledReason`"이며, 비활성화 이벤트는 유발 이벤트와 같은 group으로 묶어 undo 일관성을 유지하고, 플라이아웃 블록은 비활성화하지 말라고 한다 ([Blockly validation codelab](https://docs.blockly.com/codelabs/validation-and-warnings/displaying-warnings/)). "모든 워크스페이스 변경은 이벤트를 발생"시키므로 리스너에서 분기한다 ([Blockly Events](https://docs.blockly.com/guides/configure/events/)). [제안] 요구사항 (6)의 구현: ① 블록 로컬(즉시) — 빈 슬롯, 수치 범위(0 < mL ≤ 용기 용량), 단위 → `setWarningText` + validator; ② 절차 전역(디바운스 200~300ms) — UI 이벤트를 무시하고 JSON 직렬화 → 시뮬레이터의 **dry-run**(사전조건만 평가) → 진단을 blockId에 매핑해 경고 + 우측 "실험 점검" 패널 목록. 편집 중 경고와 실행 시 오류가 **같은 규칙 엔진**을 공유하므로 메시지가 어긋나지 않는다. 학습 효과를 위해 교사 설정으로 "편집 중 힌트 수준(없음/빈 슬롯만/전부)"을 두어, "실행해 보고 깨닫는" 기회를 남긴다. 경고 아이콘만으로는 중학생이 놓치기 쉬우므로 블록 테두리 색 + 패널 배지 카운트 + ARIA live region 요약을 병행한다.

### 시뮬레이션 엔진: 불변 상태 + 순수 함수 + 시드 난수

[제안] 엔진은 `applyStep(state, step, rng) → {state', frames[], diagnostics[]}` 형태의 결정론적 리듀서로 만든다. 사전조건 규칙은 데이터로 선언한다: `measure_mass` requires `scale.zeroed && container_on_scale`; `heat` requires `apparatus.assembled && thermometer.inserted`; `submerge_solid` requires `solid.massMeasured`. 위반 시 `severity:'error'`로 실행을 멈추거나, "잘못된 값이 기록됨"(영점 없이 측정 → 용기 질량이 더해진 값, 젖은 시료 +0.3~1 g)으로 분기할 수 있는데, 후자가 학습 효과가 크다. PhET 연구가 보여주듯 학생에게 도구를 쥐어주고 스스로 검증하게 하는 구조(6학년 학생이 "무거운 스케이터가 더 빠르다"는 오개념을 속도계로 스스로 수정)가 "틀렸습니다" 팝업보다 효과적일 가능성이 높다 ([Podolefsky, Moore & Perkins](https://arxiv.org/pdf/1306.6544)). PhET의 암묵적 비계 원칙 — 파라미터 범위 제한(극단값 탐색이 유의미한 비교가 되게), 즉시 피드백, Reset All로 저위험 반복, 최소 텍스트 — 를 모니터 UX에 적용한다. 지시문 없이 10분 만에 평균 23개 중 18개 기능을 사용했지만 36%만 탐색한 핵심 기능에는 표적 안내 질문이 필요했다는 결과는 ([RSC CERP 2013](https://pubs.rsc.org/en/content/articlehtml/2013/rp/c3rp20157k)) 영점조정 같은 단계를 튜터가 콕 집어 묻는 근거다.

가열 곡선 모델은 중학 수준의 구간별 선형(고체 구간 기울기 `P/(m·c_s)`, 녹는점 평탄 `m·L_f/P`, 액체 구간, 끓는점 평탄)으로 충분하고, 물중탕은 `dT/dt = h·(T_bath − T)`로 두면 "완만한 S자 + 평탄"이 자연스럽다. 증류는 남은 에탄올 분율 x에 대한 경험적 보간 `T_bp(x) = 78.4 + 21.6·(1−x)^n`과 증류액 분율 테이블로 "혼합물은 끓는점이 일정하지 않다"를 드러낸다. 재결정은 `precipitate = max(0, dissolved − S(T_low)·water/100)`. 학생별 시드(`hash(studentId + experimentId)`)로 저울 ±0.1 g, 온도계 ±0.5℃, 눈금 ±0.5 mL 노이즈와 시료 질량 ±3~5% 변동을 주되 평탄 구간 중심은 참조값 ±0.5℃로 묶어 "교과서와 일치하되 숫자는 다름"을 보장한다. 이는 복붙 방지와 요구사항 (10)의 "그 학생의 데이터에서 정답 재계산"의 기반이 된다. 하네스 리포의 평가 무결성 규칙("문항 순서는 학생마다 시드 기반 랜덤화 — 재현 가능해야 함")과 같은 원리다.

### 참조 물성 데이터

| 물질 | 값 | 출처 | 교과서 값과 비교 |
|---|---|---|---|
| 에탄올 끓는점 | 351.5 ± 0.2 K ≈ 78.4℃ | [NIST WebBook](https://webbook.nist.gov/cgi/cbook.cgi?Name=ethanol&Units=SI&Mask=4) | 교재 78℃ |
| 라우르산 녹는점 | 317 ± 2 K ≈ 43.9℃ | [NIST WebBook](https://webbook.nist.gov/cgi/cbook.cgi?Name=lauric+acid&Units=SI&Mask=4) | SERC 43.5, 교과서 44 |
| 팔미트산 녹는점 | 335 ± 1 K ≈ 61.9℃ | [NIST WebBook](https://webbook.nist.gov/cgi/cbook.cgi?Name=palmitic+acid&Units=SI&Mask=4) | SERC 62.7, 교과서 63 (약 1℃ 차) |
| KNO₃ 용해도 (g/100 mL) | 0℃ 13.3 / 20℃ 31.6 / 40℃ 63.9 / 60℃ 110.0 / 80℃ 169 / 100℃ 246 | [Wikipedia Solubility table](https://en.wikipedia.org/wiki/Solubility_table) | SERC 20℃ 31.6 일치 |
| H₃BO₃(붕산) | 0℃ 2.59 / 20℃ 4.95 / 40℃ 8.79 / 60℃ 14.90 / 80℃ 23.61 / 100℃ 37.99 | 동일 | SERC 4.9 |
| CuSO₄·5H₂O | 0℃ 23.1 / 20℃ 32 / 40℃ 44.6 / 60℃ 61.8 / 80℃ 83.8 / 100℃ 114 | 동일 | — |
| NaCl 40℃ | 약 36.5 g | [wonedu](https://www.wonedu.org/ms-science/%EA%B3%BC%ED%95%99%E2%91%A1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1%EC%9D%98%20%EC%9D%98%EB%AF%B8/) | 온도 의존 거의 없음 |
| 밀도 (g/cm³) | 얼음 0.92, 물 1.00, 기름 0.92, 알루미늄 2.70, 철 7.87, 금 19.3 | [wonedu](https://www.wonedu.org/ms-science/%EA%B3%BC%ED%95%99%E2%91%A1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1%EC%9D%98%20%EC%9D%98%EB%AF%B8/) | 프로토타입 철 7.9 |

용해도 표는 Wikipedia(g/100 mL) 2차 자료이므로 CRC 재확인이 권장되며, 교과서 값(44/63℃)과 NIST 값의 1~2℃ 차이는 `TEXTBOOK_MODE` 상수로 흡수하고 설정에서 전환 가능하게 한다. 라우르산·팔미트산의 비열·융해열은 확보하지 못했으므로 곡선 모양만 맞추는 상대값으로 둔다.

### 차트: Recharts(결과) + Chart.js dragdata(예측 그리기)

Chart.js는 gzip 약 46~60 kB(canvas), Recharts v3는 React 외부화 시 약 97~113 kB(SVG), ECharts 157~177 kB이며 측정 방식이 달라 직접 비교는 제한적이다 ([TanStack Charts comparison](https://tanstack.com/charts/latest/docs/framework/react/comparison)). Recharts v3는 `accessibilityLayer`가 기본 활성이고, react-chartjs-2는 canvas라 접근성 대안이 필요하다 ([LogRocket 2026](https://blog.logrocket.com/top-5-react-chart-libraries/)). `chartjs-plugin-dragdata`(MIT)는 점 드래그, 터치(`pointHitRadius` 25 이상 권장), `onDrag` 값 제한, `magnet` 스냅, `round`를 지원한다 ([npm chartjs-plugin-dragdata](https://npmjs.org/package/chartjs-plugin-dragdata)). [제안] 결과 표·차트는 Recharts(ReferenceArea로 평탄 구간 음영, SSR 가능), 예측 그리기 위젯은 Chart.js + dragdata로 "점 5~8개를 끌어 예측 곡선 → 실제 데이터셋 추가로 reveal(점선 vs 실선)". 번들 단일화가 중요하면 Chart.js + annotation 플러그인으로 통일한다. 축 선택(시간/온도/질량/부피)은 학생이 드롭다운으로 고르게 하고 잘못된 조합은 즉시 피드백한다. 보고서용 PNG는 Chart.js `toBase64Image()`가 간단하며 Noto Sans KR/Pretendard를 `document.fonts.ready` 후 렌더링한다. 접근성을 위해 canvas 차트 옆에 데이터 표를 항상 제공한다.

### 모니터 렌더링: SVG + CSS, 입자만 canvas

객체 수가 적고 상태 전환이 핵심이므로 SVG + CSS transition(필요 시 Framer Motion 제한 사용)이 유지보수·접근성·터치에서 유리하다. PixiJS v8은 10만 스프라이트 벤치마크에서 CPU 프레임 50→15 ms로 빠르지만 ([PixiJS v8](https://pixijs.com/blog/pixi-v8-launches)) 기포·결정 입자가 수천 개일 때만 필요하다. [제안] 장치·액체 높이·온도계 = SVG, 기포·결정·증기 = 작은 `<canvas>` 오버레이(≤500 입자, 성능 모드), 프레임 재생은 SVG/DOM 10~15 fps 스로틀. 400개 이상 SVG 요소 애니메이션에서 성능 이슈가 보고된 바 있다 ([GSAP forum](https://gsap.com/community/forums/topic/17587-over-400-svg-elements-performance/)). 모니터 옆에 텍스트 로그("00:30 온도 44℃, 녹기 시작")를 두면 스크린리더와 저사양 환경을 함께 지원한다.

---

## 7. 시스템 아키텍처: Haiku 5.5·Route Handler·RLS로 비용과 보안을 동시에 잡는다

### 모델 선택과 가격

2026-10 현행 모델은 모두 1M 컨텍스트·128K 출력이다: Fable 5.1 $10/$50, Opus 5.5 $4/$20, **Sonnet 5.5 $2/$10**, **Haiku 5.5 $0.10/$0.50**(≤100K 토큰; 초과 시 $0.50/$2.50) ([Models overview](https://platform.claude.com/docs/en/models/overview); [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)). 프로토타입의 `claude-sonnet-4-6`은 $3/$15로 Sonnet 5.5보다 비싸고 캐시 최소 길이도 1,024 토큰(5.5 세대는 512)이다 ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). 캐시 가격은 Haiku 5.5 5분 쓰기 $0.125·읽기 $0.01, Sonnet 5.5 $2.50·$0.10이고, Batch API는 50% 할인이다 ([Pricing](https://platform.claude.com/docs/en/about-claude/pricing)). [제안] 2티어: `CLAUDE_MODEL_TUTOR=claude-haiku-5-5`(대화형 힌트), `CLAUDE_MODEL_GRADER=claude-sonnet-5-5`(보고서 피드백·오개념 진단·교사 요약). 모델 ID는 환경변수로 분리한다. 한국어 품질의 공식 비교 자료는 없으므로 Haiku의 한국어 힌트 품질은 파일럿에서 실측해야 한다.

### 호출 경로: Next.js Route Handler(Node, 서울)

Vercel Functions는 Hobby에서도 300초(스트리밍 포함), Pro 최대 800초, 메모리 Hobby 2GB이며 I/O 대기는 Active CPU에 과금되지 않는다 ([Vercel Functions limits](https://vercel.com/docs/functions/limitations)). Supabase Edge Function은 CPU 2초/요청·256MB·Free 150초 wall-clock 제한이 있어 ([Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)) LLM 프록시보다는 제출 웹훅·크론·PDF 생성에 적합하다. 리전은 Vercel `icn1`(ap-northeast-2 서울)과 Supabase 서울을 맞춘다 ([Regions](https://vercel.com/docs/regions); [Supabase Regions](https://supabase.com/docs/guides/platform/regions)). Claude API는 미국 엔드포인트이므로 LLM 지연은 리전과 무관하다.

스트리밍은 SSE 이벤트(`message_start → content_block_delta … → message_stop`)이며 ([Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)) Vercel AI SDK의 `streamText` + `createUIMessageStreamResponse`와 클라이언트 `useChat`으로 통합한다 ([AI SDK quickstart](https://ai-sdk.dev/docs/getting-started/nextjs-app-router)). 캐싱은 `providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } }`를 시스템 메시지에 지정하고 사용량은 `usage.inputTokenDetails.cacheReadTokens`로 확인한다 ([AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)).

```ts
// app/api/tutor/route.ts  (Node 런타임, export const maxDuration = 120)
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream } from 'ai';

export async function POST(req: Request) {
  const supabase = await createServerClient();           // @supabase/ssr, getClaims()로 소유자 검증
  const { sessionId, messages } = await req.json();
  const ctx = await loadSessionContext(supabase, sessionId); // 실험 spec, 상태, check 결과, 최근 메시지
  const result = streamText({
    model: anthropic(process.env.CLAUDE_MODEL_TUTOR ?? 'claude-haiku-5-5'),
    messages: [
      { role: 'system', content: TUTOR_RULES },
      { role: 'system', content: ctx.knowledgeBase,       // 실험별 ~4k 토큰, 끝에 캐시 브레이크포인트
        providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
      { role: 'system', content: `<상태>${JSON.stringify(ctx.state)}</상태>` },
      ...(await convertToModelMessages(messages)),
    ],
    onFinish: async ({ text, usage }) => { await saveChat(supabase, sessionId, text, usage); },
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
```

계산값 검증과 보고서 피드백처럼 구조가 필요한 호출은 비스트리밍 + `output_config.format = { type: "json_schema", schema }`를 쓴다. 베타 헤더가 불필요하고, `additionalProperties: false` 필수, `minimum/maximum` 미지원이므로 `hint_level`은 `enum: [0,1,2,3]`으로 표현한다 ([Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)). 캐시 프리픽스 순서는 tools → system → messages이고, 요청 최상위 `cache_control`로 자동 캐싱을 켜면 대화 이력도 캐시되며, 5분 TTL은 읽을 때마다 무료 갱신된다 ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). 레이트 리밋은 Start 티어에서 Sonnet/Haiku 각 1,000 RPM·2M ITPM이고 캐시 읽기는 ITPM에 미포함이므로 ([Rate limits](https://platform.claude.com/docs/en/api/rate-limits)) 한 학급은 물론 전교 동시 사용도 여유가 있다.

### Supabase 스키마와 RLS

역할은 `profiles.role` + (선택) Custom Access Token Hook으로 JWT 클레임에 복사하는 것이 공식 패턴이고, RLS는 연산별 정책 분리, `(select auth.uid())`로 initPlan 캐시, `user_metadata` 대신 `app_metadata`, 상호 참조 정책의 재귀(`42P17`)는 private 스키마의 `security definer` 함수로 끊는다 ([Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac); [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)). 서버에서는 `getClaims()`/`getUser()`를 쓰고 `getSession()`은 신뢰하지 않는다 ([Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)). [제안] 스키마 핵심:

```sql
create type public.app_role as enum ('student','teacher','admin');
create table public.profiles (id uuid primary key references auth.users on delete cascade,
  role app_role not null default 'student', display_name text not null, school text,
  consent_on_file boolean not null default false, consent_date date);   -- 보호자 동의 플래그
create table public.classes (id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id), name text not null,
  join_code text not null unique);
create table public.enrollments (class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade, primary key (class_id, student_id));
create table public.experiments (id uuid primary key default gen_random_uuid(), slug text unique,
  title text, spec jsonb not null, is_published boolean default false);  -- 허용 블록, 정답 범위, 시뮬 파라미터
create table public.sessions (id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id), class_id uuid references public.classes(id),
  experiment_id uuid references public.experiments(id), seed text not null,
  status text not null default 'in_progress',   -- in_progress|submitted|returned|resubmitted
  started_at timestamptz default now(), submitted_at timestamptz);
create table public.block_programs (id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade, program jsonb not null,
  version int default 1, saved_at timestamptz default now());
create table public.measurements (id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id) on delete cascade, key text not null,
  value numeric, is_student_input boolean default false, is_correct boolean, error_type text);
create table public.predictions (id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id) on delete cascade, target text not null,
  choice text, rationale text, matched boolean);
create table public.reports (session_id uuid primary key references public.sessions(id) on delete cascade,
  content jsonb not null, ai_assisted_sections text[], version int default 1, updated_at timestamptz default now());
create table public.submissions (id uuid primary key default gen_random_uuid(),
  session_id uuid unique references public.sessions(id) on delete cascade,
  submitted_at timestamptz default now(), late boolean default false,
  rubric_scores jsonb, teacher_feedback text, ai_feedback jsonb, returned_at timestamptz);
create table public.chat_messages (id bigint generated always as identity primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  role text check (role in ('user','assistant')), content text not null,
  meta jsonb, flagged boolean default false, created_at timestamptz default now());
create table public.events (id bigint generated always as identity primary key,   -- 교사 대시보드용 불변 로그
  session_id uuid references public.sessions(id) on delete cascade,
  event_type text not null, payload jsonb, ts timestamptz default now());
```

RLS 핵심 패턴(공식 가이드 적용):

```sql
create schema if not exists private;
create or replace function private.my_teaching_class_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.classes where teacher_id = (select auth.uid()) $$;
revoke all on function private.my_teaching_class_ids() from public, anon;
grant execute on function private.my_teaching_class_ids() to authenticated;

alter table public.sessions enable row level security;
create policy "student selects own" on public.sessions for select to authenticated
  using ((select auth.uid()) = student_id);
create policy "student updates own in-progress" on public.sessions for update to authenticated
  using ((select auth.uid()) = student_id and status = 'in_progress')
  with check ((select auth.uid()) = student_id);
create policy "teacher selects class sessions" on public.sessions for select to authenticated
  using (class_id in (select private.my_teaching_class_ids()));

-- 반 참여 RPC: join_code는 security definer 함수로만 조회
create or replace function public.join_class(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_class uuid;
begin
  select id into v_class from public.classes where join_code = upper(p_code);
  if v_class is null then raise exception 'invalid_join_code'; end if;
  insert into public.enrollments(class_id, student_id) values (v_class, (select auth.uid()))
  on conflict do nothing;
  return v_class;
end $$;
```

프로토타입이 없던 두 테이블(`predictions`, `events`)과 `sessions.seed`, `measurements.is_student_input/error_type`, `reports.ai_assisted_sections`가 요구사항 (10)(13)(14)와 교사 대시보드를 직접 지원한다. 교사 계정은 학생이 교사로 가입할 수 있으므로 관리자 승격 또는 학교 이메일 도메인 화이트리스트가 필요하고, 이메일 없는 중학생 계정은 교사가 "반 코드 + 학번/닉네임 + PIN"으로 서버(service role)에서 생성하는 방식이 현실적이다[제안; 공식 K-12 가이드는 없음]. 정답 범위·시뮬레이션 파라미터는 `experiments.spec`에만 두고 클라이언트 응답에 포함하지 않는다(하네스 리포의 "정답 데이터 API 응답 포함 금지" 규칙과 일치).

### 플랜 한도와 비용 추정

Supabase Free는 DB 500MB·MAU 5만·Realtime 동시 200이지만 **1주 비활성 시 일시정지**되어 방학 중 반드시 발생하고, Pro($25/월)는 일시정지가 없다 ([Supabase pricing](https://supabase.com/pricing)). Vercel Hobby는 "비상업·개인 용도로만" 제한되므로 학교 공식 서비스는 Pro($20/시트/월) 또는 약관 확인이 필요하다 ([Vercel Hobby plan](https://vercel.com/docs/plans/hobby)). Realtime Postgres Changes는 구독자마다 RLS를 검사하므로 대시보드 구독은 교사 수(≤200)에 한정하고 학생 클라이언트는 구독하지 않는다 ([Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)).

LLM 비용(가정: 턴당 입력 150·출력 250 토큰, 20턴 이력 ≈ 3,800 토큰, 시스템+KB 4,000 토큰, 30명×6실험×20턴 = 3,600턴):

| 시나리오 | Haiku 5.5 | Sonnet 5.5 | Sonnet 4.6(프로토타입) |
|---|---|---|---|
| A. KB만 캐시, 이력 비캐시 | ≈ $2.1 | ≈ $39.6 | ≈ $61.5 |
| A'. 턴마다 캐시 재쓰기(5분 초과) | ≈ $3.8 | ≈ $74 | ≈ $113 |
| B. 자동 캐싱으로 이력까지 캐시 | ≈ $0.9 | ≈ $15.4 | ≈ $27.3 |

단가는 [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) 기준이며 한국어 토큰 배율이 미확인이라 실제는 1.5~2배까지 가능하다. 어느 경우든 플랫폼 고정비(Pro 조합 $45/월)보다 LLM 비용이 작고, 보고서 일괄 채점은 Batch API로 절반이 된다.

### 리포 구조와 CI

Supabase 공식 가이드는 feature↔로컬, `develop`↔staging, `main`↔production 3단계와 PR에서 `supabase db start` + `supabase db diff --strict-coverage`, 타입 생성 drift 검사를 권장한다 ([Managing environments](https://supabase.com/docs/guides/deployment/managing-environments); [Generating types in CI](https://supabase.com/docs/guides/deployment/ci/generating-types)). [제안] 구조:

```
repo/
├── CLAUDE.md  AGENTS.md  architecture.md  progress.md  설계원리.md   # 하네스 루트
├── .claude/{agents,hooks,skills}/                                   # 하네스 템플릿
├── app/(student)/lab/[sessionId]/   app/(teacher)/dashboard/   app/api/tutor/route.ts
├── lib/engine/{blocks,simulator,rules,grader}.ts   # 블록 DSL·리듀서·사전조건·채점(서버/클라 공용 순수 함수)
├── lib/ai/{prompts,schemas}.ts   lib/supabase/{client,server,proxy}.ts
├── supabase/{config.toml,migrations/*.sql,seed.sql,functions/}
├── types/database.ts   .github/workflows/{ci,generate-types,release-staging,release-prod}.yml
└── vercel.json   # { "regions": ["icn1"] }
```

Preview 배포가 production Supabase를 가리키지 않도록 환경변수를 Preview/Production 스코프로 분리하고, `ANTHROPIC_API_KEY`·`SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 없이 서버 전용으로만 둔다.

---

## 8. 교사 대시보드: 네 장의 카드와 이벤트 로그로 시작한다

비교 제품의 교사 기능은 수렴한다. Google Classroom은 학급 코드/초대 가입, 과제 배정·루브릭 채점, "누가 제출했는지, 누가 작업 중인지, 누가 채점되었는지"의 실시간 확인, 코멘트 뱅크, 보호자 요약을 제공한다 ([Classroom teacher guide](https://services.google.com/fh/files/misc/gfe_classroom_userguide_teachers.pdf)). Labster는 시뮬레이션별 완료 %·시도 횟수·소요 시간·문항별 응답 열람과 시뮬레이션/학생 뷰 전환, 데이터 다운로드를 제공하고 ([Labster dashboard](https://help.labster.com/en/articles/8032930-instructor-labster-dashboard-from-course-manager)), Gizmos는 학생 이름 클릭 시 문항별 답변을 보여준다 ([ExploreLearning](https://legacyhelp.explorelearning.com/en/articles/9806176-using-student-assessments)). Khanmigo는 Roster → 학생 → "Chat history"로 모든 대화를 열람하게 하고, 모더레이션이 플래그한 대화에는 빨간 고지와 교사 이메일 알림이 붙는다 ([Khan Academy Support](https://support.khanacademy.org/hc/en-us/articles/15127248640525-How-do-I-view-my-students-Khanmigo-chat-history)).

학습분석 연구는 "데이터만 보여주는" 대시보드의 한계를 경고한다. Verbert et al.(2013)의 4단계(인식→성찰→의미형성→영향)에서 대부분의 대시보드는 인식에 머물렀고, 15개 중 성과 영향이 측정된 것은 Course Signals뿐(잔류율 96.71% vs 83.44%)이며, "데이터가 목표와 연결되고 목표 대비 진행을 추적할 때" 피드백 루프가 생긴다 ([Verbert et al. 2013](https://lirias.kuleuven.be/bitstream/123456789/396821/1/American%20Behavioral%20Scientist-2013-Verbert-0002764213479363.pdf)). Jivet et al.(2017)은 제목 그대로 "Awareness is not enough"라며 사회적 비교·경쟁 중심 설계의 함정을 지적한다 ([Open Universiteit](https://research.ou.nl/en/publications/awareness-is-not-enough-pitfalls-of-learning-analytics-dashboards/)). 국내 맥락에서는 AIDT 사용 교사의 79.7%가 업무 증가를 보고했고 ([파이낸셜뉴스 2025](https://www.fnnews.com/news/202507281500528873)), 대구 교사 77.4%가 "거의 사용하지 않음"의 이유로 "접속조차 불안정"을 들었다 ([한겨레 2025](https://v.daum.net/v/0RroZnlo19)).

[제안] 최소·고가치 기능 세트: ① 학급 생성 + 6자리 코드, ② 실험 배정 + 마감일 + 교사 설정(편집 중 힌트 수준, 말투, 시도 제한), ③ 제출 상태 3단계(작업 중/제출/피드백 완료) 실시간 보드, ④ 실험별 학생 행(현재 단계, 시도 횟수, 소요 시간, 예측-결과 일치 여부, 계산값 정오), ⑤ 단계별 학생 응답·블록 프로그램·그래프 열람, ⑥ 보고서 루브릭 채점 + 코멘트 뱅크 + 반환, ⑦ AI 대화: 플래그된 대화 상단 노출 + 알림, 전체는 학생별 탭, ⑧ CSV 내보내기(성적 + 참여 로그), ⑨ 학급 데이터 공유 뷰(여러 학생의 밀도·녹는점 측정값을 한 그래프에 — 교육과정 고려사항 "모둠 데이터 공유"). 첫 화면은 **막힌 학생 / 미제출·지각 / 플래그된 AI 대화 / 공통 오답 상위 3개**의 4카드로 제한하고 각 카드에 다음 행동("힌트 보내기", "단계 해설 열기")을 붙인다. 학생 화면에는 순위·반 평균 비교를 노출하지 않는다.

이벤트 모델은 `events(session_id, event_type, payload, ts)` 불변 로그로, `event_type ∈ {step_started, step_completed, prediction_made, block_program_run, sim_error_flagged, calc_checked, ai_help_requested, ai_flagged, report_draft_saved, report_submitted, feedback_returned, report_resubmitted}`이다. 대시보드는 이를 접어서 "현재 단계, 마지막 활동, 같은 단계 체류 시간, 오류 횟수"를 계산하고, 체류 시간이 학급 중앙값의 N배 이상이거나 `sim_error_flagged ≥ k`면 "막힘"으로 표시한다. 제출 워크플로는 `draft(자동저장) → submitted(잠금) → returned(교사 피드백, 잠금 해제) → resubmitted(version+1)`이며 마감 후 제출은 `late=true`로 표시하되 교사가 허용 토글한다. 제출 시 Supabase DB Webhook → Edge Function으로 교사 알림을 보내고, AI 피드백은 초안으로만 생성되어 교사가 확정해야 반환된다(전북 가이드라인의 "최종 판단은 교사").

---

## 9. 규제·안전·접근성: 설계 초기에 내장해야 할 체크리스트

**개인정보보호법(만 14세 미만).** 만 14세 미만 아동의 개인정보 수집에는 법정대리인 동의가 필요하며 위반 시 5천만 원 이하 과태료다 ([캐치시큐](https://www.catchsecu.com/archives/15354)). 동의 확인 방법(ISMS-P 해설)은 법정대리인 전자서명, 휴대전화 본인인증 후 동의, **서명된 서면을 우편·팩스·이메일로 제출**, 전화 확인 등이고, 법정대리인의 성명·연락처는 아동에게서 최소한으로 수집하되 동의 불가 시 5일 내 파기해야 한다 ([CELA ISMS-P 3.1](https://www.cela.kr/ISMS_3_1)). 아동에게는 "이해하기 쉬운 양식과 쉬운 언어로" 고지해야 하고, 개인정보위는 아동의 자유의사에 반해 보호자 동의만으로 처리해서는 안 된다는 입장이다 ([nepla 위키](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/개인정보의-처리에-대한-적법한-동의를-받는-방법/만-14세-미만-아동의-법정대리인-동의-절차-rv5n71yqnzm4)). [제안] 학생 계정은 학급 코드 + 학번/닉네임으로 실명·이메일을 받지 않고, 보호자 동의는 **학교 가정통신문(서면)**으로 받아 보관하며 앱에는 `consent_on_file` 플래그와 일자만 기록한다. 중1~중2 초기는 다수가 14세 미만이고 생년월일 수집 자체가 추가 수집이므로 "전원 보호자 동의"가 가장 단순하다. 하네스 리포의 규칙 5("만 14세 미만 보호자 동의 플로우 필수, 수집 최소화")와 일치한다.

**국외 이전.** 해외 클라우드 보관은 국외 이전에 해당하지만, 계약 이행을 위한 처리위탁·보관이면 처리방침에 5개 항목(이전 항목, 국가·시기·방법, 이전받는 자, 이용 목적·보유기간, 거부 방법)을 공개하면 별도 동의가 불필요하다 ([IT위키 제28조의8](https://itwiki.kr/w/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95_%EC%A0%9C28%EC%A1%B0%EC%9D%988); [nepla 일문일답](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/-일문일답-해외-클라우드-aws-등-에서-개인정보를-보관-처리할-때-정보주체의-동의를-받아야-하는가-54gnvzpe81pr)). 서울 리전이 국외 이전인지의 공식 해석은 없으므로 Supabase·Vercel·Anthropic(미국, AI 응답 생성, 최대 30일/플래그 시 2년)을 보수적으로 모두 기재한다. 프롬프트에 실명·학번을 넣지 않고 익명 세션 ID만 전달하면 국외로 가는 개인정보 항목을 대화 내용으로 한정할 수 있다.

**Anthropic 미성년자 정책과 데이터 보존.** Anthropic은 API 기반 제품을 미성년자가 직접 사용하는 조직에 연령 확인, 유해 콘텐츠 필터링, 모니터링·신고 체계, 안전 사용 교육 자료, 아동안전 시스템 프롬프트, 관련 법 준수의 공개 고지, "AI와 대화 중"임을 알리는 공개를 요구하며, 위반율이 높으면 계정 정지가 가능하다 ([Anthropic guidelines for organizations serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors)). Claude.ai 소비자 제품과 Claude for Teachers는 18세 이상 정책이므로 학생 직접 노출은 API 기반 자체 제품으로만 가능하다 ([Anthropic 2026](https://www.anthropic.com/news/claude-for-teachers)). API 입력·출력은 기본 30일 내 삭제되고 명시적 허가 없이 학습에 사용되지 않으며, 트러스트&세이프티 플래그 시 최대 2년 보관된다 ([Privacy Center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)). ZDR은 조직 단위 영업 요청이며 Fable 5.1 등 Covered Models는 30일 보관이 필수라 ZDR 대상이 아니다 ([API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)) — Haiku/Sonnet 5.5 선택은 이 점에서도 유리하다. [제안] 체크리스트: 학교 계정 기반 접근(교사 명부로 계정 발급 = 연령 확인 대체), 과학 실험 범위 제한 프롬프트 + 아동안전 프롬프트, 키워드·모델 플래그 → 교사 알림, 처리방침 공개, 채팅 상단 "AI 튜터입니다 · 선생님이 열람할 수 있어요" 상시 표시.

**교육부·교육청 지침.** 교육부 「교육 분야 인공지능 윤리원칙」(2022-08-11)은 ② 학습자 주도성, ③ 교수자 전문성 존중, ⑨ 데이터 처리 투명성, ⑩ 목적 내 활용·프라이버시를 포함한다 ([스마트투데이](https://www.smarttoday.co.kr/ko-kr/articles/24171)). 전북교육청 가이드라인(2026.9 시행)은 교사의 최종 판단, 학생의 AI 사용 사실 공개, 출처 검증을 요구한다 ([한국교육신문 2026](https://hangyo.com/mobile/article.html?no=108725)). AI 디지털교과서는 2025년 8월 초·중등교육법 개정으로 "교육자료"가 되어 학교 선택사항이 되었고 2학기 신청 학교가 4,146교에서 2,095교로 줄었으므로 ([머니투데이방송 2025](https://news.mtn.co.kr/news-detail/2025092210564273824)), 본 앱은 "학교장 승인 교육자료" 경로를 전제하면 된다.

**접근성(KWCAG).** 2022 개정 KWCAG는 4원칙·33개 검사항목으로, 명도 대비 4.5:1, 키보드 완전 조작, 대체 텍스트, 포커스 순서, 컨트롤 대각선 6.0 mm 이상, 자동 변경 콘텐츠 정지, 시간제한 연장·해제, 접근 가능한 인증 등을 요구한다 ([요즘IT KWCAG 해설](https://yozm.wishket.com/magazine/detail/1942)). [제안] 블록 편집기(Blockly v13 키보드 내비게이션)와 시뮬레이션은 결과의 텍스트 표현(표·로그)을 병행하고, 채팅은 `aria-live`, 상태는 색만으로 표현하지 않으며, 실험에는 시간제한을 두지 않고, 모든 컨트롤은 44px 이상으로 한다. 하네스 리포의 WCAG 2.1 AA 규칙·`docs/wcag-checklist.md`와 함께 쓴다.

**학교 망.** Vercel은 "대학·사무실 같은 공유망의 방화벽 규칙이 특정 사이트를 의도치 않게 차단할 수 있다"며 네트워크 관리자에게 IP·도메인 허용을 요청하라고 안내한다 ([Vercel KB](https://vercel.com/kb/guide/how-to-resolve-ip-blocking-issues)). [제안] `*.vercel.app` 대신 커스텀 도메인을 쓰고, 브라우저→Supabase 직접 호출을 Next.js 서버 라우트로 프록시해 차단 지점을 앱 도메인 하나로 줄이며, 앱에 "망 점검 페이지"(접속·로그인·실시간 구독·이미지)를 두어 도입 전 교사망·학생망에서 점검한다.

---

## 10. 하네스 적용 방안: 템플릿을 Supabase 스택에 맞추고 설계원리.md를 헌법에 연결한다

### 리포가 제공하는 것과 제공하지 않는 것

`tigerjk9/Harness-Engineering`은 "EduHarness Foundation — 교육자를 위한 AI 코딩 에이전트 하네스 템플릿"으로, 앱 코드가 전혀 없고 Claude Code가 읽는 규칙 문서(`CLAUDE.md`, `AGENTS.md`, `architecture.md`, `progress.md`) + `.claude/`의 7개 에이전트·4개 훅·6개 스킬 + `verify.sh` + 교육학·접근성·루브릭 문서로 구성된 MIT 템플릿이며, 마지막 커밋은 2026-04-26이다 ([GitHub API](https://api.github.com/repos/tigerjk9/Harness-Engineering); [README](https://github.com/tigerjk9/Harness-Engineering/blob/main/README.md)). 저자는 대전광역시교육청 소속의 교사·AI교육 연구자로 ([GitHub users/tigerjk9](https://api.github.com/users/tigerjk9)), PRD의 대상은 "코딩 경험이 적은 교육자"다 ([docs/PRD.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/PRD.md)). `verify.sh`는 `package.json`도 `src/`도 없으면 `SETUP_REQUIRED`를 반환하므로 Next.js 앱은 `/quickstart` Step 5의 안내대로 `npx create-next-app@latest . --typescript --tailwind --app`으로 별도 생성한다 ([verify.sh](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/verify/verify.sh); [quickstart SKILL](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/quickstart/SKILL.md)).

`설계원리.md`는 리포에서 오지 않는다(리포 전체를 `설계원리|design principle`로 grep하면 0건). 사용자가 제공한 「설계원리 및 지침(안)」이 그 자리를 채우되, 이 문서는 **교수학습 원리**만 다루고 코딩 규칙·평가 무결성·개인정보·접근성은 다루지 않는다. 리포에서 그 나머지 역할을 하는 문서는 `CLAUDE.md`(코딩 규칙: TypeScript 필수·`any` 금지·불변성·async try-catch·`process.env`만·파일 800줄·함수 50줄·중첩 4단계·WCAG 2.1 AA; 교육 도메인 규칙 1~5; 금지 행동 위험 분류; 완료 기준 "실행 증거 필수"), `architecture.md`(API 응답 형식 `{data, error, status}`, zod 입력 검증, 승인 필요 영역), `docs/verification-rubric.md`(🔴 CRITICAL 커밋 차단 / APPROVED = C_fail 0 AND H 100% AND M ≥ 80%), `docs/education-principles.md`(형성평가 재시도는 권리, Bloom, UDL, 심리 안전 "틀렸습니다 → 아직 아니에요", 만 14세 미만 동의, 알림 윤리)다 ([CLAUDE.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/CLAUDE.md); [architecture.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/architecture.md); [verification-rubric.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/verification-rubric.md); [education-principles.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/education-principles.md)). 즉 "모든 구현은 설계원리.md에 따른다"는 요구사항은 **설계원리.md(교수학습 24지침) + CLAUDE.md/architecture.md(기술·보안·데이터 규칙)** 두 층이 함께 작동할 때 충족된다. 리포의 `education-principles.md`(형성평가 재시도는 권리, 심리 안전 문구, 만 14세 미만 동의)는 설계원리의 원리 4·5와 충돌하지 않고 보완한다.

### 워크플로우

`/edu-harness`는 7단계(0 SYSTEM CHECK → 1 PLAN → 1.5 SPRINT CONTRACT(사용자 승인) → 2 EDU DESIGN → 3 BUILD(단위 테스트 + jest-axe) → 4 PEDAGOGY REVIEW → 5 VERIFY → 6 HARNESS UPDATE(CLAUDE.md에 규칙 누적) → 7 DONE(progress.md))이며, 산출물은 `_workspace/0N_*.md`에 남긴다 ([edu-harness SKILL](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/edu-harness/SKILL.md)). REJECTED면 `/execution-loop`(최대 5회, "스프린트 계약 없으면 코드 작성 금지"), 수치 목표면 `/objective-loop`(5회마다 루브릭 건강 검사 = Goodhart 방어)다 ([execution-loop](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/execution-loop/SKILL.md); [objective-loop](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/objective-loop/SKILL.md)). 역할은 7개 서브에이전트(planner/coder/evaluator/reviewer/tester/pedagogy-reviewer/harness-auditor)로 분리되고 "분석·판단은 opus, 구현은 sonnet"이 원칙이며, Reviewer는 "칭찬은 하지 마세요. 결함을 찾는 것이 유일한 목적"이다 ([AGENTS.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/AGENTS.md)). 스프린트 계약의 좋은 조건 예시 — "isCorrect가 API 응답 JSON에 없음 (grep 결과 0건)" — 는 이 프로젝트의 "시뮬레이션 정답값이 클라이언트 응답에 없음"으로 그대로 번역된다 ([references/sprint.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/edu-harness/references/sprint.md)).

### 이 스택에 맞춘 수정 권고

Anthropic의 현행 Claude Code 모범 사례는 지시를 **비결정론적**(CLAUDE.md, 스킬 — "따른다는 보장은 없다")과 **결정론적**(hook, deny rule, managed setting — "매번 적용")으로 구분하며, "강조를 계속 추가해도 놓친다면 그 줄은 hook에 속한다", "CLAUDE.md는 코드에서 알 수 없는 것만", "검증 명령 한 줄이 가장 유용", "`.claude/agents/`에 `tools: Read, Grep, Glob`만 주면 편집 불가 리뷰어가 설정으로 강제된다", Stop hook은 "스크립트가 exit 2면 Claude를 다시 일하게 한다"고 안내한다 ([Claude Code Best practices](https://code.claude.com/docs/en/best-practices)). OpenAI의 하네스 엔지니어링 글도 "약 100줄의 지도형 AGENTS.md + 버전 관리되는 docs/", "불변식을 강제하되 구현을 미세관리하지 않기"를 강조한다 ([OpenAI Harness engineering](https://openai.com/index/harness-engineering/)). 리포는 2026-04 기준이라 이런 결정론적 수단을 거의 쓰지 않고 CLAUDE.md 문장에 의존한다. [제안] 수정 6가지:

1. **구조**: "Use this template" → 루트 4파일의 `[대괄호]` 채움 → 같은 폴더에서 Next.js 생성 → 사용자의 `설계원리.md`를 루트에 두고 `CLAUDE.md` "작업 시작 전 필수 절차"에 "`설계원리.md` 읽기"를 `progress.md` 다음 순서로 추가(컨텍스트에 없으면 존재하지 않는다). 스프린트 계약의 완료 조건에는 지침 번호를 적는다(예: "지침 3.1: `predictions` 행이 없으면 `/api/run`이 403을 반환(테스트 통과)", "지침 2.1: 변인 설계 카테고리에 블록 6종 존재").
2. **architecture.md 교체**: 데이터 흐름을 "브라우저 → Next.js Route Handler/Server Action → `@supabase/ssr` → Postgres(RLS)"로, `prisma/`를 `supabase/migrations/`로, 승인 필요 영역을 `supabase/migrations/*.sql`·RLS 정책·`lib/supabase/*`·`app/api/**`·`.env`로. 데이터 모델의 `Quiz/Question/GradeAuditLog`를 7절 스키마로 대체.
3. **결정론적 강제**: `verify.sh --full`/`tsc`를 Stop hook(exit 2)으로, `.env*`·`supabase/migrations/` 편집 차단을 PreToolUse hook/deny rule로, reviewer·evaluator·pedagogy-reviewer·harness-auditor에 `tools: Read, Grep, Glob` 추가. 에이전트 파일의 `model: opus/sonnet`은 현행 모델명으로 조정.
4. **verify.sh 확장(사용자 승인 필요)**: EDU-DOMAIN 검사의 `isCorrect`·`quiz.type`·`GradeAuditLog`는 관련 파일이 없으면 자동 통과되므로, 이 프로젝트용 grep을 추가 — 클라이언트 번들에 `experiments.spec`의 정답 키(`expected`, `trueValue`)가 없음, `dangerouslyAllowBrowser` 0건, `api.anthropic.com` 문자열이 `app/api/` 밖에 0건, `aria-live` 채팅 영역 존재, "틀렸습니다/오답입니다" 0건. 설계원리 지침 중 코드로 검사 가능한 것은 CRITICAL/HIGH로 격상: 지침 3.1(예측 없이 실행 불가 — 서버 가드 테스트), 지침 5.4·2.4(블록 자동 완성·보고서 문장 생성 API 없음 — `autocomplete`/`generateReport` 0건), 지침 3.4(`runs` 테이블과 버전 보존 — 마이그레이션 존재), 지침 6.4(제출 전 성찰 3항목 필수 — 서버 검증).
7. **pedagogy-reviewer 에이전트 보강**: `.claude/agents/pedagogy-reviewer.md`의 체크리스트를 설계원리 24지침으로 교체하고, 단계 4 PEDAGOGY REVIEW 산출물(`_workspace/04_*.md`)에 "지침별 충족/미충족/해당 없음" 표를 요구한다. 이 표가 누적되면 전문가 타당화 메모가 요구하는 "지침의 명료성·실행 가능성" 평정의 1차 자료가 된다.
5. **CI 연동**: `.husky/pre-commit`의 lint/tsc/test를 GitHub Actions에서도 실행하고 Supabase `db diff`·타입 생성 drift 검사를 추가. PR 템플릿에 "하네스 변경 여부" 항목(루브릭 변경은 사람 승인).
6. **최신성 보정**: "컨텍스트 70% 규칙"은 1M 컨텍스트·자동 컴팩션 시대엔 완화하고, `docs/harness-audit.md`의 "모델이 하네스 없이도 하는가?" 테스트를 먼저 돌려 불필요 규칙을 줄인다("CLAUDE.md에 규칙이 50개가 넘으면 AI가 다 읽지 않습니다" ([customization-guide](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/customization-guide.ko.md))).

### 설계원리.md를 하네스에 연결하는 보조 문서 [제안]

설계원리.md 자체는 사용자 문서이므로 수정하지 않고(타당화 대상 원문 보존), 그 옆에 **`docs/design-principles-impl.md`**를 두어 24지침 각각에 (a) 구현 위치(파일/테이블/프롬프트 규칙), (b) 검증 방법(테스트명 또는 verify grep), (c) 파일럿 지표(예: 3.1 예측 입력률, 4.3 하강 발생률, 6.4 성찰 작성률), (d) 타당화 상태(미검토/수정 제안/확정)를 기록한다. 3절의 매핑 표가 이 문서의 초기 내용이 된다. 교수학습 원리가 다루지 않는 영역 — 평가 무결성(정답은 `experiments.spec` 서버 전용, 학생별 seed, 제출 잠금), 데이터·개인정보(학급 코드·학번·PIN만 수집, `consent_on_file`, 국외 이전 5항목, 프롬프트에 실명 금지), 접근성(KWCAG·`aria-live`·44px), 아키텍처 불변식(Claude 호출은 `app/api/**`만, Supabase는 RLS 통과만) — 는 리포의 `CLAUDE.md`·`architecture.md` 교체본에 둔다. 설계원리.md의 타당화 메모가 "원문 확정 답변을 확보하면 원리 명칭·번호·문장을 먼저 대조"하라고 하므로, 지침 번호가 바뀔 가능성에 대비해 코드의 태그는 `guideline_id`를 상수 테이블(`lib/engine/guidelines.ts`)로 한 곳에서 관리한다.

---

## 11. 기능 요구사항 ↔ 연구 근거 매핑

| 요구사항 | 구현 방향 | 관련 지침 | 핵심 근거 | 상태 |
|---|---|---|---|---|
| (1) 챗봇과 개념 학습 | 실험별 KNOWLEDGE_BASE(프로토타입 재사용) + 설명 모드에선 짧은 직접 설명 허용, 개념은 비유 우선 | 5.1, 5.2, 4.2 | 소크라테스식 단독의 효율 저하(SIGCSE 2026, Blasco 2024) | 프로토타입 있음 → 서버 이전 |
| (2) 실험 설계 | 블록 팔레트(준비물/수치/행동/위치) + 변인 설정 패널 + 분리 실험은 "순물질 특성값 조회 → 방법 선택" 단계; **변인 설계 블록 카테고리 신설** | 1.1, 1.2, 2.1, 2.2 | 고시 고려사항 "자료를 근거로 설계하고 계획 공유" | 프로토타입 있음 → 변인·설계 단계 추가 |
| (3) 막힐 때 도움 | 4단 힌트 사다리, 2회 실패/3분 정체 시 하강, "내 생각 입력 → 힌트" | 4.1, 4.2, 4.3, 4.4, 5.4 | Bastani 2024, Tutor CoPilot, Bisra 2018, Help abuse | 신규(프로토타입은 L3만) |
| (4) 블록 코딩 가상 실험 | Blockly core + 자체 래퍼, 슬롯 타입 체크, `msg/ko` | 2.2, 3.2 | Blockly v13, react-blockly 비유지보수 | 재구현 |
| (5) 조립으로 순서 익히기 | 사전조건 규칙 테이블, "예시 순서 3단계만" 힌트 유지, 교사 설정 힌트 수준 | 2.2, 2.4 | PhET 암묵적 비계, Moore 2013 표적 안내 | 프로토타입 있음 |
| (6) 모니터로 실시간 오류 확인 | 블록 로컬 경고 + 전역 dry-run(디바운스) + 실행 시 "잘못된 값 기록" 분기 | 1.3, 2.3, 5.3 | Blockly codelab 검증 순서, PhET 자기 검증 사례 | 프로토타입 있음 → 2계층화 |
| (7) 결과 데이터 즉시 제공 | `measurements` 저장, 시드 노이즈로 학생별 고유 데이터, 데이터 표 자동; `runs`로 시도 보존 | 3.2, 3.4 | de Jong 2013(가상실험의 깨끗한 데이터), 리포 시드 규칙 | 프로토타입 있음 → 저장 추가 |
| (8) 결과 분석·그래프 | Recharts 결과 차트 + 축 선택 + 평탄 구간 ReferenceArea; 예측 그리기는 Chart.js dragdata; 이전 실행 오버레이 | 1.3, 3.4 | SERC 채점 기준(눈금·축), 번들 비교 | 밀도·용해도 그래프 신규 |
| (9) HTML 6종 참고 | 3단 레이아웃·블록 카테고리·상태 머신·넛지·KB 유지, 공통 엔진으로 통합 | 1.4 | 프로토타입 분석 | — |
| (10) 측정값 제시·계산값 입력·오답 도움 | 입력 셀(밀도, 환산 용해도, 평탄 온도, 석출량), 코드 채점(±2~3%), error_type → 힌트 | 5.3, 4.1 | 아첨 연구(Arvin 2025, SCALE), SERC 오개념 | 신규 |
| (11) 보고서 작성 화면 | 9항목 템플릿, 블록 로그·POE·측정값 자동 전사 + 학생 작성, AI는 질문·시작어·루브릭 지적만 | 6.1, 6.2, 6.3, 5.4 | 감점 기준(내일신문), Study Mode, Learning mode | 신규 |
| (12) 느낀점·성찰 | 네 질문 구조("재미있었다"로 끝나면 추가 질문); 제출 전 성찰 게이트 | 6.4 | Bisra 2018(자기 설명), 메타인지 비계 g=0.384 | 신규 |
| (13) 예측 먼저·힌트 | 결과/그래프 버튼 잠금, 객관식+근거, P1~P3 힌트, "틀림" 대신 탐구 프레이밍 | 3.1, 3.3 | de Jong 2013, POE 준실험, Hashweh 2015 | 프로토타입 프롬프트 → UI 게이트 |
| (14) 교사 제출 | `submissions` + 상태 머신(draft→submitted→returned→resubmitted), late, AI 활용 체크박스, 웹훅 알림 | 6.4 | Google Classroom 상태판, 전북 가이드라인 | 신규 |
| (15) 학생/교사 화면 분리 | `profiles.role` + JWT 클레임 라우팅, RLS 이중 보장, 대시보드 4카드 + 이벤트 로그 | 1.4(교사 뷰) | Supabase RBAC/RLS 문서, Verbert 2013, Jivet 2017 | 신규 |
| (16) 설계원리.md 준수 | 사용자 제공 24지침을 통치 문서로 채택, CLAUDE.md 필수 읽기에 등록, 지침 번호를 스프린트 계약·verify·pedagogy-reviewer에 연결, 파일럿 로그로 타당화 | 전체 | 3절 매핑 표; 문서의 타당화 메모 | **재구성안 — 전문가 타당화 필요** |
| (17) 2022 개정 중학교 과학 | [9과08-01~03], 크로마토그래피 제외(심화 선택), 2026학년도 중2부터, 입자 개념 미전제 | — | 나무위키·천재 교재·sciencelove hwp | 고시 원문 대조 필요 |

---

## 12. 리스크·미확인 사항과 다음 단계

**확인되지 않은 것(갭).** ① 2022 고시문 원문(별책 9)과 성취수준 A~E 서술문은 직접 열람하지 못해 성취기준 3개의 글자 단위 검증이 미완이다 — [sciencelove.com/2674](https://sciencelove.com/2674)의 hwp로 대조할 것. ② 2022 검정 교과서(비상·미래엔·동아)의 실험 물질·분량은 미확인(천재 교재 간접 정보만). ③ 교육청 공식 탐구 보고서 양식·루브릭 1차 자료 없음 — 5절 루브릭은 제안. ③-2 설계원리.md는 스스로 "원문과의 문장 단위 일치 미확인 재구성안"이라 밝히므로, 원문 확정본 확보 시 원리 명칭·번호·문장 대조가 선행되어야 하며 지침 번호 변경 가능성이 있다. ④ 수치 허용오차(±%)와 오류 진단 규칙의 ITS 1차 근거 없음. ⑤ Haiku 5.5의 한국어 힌트 품질, 한국어 토큰 배율 미확인. ⑥ Blockly core 번들 크기·iPad 터치 실동작·multiselect 플러그인 v13 호환 미확인. ⑦ 라우르산·팔미트산 비열·융해열, 중학 수준 증류 곡선 공개 모델 없음. ⑧ 개인정보보호법 시행령 제17조 원문, 아동·청소년 가이드라인 원문, 서울 리전의 국외 이전 해당 여부 공식 해석 없음. ⑨ Anthropic Usage Policy 미성년 조항 원문과 아동안전 시스템 프롬프트 제공 경로 미확인. ⑩ 교육청 망의 vercel.app/supabase.co 차단 사례 미확인. ⑪ 하네스 리포가 인용하는 프레임워크("4대 구성 요소", "Anthropic $9 vs $200")의 1차 출처 미특정 — 리포의 주장으로만 취급.

**주요 리스크.** 기술적으로는 Supabase Free의 1주 일시정지(방학)와 Vercel Hobby의 비상업 조항이 운영 중단·약관 리스크이며, 파일럿 후 Pro 전환을 전제한다. 교육적으로는 힌트 사다리가 수업 45분 안에서 "효율 저하"로 체감될 수 있어 2회 실패/3분 하강 규칙과 교사 설정(힌트 수준·말투)이 안전장치다. 규제적으로는 미성년자 직접 사용 제품의 모니터링·신고 체계를 갖추지 못하면 Anthropic 측 조치 대상이 될 수 있다. 하네스 측면에서는 리포가 6개월간 갱신되지 않았고 결정론적 강제가 약해, 그대로 쓰면 "CLAUDE.md에 적었지만 지켜지지 않는" 규칙이 생긴다.

**다음 단계(권장 순서).** (1) 설계원리.md를 리포 루트에 두고 `docs/design-principles-impl.md`(3절 표 기반)를 작성하며, 고시 원문 대조·루브릭 교사 검토를 반영한다; 전문가 타당화 설문의 평정 문항을 지침별 파일럿 지표와 연결해 둔다. (2) 템플릿으로 리포를 만들고 architecture.md를 Supabase 스택으로 교체, 에이전트에 읽기 전용 `tools` 추가, Stop hook 구성. (3) 스프린트 1: 공통 엔진(`lib/engine`) — 프로토타입 6종의 `applyStep` 규칙을 하나의 사전조건 테이블로 이식하고, 변인 설계 블록(지침 2.1)과 `runs` 보존(지침 3.4)의 데이터 모델을 확정하며, 단위 테스트로 6개 실험의 정상 경로·오류 경로를 고정. (4) 스프린트 2: Blockly 편집기 + 모니터 + 2계층 검증. (5) 스프린트 3: Auth·스키마·RLS·`/api/tutor` 스트리밍 + 힌트 사다리·예측 게이트·코드 채점. (6) 스프린트 4: 보고서·성찰·제출·교사 대시보드 4카드. (7) 파일럿: 한 학급에서 Haiku 품질, 학교 망, 접근성(jest-axe + 실기), 비용을 실측하고 Sonnet 라우팅 범위를 정하며, 지침별 로그 집계를 타당화 위원에게 제공한다. 각 스프린트는 `/edu-harness` 7단계와 스프린트 계약(grep 가능한 완료 조건)으로 진행한다.

---

## 결론

이 프로젝트의 진짜 난제는 블록 코딩이나 시뮬레이션이 아니다. 그 부분은 프로토타입이 이미 증명했고 Blockly와 결정론적 리듀서로 정리하면 된다. 난제는 **AI가 "대신 해주지 않도록" 시스템을 설계하는 일**이며, 연구 증거는 이를 프롬프트 문구가 아니라 구조로 풀라고 말한다. 예측 게이트는 UI가 잠그고, 정답은 서버 코드가 판정하며, 보고서 섹션은 모델이 완성하지 못하게 출력 형식 자체를 제한하고, 학생별 시드로 데이터를 고유하게 만든다. 하네스 엔지니어링의 교훈("규칙이 자꾸 무시되면 hook으로")과 교수학습의 교훈("답을 주는 AI는 시험 성적을 떨어뜨린다")은 같은 방향을 가리킨다 — 바람직한 행동을 **결정론적 제약**으로 내려보내고, 모델에는 그 제약 안에서의 언어적 유연성만 맡기는 것이다.

두 번째 함의는 이 앱이 교육과정 변화와 정확히 맞물린다는 점이다. 2022 개정은 이 단원을 중2 첫 단원으로 앞당기고 "설계하고 수행하기"라는 탐구 하나를 명시했으며, 평가를 과정 기록 중심으로 돌렸다. 블록으로 설계하고, 예측하고, 데이터를 받아 그래프를 그리고, 성찰을 써서 제출하는 전체 흐름이 그 자체로 2022가 요구하는 "학습의 전 과정 기록"이다. 따라서 PRD는 기능 목록보다 **세션 로그 하나가 곧 평가 포트폴리오가 되는 데이터 모델**을 중심에 두어야 하며, 그 전제 위에서만 교사 대시보드가 "인식"을 넘어 "행동"에 닿을 수 있다. 마지막으로, 설계원리.md가 스스로 재구성안임을 인정한다는 점은 약점이 아니라 기회다. 24개 지침 각각을 기능·테스트·로그 지표에 묶어 두면, 이 앱은 지침을 따르는 산출물인 동시에 지침의 실행 가능성을 검증하는 **타당화 도구**가 된다. 따라서 가장 먼저 해야 할 일은 코드가 아니라, 24지침과 구현·검증·지표를 잇는 `docs/design-principles-impl.md`를 쓰는 것이다.

---

## 13. 출처

**프로토타입·하네스**
- 사용자 폴더 `D:\agent\block` HTML 6종 직접 분석(2026-10-27)
- 사용자 제공 「과학 탐구 지원 AI 에이전트의 설계원리 및 지침(안)」(6원리·24지침, 재구성안; 연구 노트 `01_design_principles_user_provided.md`)
- tigerjk9/Harness-Engineering: [README](https://github.com/tigerjk9/Harness-Engineering/blob/main/README.md) · [CLAUDE.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/CLAUDE.md) · [architecture.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/architecture.md) · [AGENTS.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/AGENTS.md) · [docs/PRD.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/PRD.md) · [verification-rubric.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/verification-rubric.md) · [education-principles.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/education-principles.md) · [customization-guide.ko.md](https://github.com/tigerjk9/Harness-Engineering/blob/main/docs/customization-guide.ko.md) · [edu-harness SKILL](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/edu-harness/SKILL.md) · [execution-loop](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/execution-loop/SKILL.md) · [objective-loop](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/objective-loop/SKILL.md) · [verify.sh](https://github.com/tigerjk9/Harness-Engineering/blob/main/.claude/skills/verify/verify.sh) · [GitHub API repo](https://api.github.com/repos/tigerjk9/Harness-Engineering) · [GitHub API user](https://api.github.com/users/tigerjk9)
- [Claude Code Best practices](https://code.claude.com/docs/en/best-practices) · [OpenAI Harness engineering](https://openai.com/index/harness-engineering/)

**교육과정·오개념**
- [나무위키 2022 개정 교육과정/과학과/중학교/과학 2](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90/%EA%B3%BC%ED%95%99%202) · [나무위키 중학교](https://namu.wiki/w/2022%20%EA%B0%9C%EC%A0%95%20%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95/%EA%B3%BC%ED%95%99%EA%B3%BC/%EC%A4%91%ED%95%99%EA%B5%90)
- [천재교육 (22개정) 체크연간서 과학2](https://cdata2.chunjae.co.kr/webdata_110/chunjae/_CMS/BookData/Solution/2025/11/(22%EA%B0%9C%EC%A0%95)%EC%B2%B4%ED%81%AC%EC%97%B0%EA%B0%84%EC%84%9C_%EA%B3%BC%ED%95%992_%EC%A0%95%EB%8B%B54%EB%8F%84.pdf) · [비상 오투 교과서별 개념 비교](https://cdn.visang.com/contents/162msco2/html/data/152%ec%98%a4%ed%88%ac%ec%a4%91%eb%93%b1%ea%b3%bc%ed%95%99%e2%91%a1/%ec%a4%91%eb%93%b1%ec%98%a4%ed%88%ac%e2%91%a1-2(15)%ea%b5%90%ea%b3%bc%ec%84%9c%eb%b3%84%ea%b0%9c%eb%85%90pdf.pdf) · [wonedu 물질의 특성의 의미](https://www.wonedu.org/ms-science/%EA%B3%BC%ED%95%99%E2%91%A1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1/01_%EB%AC%BC%EC%A7%88%EC%9D%98%20%ED%8A%B9%EC%84%B1%EC%9D%98%20%EC%9D%98%EB%AF%B8/) · [sciencelove.com/2674](https://sciencelove.com/2674) · [사이언스타임즈](https://sciencetimes.co.kr/news/sn/261565)
- 서울대 과학교육연구소: [(04) 오개념](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(04)1_3_1_%EC%98%A4%EA%B0%9C%EB%85%90.pdf) · [(08) 끓는점과 녹는점](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(08)1_3_4_%EB%81%93%EB%8A%94%EC%A0%90%EA%B3%BC_%EB%85%B9%EB%8A%94%EC%A0%90_%EA%B5%90%EA%B3%BC%EC%84%9C%ED%83%90%EA%B5%AC.pdf) · [(09)](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(09)1_3_3_%EB%81%93%EB%8A%94%EC%A0%90%EA%B3%BC_%EB%85%B9%EB%8A%94%EC%A0%90_%EA%B5%90%EA%B3%BC%EC%84%9C%ED%83%90%EA%B5%AC.pdf) · [(13) 용해도](https://serc.snu.ac.kr/wp-content/uploads/sites/80/2022/a/(13)1_3_4_용해도_교과서탐구(1).pdf)
- [중학생들의 과학 개념: 혼합물의 분리](https://koreascience.kr/article/JAKO201610236160131.pdf) · [Hashweh 2015](https://fada.birzeit.edu/jspui/bitstream/20.500.11889/2503/1/The%20complexity%20of%20teaching%20density%20in%20middle%20school%281%29.pdf)

**교수학습·AI 튜터**
- [Bastani et al. 2024](https://papers.ssrn.com/abstract=4895486) · [Stanford Tutor CoPilot](https://nssa.stanford.edu/studies/tutor-copilot-human-ai-approach-scaling-real-time-expertise) · [SIGCSE TS 2026](https://sigcse2026.sigcse.org/details/sigcse-ts-2026-posters/161/To-Tell-or-to-Ask-Comparing-the-Effects-of-Targeted-vs-Socratic-AI-Hints) · [Blasco & Charisi 2024](https://scale.stanford.edu/ai/repository/impact-large-language-models-students-randomised-study-socratic-vs-non-socratic-ai) · [Bisra 2018](https://www.clearinghouse.edu.tum.de/wp-content/uploads/2023/09/CHU-KR-25_ENG_Bisra_2018_Selbsterklaerungen.pdf) · [Educ Psychol Rev 2018](https://link.springer.com/10.1007/s10648-017-9419-1) · [LearnLab Help abuse](https://learnlab.org/research/wiki/index.php/Help_abuse)
- [de Jong, Linn & Zacharia 2013](https://users.gw.utwente.nl/jong/dejonglinnzacharia%20science.pdf) · [Özcan & Uyanık 2022](https://unis.kastamonu.edu.tr/yayin-detay/2_CZGuC3a_60/the-effects-of-the-predict-observe-explain-poe-strategy-on-academic-achievement-attitude-and-retention-in-science-learning) · [IJMSS 2024](https://systems.enpress-publisher.com/index.php/IJMSS/article/view/5518/0)
- [Arvin 2025 sycophancy](https://arxiv.org/pdf/2506.10297) · [Stanford SCALE sycophancy](https://scale.stanford.edu/ai/repository/sycophancy-educational-safety-risk-why-llm-tutors-need-sycophancy-benchmarks) · [The 74 (2026)](https://www.the74million.org/article/ai-tutors-are-praising-instead-of-teaching-heres-why-thats-hurting-students/)
- [Anthropic Claude for Education](https://www.anthropic.com/news/introducing-claude-for-education) · [Claude for Teachers](https://www.anthropic.com/news/claude-for-teachers) · [Claude prompting best practices](https://platform.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [Khanmigo 7-step](https://blog.khanacademy.org/khan-academys-7-step-approach-to-prompt-engineering-for-khanmigo) · [Study Mode (Simon Willison)](https://simonwillison.net/2025/Jul/29/openai-introducing-study-mode)
- [내일신문 2025](https://www.localnaeil.com/News/View/654832) · [유니콘팩토리 2024](https://www.unicornfactory.co.kr/article/2024103111050573207)

**블록코딩·시뮬레이션·차트**
- [Google Open Source Blog: Blockly graduates](https://opensource.googleblog.com/2025/10/blockly-graduates-from-google.html) · [blockly-announce v13.0.0](https://groups.google.com/g/blockly-announce/c/U9-gdZN5NvM) · [Blockly Translations](https://docs.blockly.com/guides/configure/translations/) · [Blockly Events](https://docs.blockly.com/guides/configure/events/) · [Blockly validation codelab](https://docs.blockly.com/codelabs/validation-and-warnings/displaying-warnings/) · [react-blockly](https://github.com/nbudin/react-blockly) · [multiselect plugin](https://www.jsdelivr.com/package/npm/@mit-app-inventor/blockly-plugin-workspace-multiselect) · [scratch-blocks](https://github.com/scratchfoundation/scratch-blocks) · [scratch-editor](https://github.com/RaspberryPiFoundation/scratch-editor) · [entryjs](https://github.com/entrylabs/entryjs) · [pkgpulse DnD 비교](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026)
- NIST WebBook: [Ethanol](https://webbook.nist.gov/cgi/cbook.cgi?Name=ethanol&Units=SI&Mask=4) · [Lauric acid](https://webbook.nist.gov/cgi/cbook.cgi?Name=lauric+acid&Units=SI&Mask=4) · [Palmitic acid](https://webbook.nist.gov/cgi/cbook.cgi?Name=palmitic+acid&Units=SI&Mask=4) · [Wikipedia Solubility table](https://en.wikipedia.org/wiki/Solubility_table)
- [PhET implicit scaffolding (arXiv 1306.6544)](https://arxiv.org/pdf/1306.6544) · [RSC CERP 2013](https://pubs.rsc.org/en/content/articlehtml/2013/rp/c3rp20157k) · [PhET HTML licensing](https://phet.colorado.edu/en/licensing/html)
- [TanStack Charts comparison](https://tanstack.com/charts/latest/docs/framework/react/comparison) · [LogRocket React chart libraries 2026](https://blog.logrocket.com/top-5-react-chart-libraries/) · [chartjs-plugin-dragdata](https://npmjs.org/package/chartjs-plugin-dragdata) · [PixiJS v8](https://pixijs.com/blog/pixi-v8-launches) · [GSAP forum SVG 성능](https://gsap.com/community/forums/topic/17587-over-400-svg-elements-performance/)

**아키텍처**
- Claude Platform: [Models overview](https://platform.claude.com/docs/en/models/overview) · [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) · [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) · [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) · [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) · [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) · [anthropic-sdk-typescript](https://github.com/anthropics/anthropic-sdk-typescript)
- Vercel AI SDK: [Next.js App Router quickstart](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) · [Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- Vercel: [Functions limits](https://vercel.com/docs/functions/limitations) · [Hobby plan](https://vercel.com/docs/plans/hobby) · [Regions](https://vercel.com/docs/regions) · [Configuring regions](https://vercel.com/docs/functions/configuring-functions/region) · [IP blocking KB](https://vercel.com/kb/guide/how-to-resolve-ip-blocking-issues)
- Supabase: [Pricing](https://supabase.com/pricing) · [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) · [Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) · [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) · [Edge Function limits](https://supabase.com/docs/guides/functions/limits) · [Regional invocation](https://supabase.com/docs/guides/functions/regional-invocation) · [Regions](https://supabase.com/docs/guides/platform/regions) · [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) · [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments) · [Generating types in CI](https://supabase.com/docs/guides/deployment/ci/generating-types)

**교사 대시보드·규제**
- [Google Classroom teacher guide](https://services.google.com/fh/files/misc/gfe_classroom_userguide_teachers.pdf) · [Labster dashboard](https://help.labster.com/en/articles/8032930-instructor-labster-dashboard-from-course-manager) · [ExploreLearning assessments](https://legacyhelp.explorelearning.com/en/articles/9806176-using-student-assessments) · [Khanmigo chat history](https://support.khanacademy.org/hc/en-us/articles/15127248640525-How-do-I-view-my-students-Khanmigo-chat-history)
- [Verbert et al. 2013](https://lirias.kuleuven.be/bitstream/123456789/396821/1/American%20Behavioral%20Scientist-2013-Verbert-0002764213479363.pdf) · [Jivet et al. 2017](https://research.ou.nl/en/publications/awareness-is-not-enough-pitfalls-of-learning-analytics-dashboards/)
- [파이낸셜뉴스 2025-07-28](https://www.fnnews.com/news/202507281500528873) · [한겨레(다음) 2025-05-29](https://v.daum.net/v/0RroZnlo19) · [뉴시스(다음) 2026-01-11](https://v.daum.net/v/20260111071208949) · [머니투데이방송 2025-09-22](https://news.mtn.co.kr/news-detail/2025092210564273824) · [한국교육신문 2026(전북 가이드라인)](https://hangyo.com/mobile/article.html?no=108725) · [스마트투데이 2022(교육부 AI 윤리원칙)](https://www.smarttoday.co.kr/ko-kr/articles/24171)
- [캐치시큐: 14세 미만 동의](https://www.catchsecu.com/archives/15354) · [CELA ISMS-P 3.1](https://www.cela.kr/ISMS_3_1) · [nepla: 법정대리인 동의 절차](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/개인정보의-처리에-대한-적법한-동의를-받는-방법/만-14세-미만-아동의-법정대리인-동의-절차-rv5n71yqnzm4) · [nepla: 해외 클라우드 국외 이전](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/-일문일답-해외-클라우드-aws-등-에서-개인정보를-보관-처리할-때-정보주체의-동의를-받아야-하는가-54gnvzpe81pr) · [IT위키 제28조의8](https://itwiki.kr/w/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95_%EC%A0%9C28%EC%A1%B0%EC%9D%988)
- [Anthropic guidelines for organizations serving minors](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors) · [Anthropic Privacy Center 데이터 보관](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- [요즘IT KWCAG 해설](https://yozm.wishket.com/magazine/detail/1942)
