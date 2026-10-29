#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
ADMIN_TOKEN=$(cat results/q2/token-admin1.txt)
OFFICER_TOKEN=$(cat results/q2/token-officer1.txt)
VOLUNTEER_TOKEN=$(cat results/q2/token-volunteer1.txt)

# Find an existing donor ID dynamically
EXISTING_ID=$(curl -s http://localhost:8080/api/donors | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
DONOR_ID="${EXISTING_ID:-6ae056ddcc14308b7f7d37d0}"

echo "Using DONOR_ID: $DONOR_ID"
export ADMIN_TOKEN OFFICER_TOKEN VOLUNTEER_TOKEN DONOR_ID
bash backend/scripts/q2-auth-tests.sh | tee results/q2/b-auth-tests.txt
