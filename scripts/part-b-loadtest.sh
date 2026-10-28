#!/usr/bin/env bash
set -e
mkdir -p results
URL="http://localhost:8080/api/donors/"
N=1000
C=50

echo "== Warm-up =="
curl -s -o /dev/null "$URL"

echo "== Run 1: ONE instance (nginx-single.conf) =="
NGINX_CONF=nginx-single.conf docker compose up -d --force-recreate nginx
docker compose stop backend2 backend3
sleep 3
curl -s -o /dev/null "$URL"
ab -n $N -c $C "$URL" | tee results/part-b-1-instance.txt

echo "== Run 2: THREE instances (nginx.conf) =="
docker compose start backend2 backend3
sleep 5
NGINX_CONF=nginx.conf docker compose up -d --force-recreate nginx
sleep 3
curl -s -o /dev/null "$URL"
ab -n $N -c $C "$URL" | tee results/part-b-3-instances.txt

echo "== Summary =="
for f in results/part-b-1-instance.txt results/part-b-3-instances.txt; do
  echo "--- $f"
  grep -E "Requests per second|Time per request|Failed requests|Non-2xx" "$f"
done | tee results/part-b-summary.txt
