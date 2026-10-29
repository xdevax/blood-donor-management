#!/usr/bin/env bash
# =============================================================================
# q2-auth-tests.sh  — Part (b) authorisation evidence
# Usage:
#   ADMIN_TOKEN=<jwt>   OFFICER_TOKEN=<jwt>   VOLUNTEER_TOKEN=<jwt> \
#   DONOR_ID=<mongoId>  bash backend/scripts/q2-auth-tests.sh
# =============================================================================
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
RESULTS="results/q2"
OUT="$RESULTS/b-auth-tests.txt"
mkdir -p "$RESULTS"

# ── colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'; BOLD='\033[1m'
pass() { echo -e "${GREEN}PASS${RESET}  $1"; }
fail() { echo -e "${RED}FAIL${RESET}  $1"; }

# ── require env vars ──────────────────────────────────────────────────────────
: "${ADMIN_TOKEN:?Set ADMIN_TOKEN}"
: "${OFFICER_TOKEN:?Set OFFICER_TOKEN}"
: "${VOLUNTEER_TOKEN:?Set VOLUNTEER_TOKEN}"
: "${DONOR_ID:?Set DONOR_ID}"

echo -e "${BOLD}=== Q2 Part (b) — JWT + RBAC Auth Tests ===${RESET}"
echo "Base URL : $BASE"
echo "Donor ID : $DONOR_ID"
echo "Date     : $(date)"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# ── helper: run one test ──────────────────────────────────────────────────────
# run_test <label> <expected_http_code> <method> <url> [<token>] [<body>]
run_test() {
  local LABEL="$1"
  local EXPECTED="$2"
  local METHOD="$3"
  local URL="$4"
  local TOKEN="${5:-}"
  local BODY="${6:-}"

  local AUTH_HEADER=""
  [ -n "$TOKEN" ] && AUTH_HEADER="-H 'Authorization: Bearer $TOKEN'"

  local CONTENT_HEADER=""
  local DATA_ARG=""
  if [ -n "$BODY" ]; then
    CONTENT_HEADER="-H 'Content-Type: application/json'"
    DATA_ARG="-d '$BODY'"
  fi

  ACTUAL=$(eval curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" \
    "$URL" $AUTH_HEADER $CONTENT_HEADER $DATA_ARG)

  if [ "$ACTUAL" = "$EXPECTED" ]; then
    pass "[$LABEL] expected=$EXPECTED got=$ACTUAL"
    PASS_COUNT=$((PASS_COUNT+1))
  else
    fail "[$LABEL] expected=$EXPECTED got=$ACTUAL"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
}

echo "--- Test 1: No token → PUT donor → 401 ---"
run_test "No-token PUT donor" "401" "PUT" "$BASE/api/donors/$DONOR_ID" "" '{"isAvailable":true}'

echo "--- Test 2: No token → DELETE donor → 401 ---"
run_test "No-token DELETE donor" "401" "DELETE" "$BASE/api/donors/$DONOR_ID"

echo "--- Test 3: No token → PUT request → 401 ---"
run_test "No-token PUT request" "401" "PUT" "$BASE/api/requests/$DONOR_ID" "" '{"status":"fulfilled"}'

echo "--- Test 4: No token → DELETE request → 401 ---"
run_test "No-token DELETE request" "401" "DELETE" "$BASE/api/requests/$DONOR_ID"

echo "--- Test 5: Volunteer token → PUT donor → 403 (wrong role) ---"
run_test "Volunteer PUT donor (403)" "403" "PUT" "$BASE/api/donors/$DONOR_ID" \
  "$VOLUNTEER_TOKEN" '{"isAvailable":true}'

echo "--- Test 6: Volunteer token → DELETE donor → 403 (wrong role) ---"
run_test "Volunteer DELETE donor (403)" "403" "DELETE" "$BASE/api/donors/$DONOR_ID" \
  "$VOLUNTEER_TOKEN"

echo "--- Test 7: Officer token → PUT donor → 200 (allowed) ---"
run_test "Officer PUT donor (200)" "200" "PUT" "$BASE/api/donors/$DONOR_ID" \
  "$OFFICER_TOKEN" '{"isAvailable":true}'

echo "--- Test 8: Officer token → DELETE donor → 403 (not admin) ---"
run_test "Officer DELETE donor (403)" "403" "DELETE" "$BASE/api/donors/$DONOR_ID" \
  "$OFFICER_TOKEN"

echo ""
echo "--- Test 9: Admin token → GET /api/auth/me → 200 ---"
run_test "Admin GET /me (200)" "200" "GET" "$BASE/api/auth/me" "$ADMIN_TOKEN"

echo ""
echo "======================================="
echo -e "${BOLD}Results: ${GREEN}$PASS_COUNT PASS${RESET}  ${RED}$FAIL_COUNT FAIL${RESET}"
echo "======================================="

# ── create a test donor then DELETE with admin (full demo) ────────────────────
echo ""
echo "--- Creating test donor for DELETE demo ---"
RAND_PHONE="9$(date +%s | tail -c 10)"
TEST_DONOR=$(curl -s -X POST "$BASE/api/donors" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Delete Demo\",\"age\":25,\"gender\":\"Male\",\"bloodGroup\":\"O+\",\"phone\":\"$RAND_PHONE\",\"email\":\"test-${RAND_PHONE}@demo.com\",\"city\":\"TestCity\",\"state\":\"TestState\"}")
echo "Create response: $TEST_DONOR"

TEST_ID=$(echo "$TEST_DONOR" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$TEST_ID" ]; then
  echo ""
  echo "--- Test 10: Admin DELETE test donor → 200 ---"
  run_test "Admin DELETE donor (200)" "200" "DELETE" "$BASE/api/donors/$TEST_ID" "$ADMIN_TOKEN"
else
  echo "Could not create test donor — skipping DELETE demo"
fi

echo ""
echo "Final Results: $PASS_COUNT PASS, $FAIL_COUNT FAIL"
