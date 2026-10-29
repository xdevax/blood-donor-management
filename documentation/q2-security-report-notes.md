# Q2 Security Report Notes
## Blood Donor Management System — Assignment 3, Question 2

---

## Part (a) — bcrypt Password Hashing

### Donor/User Data Fields (Donor model)

| Field | Type | Sensitivity |
|-------|------|-------------|
| `name` | String | Personal identifier |
| `age` | Number | Personal |
| `gender` | String | Personal |
| `bloodGroup` | String | Health data (GDPR Art. 9 "special category") |
| `phone` | String | Contact / personal |
| `email` | String | Contact / personal |
| `city` | String | Location |
| `state` | String | Location |
| `lastDonationDate` | Date | Health-related |
| `isAvailable` | Boolean | Availability |

### Staff Model (User.js)

| Field | Purpose |
|-------|---------|
| `username` | Login identifier |
| `passwordHash` | bcrypt $2b$12$ hash (cost factor 12) |
| `role` | admin / bloodbank_officer / volunteer |
| `mfaEnabled` | Whether TOTP MFA is active |
| `mfaSecret` | TOTP secret (select:false — never sent to client) |

### Before → After Evidence

**Before (plaintext):**
```
{ username: "admin1", password: "Admin@123", role: "admin" }
```

**After (bcrypt migrated — `q2-hash-passwords.js`):**
```
{ username: "admin1",
  passwordHash: "$2b$12$essqepO2yesL2cKbcr4o4O50wMt2hOpsciWeL8pEVvESOXKaIy3aa",
  mfaEnabled: true }
```

### Why bcrypt?

1. **Adaptive cost factor** — cost=12 means ~250 ms per hash; brute-force at GPU speed is infeasible.
2. **Built-in salt** — each hash includes a unique 22-character random salt, defeating rainbow-table attacks.
3. **Industry standard** — OWASP Password Storage Cheat Sheet recommends bcrypt (work factor ≥ 10).
4. **GDPR Art. 32** — requires "appropriate technical measures" for personal data security; bcrypt satisfies this for credential storage.

---

## Part (b) — TOTP MFA + JWT + Role-Based Access Control

### Authentication Flow

```
Client                    Server
  |                          |
  |-- POST /api/auth/login ->|  validates password (bcrypt.compare)
  |<- { token: setupJWT } ---|  purpose="mfa_setup" (short-lived, 10 min)
  |                          |
  |-- POST /api/auth/mfa/setup -> |  generates TOTP secret, returns QR
  |<- { qrDataUrl, otpauthUrl } --|
  |  [user scans QR with phone]   |
  |-- POST /api/auth/mfa/verify-setup { code } ->|
  |<- { token: accessJWT }    |  purpose="access" (1 h)
  |                          |
  |-- PUT /api/donors/:id  Authorization: Bearer <accessJWT> ->|
  |   middleware: requireAuth("access") → requireRole("admin","bloodbank_officer")
  |<- 200 OK or 403 Forbidden
```

### Role Matrix

| Endpoint | No token | volunteer | bloodbank_officer | admin |
|----------|----------|-----------|-------------------|-------|
| GET /api/donors | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| POST /api/donors | ✅ 200 | ✅ 200 | ✅ 200 | ✅ 200 |
| PUT /api/donors/:id | ❌ 401 | ❌ 403 | ✅ 200 | ✅ 200 |
| DELETE /api/donors/:id | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 200 |
| PUT /api/requests/:id | ❌ 401 | ❌ 403 | ✅ 200 | ✅ 200 |
| DELETE /api/requests/:id | ❌ 401 | ❌ 403 | ❌ 403 | ✅ 200 |

### Test Evidence (`results/q2/b-auth-tests.txt`)

| Test | Token | Expected | Result |
|------|-------|----------|--------|
| No-token PUT donor | — | 401 | ✅ PASS |
| No-token DELETE donor | — | 401 | ✅ PASS |
| No-token PUT request | — | 401 | ✅ PASS |
| No-token DELETE request | — | 401 | ✅ PASS |
| Volunteer PUT donor | volunteer | 403 | ✅ PASS |
| Volunteer DELETE donor | volunteer | 403 | ✅ PASS |
| Officer PUT donor | officer | 200 | ✅ PASS |
| Officer DELETE donor | officer | 403 | ✅ PASS |
| Admin GET /me | admin | 200 | ✅ PASS |
| Admin DELETE test donor | admin | 200 | ✅ PASS |

---

## Part (c) — Docker Image Hardening & Trivy Scan

### Image Comparison

| Attribute | Before (`node:20-slim`) | After (`node:20-alpine`) | Change / Improvement |
|-----------|-------------------------|--------------------------|----------------------|
| Base image | Debian 12.13 (glibc) | Alpine Linux 3.23.4 (musl) | Minimal attack surface |
| Image size | 331 MB | 219 MB | **-112 MB (34% reduction)** |
| Running user | `uid=0(root)` | `uid=1000(node)` | **Non-root containment** |
| Installed OS pkgs | 88 packages | 18 packages | **-70 packages (80% fewer pkgs)** |
| npm installation | `npm install` (all deps + cache) | `npm ci --omit=dev && npm cache clean --force` | Production dependencies only |
| Secrets hygiene | `.env` present in context | `RUN rm -f .env` | Prevents secret leakage |

### Trivy Scan Results

*(See `results/q2/c-trivy-before.txt` and `results/q2/c-trivy-after.txt` for raw output)*

| Severity Category | Before (`node:20-slim`) | After (`node:20-alpine`) | Vulnerability Reduction |
|-------------------|-------------------------|--------------------------|-------------------------|
| OS Vulnerabilities | 74 | 4 | **-94.6% reduction** |
| CRITICAL Severities | 7 | 4 | **-42.9% reduction** |
| HIGH Severities | 8 | 6 | **-25.0% reduction** |
| Total Flagged | 100+ | Low single-digit OS vulns | **Major security gain** |

### Hardening Controls Applied

1. **Non-root user** — `USER node` (uid=1000): if exploited, attacker cannot modify system binaries.
2. **Alpine base** — minimal OS packages = smaller attack surface.
3. **`npm ci --omit=dev`** — removes test frameworks, build tools from runtime image.
4. **`npm cache clean --force`** — no cached npm files in the image layer.
5. **`RUN rm -f .env`** — prevents accidental secret leakage if `.dockerignore` is misconfigured.

---

## Part (d) — Threat Model, Controls & GDPR

### System Architecture (from Q1)

```
Netlify (frontend) → Nginx LB :8080 → backend1/2/3 (Node.js) → MongoDB Atlas
                                          ↑
                                   Cloud Burst node (Azure/AWS on-demand)
```

### GDPR-Relevant Data in System

| Data | GDPR Category | Article |
|------|---------------|---------|
| Name, email, phone | Personal data | Art. 4(1) |
| Blood group | Special category (health) | Art. 9 |
| Donation history | Health-related | Art. 9 |
| Location (city/state) | Personal data | Art. 4(1) |

### Threat Agents & Controls

| # | Threat Agent | Attack Vector | Impact | Control Implemented |
|---|-------------|---------------|--------|---------------------|
| 1 | **External cybercriminal** | SQL/NoSQL injection via donor name/email fields | Data exfiltration of all donor PII | Mongoose schema validation + type enforcement prevents $where injection |
| 2 | **Credential theft / phishing** | Stolen staff password → unauthorised PUT/DELETE | Data manipulation, GDPR breach | bcrypt hashing + TOTP MFA (two-factor) makes stolen password alone useless |
| 3 | **Insider threat (malicious staff)** | Volunteer-role user attempts to delete records | Data destruction | RBAC: volunteer cannot PUT/DELETE; only admin can DELETE |
| 4 | **Brute-force login** | Automated password guessing on /api/auth/login | Account takeover | Rate limiter (10 req / 15 min per IP) via express-rate-limit |
| 5 | **Privilege escalation** | JWT tampering to forge admin role | Full admin access | JWT signed with 256-bit HS256 secret; role embedded in payload; verified on every request |
| 6 | **Container escape / root exploit** | Exploit app vulnerability to gain root in container | Host system compromise | Non-root USER node in hardened Docker image |
| 7 | **Known CVE in base image** | Exploit unpatched Debian library in node:20 full | Remote code execution | node:20-alpine base reduces exposed packages; Trivy CI scan gates deployment |
| 8 | **Token replay / interception** | Capture JWT over HTTP | Persistent unauthorised access | JWT expires in 1 h; HTTPS enforced in production (Render + Netlify) |

### GDPR Compliance Mapping

| GDPR Article | Requirement | Implementation |
|-------------|-------------|----------------|
| Art. 5(1)(f) — Integrity & Confidentiality | Personal data must be secured against unauthorised access | bcrypt passwords, JWT auth, RBAC, HTTPS in production |
| Art. 9 — Special Category Data | Blood group data requires explicit consent and extra safeguards | Role-based access; only authenticated staff can modify records; donors submit voluntarily |
| Art. 25 — Data Protection by Design | Privacy built into system design | `mfaSecret` uses `select:false` (never returned to client); `.env` excluded from image; non-root container |
| Art. 32 — Security of Processing | Appropriate technical measures | MFA, bcrypt (cost 12), rate limiting, hardened Docker image, Trivy scanning |

### Why Cloud Bursting (not Edge Computing)?

Cloud bursting dynamically provisions extra compute capacity during demand spikes (e.g., disaster or mass-casualty event requiring many urgent blood requests). Edge computing pre-deploys cached data at edge nodes — inappropriate here because:

1. **Data freshness** — donor availability changes minute-by-minute; edge caches risk showing stale "available" status.
2. **Unpredictability** — emergencies are sudden; cloud bursting scales on-demand without pre-deployed infrastructure everywhere.
3. **Consistency** — all locations must see the same real-time donor database (MongoDB Atlas); edge nodes would diverge.
4. **Cost** — cloud bursting is pay-per-use (scale to zero when no emergency); always-on edge nodes would be wasteful.

---

*Report prepared for Cloud Computing Assignment 3 — Q2*
*Branch: assignment-3 | Repo: https://github.com/xdevax/blood-donor-management*
