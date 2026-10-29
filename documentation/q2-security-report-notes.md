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

### Before -> After Evidence

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
3. **Industry standard** — OWASP Password Storage Cheat Sheet recommends bcrypt (work factor >= 10).
4. **GDPR Art. 32** — requires "appropriate technical measures" for personal data security; bcrypt satisfies this for credential storage.

---

## Part (b) — TOTP MFA + JWT + Role-Based Access Control

### Authentication Flow

```
Client                    Server
  |                          |
  |-- POST /api/auth/login ->|  validates password (bcrypt.compare)
  |<- { setupToken } --------|  purpose="mfa-setup" (short-lived, 10 min)
  |                          |
  |-- POST /api/auth/mfa/setup (Bearer setupToken) ->|  generates TOTP secret, returns QR
  |<- { qrDataUrl, otpauthUrl } ------------------|
  |  [user scans QR with phone]                   |
  |-- POST /api/auth/mfa/verify-setup { code } -->|
  |<- { token: accessJWT }    |  purpose="access" (1 h)
  |                          |
  |  (subsequent logins, MFA already enrolled)    |
  |-- POST /api/auth/login ->|  returns { mfaRequired:true, mfaToken }
  |-- POST /api/auth/mfa/verify (Bearer mfaToken) { code } ->|
  |<- { token: accessJWT }    |
  |                          |
  |-- PUT /api/donors/:id  Authorization: Bearer <accessJWT> ->|
  |   middleware: requireAuth("access") -> requireRole("admin","bloodbank_officer")
  |<- 200 OK or 403 Forbidden
```

### Role Matrix

| Endpoint | No token | volunteer | bloodbank_officer | admin |
|----------|----------|-----------|-------------------|-------|
| GET /api/donors | 200 | 200 | 200 | 200 |
| POST /api/donors | 200 | 200 | 200 | 200 |
| PUT /api/donors/:id | 401 | 403 | 200 | 200 |
| DELETE /api/donors/:id | 401 | 403 | 403 | 200 |
| PUT /api/requests/:id | 401 | 403 | 200 | 200 |
| DELETE /api/requests/:id | 401 | 403 | 403 | 200 |

### Test Evidence (`results/q2/b-auth-tests.txt`) — All 15 Tests PASS

| # | Test | Token used | Expected | Result |
|---|------|-----------|----------|--------|
| 1 | No token -> PUT donor | none | 401 | PASS |
| 2 | No token -> DELETE donor | none | 401 | PASS |
| 3 | No token -> PUT request | none | 401 | PASS |
| 4 | No token -> DELETE request | none | 401 | PASS |
| 5 | Volunteer -> PUT donor | volunteer | 403 | PASS |
| 6 | Volunteer -> DELETE donor | volunteer | 403 | PASS |
| 7 | Officer -> PUT donor | officer | 200 | PASS |
| 8 | Officer -> DELETE donor | officer | 403 | PASS |
| 9 | Admin -> GET /api/auth/me | admin | 200 | PASS |
| 10 | Admin DELETE TEST DELETE DONOR | admin | 200 | PASS |
| 11 | Login correct pw -> mfaRequired:true, no "token" field | — | 200+mfaRequired | PASS |
| 12 | mfaToken as Bearer on PUT donor | mfaToken | 401 | PASS |
| 13 | mfa/verify with code 000000 | mfaToken | 401 | PASS |
| 14 | PUT donor with Bearer faketoken123 | fake | 401 | PASS |
| 15 | Login wrong password | — | 401 | PASS |

---

## Part (c) — Docker Image Hardening & Trivy Scan

### Image Comparison

| Attribute | Before (`node:20-slim`) | After (`node:20-alpine`) | Change |
|-----------|-------------------------|--------------------------|--------|
| Base image | Debian 12.13 (glibc) | Alpine Linux 3.23.7 (musl) | Minimal attack surface |
| Image size | 331 MB | 230 MB | -101 MB (-30.5%) |
| Running user | uid=0 (root) | uid=1000 (node) | Non-root containment |
| npm installation | npm install (all deps) | Multi-stage `npm ci --omit=dev` | Production only |
| Package manager | npm/yarn installed | Removed in runtime stage | Eliminates CLI CVEs |
| Secrets hygiene | .env present in context | RUN rm -f .env | Prevents secret leakage |

### Trivy Scan Summary

*(Full output: `results/q2/c-trivy-before.txt` and `results/q2/c-trivy-after.txt`)*
*(Detailed table: `results/q2/c-summary.txt`)*

| Image | Base | User | Size | CRITICAL | HIGH | OS pkgs | Node pkgs |
|-------|------|------|------|:---:|:---:|:---:|:---:|
| blood-donor-backend:before | node:20-slim | uid=0 root | 331 MB | 8 | 92 | 6C+68H=74 | 2C+24H=26 |
| blood-donor-backend:hardened | node:20-alpine | uid=1000 node | 230 MB | **0** | **0** | **0** | **0** |

> **Note on Image Size:** Size increased slightly (219 → 230 MB) because `apk upgrade` adds patched packages in a new layer, and files deleted from the base image layer still occupy space. Security, not size, was the goal of this step; the image is still 30% smaller than the original (331 MB).

All vulnerabilities in the hardened image were reduced to 0:
- OS OpenSSL CVE-2026-14456 was resolved by `apk upgrade --no-cache` (upgraded libcrypto3/libssl3 to 3.5.9-r0).
- Node CLI vulnerabilities in npm/tar/sigstore/brace-expansion were eliminated by pruning `/usr/local/lib/node_modules/npm`, yarn, and corepack from the runtime container.
- Application-level dependencies remain 100% clean (0 vulnerabilities after `npm audit fix`).

### Hardening Controls Applied

1. **Non-root user** — `USER node` (uid=1000): exploited container cannot modify system binaries.
2. **Alpine base** — minimal OS packages, 80% fewer installed packages.
3. **Multi-stage build & `npm ci --omit=dev`** — dependencies installed in builder stage; devDependencies excluded.
4. **Stripped runtime package managers** — removed npm, yarn, corepack from the runtime stage since Node runs `server.js` directly.
5. **OS patch level** — `apk upgrade --no-cache` pulls the latest security patches for base packages.
6. **`RUN rm -f .env`** — prevents accidental secret leakage if `.dockerignore` is misconfigured.
7. **`npm audit fix`** — fixed proxy-addr (CRITICAL CVE-2026-90711) and body-parser (HIGH) in the dependency tree.

---

## Part (d) — Threat Model, Controls & GDPR

### Why This System Processes GDPR-Regulated Data

The system stores donor records containing:
- **Name, email, phone, city/state** — personal data identifying a natural person (GDPR Art. 4(1))
- **Blood group and donation eligibility** — health data, a *special category* under **GDPR Art. 9**

Any unauthorised access, leakage or manipulation of these records constitutes a personal data breach
requiring notification to supervisory authorities (Art. 33) and potentially to donors themselves (Art. 34).

---

### Threat Agent 1 — External Cybercriminal / Credential-Stuffing Attacker

**Profile:** Automated attacker using breach-database credential lists to attempt login to staff accounts
via POST /api/auth/login; or scanning for unpatched container CVEs to gain remote code execution.

**Attack vector:**
- Tries `admin1 / password123` (credential stuffing from known breaches)
- If password matches: gains access to PUT/DELETE donor records without MFA
- Or exploits a CRITICAL OS/Node CVE in the unpatched `node:20-slim` image to exfiltrate the database

**Impact:** Mass exfiltration of donor PII and blood group data; manipulation or deletion of donor records.

**Controls implemented:**
1. **bcrypt (cost 12) password hashing** — even if the database is stolen, hashes cannot be reversed in feasible time; credential stuffing fails because plaintext from other breaches won't match the hash.
2. **TOTP MFA (Google/Microsoft Authenticator)** — a valid password alone is insufficient; attacker also needs the physical device with the TOTP seed. Staff login always requires a second factor.
3. **Rate limiter** — `express-rate-limit` (10 req / 15 min per IP) blocks automated credential-stuffing bursts.
4. **Docker image hardening** — switching from `node:20-slim` (8 CRITICAL+HIGH OS CVEs) to `node:20-alpine` eliminates the Debian-specific CVEs (OS CRITICAL reduced from 6 to 0), shrinking the attack surface for remote code execution.

**GDPR requirement — Art. 32(1):**
> "The controller and processor shall implement appropriate technical ... measures to ensure a level of
> security appropriate to the risk, including ... (b) the ability to ensure the ongoing confidentiality,
> integrity, availability and resilience of processing systems."

**Why Art. 32(1) applies:** Blood group data is a special-category health record (Art. 9). Processing it
requires *heightened* technical security. bcrypt + MFA directly fulfils the "appropriate technical measures"
obligation; the Trivy-driven hardening reduces the risk of a system-level breach that would expose all donor records.

---

### Threat Agent 2 — Malicious or Careless Insider (Volunteer / Staff)

**Profile:** A staff member with a low-privilege `volunteer` account (or a `bloodbank_officer` who overreaches)
who attempts to delete or corrupt donor records — either maliciously (covering tracks after a fraudulent
blood request) or carelessly (mistaken bulk delete).

**Attack vector:**
- Volunteer authenticates successfully (password + MFA) -> receives valid `access` JWT with `role: "volunteer"`
- Calls `DELETE /api/donors/:id` or `PUT /api/donors/:id` hoping their token is accepted
- Or an officer calls `DELETE /api/donors/:id` (above their permitted role)

**Impact:** Deletion or corruption of donor records; loss of health data that could be needed in a medical emergency.

**Controls implemented:**
1. **Role-Based Access Control (RBAC)** — `requireRole` middleware rejects `volunteer` with HTTP 403 on any PUT/DELETE route; `bloodbank_officer` is blocked from DELETE. Only `admin` can delete records.
2. **JWT `role` claim** — role is embedded and cryptographically signed in the JWT; a volunteer cannot self-elevate to `admin` by modifying the token without invalidating the HS256 signature.
3. **`mfaSecret` with `select:false`** — the TOTP secret is never returned in API responses, preventing a staff member from extracting another user's secret via the API.

**GDPR requirement — Art. 25 (Data Protection by Design and by Default):**
> "The controller shall ... implement appropriate technical and organisational measures ... designed to
> implement data-protection principles ... in an effective manner and to integrate the necessary safeguards
> into the processing."

**Why Art. 25 applies:** The principle of *data minimisation* and *access limitation* (Art. 5(1)(c) and (f))
requires that each staff role can access only the data and operations necessary for their function.
A volunteer coordinating donors has no legitimate need to delete or update records — RBAC enforces this
at the architecture level, making privacy the default rather than an afterthought. Blood group and
eligibility status are Art. 9 health data; restricting write access to senior roles limits insider risk
to the minimum technically achievable.

---

### Other Controls (Summary)

In addition to the two primary controls above, the system also implements:
- **Helmet.js** — sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **JWT expiry (1 h)** — limits the window for a stolen token to be misused
- **`.env` excluded from Docker image** — `RUN rm -f .env` + `.dockerignore` prevents secret leakage into image layers
- **MongoDB Atlas** — managed database with TLS in transit, IP allow-listing, and Atlas audit logs

---

*Report prepared for Cloud Computing Assignment 3 — Q2*
*Branch: assignment-3 | Repo: https://github.com/xdevax/blood-donor-management*
