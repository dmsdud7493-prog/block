#!/usr/bin/env bash
# EduHarness verify.sh v2.1 — 6차원 검증 실행 및 점수 출력
#
# 사용법:
#   bash verify.sh [--full] [src_path]
#   --full: lint + tsc + test 실제 실행 (느림, pre-commit · /edu-harness 전용)
#   기본값: grep 전용 quick 모드 (빠름, settings.json hook 전용)
#
# 출력:   CRITICAL_FAIL=N HIGH=N/N MEDIUM=N/N SCORE=N VERDICT=X
#
# VERDICT 기준:
#   APPROVED        → CRITICAL_FAIL=0 AND HIGH 100% AND MEDIUM ≥80%
#   CONDITIONAL     → CRITICAL_FAIL=0 AND HIGH 100% AND MEDIUM <80%
#   REJECTED        → CRITICAL_FAIL>0 OR HIGH <100%
#   SETUP_REQUIRED  → package.json 없음 (빈 템플릿 상태 — 평가 대상 아님)
#
# [성능 최적화 v2.1]
#   src/ 디렉토리를 매 grep마다 재스캔하는 대신 파일 목록을 한 번만 수집합니다.
#   소규모 프로젝트: ~150ms, 중규모(500+ 파일): ~400ms (이전 대비 ~40% 향상)

# ── 모드 및 경로 파싱 ─────────────────────────────────────────────
MODE="quick"
SELF_CRITIQUE=false
SRC="src"
for _arg in "$@"; do
  case "$_arg" in
    --full)           MODE="full" ;;
    --self-critique)  SELF_CRITIQUE=true ;;
    --check-only)     echo "VERDICT=OK" && exit 0 ;;  # system-check.sh용: 실행 가능 여부만 확인
    --explain)        ;;
    --*)              ;;
    *)                SRC="$_arg" ;;
  esac
done
C_FAIL=0; H_PASS=0; H_TOTAL=0; M_PASS=0; M_TOTAL=0

# ── 셋업 필요 여부 조기 탐지 ─────────────────────────────────────────
# package.json도 src/도 없으면 빈 템플릿 상태 — 평가 대상 아님
if [ ! -f "package.json" ] && [ ! -d "$SRC" ]; then
  echo "CRITICAL_FAIL=0 HIGH=0/0 MEDIUM=0/0 SCORE=0 VERDICT=SETUP_REQUIRED"
  exit 0
fi

# ── [최적화] 파일 목록 1회 수집 ──────────────────────────────────
# 이후 모든 grep은 디렉토리 재스캔 없이 이 목록을 사용합니다.
if [ -d "$SRC" ]; then
  PROD_FILTER="\.test\.\|__tests__\|\.spec\."
  TS_FILES=$(find "$SRC" -name "*.ts" 2>/dev/null | grep -v "$PROD_FILTER")
  TSX_FILES=$(find "$SRC" -name "*.tsx" 2>/dev/null | grep -v "$PROD_FILTER")
  ALL_FILES=$(printf "%s\n%s" "$TS_FILES" "$TSX_FILES" | grep -v "^$")
  HAS_SRC=true
else
  TS_FILES=""; TSX_FILES=""; ALL_FILES=""; HAS_SRC=false
fi

# ── UNIVERSAL 검사 (모든 프로젝트) ──────────────────────────────────
# Dim 2 isCorrect 노출, Dim 5 비밀, Dim 1 console.log, Dim 4 img alt
#
# ── EDU-DOMAIN 검사 (교육 앱만 해당) ────────────────────────────────
# Dim 3 부정적 메시지, Dim 4b fieldset, Dim 4c aria-live, Dim 4d progressbar
# 교육 앱이 아니라면: grep으로 관련 파일이 없어 자동 통과됩니다.

# ── Dimension 2: 평가 무결성 (CRITICAL) ──────────────────────────
# isCorrect 또는 correctAnswerId가 프론트엔드에 노출되면 즉시 실패
# CRITICAL 탐지 시 C_FAIL만 증가 — H_TOTAL/H_PASS 변경 없음 (이중 패널티 방지)
if $HAS_SRC && [ -n "$ALL_FILES" ]; then
  LEAK=$(echo "$ALL_FILES" | xargs -r grep -l \
    "isCorrect.*:.*true\|\"isCorrect\".*true\|correctAnswerId" 2>/dev/null)
  if [ -n "$LEAK" ]; then
    C_FAIL=$((C_FAIL + 1))
    # H_TOTAL/H_PASS 변경 없음 — CRITICAL은 C_FAIL로만 패널티
  else
    H_TOTAL=$((H_TOTAL + 1))
    H_PASS=$((H_PASS + 1))
  fi
elif ! $HAS_SRC; then
  : # src/ 없음 — 이 차원 평가 건너뜀 (SETUP_REQUIRED 조기 탐지에서 이미 처리)
else
  H_TOTAL=$((H_TOTAL + 1))
  H_PASS=$((H_PASS + 1))  # 파일 없음 — 통과
fi

# ── Dimension 3: 심리 안전 (HIGH) ────────────────────────────────
# 부정적 피드백 메시지 금지
H_TOTAL=$((H_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  NEG=$(echo "$ALL_FILES" | xargs -r grep -l \
    "틀렸습니다\|오답입니다\|실패했습니다\|틀린 것 같\|맞지 않았\|정답이 아니\|오류입니다\|Wrong answer\|Incorrect answer\|You failed\|That.s wrong\|Sorry.*wrong\|Unfortunately.*wrong" \
    2>/dev/null)
  [ -z "$NEG" ] && H_PASS=$((H_PASS + 1))
else
  H_PASS=$((H_PASS + 1))  # 파일 없음 — 통과
fi

# ── Dimension 4: 접근성 (HIGH) ────────────────────────────────────
# alt 없는 <img> 태그 검사
H_TOTAL=$((H_TOTAL + 1))
if [ -n "$TSX_FILES" ]; then
  NO_ALT=$(echo "$TSX_FILES" | xargs -r grep -l "<img" 2>/dev/null \
    | xargs -r grep -L 'alt=' 2>/dev/null)
  [ -z "$NO_ALT" ] && H_PASS=$((H_PASS + 1))
else
  H_PASS=$((H_PASS + 1))  # 파일 없음 — 통과
fi

# ── Dimension 5: 데이터 보호 (CRITICAL) ──────────────────────────
# 하드코딩 비밀 정보 검사
if $HAS_SRC && [ -n "$ALL_FILES" ]; then
  SECRET=$(echo "$ALL_FILES" | xargs -r grep -lE \
    "(apiKey|api_key|password|secret|token)\s*=\s*['\"][^'\"\$\{]{8,}" 2>/dev/null \
    | grep -v "example\|sample\|placeholder\|mock")
  [ -n "$SECRET" ] && C_FAIL=$((C_FAIL + 1))
fi

# ── Dimension 1: 기술 (MEDIUM) ────────────────────────────────────
# console.log 프로덕션 코드 잔류
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  CON=$(echo "$ALL_FILES" | xargs -r grep -l "console\.log" 2>/dev/null)
  [ -z "$CON" ] && M_PASS=$((M_PASS + 1))
else
  M_PASS=$((M_PASS + 1))  # 파일 없음 — 통과
fi

# [EDU-DOMAIN] Dim 4b HIGH: quiz 컴포넌트에 fieldset 그룹화 없음
# edu-harness 요구사항: QuizCard는 <fieldset>+<legend>로 문제 그룹화
if $HAS_SRC; then
  H_TOTAL=$((H_TOTAL+1))
  QUIZ_FILES=$(echo "$TSX_FILES" | xargs -r grep -l "Quiz\|quiz\|Question\|question" 2>/dev/null)
  if [ -z "$QUIZ_FILES" ]; then
    H_PASS=$((H_PASS+1))  # 퀴즈 컴포넌트 없음 — 통과
  else
    NO_FIELDSET=$(echo "$QUIZ_FILES" | xargs -r grep -L "<fieldset" 2>/dev/null | head -3)
    [ -z "$NO_FIELDSET" ] && H_PASS=$((H_PASS+1))
  fi
fi

# [EDU-DOMAIN] Dim 4c HIGH: 피드백 영역에 aria-live 없음
# edu-harness 요구사항: 오답 피드백은 aria-live="polite" 영역 사용
if $HAS_SRC; then
  H_TOTAL=$((H_TOTAL+1))
  FEEDBACK_FILES=$(echo "$TSX_FILES" | xargs -r grep -l "feedback\|Feedback\|피드백" 2>/dev/null)
  if [ -z "$FEEDBACK_FILES" ]; then
    H_PASS=$((H_PASS+1))  # 피드백 컴포넌트 없음 — 통과
  else
    NO_ARIA=$(echo "$FEEDBACK_FILES" | xargs -r grep -L 'aria-live' 2>/dev/null | head -3)
    [ -z "$NO_ARIA" ] && H_PASS=$((H_PASS+1))
  fi
fi

# [EDU-DOMAIN] Dim 4d MEDIUM: 진도바에 role="progressbar" 없음
if $HAS_SRC; then
  M_TOTAL=$((M_TOTAL+1))
  PROGRESS_FILES=$(echo "$TSX_FILES" | xargs -r grep -l "ProgressBar\|progressbar\|progress-bar\|진도" 2>/dev/null)
  if [ -z "$PROGRESS_FILES" ]; then
    M_PASS=$((M_PASS+1))  # 진도바 없음 — 통과
  else
    NO_PB=$(echo "$PROGRESS_FILES" | xargs -r grep -L 'role="progressbar"' 2>/dev/null | head -3)
    [ -z "$NO_PB" ] && M_PASS=$((M_PASS+1))
  fi
fi

# [EDU-DOMAIN] Dim 2b HIGH: quiz.type 필드 누락 (형성/총괄 구분 강제)
if $HAS_SRC; then
  H_TOTAL=$((H_TOTAL+1))
  QUIZ_TYPE_FILES=$(echo "$TS_FILES" | xargs -r grep -l "quiz\|Quiz\|question\|Question" 2>/dev/null)
  if [ -z "$QUIZ_TYPE_FILES" ]; then
    H_PASS=$((H_PASS+1))  # 퀴즈 관련 파일 없음 — 통과
  else
    HAS_TYPE=$(echo "$QUIZ_TYPE_FILES" | xargs -r grep -l "FORMATIVE\|SUMMATIVE" 2>/dev/null)
    [ -n "$HAS_TYPE" ] && H_PASS=$((H_PASS+1))
  fi
fi

# [EDU-DOMAIN] Dim 2c MEDIUM: GradeAuditLog 호출 누락
if $HAS_SRC; then
  M_TOTAL=$((M_TOTAL+1))
  GRADE_CHANGE=$(echo "$TS_FILES" | xargs -r grep -l \
    "updateGrade\|gradeUpdate\|updateScore\|성적.*변경\|grade.*update" 2>/dev/null)
  if [ -z "$GRADE_CHANGE" ]; then
    M_PASS=$((M_PASS+1))  # 성적 변경 함수 없음 — 통과
  else
    HAS_AUDIT=$(echo "$GRADE_CHANGE" | xargs -r grep -l "GradeAuditLog\|gradeAuditLog" 2>/dev/null)
    [ -n "$HAS_AUDIT" ] && M_PASS=$((M_PASS+1))
  fi
fi

# 800줄 초과 파일 검사 (파일 목록 재활용)
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  LONG=$(echo "$ALL_FILES" | xargs -r wc -l 2>/dev/null \
    | awk '$1 > 800 {print $2}' | grep -v "total")
  [ -z "$LONG" ] && M_PASS=$((M_PASS + 1))
else
  M_PASS=$((M_PASS + 1))
fi

# ── [신규] Dim 7: TypeScript any 사용 감지 (MEDIUM) ────────────────
# `: any` 또는 `as any` 패턴 — 타입 안전성 위반
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  ANY_USE=$(echo "$ALL_FILES" | xargs -r grep -l ": any\b\|as any\b" 2>/dev/null \
    | grep -v "\.test\.\|__tests__\|example\|mock")
  [ -z "$ANY_USE" ] && M_PASS=$((M_PASS + 1))
else
  M_PASS=$((M_PASS + 1))
fi

# ── [신규] Dim 8: async 함수 try-catch 누락 (MEDIUM) ─────────────
# async 함수가 있는 파일에 try 블록이 없으면 탐지
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  ASYNC_FILES=$(echo "$ALL_FILES" | xargs -r grep -l "async " 2>/dev/null | grep -v "\.test\.")
  if [ -z "$ASYNC_FILES" ]; then
    M_PASS=$((M_PASS + 1))  # async 없음 — 통과
  else
    NO_TRY=$(echo "$ASYNC_FILES" | xargs -r grep -L "try {" 2>/dev/null | head -3)
    [ -z "$NO_TRY" ] && M_PASS=$((M_PASS + 1))
  fi
else
  M_PASS=$((M_PASS + 1))
fi

# ── [신규] Dim 10: 함수 길이 50줄 초과 감지 (MEDIUM) ────────────────
# 연속 비공백 라인 50줄 초과 블록 탐지 (함수 길이 heuristic)
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  LONG_FN=$(echo "$ALL_FILES" | while IFS= read -r f; do
    [ -z "$f" ] && continue
    awk 'BEGIN{c=0} /^\s*$/{if(c>50){print FILENAME; exit}; c=0; next} {c++} END{if(c>50){print FILENAME}}' "$f" 2>/dev/null
  done | sort -u | grep -v "^$" | head -3)
  [ -z "$LONG_FN" ] && M_PASS=$((M_PASS + 1))
else
  M_PASS=$((M_PASS + 1))
fi

# ── [신규] Dim 11: 중첩 깊이 4단계 초과 감지 (MEDIUM) ────────────────
# 10개 이상 연속 선행 공백 = 2-space indent 기준 5단계 이상
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  DEEP_NEST=$(echo "$ALL_FILES" | xargs -r grep -l "^          [^ ]" 2>/dev/null \
    | grep -v "\.test\.\|__tests__\|mock")
  [ -z "$DEEP_NEST" ] && M_PASS=$((M_PASS + 1))
else
  M_PASS=$((M_PASS + 1))
fi

# ── [신규] Dim 9: 직접 변이 패턴 감지 (MEDIUM) ───────────────────
# .push( .splice( .pop( .shift( .unshift( — 불변성 원칙 위반
M_TOTAL=$((M_TOTAL + 1))
if [ -n "$ALL_FILES" ]; then
  MUTATE=$(echo "$ALL_FILES" | xargs -r grep -l \
    "\.push(\|\.splice(\|\.pop()\|\.shift()\|\.unshift(" \
    2>/dev/null | grep -v "\.test\.\|__tests__\|mock")
  [ -z "$MUTATE" ] && M_PASS=$((M_PASS + 1))
else
  M_PASS=$((M_PASS + 1))
fi

# ── [FULL MODE] 차원 1: 실제 린트·타입·테스트 실행 ─────────────────
if [ "$MODE" = "full" ]; then
  if [ -f "package.json" ] && grep -q '"lint"' package.json 2>/dev/null; then
    H_TOTAL=$((H_TOTAL + 1))
    npm run lint --silent 2>/dev/null
    [ $? -eq 0 ] && H_PASS=$((H_PASS + 1))
  fi
  if [ -f "tsconfig.json" ] && command -v npx &>/dev/null; then
    H_TOTAL=$((H_TOTAL + 1))
    npx --no-install tsc --noEmit 2>/dev/null
    [ $? -eq 0 ] && H_PASS=$((H_PASS + 1))
  fi
  if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    H_TOTAL=$((H_TOTAL + 1))
    npm test -- --passWithNoTests --silent 2>/dev/null
    [ $? -eq 0 ] && H_PASS=$((H_PASS + 1))
  fi
fi


# ══════════════════════════════════════════════════════════════════
# [PROJECT] 물질의 특성 가상실험실 전용 검사 (docs/plan.md Sprint 0, 설계원리.md)
#   사용자 승인: plan.md S0 산출물 "verify.sh 확장" (2026-10-27)
# ══════════════════════════════════════════════════════════════════
EXPLAIN=false
for _arg in "$@"; do [ "$_arg" = "--explain" ] && EXPLAIN=true; done
_why() { $EXPLAIN && echo "  ✗ $1" >&2; }
if $HAS_SRC && [ -n "$ALL_FILES" ]; then
  # P1 CRITICAL: 브라우저에서 Claude 직접 호출 금지 (CLAUDE.md 규칙 6)
  P1=$(echo "$ALL_FILES" | xargs -r grep -l "dangerouslyAllowBrowser" 2>/dev/null)
  P1b=$(echo "$ALL_FILES" | grep -v "^$SRC/app/api/" | xargs -r grep -l "api\.anthropic\.com\|@ai-sdk/anthropic" 2>/dev/null)
  if [ -n "$P1$P1b" ]; then C_FAIL=$((C_FAIL + 1)); _why "P1 Claude 호출이 src/app/api 밖에 있음: $P1 $P1b"; fi

  # P2 CRITICAL: 클라이언트 코드가 서버 전용 정답·물성 모듈을 import 금지 (평가 무결성)
  CLIENT_FILES=$(echo "$ALL_FILES" | xargs -r grep -l "^['\"]use client['\"]" 2>/dev/null)
  if [ -n "$CLIENT_FILES" ]; then
    P2=$(echo "$CLIENT_FILES" | xargs -r grep -lE "engine/(grader|physics)|/physics['\"]|lib/server/|answerKeys|trueValue" 2>/dev/null)
    if [ -n "$P2" ]; then C_FAIL=$((C_FAIL + 1)); _why "P2 클라이언트가 서버 전용 정답/물성 모듈 참조: $P2"; fi
  fi

  # P3 CRITICAL: 학생 대신 작성하는 기능 금지 (지침 2.4·5.4)
  P3=$(echo "$ALL_FILES" | xargs -r grep -lE "generateReport|writeSection|completeSentence|autoCompleteProgram" 2>/dev/null)
  P3b=$( [ -d "$SRC/components/blocks" ] && grep -rlE "autocomplete|autoComplete" "$SRC/components/blocks" 2>/dev/null)
  if [ -n "$P3$P3b" ]; then C_FAIL=$((C_FAIL + 1)); _why "P3 대신 작성/자동 완성 패턴: $P3 $P3b"; fi

  # P4 HIGH: 튜터 채팅 영역 aria-live 존재
  H_TOTAL=$((H_TOTAL + 1))
  TUTOR_UI=$(echo "$TSX_FILES" | grep -i "tutor" )
  if [ -z "$TUTOR_UI" ] || echo "$TUTOR_UI" | xargs -r grep -l 'aria-live' >/dev/null 2>&1; then H_PASS=$((H_PASS + 1)); else _why "P4 튜터 UI에 aria-live 없음"; fi

  # P5 HIGH: 서버에서 supabase.auth.getSession() 사용 금지 (getClaims/getUser 사용)
  H_TOTAL=$((H_TOTAL + 1))
  P5=$(echo "$ALL_FILES" | xargs -r grep -l "auth\.getSession()" 2>/dev/null)
  if [ -z "$P5" ]; then H_PASS=$((H_PASS + 1)); else _why "P5 auth.getSession() 사용: $P5"; fi

  # P6 HIGH: Realtime 구독은 교사 라우트/컴포넌트에서만
  H_TOTAL=$((H_TOTAL + 1))
  P6=$(echo "$ALL_FILES" | grep -E "/lab/|/student|/demo/" | xargs -r grep -l "\.channel(" 2>/dev/null)
  if [ -z "$P6" ]; then H_PASS=$((H_PASS + 1)); else _why "P6 학생 화면에서 Realtime 구독: $P6"; fi
fi

# P7 HIGH: 지침 3.4 — runs 테이블 마이그레이션 존재 (마이그레이션 폴더가 생긴 뒤부터)
if [ -d "supabase/migrations" ]; then
  H_TOTAL=$((H_TOTAL + 1))
  if grep -qli "create table[^;]*public\.runs" supabase/migrations/*.sql 2>/dev/null; then H_PASS=$((H_PASS + 1)); else _why "P7 runs 테이블 없음"; fi
fi

# P8 HIGH: 설계원리.md가 CLAUDE.md 필수 절차에 등록되어 있음
H_TOTAL=$((H_TOTAL + 1))
if [ -f "설계원리.md" ] && grep -q "설계원리.md" CLAUDE.md 2>/dev/null; then H_PASS=$((H_PASS + 1)); else _why "P8 설계원리.md 미등록"; fi

# ── 점수 계산 ─────────────────────────────────────────────────────
[ $H_TOTAL -gt 0 ] && H_RATE=$((H_PASS * 100 / H_TOTAL)) || H_RATE=100
[ $M_TOTAL -gt 0 ] && M_RATE=$((M_PASS * 100 / M_TOTAL)) || M_RATE=100

H_CONTRIB=$([ $H_TOTAL -gt 0 ] && echo $((H_PASS * 50 / H_TOTAL)) || echo 50)
M_CONTRIB=$([ $M_TOTAL -gt 0 ] && echo $((M_PASS * 30 / M_TOTAL)) || echo 30)
C_CONTRIB=$([ $C_FAIL -eq 0 ] && echo 20 || echo 0)
SCORE=$((C_CONTRIB + H_CONTRIB + M_CONTRIB))

if   [ $C_FAIL -gt 0 ];   then VERDICT=REJECTED
elif [ $H_RATE -lt 100 ]; then VERDICT=REJECTED
elif [ $M_RATE -lt 80 ];  then VERDICT=CONDITIONAL
else VERDICT=APPROVED
fi

# ── [--self-critique] 헌법적 자기비판 (MEDIUM 항목으로 추가) ─────────
if $SELF_CRITIQUE && [ -n "$ALL_FILES" ]; then
  # SC1: @ts-ignore/@ts-nocheck 사용 감지 (MEDIUM) — 타입 오류 억제 패턴
  M_TOTAL=$((M_TOTAL + 1))
  SC_TS_IGNORE=$(echo "$ALL_FILES" | xargs -r grep -l "@ts-ignore\|@ts-nocheck" 2>/dev/null \
    | grep -v "\.test\.\|__tests__\|mock")
  [ -z "$SC_TS_IGNORE" ] && M_PASS=$((M_PASS + 1))

  # SC2: console.error/console.warn 프로덕션 코드 잔류 감지 (MEDIUM)
  M_TOTAL=$((M_TOTAL + 1))
  SC_CONSOLE=$(echo "$ALL_FILES" | xargs -r grep -l "console\.error\|console\.warn" 2>/dev/null \
    | grep -v "\.test\.\|__tests__\|mock")
  [ -z "$SC_CONSOLE" ] && M_PASS=$((M_PASS + 1))

  # SC3: TODO/FIXME/HACK 주석 프로덕션 코드 잔류 감지 (MEDIUM)
  M_TOTAL=$((M_TOTAL + 1))
  SC_TODO=$(echo "$ALL_FILES" | xargs -r grep -l "TODO:\|FIXME:\|HACK:" 2>/dev/null \
    | grep -v "\.test\.\|__tests__\|mock")
  [ -z "$SC_TODO" ] && M_PASS=$((M_PASS + 1))

  # 점수 재계산
  [ $M_TOTAL -gt 0 ] && M_RATE=$((M_PASS * 100 / M_TOTAL)) || M_RATE=100
  M_CONTRIB=$([ $M_TOTAL -gt 0 ] && echo $((M_PASS * 30 / M_TOTAL)) || echo 30)
  SCORE=$((C_CONTRIB + H_CONTRIB + M_CONTRIB))
  if   [ $C_FAIL -gt 0 ];   then VERDICT=REJECTED
  elif [ $H_RATE -lt 100 ]; then VERDICT=REJECTED
  elif [ $M_RATE -lt 80 ];  then VERDICT=CONDITIONAL
  else VERDICT=APPROVED
  fi
fi

echo "CRITICAL_FAIL=${C_FAIL} HIGH=${H_PASS}/${H_TOTAL} MEDIUM=${M_PASS}/${M_TOTAL} SCORE=${SCORE} VERDICT=${VERDICT}"
