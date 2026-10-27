# 공통 엔진 (`src/lib/engine`) — 코드에서 바로 보이지 않는 것만

## 1. 두 층: 카탈로그(클라이언트) / 물성(서버) — ADR-P04

| 층 | 파일 | 내용 | 번들 |
|---|---|---|---|
| 카탈로그 | `experiments/<slug>/catalog.ts`, `reducer.ts` | 블록 정의, 용품 종류, 사전조건 규칙(리듀서), 변인 선택지, 예측 선택지·힌트 | 클라이언트 허용 |
| 물성 | `experiments/<slug>/physics.ts` | 물성 수치, 세션별 시료 변동, 정답 규칙(`answers`) | `server-only` |
| 채점 | `grader/check.ts` | 측정값으로 정답 재계산 → `{correct, errorType, hint}` | `server-only` |

리듀서는 숫자를 `ctx.param(key)`·`ctx.noise(value, spec)`로만 얻는다. `dryRun`은 같은 리듀서를 `param() = NaN`으로 돌리므로 **편집 중 경고와 실행 오류가 같은 규칙에서 나온다**(plan D4). 리듀서는 NaN 비교로 오류를 만들지 않아야 한다(용량 초과처럼 수치가 필요한 검사는 실행 때만 잡힌다).

## 2. 실행 루프 (`simulator/run.ts`)

1. 모든 단계의 구멍 검사(`rules/slots.ts`) — 하나라도 있으면 실행하지 않고 전부 보고.
2. 변인 선언 검사(`rules/variables.ts`) — 절차를 시도(trial) 단위로 나눠 통제변인이 같은지, 조작변인이 달라지는지 확인. 경고(`warn`)라 실행은 막지 않는다.
3. 리듀서를 순서대로 접는다. 첫 상태 오류에서 멈추고 그 블록 id로 진단을 만든다(프로토타입과 동일한 "멈춤" 정책).
4. 결과: `frames`(블록별 상태 스냅숏·이벤트 문구), `measurements`(제시값), `calcRequests`(학생 입력 칸), `series`(시간–온도).

## 3. 시도(trial)와 키 규칙

`catalog.isTrialEnd(step)`인 블록(밀도: 계산 블록, 가열 실험: 그래프 블록) 뒤에서 시도 번호가 1 증가한다.

- 측정값: `<양>.<대상>.t<시도>` — `mass.iron_big.t1`, `volume.water.t2`
- 계산 칸: `density.<대상>.t<n>`, `mp.`, `bp.`, `sol.`, `dist.`, `precip.`
- 시계열: `temp.<대상>.t<n>`

## 4. 노이즈와 seed (CLAUDE.md 규칙 3)

- 세션 seed = `sessions.seed`(생성 시 무작위). 물성 변동은 `createRng(seed + ":params")`, 측정 노이즈는 `createRng(seed)`(실행 번호를 섞을 때 `seed + ":run" + n`).
- 밀도: 철조각 크기 ±5%(밀도 7.9 유지), 액체 밀도 ±0.4%, 저울·눈금 해상도 0.1.
- 골든 테스트는 `sessionParams(null)` + `NO_NOISE`로 프로토타입 값과 정확히 맞춘다.

## 5. `runs` 테이블 (지침 3.4 — S1에서 확정, S3 마이그레이션)

```sql
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  run_no int not null,                 -- 세션 안에서 1부터 누적, 덮어쓰지 않음
  program_version int not null,        -- 실행 당시 block_programs.version
  program jsonb not null,              -- 실행한 Program 스냅숏(블록 JSON)
  seed text not null,                  -- 측정 노이즈 seed (재현용)
  ok boolean not null,
  diagnostics jsonb not null default '[]',
  measurements jsonb not null default '[]',  -- 제시값만 (정답 없음)
  calc_requests jsonb not null default '[]',
  series jsonb not null default '[]',
  changed_vars text[] not null default '{}', -- 직전 실행 대비 바뀐 변인(튜터 상태 주입)
  created_at timestamptz not null default now(),
  unique (session_id, run_no)
);
```

## 6. 오류 유형(`grader/errorTypes.ts`)

| 유형 | 판정 | 실험 |
|---|---|---|
| `swapped` | 부피÷질량 값과 일치 | 밀도 |
| `unit` | 값은 맞고 단위 선택이 다름 / 켈빈 값 | 공통 |
| `meniscus` | 부피를 ±0.5·1 mL 잘못 읽은 값 | 밀도 |
| `decimal` | 10배·100배 차 | 공통 |
| `rounding` | 10% 이내지만 허용오차 밖 | 공통 |
| `solvent_basis` | 물 100 g 환산을 안 한 값 | 용해도 |
| `plateau` | 평탄 구간이 아닌 온도 | 녹는점·끓는점·증류 |
| `table_read` | 석출량 계산에서 다른 온도의 용해도 사용 | 재결정 |

실수 후보는 1% 범위로만 맞춰 본다(넓으면 단순 실수가 다른 유형으로 오분류됨).
