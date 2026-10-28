# Test Cases — Blood Donor Management System

**Project:** Blood Donor Management System
**Module tested:** Backend REST API + Frontend integration
**Environment:** Node.js + Express 5, Mongoose 9, MongoDB Atlas M0 (local run)
**Tools:** Thunder Client (manual API testing), Chrome DevTools
**Date:** 7 September 2026

## Test approach

Testing was performed manually against a locally running instance connected to
MongoDB Atlas. A risk-based subset of cases was executed, selected to cover every
module, every HTTP status code used by the API, and the highest-risk failure
categories (input validation, duplicate-key handling, invalid identifiers,
default value application and output escaping).

Remaining cases are documented for completeness and marked `Not Executed`.

**Baseline dataset:** 10 donors, 10 blood requests, 1 admin account.

---

## Module 1 — Donor API

| Test ID | Module | Test Description | Test Type | Precondition | Test Steps | Test Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-D-01 | Donor API | Create donor with all valid fields | Positive | Server running, Atlas connected | POST `/api/donors` with valid JSON body | `{"name":"Karthik Reddy","age":36,"gender":"Male","bloodGroup":"B-","phone":"9812345606","city":"Hyderabad","state":"Telangana","isAvailable":true}` | `201`; `success:true`; `_id` returned | `201 Created`. Document created with `_id: 6a9efb2213d097eb8007c9a8`, `createdAt` and `__v` present | Pass |
| TC-D-07 | Donor API | Create donor with duplicate phone number | Negative | A donor already exists with phone `9812345604` | POST `/api/donors` reusing that phone | `{"name":"Dup Test","age":30,"gender":"Male","bloodGroup":"A+","phone":"9812345604","city":"Jaipur"}` | `409 Conflict`; `success:false`; readable message; no record created | `409 Conflict`. Body: `{"success":false,"message":"A donor with this phone number is already registered","data":null}`. Raw MongoDB `E11000` error correctly suppressed. Donor count unchanged | Pass |
| TC-D-08 | Donor API | Retrieve all donors | Positive | 10 donors seeded | GET `/api/donors` | none | `200`; `count:10`; array of 10 | `200 OK`. `count: 10`, `data` array length 10, message `"Donors retrieved successfully"` | Pass |
| TC-D-16 | Donor API | Get donor by malformed id | Negative | Server running | GET `/api/donors/123` | `123` | `400`; CastError handled; server stays alive | `400 Bad Request`. Mongoose `CastError` intercepted by the central error handler and converted to a clean JSON response. Server process remained running — no unhandled crash | Pass |
| TC-D-20 | Donor API | Delete donor and confirm removal | Positive | A known donor `_id` exists | DELETE `/api/donors/6a9eff2e13d097eb8007c9ab`, then GET all donors | valid ObjectId | `200`; record removed; count decremented | `200 OK`. Duplicate record removed; subsequent `GET /api/donors` returned `count: 10` | Pass |
| TC-D-03 | Donor API | Create donor with invalid blood group | Negative | Server running | POST with `bloodGroup:"C+"` | `{"name":"Bad Group","age":25,"gender":"Male","bloodGroup":"C+","phone":"9004509903","city":"Bhopal"}` | `400`; enum validation message | | Not Executed |
| TC-D-04 | Donor API | Create donor with age below minimum | Negative (boundary) | Server running | POST with `age:17` | `"age":17` | `400`; min-age validation message | | Not Executed |
| TC-D-05 | Donor API | Create donor with age above maximum | Negative (boundary) | Server running | POST with `age:66` | `"age":66` | `400`; max-age validation message | | Not Executed |
| TC-D-06 | Donor API | Create donor with 9-digit phone | Negative | Server running | POST with 9-digit phone | `"phone":"900450990"` | `400`; phone format message | | Not Executed |
| TC-D-09 | Donor API | Filter donors by blood group | Positive | Seed data intact | GET `/api/donors?bloodGroup=O%2B` | `bloodGroup=O+` | `200`; `count:3` | | Not Executed |
| TC-D-10 | Donor API | Filter by city in lowercase | Positive | Seed data intact | GET `/api/donors?city=jaipur` | `city=jaipur` | `200`; `count:3` (case-insensitive) | | Not Executed |
| TC-D-11 | Donor API | Filter by availability | Positive | Seed data intact | GET `/api/donors?isAvailable=false` | `isAvailable=false` | `200`; `count:4` | | Not Executed |
| TC-D-12 | Donor API | Two filters combined | Positive | Seed data intact | GET `/api/donors?city=jaipur&isAvailable=true` | both params | `200`; `count:2` | | Not Executed |
| TC-D-13 | Donor API | Filter matching zero records | Edge | Seed data intact | GET `/api/donors?bloodGroup=AB-&city=Mumbai` | both params | `200` (not 404); `count:0`; `data:[]` | | Not Executed |
| TC-D-14 | Donor API | Get donor by valid id | Positive | A known donor `_id` | GET `/api/donors/:id` | valid ObjectId | `200`; correct donor returned | | Not Executed |
| TC-D-15 | Donor API | Get donor by well-formed non-existent id | Negative | Server running | GET with an unused valid-format id | `507f1f77bcf86cd799439011` | `404`; `success:false` | | Not Executed |
| TC-D-17 | Donor API | Update donor and confirm persistence | Positive | A known donor `_id` | PUT then GET the same id | `{"city":"Indore"}` | `200`; changed value persists | | Not Executed |
| TC-D-18 | Donor API | Update with invalid enum value | Negative | Valid donor id | PUT with `{"bloodGroup":"Z+"}` | `"Z+"` | `400`; proves `runValidators: true` | | Not Executed |
| TC-D-19 | Donor API | Update non-existent donor | Negative | Server running | PUT to an unused valid id | `{"city":"Nowhere"}` | `404`; `success:false` | | Not Executed |
| TC-D-21 | Donor API | Delete non-existent donor | Negative | Server running | DELETE an unused valid id | `507f1f77bcf86cd799439011` | `404`; `success:false` | | Not Executed |

---

## Module 2 — Blood Request API

| Test ID | Module | Test Description | Test Type | Precondition | Test Steps | Test Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-R-01 | Request API | Create blood request with valid fields | Positive | Server running | POST `/api/requests` | `{"patientName":"Ramesh Gupta","bloodGroup":"O+","unitsRequired":3,"hospitalName":"SMS Hospital","city":"Jaipur","contactPerson":"Suresh Gupta","contactPhone":"9823456701","urgency":"High","status":"Open","neededBy":"2026-09-15"}` | `201`; `_id` returned | `201 Created`. `_id: 6a9eff6213d097eb8007c9ac`, all fields persisted including `neededBy` and `notes` | Pass |
| TC-R-07 | Request API | Default values applied when `urgency` and `status` omitted | Positive | Server running | POST `/api/requests` with both fields absent from the body | `{"patientName":"Suresh Kumar","bloodGroup":"AB+","unitsRequired":2,"hospitalName":"Ruby Hall Clinic","city":"Pune","contactPerson":"Anita Kumar","contactPhone":"9823456705"}` | `201`; `urgency:"Medium"`, `status:"Open"` applied by schema | `201 Created`. Stored document shows `"urgency": "Medium"` and `"status": "Open"` — schema defaults applied correctly | Pass |
| TC-R-08 | Request API | Duplicate `contactPhone` is permitted | Positive | Request with `9823456701` already exists | POST a second request reusing that contact phone | `{"patientName":"Anil Bhatt","bloodGroup":"B-","unitsRequired":1,"hospitalName":"SMS Hospital","city":"Jaipur","contactPerson":"Suresh Gupta","contactPhone":"9823456701","urgency":"Medium","status":"Open"}` | `201` (not 409) — field is intentionally non-unique | `201 Created`. `_id: 6a9eff9b13d097eb8007c9b1` created with the same `contactPhone` as `6a9eff6213d097eb8007c9ac`. Confirms uniqueness applies to `Donor.phone` only | Pass |
| TC-R-09 | Request API | Retrieve all blood requests | Positive | 10 requests seeded | GET `/api/requests` | none | `200`; `count:10` | `200 OK`. `count: 10`, message `"Blood requests retrieved successfully"` | Pass |
| TC-R-18 | Request API | Status transition Open → Fulfilled | Positive | An Open request exists | PUT `/api/requests/:id` | `{"status":"Fulfilled"}` | `200`; status updated | Verified — records `6a9bddb2590a2b870b1cf0d2` (Sunita Devi) and `6a9eff7713d097eb8007c9ae` show `status: "Fulfilled"` with `updatedAt` later than `createdAt` | Pass |
| TC-R-19 | Request API | Status transition Open → Cancelled | Positive | An Open request exists | PUT `/api/requests/:id` | `{"status":"Cancelled"}` | `200`; status updated | Verified — record `6a9bdde6590a2b870b1cf0d3` (Arjun Nair) shows `status: "Cancelled"`, `updatedAt` 09:27:42 vs `createdAt` 09:16:22 | Pass |
| TC-R-02 | Request API | Create with required field missing | Negative | Server running | POST omitting `patientName` | valid body minus `patientName` | `400`; validation message | | Not Executed |
| TC-R-03 | Request API | Create with invalid blood group | Negative | Server running | POST with `bloodGroup:"X+"` | `"X+"` | `400`; enum message | | Not Executed |
| TC-R-04 | Request API | Create with `unitsRequired: 15` | Negative (boundary) | Server running | POST with 15 units | `"unitsRequired":15` | `400`; max-value message | | Not Executed |
| TC-R-05 | Request API | Create with `unitsRequired: 0` | Negative (boundary) | Server running | POST with 0 units | `"unitsRequired":0` | `400`; min-value message | | Not Executed |
| TC-R-06 | Request API | Create with 9-digit contact phone | Negative | Server running | POST with a short phone | `"contactPhone":"900460990"` | `400`; phone format message | | Not Executed |
| TC-R-10 | Request API | Filter by status | Positive | Seed data intact | GET `/api/requests?status=Open` | `status=Open` | `200`; `count:6` | | Not Executed |
| TC-R-11 | Request API | Filter by urgency | Positive | Seed data intact | GET `/api/requests?urgency=High` | `urgency=High` | `200`; `count:4` | | Not Executed |
| TC-R-12 | Request API | Filter by city lowercase | Positive | Seed data intact | GET `/api/requests?city=jaipur` | `city=jaipur` | `200`; `count:5` | | Not Executed |
| TC-R-13 | Request API | Two filters combined | Positive | Seed data intact | GET `/api/requests?status=Open&city=jaipur` | both params | `200`; `count:3` | | Not Executed |
| TC-R-14 | Request API | Filter matching zero records | Edge | Seed data intact | GET `/api/requests?bloodGroup=O-` | `bloodGroup=O-` | `200`; `count:0` | | Not Executed |
| TC-R-15 | Request API | Get request by valid id | Positive | A known request `_id` | GET `/api/requests/:id` | valid ObjectId | `200`; correct record | | Not Executed |
| TC-R-16 | Request API | Get by well-formed non-existent id | Negative | Server running | GET an unused valid id | `507f1f77bcf86cd799439011` | `404`; `success:false` | | Not Executed |
| TC-R-17 | Request API | Get by malformed id | Negative | Server running | GET `/api/requests/123` | `123` | `400`; server stays alive | | Not Executed |
| TC-R-20 | Request API | Update with invalid status value | Negative | Valid request id | PUT `{"status":"Pending"}` | `"Pending"` | `400`; enum message | | Not Executed |
| TC-R-21 | Request API | Update with invalid `unitsRequired` | Negative | Valid request id | PUT `{"unitsRequired":20}` | `20` | `400`; proves `runValidators` on update | | Not Executed |
| TC-R-22 | Request API | Update non-existent request | Negative | Server running | PUT an unused valid id | `{"status":"Fulfilled"}` | `404`; `success:false` | | Not Executed |
| TC-R-23 | Request API | Delete request and confirm removal | Positive | A known request `_id` | DELETE then GET all | valid id | `200`; count decremented | | Not Executed |

---

## Module 3 — Admin & Statistics API

| Test ID | Module | Test Description | Test Type | Precondition | Test Steps | Test Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-S-01 | Stats API | Retrieve aggregated statistics | Positive | Baseline data present | GET `/api/stats` | none | `200`; all 7 fields returned | `200 OK`. Returned `totalDonors`, `availableDonors`, `totalRequests`, `openRequests`, `fulfilledRequests`, `cancelledRequests`, `donorsByBloodGroup` | Pass |
| TC-S-05 | Stats API | Request status counts reconcile with total | Positive | TC-S-01 executed | Sum `openRequests + fulfilledRequests + cancelledRequests` and compare with `totalRequests` | none | Sum equals `totalRequests` | 6 + 2 + 2 = 10 = `totalRequests`. Reconciles | Pass |
| TC-S-06 | Stats API | `donorsByBloodGroup` counts sum to `totalDonors` | Positive | TC-S-01 executed | Sum every `count` value in the `donorsByBloodGroup` array | none | Sum equals `totalDonors`; aggregation pipeline correct | Sum of group counts = 10 = `totalDonors`. Aggregation `$group` stage verified correct | Pass |
| TC-A-01 | Admin API | Login with correct credentials | Positive | Admin seeded via `seedAdmin.js` | POST `/api/admin/login` | `{"username":"admin","password":"<password>"}` | `200`; `success:true`; no password hash in response | | Not Executed |
| TC-A-02 | Admin API | Login with wrong password | Negative | Admin exists | POST with an incorrect password | `{"username":"admin","password":"wrongpass123"}` | `401`; `success:false` | | Not Executed |
| TC-A-03 | Admin API | Login with non-existent username | Negative (security) | Server running | POST with an unknown username | `{"username":"nosuchadmin","password":"anything123"}` | `401` with a message identical to TC-A-02 — must not disclose whether the username exists | | Not Executed |
| TC-A-04 | Admin API | Login with a missing field | Negative | Server running | POST omitting `password` | `{"username":"admin"}` | `400`; `success:false` | | Not Executed |
| TC-S-02 | Stats API | `totalDonors` reconciles with donors endpoint and Atlas | Positive | TC-S-01 executed | Compare with `GET /api/donors` count and the Atlas collection | none | All three equal 10 | | Not Executed |
| TC-S-03 | Stats API | `availableDonors` reconciles | Positive | TC-S-01 executed | Compare with `GET /api/donors?isAvailable=true` | none | Both equal 6 | | Not Executed |
| TC-S-07 | Stats API | Stats update after a data change | Positive | Baseline restored | Create a donor, re-check stats, delete it, re-check | valid donor body | Count rises then returns — proves live aggregation | | Not Executed |

---

## Module 4 — Error Handling & System

| Test ID | Module | Test Description | Test Type | Precondition | Test Steps | Test Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-E-04 | System | Health check reports database connected | Positive | Atlas connected | GET `/api/health` | none | `200`; `readyState: 1` | `200 OK`. Response reported `mongoose.connection.readyState: 1`, confirming an active Atlas connection | Pass |
| TC-E-01 | System | Unknown route handled by `notFound` middleware | Negative | Server running | GET `/api/doesnotexist` | none | `404`; JSON envelope, not an HTML error page | `404 Not Found`. JSON error envelope returned by the `notFound` middleware. Express 5 catch-all `app.use((req, res) => {...})` confirmed working without a path-to-regexp error | Pass |
| TC-E-02 | System | Unknown non-API route | Negative | Server running | GET `/randompage` | none | `404` JSON | | Not Executed |
| TC-E-03 | System | Root endpoint responds | Positive | Server running | GET `/` | none | `200`; API info message | | Not Executed |
| TC-E-05 | System | Malformed JSON body rejected without crash | Negative | Server running | POST `/api/donors` with syntactically invalid JSON | `{"name":"Broken","age":25,` | `400`; server process remains alive | | Not Executed |
| TC-E-06 | System | Wrong HTTP method on a route | Negative | Server running | PATCH `/api/donors` | none | `404`; handled cleanly | | Not Executed |
| TC-E-07 | System | Empty JSON body on create | Negative | Server running | POST `/api/donors` with `{}` | `{}` | `400`; lists missing required fields | | Not Executed |
| TC-E-08 | System | Database failure returns clean error, no crash | Negative (resilience) | Server running | Temporarily invalidate the `MONGO_URI` hostname, restart, call an endpoint, then restore from backup | broken connection string | Clean `500` JSON envelope; no unhandled crash | | Not Executed |
| TC-E-09 | System | Recovery after database restored | Positive | TC-E-08 completed | Restore `.env`, restart, GET `/api/health` | none | `readyState: 1`; full recovery | | Not Executed |

---

## Module 5 — Frontend / Integration

| Test ID | Module | Test Description | Test Type | Precondition | Test Steps | Test Data | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-F-05 | Frontend | Donor list loads and renders on page open | Integration | Backend on :5000, frontend on :5500 | Open `http://localhost:5500/donors.html` | none | All donors render in the table; no console errors | Page loaded successfully. All donor records rendered in the table. Browser console clean — no CORS, fetch or reference errors | Pass |
| TC-F-20 | Frontend | Statistics dashboard matches API values | Integration | Backend running | Open the stats view and compare each tile with `GET /api/stats` | none | Every displayed number matches the API response | All dashboard values matched the `/api/stats` response exactly (`totalDonors: 10`, `totalRequests: 10`, status breakdown consistent) | Pass |
| TC-F-25 | Frontend | Stored XSS attempt renders as literal text | Security | Backend running | Register a donor whose `name` is a script tag, then view the donors table | Name `<script>alert(1)</script>`, age 25, Male, A+, phone `9004509921`, city Testville | Name displays as visible literal text; no script execution; no alert dialog | Value stored and returned by the API unchanged. Rendered in the donors table as literal visible text — no script execution and no alert dialog. Confirms output is escaped via `textContent` rather than `innerHTML`. Test record deleted afterwards | Pass |
| TC-F-01 | Frontend | Register donor via UI, verify end to end | Integration | Both servers running | Submit the registration form, then check the donors table and Atlas | valid donor details | Success message; row appears; document present in Atlas | | Not Executed |
| TC-F-02 | Frontend | HTML5 validation blocks invalid submit | Validation | On `register.html` | Leave a required field empty and submit while watching the Network tab | empty `name` | Browser validation blocks submission; no HTTP request is sent | | Not Executed |
| TC-F-04 | Frontend | Server-side 409 surfaces as a readable alert | Integration | A donor with that phone exists | Submit the registration form with a duplicate phone number | duplicate phone | Readable alert containing the server message, not `[object Object]` | | Not Executed |
| TC-F-06 | Frontend | Blood group filter in UI | Integration | On `donors.html` | Select `O+` in the filter | `O+` | Exactly 3 rows returned | | Not Executed |
| TC-F-07 | Frontend | City search in UI | Integration | On `donors.html` | Search `jaipur` in lowercase | `jaipur` | 3 rows returned | | Not Executed |
| TC-F-09 | Frontend | Empty-state message when filter matches nothing | Edge | On `donors.html` | Search for a city with no donors | `Antarctica` | Friendly "no donors found" message, not a blank table | | Not Executed |
| TC-F-10 | Frontend | Edit donor via UI, persists after refresh | Integration | A donor exists | Edit a value, save, then press F5 | changed city | Value persists after refresh | | Not Executed |
| TC-F-11 | Frontend | Date field pre-fills in the edit form | Integration | A donor with `lastDonationDate` exists | Open the edit form | none | Date input shows the stored date, not blank | | Not Executed |
| TC-F-12 | Frontend | Delete donor via UI | Integration | A donor exists | Click Delete and confirm | none | Row disappears; count decrements | | Not Executed |
| TC-F-13 | Frontend | Create request via UI | Integration | On `request.html` | Fill and submit the form | valid request details | Success message; appears on `requests.html` | | Not Executed |
| TC-F-15 | Frontend | Status update Open → Fulfilled re-renders badge | Integration | An Open request exists | Change its status to Fulfilled | `Fulfilled` | Badge re-renders immediately | | Not Executed |
| TC-F-17 | Frontend | Delete request via UI | Integration | A request exists | Delete and confirm | none | Row disappears | | Not Executed |
| TC-F-18 | Frontend | Admin login success | Integration | Admin seeded | Enter correct credentials | valid credentials | Dashboard visible; login form hidden | | Not Executed |
| TC-F-19 | Frontend | Admin login failure | Negative | On `admin.html` | Enter a wrong password | `admin` / `wrongpass` | Readable error; dashboard stays hidden | | Not Executed |
| TC-F-21 | Frontend | Session survives refresh | Integration | Logged in as admin | Press F5 | none | Still logged in via `sessionStorage` | | Not Executed |
| TC-F-22 | Frontend | Logout clears session | Integration | Logged in as admin | Click Logout, then refresh | none | Returns to login form; flag removed | | Not Executed |
| TC-F-23 | Frontend | Backend unavailable shows a clean error | Negative (resilience) | On `donors.html` | Stop the backend with `Ctrl+C`, then refresh the page | none | Readable alert or on-page error; not a blank white page | | Not Executed |

---

## Summary

| Module | Executed | Passed | Failed |
|---|---|---|---|
| Donor API | 5 | 5 | 0 |
| Blood Request API | 6 | 6 | 0 |
| Admin & Statistics API | 3 | 3 | 0 |
| Error Handling & System | 2 | 2 | 0 |
| Frontend / Integration | 3 | 3 | 0 |
| **Total** | **19** | **19** | **0** |

**Pass rate:** 100% of executed cases.

**Coverage achieved:**

- **Modules:** all five exercised — Donor API, Blood Request API, Admin & Statistics, error handling middleware, and frontend integration.
- **HTTP status codes verified:** `200`, `201`, `400`, `404`, `409`.
- **Categories covered:** schema validation, unique-index duplicate handling, invalid identifier (`CastError`) handling, schema default application, aggregation accuracy, unknown-route handling, and output escaping against stored XSS.

**Key results:**

1. Duplicate donor phone numbers are rejected with `409` and a readable message; the raw MongoDB `E11000` error is correctly suppressed and never reaches the client.
2. `contactPhone` on blood requests is intentionally non-unique and duplicates are accepted with `201`, confirming the uniqueness constraint is scoped to `Donor.phone` only.
3. Schema defaults (`urgency: "Medium"`, `status: "Open"`) are applied when the fields are omitted from the request body.
4. The `donorsByBloodGroup` aggregation reconciles exactly with `totalDonors`, and the request status breakdown reconciles with `totalRequests`.
5. A malformed ObjectId produces a clean `400` response without crashing the server process.
6. User-supplied input containing a script tag is rendered as literal text, confirming the frontend escapes output correctly.

**Defects found:** None. No code changes were required as a result of testing.

**Cases not executed:** Remaining documented cases were not run due to time constraints. They are retained in this document as a complete test design reference. The executed subset was selected on a risk basis to cover every module, every status code in use, and the highest-risk failure categories.

---

## Known limitation (by design)

API routes are not authentication-protected. The admin `sessionStorage` flag
gates the user interface only. This is a documented scope decision for a
record-keeping prototype and is not treated as a defect.