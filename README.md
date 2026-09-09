# Blood Donor Management System

A cloud-based web application for managing blood donor records and blood requests.
Built as a project for the Cloud Infrastructure and Architecture course.

The system allows donors to register their details, lets users and hospitals search
for donors by blood group and city, and supports creating, updating, and closing
blood requests.

> **Disclaimer:** This is a record-keeping prototype for academic purposes only.
> It does **not** determine medical eligibility to donate blood. All medical
> screening must be carried out by qualified healthcare professionals.

## Features

- Register new blood donors with contact and location details
- Search donors by blood group and city
- View, update, and delete donor records
- Create blood requests and mark them as fulfilled or closed
- Admin dashboard with summary statistics
- Full CRUD operations exposed through RESTful APIs
- Cloud-hosted database and cloud-deployed frontend and backend

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Cloud, Free Tier M0) |
| ODM | Mongoose |
| API Testing | Thunder Client (VS Code Extension) |
| Backend Hosting | Render |
| Frontend Hosting | Netlify |
| Version Control | Git, GitHub |
| Editor | Visual Studio Code |

---

## Cloud Architecture

```text
Browser (User)
      |
      v
Frontend  -->  Netlify (Static Hosting)
      |
      | HTTPS / REST API calls
      v
Backend   -->  Render (Node.js + Express Web Service)
      |
      | Mongoose Driver
      v
Database  -->  MongoDB Atlas (Cloud Database Cluster)
```

---

## Folder Structure

```text
blood-donor-management/
├── backend/
│   ├── config/          # Database connection configuration
│   ├── models/          # Mongoose schemas (Donor, BloodRequest)
│   ├── controllers/     # Business logic for CRUD operations
│   ├── routes/          # API route definitions
│   └── middleware/      # Custom middleware and error handling
├── frontend/
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JavaScript
│   ├── index.html
│   ├── register.html
│   ├── donors.html
│   ├── request.html
│   ├── requests.html
│   └── admin.html
├── documentation/
│   └── screenshots/     # Project screenshots and evidence
├── .gitignore
└── README.md
```

---

## Live Deployment

| Resource | URL |
|---|---|
| Live Frontend (Netlify) | https://blood-donormanagement.netlify.app/ |
| Live Backend API (Render) | https://blood-donor-api-q1jg.onrender.com |
| GitHub Repository | https://github.com/xdevax/blood-donor-management |

### Free-tier cold start

The backend is deployed on Render's free tier. After approximately 15 minutes
without activity, the service may go to sleep. The first request after sleeping
can take approximately 50 seconds while the service starts again. This is expected
free-tier behavior and is not a server failure.

Before testing the live frontend after a period of inactivity, warm the backend by
opening:

```text
https://blood-donor-api-q1jg.onrender.com/api/health
```

---

## API Endpoints

### General

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Backend service information |
| GET | `/api/health` | Health and database readiness check |
| GET | `/api/stats` | Dashboard statistics |

### Donors

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/donors` | Register a new donor |
| GET | `/api/donors` | Get all donors |
| GET | `/api/donors/:id` | Get a single donor by ID |
| PUT | `/api/donors/:id` | Update a donor record |
| DELETE | `/api/donors/:id` | Delete a donor record |

Donors can be filtered using query parameters such as:

```text
GET /api/donors?bloodGroup=O%2B
GET /api/donors?city=jaipur
GET /api/donors?isAvailable=true
```

### Blood Requests

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/requests` | Create a blood request |
| GET | `/api/requests` | Get all blood requests |
| GET | `/api/requests/:id` | Get a single blood request by ID |
| PUT | `/api/requests/:id` | Update a blood request |
| DELETE | `/api/requests/:id` | Delete a blood request |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Check the configured admin credentials |

> The admin login in this academic prototype gates the frontend dashboard UI.
> API routes are intentionally not protected with JWT authentication, according
> to the project scope decision.

---

## Local Setup

### Backend

Open PowerShell and run:

```powershell
cd backend
npm install
npm start
```

The backend runs locally on:

```text
http://localhost:5000
```

The backend requires the following environment variables:

```text
MONGO_URI
ADMIN_USERNAME
ADMIN_PASSWORD
```

### Frontend

The frontend consists of plain HTML, CSS, and vanilla JavaScript. It has no build
step and does not require npm packages.

From the repository root, serve the frontend using:

```powershell
npx serve -l 5500 frontend
```

Open the local frontend at:

```text
http://localhost:5500
```

Do not open the HTML files directly using `file://`, because browser security
restrictions can block API requests.

---

## Deployment Configuration

### Render backend

- Service: `blood-donor-api`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Branch: `main`

### Netlify frontend

- Repository: `xdevax/blood-donor-management`
- Branch: `main`
- Base directory: repository root
- Build command: none
- Publish directory: `frontend`
- Functions directory: none required

Future pushes to the `main` branch automatically trigger a new Netlify deployment.

---

## Author

**Devansh**

GitHub: [@xdevax](https://github.com/xdevax)

---

## License

This project was created for academic purposes.