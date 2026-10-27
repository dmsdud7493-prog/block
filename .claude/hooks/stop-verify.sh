#!/usr/bin/env bash
# Stop hook — 작업 종료 전 결정론적 검증 (docs/plan.md Sprint 0)
# verify.sh --full 결과가 REJECTED이면 exit 2로 종료를 막고 이유를 Claude에게 돌려준다.
[ -f package.json ] || exit 0
RESULT=$(bash .claude/skills/verify/verify.sh --full 2>/dev/null | tail -1)
if echo "$RESULT" | grep -q "VERDICT=REJECTED"; then
  echo "verify --full: $RESULT — 실패 항목을 고친 뒤 종료하세요 (bash .claude/skills/verify/verify.sh --explain)" >&2
  exit 2
fi
exit 0
