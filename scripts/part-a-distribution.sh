#!/usr/bin/env bash
set -e
mkdir -p results
echo "== Part (a): 12 requests through Nginx :8080 ==" | tee results/part-a-distribution.txt
for i in $(seq 1 12); do
  curl -s http://localhost:8080/api/whoami | tee -a results/part-a-distribution.txt
  echo | tee -a results/part-a-distribution.txt
done
echo "== Count per instance ==" | tee -a results/part-a-distribution.txt
grep -o 'backend[0-9]' results/part-a-distribution.txt | sort | uniq -c | tee -a results/part-a-distribution.txt
echo "== Nginx access log (upstream chosen) ==" | tee -a results/part-a-distribution.txt
docker logs nginx-lb 2>&1 | grep whoami | tail -n 12 | tee -a results/part-a-distribution.txt
echo "== Container status ==" | tee -a results/part-a-distribution.txt
docker compose ps | tee -a results/part-a-distribution.txt
