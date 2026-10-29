#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
mkdir -p results/q2

echo "=== 1. Checking Trivy DB ==="
ls -la "$HOME/.cache/trivy/db"

echo ""
echo "=== 2. Scanning blood-donor-backend:before ==="
/tmp/trivy image --skip-db-update --severity CRITICAL,HIGH blood-donor-backend:before | tee results/q2/c-trivy-before.txt

echo ""
echo "=== 3. Scanning blood-donor-backend:hardened ==="
/tmp/trivy image --skip-db-update --severity CRITICAL,HIGH blood-donor-backend:hardened | tee results/q2/c-trivy-after.txt

echo ""
echo "=== 4. Image Size & User ID Comparison ==="
echo "--- BEFORE ---"
docker images blood-donor-backend:before
docker run --rm --entrypoint id blood-donor-backend:before

echo "--- AFTER (HARDENED) ---"
docker images blood-donor-backend:hardened
docker run --rm --entrypoint id blood-donor-backend:hardened

echo ""
echo "=== Trivy scan complete! Files in results/q2/ ==="
ls -la results/q2/c-trivy*
