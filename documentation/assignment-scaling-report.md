# Scaling the Blood Donor Management System

## (a) Peak-demand situation
**Scenario: mass-casualty emergency.** A major accident (highway pile-up, building collapse) sends many
injured patients to city hospitals at once. Within minutes, hospital desks, blood bank staff, emergency
coordinators and volunteers all open the system to find available donors of specific blood groups and to
post urgent blood requests. Traffic jumps from a few requests per minute to hundreds per second, and
downtime directly delays life-saving transfusions.

**Hardest-hit API:** `GET /api/donors` (donor search, with blood-group filters). Every blood request leads
to many repeated donor searches, so it receives far more traffic than `POST /api/requests`.

**Implementation:** three identical containers (`backend1`, `backend2`, `backend3`) built from `backend/Dockerfile`,
behind an Nginx load balancer (`nginx-lb`, port 8080), all connected to the existing MongoDB Atlas cluster.
Each instance adds an `X-Instance` header and exposes `/api/whoami`.

**Evidence of distribution:** (see results/part-a-distribution.txt)
```
      4 backend1
      4 backend2
      4 backend3
```

## (b) Load test (ApacheBench, `ab -n 1000 -c 50 http://localhost:8080/api/donors/`)
| Setup | Requests/sec | Mean time per request (ms) | Failed |
|---|---|---|---|
| 1 instance | 97.26 | 514.088 | 0 |
| 3 instances | 107.93 | 463.269 | 0 |
| **Improvement** | **+10.97%** | **Mean response time reduced by 9.89%** | |

Discussion: Under concurrent load (c=50, 1000 requests), scaling to 3 backend instances increased throughput from 97.26 to 107.93 req/sec and mean response time reduced by 9.89% (from 514.088 ms down to 463.269 ms). The improvement is sub-linear (below 3x) because all three Docker containers execute on the same local host CPU and share a single remote MongoDB Atlas free-tier (M0) cluster over the network. The external cloud database connection pool and shared CPU contention become the primary performance bottlenecks rather than Node.js process capacity.

## (c) Instance failure during load (backend2 killed mid-test)
| Nginx config | Failed requests | Non-2xx responses | Total failed |
|---|---|---|---|
| Before (`nginx-before.conf`, `proxy_next_upstream off`) | 306 | 306 | 306 |
| After (`nginx.conf`, retry + `max_fails`) | 0 | 0 | **0** |

**Fix:** `proxy_next_upstream error timeout http_502 http_503 http_504` retries a failed request on another
healthy instance; `max_fails=1 fail_timeout=10s` removes the dead instance from rotation; short
`proxy_connect_timeout` detects it quickly; graceful SIGTERM handling in server.js finishes in-flight requests.

## (d) Architecture
See `documentation/architecture.mmd` (render at https://mermaid.live and export PNG).
Components: Netlify frontend → Nginx `nginx-lb` (:8080→:80) → `backend1` (:5001), `backend2` (:5002),
`backend3` (:5003) → MongoDB Atlas. Tools: Docker Compose, Nginx, ApacheBench, Render, MongoDB Atlas, Netlify.

**Cloud bursting component (red):** my existing Render deployment
(`blood-donor-api-q1jg.onrender.com`) is added as a `backup` upstream. Normally the three local containers serve
all traffic. During a mass-casualty spike, when they are saturated or failing, Nginx sends overflow traffic to
Render, which can auto-scale extra instances. All instances share the same MongoDB Atlas database, so donor
availability stays consistent everywhere.

**Why cloud bursting for this domain:**
1. Emergencies are unpredictable and short, so paying for peak capacity all year is wasteful; bursting rents capacity only during the spike.
2. Donor availability is life-critical shared data that must be consistent; edge/fog caching could show a
   donor as available after they have already been booked.
3. It reuses infrastructure I already have from Assignment 1 (Render + Atlas), so no new tools are needed.
