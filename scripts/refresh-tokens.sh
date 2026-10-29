#!/usr/bin/env bash
# refresh-tokens.sh — get fresh access tokens by completing MFA login
# Run: bash scripts/refresh-tokens.sh <admin_code> <officer_code> <volunteer_code>
set -e

ADMIN_CODE="${1:?pass admin TOTP code}"
OFFICER_CODE="${2:?pass officer TOTP code}"
VOLUNTEER_CODE="${3:?pass volunteer TOTP code}"
BASE="http://localhost:8080"
OUT="results/q2"

cd "$(dirname "$0")/.."

get_token() {
  local user="$1" pass="$2" code="$3"
  # Step 1: login -> mfaToken
  MFA_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}" \
    | grep -o '"mfaToken":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$MFA_TOKEN" ]; then
    echo "ERROR: could not get mfaToken for $user" >&2
    return 1
  fi
  echo "Got mfaToken for $user"
  
  # Step 2: mfa/verify -> access token
  RESP=$(curl -s -X POST "$BASE/api/auth/mfa/verify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MFA_TOKEN" \
    -d "{\"code\":\"$code\"}")
  
  TOKEN=$(echo "$RESP" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  if [ -z "$TOKEN" ]; then
    echo "ERROR: could not get access token for $user. Response: $RESP" >&2
    return 1
  fi
  echo "$TOKEN" > "$OUT/token-${user}.txt"
  echo "Saved token for $user -> $OUT/token-${user}.txt"
}

mkdir -p "$OUT"
get_token "admin1"    "Admin@123"    "$ADMIN_CODE"
get_token "officer1"  "Officer@123"  "$OFFICER_CODE"
get_token "volunteer1" "Volunteer@123" "$VOLUNTEER_CODE"
echo "All tokens refreshed."
