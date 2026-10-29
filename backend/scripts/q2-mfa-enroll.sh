#!/usr/bin/env bash
# =============================================================================
# q2-mfa-enroll.sh — Interactive MFA enrollment for staff users
# Run from repo root:  bash backend/scripts/q2-mfa-enroll.sh
# Requires: curl, node (for QR display)
# =============================================================================
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"
RESULTS="results/q2"
mkdir -p "$RESULTS"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'

enroll_user() {
  local USERNAME="$1"
  local PASSWORD="$2"

  echo ""
  echo -e "${BOLD}============================================${RESET}"
  echo -e "${BOLD} Enrolling: $USERNAME${RESET}"
  echo -e "${BOLD}============================================${RESET}"

  # Step 1: Login
  echo -e "${YELLOW}Step 1: Logging in...${RESET}"
  LOGIN_RAW=$(curl -s -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
  echo "Response: $LOGIN_RAW"

  SETUP_TOKEN=$(echo "$LOGIN_RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.setupToken||j.token||j.mfaToken||'')}catch(e){console.log('')}})")
  if [ -z "$SETUP_TOKEN" ]; then
    echo "ERROR: Login failed for $USERNAME. Check password."
    return 1
  fi
  echo -e "${GREEN}Login OK — setup token received${RESET}"

  # Step 2: Request MFA setup
  echo -e "${YELLOW}Step 2: Requesting MFA setup (getting secret + QR)...${RESET}"
  SETUP_RAW=$(curl -s -X POST "$BASE/api/auth/mfa/setup" \
    -H "Authorization: Bearer $SETUP_TOKEN")
  echo "Setup response keys: $(echo "$SETUP_RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(Object.keys(JSON.parse(d)).join(', '))}catch(e){console.log('parse error')}})")"

  OTP_URL=$(echo "$SETUP_RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.otpauth||j.otpauthUrl||'')}catch(e){console.log('')}})")
  SECRET=$(echo "$SETUP_RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);if(j.secret)console.log(j.secret);else{const m=(j.otpauth||'').match(/secret=([A-Za-z0-9]+)/);console.log(m?m[1]:'')}}catch(e){console.log('')}})")

  if [ -z "$OTP_URL" ]; then
    echo "ERROR: No OTP URL returned. Response:"
    echo "$SETUP_RAW"
    return 1
  fi

  echo ""
  echo -e "${BOLD}======= SCAN THIS IN GOOGLE AUTHENTICATOR =======${RESET}"
  echo ""
  echo "Manual entry secret: $SECRET"
  echo "Account name:        $USERNAME"
  echo "Issuer:              BloodDonorMS"
  echo ""
  echo "OTP Auth URL: $OTP_URL"
  echo ""

  # Display QR as ASCII art using qrencode if available, else use node qrcode
  if command -v qrencode &>/dev/null; then
    qrencode -t ANSIUTF8 "$OTP_URL"
  else
    # Use node qrcode to print to terminal
    NODE_PATH="/mnt/c/Users/devan/Documents/blood-donor-management/backend/node_modules" node -e "
const qrcode = require('qrcode');
qrcode.toString('$OTP_URL', {type:'terminal', small:true}, (err,str) => {
  if(err) console.log('Install qrencode or run: npm install -g qrcode');
  else console.log(str);
});
" 2>/dev/null || echo "(Install qrencode for terminal QR display: sudo apt install qrencode)"
  fi

  echo ""
  echo "Open Google/Microsoft Authenticator → Add Account → Scan QR  OR"
  echo "Choose 'Enter setup key manually' and enter the secret above."
  echo ""
  read -r -p "Enter the 6-digit TOTP code shown in the app: " TOTP_CODE

  # Step 3: Verify setup
  echo -e "${YELLOW}Step 3: Verifying TOTP code...${RESET}"
  VERIFY_RAW=$(curl -s -X POST "$BASE/api/auth/mfa/verify-setup" \
    -H "Authorization: Bearer $SETUP_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"code\":\"$TOTP_CODE\"}")
  echo "Verify response: $VERIFY_RAW"

  ACCESS_TOKEN=$(echo "$VERIFY_RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).token||'')}catch(e){console.log('')}})")
  if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}SUCCESS: $USERNAME MFA enrolled!${RESET}"
    echo "$ACCESS_TOKEN" > "$RESULTS/token-${USERNAME}.txt"
    echo -e "${GREEN}Access token saved to $RESULTS/token-${USERNAME}.txt${RESET}"
  else
    ERROR_MSG=$(echo "$VERIFY_RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).message||'')}catch(e){console.log('')}})")
    echo "ERROR: Verify failed — $ERROR_MSG"
    echo "Try again with a fresh code (they refresh every 30 s)"
    return 1
  fi
}

echo -e "${BOLD}=== Q2 Part (b) — MFA Enrollment ===${RESET}"
echo "This script will:"
echo "  1. Log in each staff user"
echo "  2. Display a QR code / secret to scan"
echo "  3. Prompt for the 6-digit code"
echo "  4. Save the access JWT to results/q2/token-<user>.txt"
echo ""
echo "Make sure the backend is running: docker compose up -d"
echo ""

enroll_user "admin1"     "Admin@123"
enroll_user "officer1"   "Officer@123"
enroll_user "volunteer1" "Volunteer@123"

echo ""
echo -e "${BOLD}=== All users enrolled ===${RESET}"
echo "Tokens stored in results/q2/token-*.txt"
echo ""
echo "Now run the auth tests:"
echo "  ADMIN_TOKEN=\$(cat results/q2/token-admin1.txt) \\"
echo "  OFFICER_TOKEN=\$(cat results/q2/token-officer1.txt) \\"
echo "  VOLUNTEER_TOKEN=\$(cat results/q2/token-volunteer1.txt) \\"
echo "  DONOR_ID=6ae056ddcc14308b7f7d37d0 \\"
echo "  bash backend/scripts/q2-auth-tests.sh | tee results/q2/b-auth-tests.txt"
