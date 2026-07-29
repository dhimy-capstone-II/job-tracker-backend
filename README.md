# Job Application Tracker - Backend

Express and PostgreSQL backend for the **Group 9 TTP Summer 2026 Capstone II** Job Application Tracker.

## Features

- Get all job applications
- Get one job application
- Create a new job application
- Edit an existing job application
- Delete a job application
- Store application data in PostgreSQL
- Use Sequelize for database models and queries
- Validate required fields
- Return clear error responses with correct HTTP status codes
- Seed the database with sample data
- Connect to the React frontend through a REST API

## Project Links

- Backend Repository: Add backend repository URL
- Frontend Repository: Add frontend repository URL
- GitHub Organization: Add GitHub organization URL
- Project Board: Add GitHub Project Board URL

### Local Links

These links work only while both servers are running:

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### Live Links

- Backend: Add Render URL after deployment
- Frontend: Add Vercel URL after deployment

## Planning Documents

The shared planning documents live in the **frontend repository**:

- `JOB-APPLICATION-TABLE-DESIGN.md` — database design and naming standard
- `PROJECT-BOARD.md` — issues, priorities, and definitions of done
- `TEAM-NORMS.md` — team working agreements

## Team

| Name | Role |
|---|---|
| Dhimy Jean | Add role |
| Daniel | Add role |

**TA:** Nevin

## Technologies

- Node.js (20.19+, 22.12+, or a newer compatible release)
- Express.js
- Sequelize
- PostgreSQL
- JavaScript
- CORS
- dotenv
- Nodemon
- Postman or Insomnia

## Application Architecture

```text
React Frontend
      │
      │ HTTP request
      ▼
Express Server
      │
      ▼
API Routes
      │
      ▼
Sequelize Model
      │
      ▼
PostgreSQL Database
      │
      ▼
JSON Response to Frontend
```

## Full Project Structure

The frontend and backend are **separate repositories**. They can be stored inside one local parent folder:

```text
capstone-2/
│
├── job-tracker-backend/
│   ├── models/
│   │   ├── index.js
│   │   └── JobApplication.js
│   ├── routes/
│   │   └── applications.js
│   ├── app.js
│   ├── db.js
│   ├── seed.js
│   ├── .env                  (not committed)
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
│
└── job-tracker-frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   └── ApplicationCard.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── ApplicationPage.jsx
    │   │   ├── CreateApplicationPage.jsx
    │   │   ├── EditApplicationPage.jsx
    │   │   └── NotFoundPage.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── .env                  (not committed)
    ├── .env.example
    ├── .gitignore
    ├── eslint.config.js
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── JOB-APPLICATION-TABLE-DESIGN.md
    ├── PROJECT-BOARD.md
    ├── TEAM-NORMS.md
    ├── vercel.json
    └── vite.config.js
```

The parent folder is only a convenience for local development. Each subfolder is its own Git repository with its own remote. Do not run `git init` in the parent folder.

## Backend Structure

```text
job-tracker-backend/
├── models/
│   ├── index.js
│   └── JobApplication.js
├── routes/
│   └── applications.js
├── app.js
├── db.js
├── seed.js
├── .env                  (not committed)
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## File Responsibilities

| File | Responsibility |
|---|---|
| `db.js` | Creates and exports the Sequelize database connection |
| `models/index.js` | Imports the database and models, defines associations, and exports them |
| `models/JobApplication.js` | Defines the `JobApplication` Sequelize model |
| `routes/applications.js` | Defines the CRUD API routes |
| `app.js` | Configures Express, middleware, CORS, routes, and starts the server |
| `seed.js` | Adds sample job applications to the database |
| `.env` | Stores private environment variables (never committed) |
| `.env.example` | Shows the required environment variable names with no secrets |

## .gitignore

The backend `.gitignore` must include at minimum:

```text
node_modules
.env
```

Commit `.gitignore` and `.env.example` **before** creating `.env`, so the real file is never tracked.

## Database Model

### `JobApplication`

| Field | Sequelize Type | Required | Description |
|---|---|---|---|
| `id` | `INTEGER` | Yes | Primary key generated automatically |
| `company` | `STRING` | Yes | Company name |
| `position` | `STRING` | Yes | Job title |
| `status` | `STRING` | Yes | Current application status, defaults to `Saved` |
| `location` | `STRING` | No | Job location or work arrangement |
| `dateApplied` | `DATEONLY` | No | Date the application was submitted |
| `jobLink` | `TEXT` | No | Link to the job posting |
| `notes` | `TEXT` | No | Additional information |
| `createdAt` | `DATE` | Yes | Created automatically by Sequelize |
| `updatedAt` | `DATE` | Yes | Updated automatically by Sequelize |

`dateApplied` must be `DATEONLY`, not `DATE`. See `JOB-APPLICATION-TABLE-DESIGN.md` for why.

Allowed status values:

```text
Saved
Applied
Interview
Offer
Rejected
Closed
```

### Required Model Configuration

Two settings must be set explicitly, or the database will not match the documented design:

1. **Table name.** Sequelize pluralizes the model name by default, which would create a table called `JobApplications`. Set `tableName: 'job_applications'` in the model options so the table matches `JOB-APPLICATION-TABLE-DESIGN.md`.
2. **Timestamps.** Leave `timestamps` enabled (the default) so `createdAt` and `updatedAt` are generated automatically.

Column names stay camelCase (`dateApplied`, `jobLink`). Do **not** enable `underscored`, because the frontend reads these exact keys from the JSON response.

## Validation Rules

Validation is defined on the Sequelize model so both the API and the seed file enforce the same rules.

| Field | Rule |
|---|---|
| `company` | Required, cannot be an empty string |
| `position` | Required, cannot be an empty string |
| `status` | Required, must be one of the six allowed values, defaults to `Saved` |
| `location` | Optional |
| `dateApplied` | Optional, must be a valid date when provided |
| `jobLink` | Optional, must be a valid URL when provided |
| `notes` | Optional |

A Sequelize validation failure must be caught in the route and returned as a `400`, not allowed to become a `500`.

## API Routes

| Method | Route | Description | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/health` | Confirms the server and database are reachable | `200` | `500` |
| `GET` | `/api/applications` | Get all job applications | `200` | `500` |
| `GET` | `/api/applications/:id` | Get one job application | `200` | `404`, `500` |
| `POST` | `/api/applications` | Create a job application | `201` | `400`, `500` |
| `PATCH` | `/api/applications/:id` | Update a job application | `200` | `400`, `404`, `500` |
| `DELETE` | `/api/applications/:id` | Delete a job application | `204` | `404`, `500` |

Any route that is not defined should return `404` with a JSON body, not an HTML error page.

### Error Response Shape

Every error returns JSON in the same shape so the frontend can display it consistently:

```json
{
  "error": "Job application not found"
}
```

| Status | When it is used |
|---|---|
| `400` | A required field is missing, or `status` is not an allowed value |
| `404` | No record exists with the requested `id`, or the route does not exist |
| `500` | An unexpected server or database error |

## Example Request Body

### Create an application

```json
{
  "company": "Example Company",
  "position": "Frontend Developer",
  "status": "Applied",
  "location": "New York, NY",
  "dateApplied": "2026-07-28",
  "jobLink": "https://example.com/job",
  "notes": "Submitted through the company website."
}
```

Only `company`, `position`, and `status` are required. If `status` is omitted, the model default `Saved` is used.

### Update an application

```json
{
  "status": "Interview",
  "notes": "Phone interview scheduled."
}
```

`PATCH` accepts a partial body. Fields that are not included are left unchanged.

## Run Locally

Create the local database once:

```bash
createdb job_application_tracker
```

Then start the server:

```bash
cd ~/TTPR/capstone-2/job-tracker-backend
npm install
npm run dev
```

The backend runs on:

```text
http://localhost:3000
```

Run the seed file when sample data is needed:

```bash
npm run seed
```

**Warning:** `seed.js` resets the table before inserting sample records. Do not run it against the Neon production database once real data exists.

Update the path if the project is stored in a different location.

## Environment Variables

Create a `.env` file in the backend repository:

```env
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/job_application_tracker
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Create a `.env.example` file with no passwords or private database information:

```env
PORT=3000
DATABASE_URL=
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on. Read it as `process.env.PORT` with a fallback, because Render assigns this value automatically |
| `DATABASE_URL` | Full PostgreSQL connection string used by `db.js` |
| `CLIENT_URL` | The single frontend origin allowed by CORS |
| `NODE_ENV` | `development` locally, `production` on Render |

Do not commit the real `.env` file.

## Database Connection

`db.js` creates the Sequelize instance from `DATABASE_URL`.

Neon requires an encrypted connection. When `NODE_ENV` is `production`, the Sequelize options must include:

```text
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
}
```

Local PostgreSQL does not use SSL, so this option must be applied conditionally. Without it, the Render deployment fails to connect to Neon.

## CORS

`app.js` allows requests from a single origin, read from `CLIENT_URL`:

- Local development: `http://localhost:5173`
- Production: the deployed Vercel URL

Do not hardcode the origin, and do not use a wildcard. Changing environments should only require changing the `CLIENT_URL` value.

## Testing with Postman or Insomnia

Test each route:

```text
GET    http://localhost:3000/api/health
GET    http://localhost:3000/api/applications
GET    http://localhost:3000/api/applications/1
POST   http://localhost:3000/api/applications
PATCH  http://localhost:3000/api/applications/1
DELETE http://localhost:3000/api/applications/1
```

Verify:

- All applications are returned as an array
- One application is returned by ID
- New applications can be created and return `201`
- Existing applications can be updated with a partial body
- Applications can be deleted and return `204`
- Creating without `company` returns `400`
- Creating without `position` returns `400`
- Creating with an invalid `status` returns `400`
- Requesting a nonexistent ID returns `404`
- Updating a nonexistent ID returns `404`
- Deleting a nonexistent ID returns `404`
- A non-numeric ID such as `/api/applications/abc` returns `400` or `404`, never `500`
- An undefined route returns `404` as JSON
- Data remains after restarting the backend

Save the requests as a shared collection so both teammates can run the same tests.

## Available Scripts

```bash
npm run dev     # start with nodemon for development
npm start       # start with node for production
npm run seed    # load sample data
```

The exact scripts must match the scripts in `package.json`. Render uses `npm start`.

## Deployment

| Layer | Service |
|---|---|
| Database | Neon PostgreSQL |
| Backend | Render |
| Frontend | Vercel |

### Deployment Order

The backend needs the frontend URL and the frontend needs the backend URL, so deploy in this order and finish with a return trip to Render:

1. **Create the Neon database.** Copy the connection string.
2. **Deploy the backend to Render.** Set `DATABASE_URL` to the Neon string and `CLIENT_URL` to a temporary placeholder such as `http://localhost:5173`. Confirm `/api/health` responds.
3. **Deploy the frontend to Vercel.** Set `VITE_API_URL` to the live Render URL.
4. **Return to Render** and update `CLIENT_URL` to the live Vercel URL, then redeploy so CORS accepts the real frontend.

### Render Settings

- Build command: `npm install`
- Start command: `npm start`
- Do **not** set `PORT` manually on Render. Render provides it, and the server must read `process.env.PORT`.

Production environment variables on Render:

```env
DATABASE_URL=your_neon_database_url
CLIENT_URL=your_vercel_frontend_url
NODE_ENV=production
```

### Free Tier Behavior

Render free web services sleep after inactivity. The first request after sleeping can take roughly 50 seconds. This is expected, and it is why the frontend must show a loading state on every fetch.

### After Deployment

- Confirm Render connects to Neon and `/api/health` returns `200`
- Confirm CORS allows the Vercel frontend and rejects other origins
- Test every CRUD route against the live URL
- Verify data remains after a Render restart
- Add the live Render URL to this README and to the frontend README
