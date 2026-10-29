#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
URL=$(cat scripts/trivy-db-url.txt)
echo "Downloading from GitHub CDN directly to /tmp/db.tar.gz..."
curl -L --progress-bar -C - -o /tmp/db.tar.gz "$URL"

echo "Extracting db.tar.gz into ~/.cache/trivy/db/..."
mkdir -p "$HOME/.cache/trivy/db"
tar -zxvf /tmp/db.tar.gz -C "$HOME/.cache/trivy/db"
echo "Trivy DB installed successfully!"
ls -la "$HOME/.cache/trivy/db"
