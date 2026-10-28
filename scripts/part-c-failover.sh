#!/usr/bin/env bash
# Usage: ./scripts/part-c-failover.sh before   OR   ./scripts/part-c-failover.sh after
set -e
MODE=${1:-after}
mkdir -p results
URL="http://localhost:8080/api/donors/"
if [ "$MODE" = "before" ]; then CONF=nginx-before.conf; else CONF=nginx.conf; fi

echo "== Part (c) $MODE using $CONF =="
docker compose up -d backend1 backend2 backend3
sleep 5
NGINX_CONF=$CONF docker compose up -d --force-recreate nginx
sleep 3
curl -s -o /dev/null "$URL"

# -r = keep going on socket errors so we can count failures
ab -r -n 1000 -c 50 "$URL" > results/part-c-$MODE.txt 2>&1 &
AB_PID=$!
sleep 0.7
echo "Killing backend2 at $(date +%T.%N)" | tee results/part-c-$MODE-kill.txt
docker kill backend2
wait $AB_PID || true

grep -E "Complete requests|Failed requests|Non-2xx|Requests per second" results/part-c-$MODE.txt | tee -a results/part-c-$MODE-kill.txt
docker logs nginx-lb 2>&1 | grep -c " \[502" | sed 's/^/Nginx 502 count: /' | tee -a results/part-c-$MODE-kill.txt || true

# restore
docker compose start backend2
NGINX_CONF=nginx.conf docker compose up -d --force-recreate nginx
