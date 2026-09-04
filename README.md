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

```
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

```
blood-donor-management/
├── backend/
│   ├── config/          # Database connection configuration
│   ├── models/          # Mongoose schemas (Donor, BloodRequest)
│   ├── controllers/     # Business logic for CRUD operations
│   ├── routes/          # API route definitions
│   └── middleware/      # Custom middleware (error handling)
├── frontend/
│   ├── css/             # Stylesheets
│   └── js/              # Client-side JavaScript
├── documentation/
│   └── screenshots/     # Project screenshots and evidence
├── .gitignore
└── README.md
```

---

## Live Deployment

| Resource | URL |
|---|---|
| Live Frontend (Netlify) | _To be added_ |
| Live Backend API (Render) | _To be added_ |
| GitHub Repository | https://github.com/xdevax/blood-donor-management |

---

## API Endpoints

_To be added once the backend is implemented._

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/donors` | Register a new donor |
| GET | `/api/donors` | Get all donors |
| GET | `/api/donors/:id` | Get a single donor by ID |
| PUT | `/api/donors/:id` | Update a donor record |
| DELETE | `/api/donors/:id` | Delete a donor record |

---

## Local Setup

_To be added once the backend is implemented._

---

## Author

**Devansh**
GitHub: [@xdevax](https://github.com/xdevax)

---

## License

This project was created for academic purposes.