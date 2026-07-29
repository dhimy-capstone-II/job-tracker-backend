# Job Application Database Design — Medium Version

This document is the source of truth for the database. If any other document disagrees with it, this one wins.

## Core Resource

**Model:** `JobApplication`
**Table:** `job_applications`
**Purpose:** Store job applications that users want to track.

The MVP has **one table**. There is no user table and no authentication. No second table is added until the CRUD application is complete, tested, and deployed.

---

## Core Table Fields

| Field | Type | Sequelize Type | Required | Purpose |
|---|---|---|---|---|
| `id` | Integer | `INTEGER` primary key, auto-increment | Yes | Primary key, automatically generated |
| `company` | String | `STRING` | Yes | Company name |
| `position` | String | `STRING` | Yes | Job title |
| `status` | String | `STRING` | Yes | Current application status, defaults to `Saved` |
| `location` | String | `STRING` | No | Job location or work arrangement |
| `dateApplied` | Date only | `DATEONLY` | No | Date the application was submitted |
| `jobLink` | Text | `TEXT` | No | Link to the job posting |
| `notes` | Text | `TEXT` | No | Additional information |
| `createdAt` | Timestamp | `DATE` | Yes | Created automatically by Sequelize |
| `updatedAt` | Timestamp | `DATE` | Yes | Updated automatically by Sequelize |

### Type Notes

- **`dateApplied` must be `DATEONLY`, not `DATE`.** A job application is applied to on a calendar day, not at an instant. `DATEONLY` stores `2026-07-28` and returns it as the string `"2026-07-28"`. Using `DATE` stores a timestamp, and timezone conversion between PostgreSQL, Node, and the browser can shift the displayed date by one day. That bug looks like a frontend problem and is hard to trace.
- `STRING` maps to `VARCHAR(255)`, which is enough for `company`, `position`, `status`, and `location`.
- `TEXT` is unbounded and is correct for `jobLink` and `notes`, which have no predictable length.
- `createdAt` and `updatedAt` are timestamps and are created automatically. Do not define them manually and do not accept them from the client.

---

## Required Model Configuration

Two settings must be set explicitly in `models/JobApplication.js`, or the implementation will not match this document:

| Setting | Value | Reason |
|---|---|---|
| `tableName` | `'job_applications'` | Sequelize pluralizes the model name by default and would create a table called `JobApplications`. The table name in this document is only produced if `tableName` is set |
| `timestamps` | `true` (the default) | Generates `createdAt` and `updatedAt` |
| `underscored` | **not enabled** | Enabling it would rename the columns to `date_applied` and `job_link`. The frontend reads the camelCase keys directly from the JSON response |

The table name is snake_case. The column names are camelCase. This is intentional and both must be preserved.

---

## Status Values

| Status | Meaning |
|---|---|
| `Saved` | Job saved but not yet applied to |
| `Applied` | Application submitted |
| `Interview` | Interview scheduled or completed |
| `Offer` | Offer received |
| `Rejected` | Application rejected |
| `Closed` | Position closed or no longer active |

Default value:

```text
Saved
```

`status` is `NOT NULL` **with a default**. This means the database always has a value, but the client is not required to send one. If `POST /api/applications` omits `status`, the record is created as `Saved`. If the client sends a value, it must be one of the six above.

The frontend must render `status` as a `<select>` limited to these six values, so an invalid status can never be submitted from the UI.

---

## Core DBML Diagram

This is the MVP schema. Paste it into dbdiagram.io to render it.

```dbml
Table job_applications {
  id integer [primary key, increment]
  company varchar [not null]
  position varchar [not null]
  status varchar [not null, default: 'Saved']
  location varchar
  dateApplied date
  jobLink text
  notes text
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}
```

---

## Core API Routes

| Method | Route | Purpose | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/applications` | Get all applications | `200` | `500` |
| `GET` | `/api/applications/:id` | Get one application | `200` | `404`, `500` |
| `POST` | `/api/applications` | Create an application | `201` | `400`, `500` |
| `PATCH` | `/api/applications/:id` | Update an application | `200` | `400`, `404`, `500` |
| `DELETE` | `/api/applications/:id` | Delete an application | `204` | `404`, `500` |

---

## Validation Rules

Validation is defined on the Sequelize model so the API, the seed file, and any future code all enforce the same rules.

| Field | Rule |
|---|---|
| `company` | Required, `allowNull: false`, cannot be an empty string |
| `position` | Required, `allowNull: false`, cannot be an empty string |
| `status` | `allowNull: false`, `defaultValue: 'Saved'`, must be one of the six allowed values |
| `location` | Optional |
| `dateApplied` | Optional, must be a valid date when provided |
| `jobLink` | Optional, must be a valid URL when provided |
| `notes` | Optional |

Notes on enforcement:

- Use a `notEmpty` validator on `company` and `position`. `allowNull: false` alone still accepts `""`, which would let a blank application be saved.
- Use an `isIn` validator on `status` against the six allowed values.
- Use an `isUrl` validator on `jobLink`. It must not reject an empty or absent value, since the field is optional.
- A Sequelize validation failure must be caught in the route and returned as `400` with `{ "error": "message" }`. It must never reach the client as a `500`.

---

## API Response Contract

The API returns the model's fields exactly as named above. The frontend depends on these keys:

```json
{
  "id": 1,
  "company": "Example Company",
  "position": "Frontend Developer",
  "status": "Applied",
  "location": "New York, NY",
  "dateApplied": "2026-07-28",
  "jobLink": "https://example.com/job",
  "notes": "Submitted through the company website.",
  "createdAt": "2026-07-28T14:02:11.000Z",
  "updatedAt": "2026-07-28T14:02:11.000Z"
}
```

`GET /api/applications` returns an array of these objects. Optional fields that were never set are returned as `null`, not omitted, so the frontend must handle `null` when rendering.

Renaming any field in the model is a breaking change for the frontend and requires updating both repositories in the same pull request.

---

## Seed Data

`seed.js` is a P0 issue on the project board. It should insert **six to eight** sample applications covering **every status value at least once**, so that:

- The list page has enough records to test the layout
- Each status renders correctly
- Optional fields are exercised, with at least one record leaving `location`, `dateApplied`, `jobLink`, and `notes` empty

`seed.js` resets the table before inserting. It must never be run against the Neon production database once real data exists.

---

## Stretch Resource: Interviews

Only add the `interviews` table after the one-resource CRUD application is complete, tested, and deployed. This is the first stretch goal that changes the database schema; filtering, sorting, and search come first because they require no schema change. See `PROJECT-BOARD.md`.

### `interviews` Fields

| Field | Type | Sequelize Type | Required | Purpose |
|---|---|---|---|---|
| `id` | Integer | `INTEGER` primary key, auto-increment | Yes | Primary key |
| `interviewDate` | Timestamp | `DATE` | Yes | Scheduled interview date and time |
| `interviewType` | String | `STRING` | No | Phone, video, technical, or onsite |
| `notes` | Text | `TEXT` | No | Preparation or follow-up notes |
| `jobApplicationId` | Integer | `INTEGER` foreign key | Yes | Foreign key to `job_applications.id` |
| `createdAt` | Timestamp | `DATE` | Yes | Created automatically |
| `updatedAt` | Timestamp | `DATE` | Yes | Updated automatically |

`interviewDate` is `DATE`, not `DATEONLY`, because an interview happens at a specific time of day. This is the opposite of `dateApplied` and the difference is deliberate.

The table name must be set to `'interviews'` for the same reason as `job_applications`.

### Two-Table DBML Diagram

```dbml
Table job_applications {
  id integer [primary key, increment]
  company varchar [not null]
  position varchar [not null]
  status varchar [not null, default: 'Saved']
  location varchar
  dateApplied date
  jobLink text
  notes text
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Table interviews {
  id integer [primary key, increment]
  interviewDate timestamp [not null]
  interviewType varchar
  notes text
  jobApplicationId integer [not null]
  createdAt timestamp [not null]
  updatedAt timestamp [not null]
}

Ref: interviews.jobApplicationId > job_applications.id
```

### Sequelize Association

```text
JobApplication has many Interviews
Interview belongs to JobApplication
```

The foreign key is:

```text
interviews.jobApplicationId
```

### Delete Behavior

Deleting a job application that has interviews must not fail on the foreign key constraint. The association is defined with:

```text
onDelete: CASCADE
```

Deleting an application deletes its interviews. This is the correct behavior here, because an interview has no meaning without its application. This decision must be made when the association is created, not discovered when `DELETE` starts returning `500`.

---

## Naming Standard

Use the following names consistently across the database, backend, frontend, and documentation:

| Concept | Name | Convention |
|---|---|---|
| Model | `JobApplication` | PascalCase, singular |
| Table | `job_applications` | snake_case, plural |
| Columns | `company`, `position`, `status`, `location`, `dateApplied`, `jobLink`, `notes` | camelCase |
| JSON keys | Identical to the column names | camelCase |
| API base path | `/api/applications` | lowercase, plural |
| Frontend routes | `/applications`, `/applications/:id` | lowercase, plural |
| Foreign key (stretch) | `jobApplicationId` | camelCase, `<model>Id` |
| Model file | `models/JobApplication.js` | PascalCase |
| Route file | `routes/applications.js` | lowercase, plural |

Quick reference:

```text
JobApplication
job_applications
dateApplied
jobLink
jobApplicationId
/api/applications
```

The model is singular, the table and the routes are plural. Changing any name here requires updating both repositories in the same pull request.
