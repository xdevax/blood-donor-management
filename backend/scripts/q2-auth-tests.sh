#!/usr/bin/env bash
# =============================================================================
# q2-auth-tests.sh  — Part (b) authorisation evidence (tests 1-15)
# Usage:
#   ADMIN_TOKEN=<jwt>   OFFICER_TOKEN=<jwt>   VOLUNTEER_TOKEN=<jwt> \
#   DONOR_ID=<mongoId>  bash backend/scripts/q2-auth-tests.sh
# =============================================================================
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
RESULTS="results/q2"
mkdir -p "$RESULTS"

GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'; BOLD='\033[1m'
pass() { echo -e "${GREEN}PASS${RESET}  $1"; }
fail() { echo -e "${RED}FAIL${RESET}  $1"; }

: "${ADMIN_TOKEN:?Set ADMIN_TOKEN}"
: "${OFFICER_TOKEN:?Set OFFICER_TOKEN}"
: "${VOLUNTEER_TOKEN:?Set VOLUNTEER_TOKEN}"
: "${DONOR_ID:?Set DONOR_ID}"

echo -e "${BOLD}=== Q2 Part (b) -- JWT + RBAC Auth Tests ===${RESET}"
echo "Base URL : $BASE"
echo "Donor ID : $DONOR_ID"
echo "Date     : $(date)"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

run_test() {
  local LABEL="$1" EXPECTED="$2" METHOD="$3" URL="$4"
  local TOKEN="${5:-}" BODY="${6:-}"
  local AUTH_HEADER="" CONTENT_HEADER="" DATA_ARG=""
  [ -n "$TOKEN" ] && AUTH_HEADER="-H 'Authorization: Bearer $TOKEN'"
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

echo "--- Test 1: No token -> PUT donor -> 401 ---"
run_test "No-token PUT donor" "401" "PUT" "$BASE/api/donors/$DONOR_ID" "" '{"isAvailable":true}'

echo "--- Test 2: No token -> DELETE donor -> 401 ---"
run_test "No-token DELETE donor" "401" "DELETE" "$BASE/api/donors/$DONOR_ID"

echo "--- Test 3: No token -> PUT request -> 401 ---"
run_test "No-token PUT request" "401" "PUT" "$BASE/api/requests/$DONOR_ID" "" '{"status":"fulfilled"}'

echo "--- Test 4: No token -> DELETE request -> 401 ---"
run_test "No-token DELETE request" "401" "DELETE" "$BASE/api/requests/$DONOR_ID"

echo "--- Test 5: Volunteer token -> PUT donor -> 403 (wrong role) ---"
run_test "Volunteer PUT donor (403)" "403" "PUT" "$BASE/api/donors/$DONOR_ID" \
  "$VOLUNTEER_TOKEN" '{"isAvailable":true}'

echo "--- Test 6: Volunteer token -> DELETE donor -> 403 (wrong role) ---"
run_test "Volunteer DELETE donor (403)" "403" "DELETE" "$BASE/api/donors/$DONOR_ID" \
  "$VOLUNTEER_TOKEN"

echo "--- Test 7: Officer token -> PUT donor -> 200 (allowed) ---"
run_test "Officer PUT donor (200)" "200" "PUT" "$BASE/api/donors/$DONOR_ID" \
  "$OFFICER_TOKEN" '{"isAvailable":true}'

echo "--- Test 8: Officer token -> DELETE donor -> 403 (not admin) ---"
run_test "Officer DELETE donor (403)" "403" "DELETE" "$BASE/api/donors/$DONOR_ID" \
  "$OFFICER_TOKEN"

echo ""
echo "--- Test 9: Admin token -> GET /api/auth/me -> 200 ---"
run_test "Admin GET /me (200)" "200" "GET" "$BASE/api/auth/me" "$ADMIN_TOKEN"

echo ""
echo "--- Creating TEST DELETE DONOR (phone derived from epoch, exactly 10 digits) ---"
# epoch is 10 digits from ~2001 to 2286, always gives exactly 10 digits
RAND_PHONE="$(date +%s)"
TEST_DONOR=$(curl -s -X POST "$BASE/api/donors" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"TEST DELETE DONOR\",\"age\":25,\"gender\":\"Male\",\"bloodGroup\":\"O+\",\"phone\":\"${RAND_PHONE}\",\"email\":\"testdelete-${RAND_PHONE}@demo.com\",\"city\":\"TestCity\",\"state\":\"TestState\"}")
echo "Create response: $TEST_DONOR"

TEST_ID=$(echo "$TEST_DONOR" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$TEST_ID" ]; then
  echo ""
  echo "--- Test 10: Admin DELETE TEST DELETE DONOR -> 200 ---"
  run_test "Admin DELETE test donor (200)" "200" "DELETE" "$BASE/api/donors/$TEST_ID" "$ADMIN_TOKEN"
else
  echo "Could not create test donor -- skipping Test 10"
  FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "======================================="
echo "=== Tests 11-15: MFA Evidence ==="
echo "======================================="

echo ""
echo "--- Test 11: POST /api/auth/login admin1 correct pw -> 200 + mfaRequired:true + NO 'token' field ---"
LOGIN_BODY=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"Admin@123"}')
LOGIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"Admin@123"}')
echo "  HTTP status : $LOGIN_HTTP"
echo "  Body        : $LOGIN_BODY"

HAS_MFA_REQUIRED=$(echo "$LOGIN_BODY" | grep -c '"mfaRequired":true' || true)
HAS_TOKEN_FIELD=$(echo "$LOGIN_BODY" | grep -c '"token":' || true)
MFA_TOKEN_11=$(echo "$LOGIN_BODY" | grep -o '"mfaToken":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ "$LOGIN_HTTP" = "200" ] && [ "$HAS_MFA_REQUIRED" -ge 1 ] && [ "$HAS_TOKEN_FIELD" -eq 0 ]; then
  pass "[Login->200+mfaRequired:true+no_token_field] expected=200+mfaRequired:true+no_token_field got=OK"
  PASS_COUNT=$((PASS_COUNT+1))
else
  fail "[Login->200+mfaRequired:true+no_token_field] http=$LOGIN_HTTP mfaRequired=$HAS_MFA_REQUIRED token_field=$HAS_TOKEN_FIELD"
  FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "--- Test 12: Use mfaToken as Bearer on PUT donor -> 401 (wrong token purpose) ---"
if [ -n "$MFA_TOKEN_11" ]; then
  run_test "mfaToken as Bearer PUT donor (401)" "401" "PUT" "$BASE/api/donors/$DONOR_ID" \
    "$MFA_TOKEN_11" '{"isAvailable":true}'
else
  fail "[mfaToken as Bearer PUT donor (401)] could not extract mfaToken from login response"
  FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "--- Test 13: POST /api/auth/mfa/verify mfaToken + code 000000 -> 401 Invalid code ---"
if [ -n "$MFA_TOKEN_11" ]; then
  T13_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/mfa/verify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MFA_TOKEN_11" \
    -d '{"code":"000000"}')
  T13_BODY=$(curl -s -X POST "$BASE/api/auth/mfa/verify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MFA_TOKEN_11" \
    -d '{"code":"000000"}')
  echo "  HTTP status : $T13_HTTP"
  echo "  Body        : $T13_BODY"
  if [ "$T13_HTTP" = "401" ]; then
    pass "[mfa/verify code 000000 -> 401] expected=401 got=$T13_HTTP"
    PASS_COUNT=$((PASS_COUNT+1))
  else
    fail "[mfa/verify code 000000 -> 401] expected=401 got=$T13_HTTP"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
else
  fail "[mfa/verify code 000000 -> 401] no mfaToken available"
  FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "--- Test 14: PUT donor with 'Bearer faketoken123' -> 401 ---"
run_test "Fake token PUT donor (401)" "401" "PUT" "$BASE/api/donors/$DONOR_ID" \
  "faketoken123" '{"isAvailable":true}'

echo ""
echo "--- Test 15: POST /api/auth/login wrong password -> 401 ---"
T15_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"WrongPassword999"}')
T15_BODY=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"WrongPassword999"}')
echo "  HTTP status : $T15_HTTP"
echo "  Body        : $T15_BODY"
if [ "$T15_HTTP" = "401" ]; then
  pass "[Wrong password -> 401] expected=401 got=$T15_HTTP"
  PASS_COUNT=$((PASS_COUNT+1))
else
  fail "[Wrong password -> 401] expected=401 got=$T15_HTTP"
  FAIL_COUNT=$((FAIL_COUNT+1))
fi

echo ""
echo "======================================="
echo -e "${BOLD}FINAL RESULTS: ${GREEN}$PASS_COUNT PASS${RESET}  ${RED}$FAIL_COUNT FAIL${RESET} (of 15 tests)${RESET}"
echo "======================================="
