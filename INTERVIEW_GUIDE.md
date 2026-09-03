# Interview Guide — Job Application Tracker

Everything in this guide is based on what is actually in the two repositories.
Nothing is invented. If a feature is unfinished, it says so — being straight
about that is worth more in an interview than a claim you cannot back up.

> **⚠️ One thing to confirm before you use this.**
> The README lists a team of "Dhimy Jean" and "Daniel". But `git shortlog -sne`
> shows **every commit in both repositories is yours** (38 on the frontend, 56 on
> the backend). Before an interview, settle in your own mind which is true:
> - If you built this repo alone, say "I built this one solo" — the history backs you.
> - If Daniel contributed in ways git does not show (design, planning, pairing),
>   say "I wrote the code in these repos; we planned it as a pair."
>
> Never claim a teammate's work. But do not undersell yours either — the commit
> history here is entirely yours.

---

## 30-second explanation

> "It's a job application tracker I built on the PERN stack — PostgreSQL,
> Express, React, and Node. You create an account, log your applications, move
> them through stages like Applied and Interview, and a dashboard shows how many
> you've sent and what your interview and offer rates are. The part I'm most
> pleased with is the analytics: all the counting happens in SQL rather than in
> JavaScript, so it stays fast whether you have ten applications or ten thousand."

## 60–90-second explanation

> "Job hunting gets messy fast — you lose track of what you applied to and when,
> and you have no idea whether you're actually making progress. So I built a
> tracker on the PERN stack.
>
> The backend is Express with Sequelize on PostgreSQL. There are two tables,
> users and job_applications, with a one-to-many relationship. Login is a JWT
> stored in an httpOnly cookie, so JavaScript on the page can never read the
> token. There's also optional Auth0 social login — the middleware accepts either
> a cookie or an Auth0 bearer token and resolves both to the same user row.
>
> The frontend is React with Vite. It's a normal React Router app with a shared
> API client and protected routes.
>
> The piece I'd point to is the analytics endpoint. It runs three queries in
> parallel and does the grouping with SQL COUNT and GROUP BY instead of pulling
> every row into Node to count it. It also fills in days with zero activity,
> because otherwise the chart would draw a straight line between two distant days
> and imply activity that never happened.
>
> There are 30 automated tests. The most important one checks that one user can't
> read or delete another user's applications."

---

## Problem, solution, and user value

**Problem.** Someone applying to a lot of jobs loses track. Which companies have
replied? How many are still open? Is the number of interviews going up? A
spreadsheet answers the first question badly and the last one not at all.

**Solution.** A small web app with an account per user, a record per application,
and a dashboard that turns the list into rates.

**User value.** You see the funnel — how many applications became interviews,
how many became offers — instead of just a long list.

---

## Verified architecture

Two separate repositories, deployed independently:

```
Browser (React + Vite, port 5173)
   │
   │  fetch(..., { credentials: "include" })
   │  cookie: token=<JWT>
   ▼
Express API (port 3000)
   │  helmet · CORS(exact origin) · rate limit · cookie-parser
   │  requireAuth  →  req.user
   ▼
Sequelize
   ▼
PostgreSQL  ─ users ──1───many──< job_applications
```

**Request flow, using "load my dashboard" as the example:**

1. `DashboardPage` calls `getSummary()` in `src/api/analytics.js`.
2. That calls the shared `request()` helper in `src/api/client.js`, which always
   sends `credentials: "include"` so the browser attaches the login cookie.
3. Express matches `GET /api/analytics/summary`. Because `app.js` mounts the
   router as `app.use("/api/analytics", requireAuth, analyticsRouter)`,
   `requireAuth` runs **first**.
4. `requireAuth` reads the cookie, verifies the JWT signature, loads the user row,
   and puts it on `req.user`. No valid token means a `401` and the route never runs.
5. The route runs three queries at once with `Promise.all`, every one filtered by
   `req.user.id`.
6. It shapes the JSON — status counts, rates, a gap-filled timeline — and returns it.
7. React renders the stat cards and the two Recharts charts.

---

## Files worth being able to open and explain

| File | Why an interviewer might ask |
|---|---|
| `middleware/requireAuth.js` | The interesting one. Two authentication methods resolving to one `req.user`. |
| `routes/analytics.routes.js` | Real SQL aggregation, parallel queries, and the gap-filling logic. |
| `routes/applications.routes.js` | CRUD, plus the ownership rule that makes the API safe. |
| `models/JobApplication.model.js` | Validation living in the model. |
| `app.js` / `server.js` | Why building the app and starting it are separate files. |
| `tests/applications.test.js` | The user-isolation test. |
| `client/src/api/client.js` | One fetch wrapper instead of scattered fetch calls. |
| `client/src/App.jsx` | Routing, protected routes, and lazy-loading. |

---

## Three engineering decisions

**1. The JWT lives in an httpOnly cookie, not in localStorage.**
A token in `localStorage` can be read by any JavaScript on the page, so a single
XSS bug hands over the account. An httpOnly cookie is invisible to JavaScript.
The cost is that cookies do not cross origins by default, so the frontend sends
`credentials: "include"` and CORS is configured with an exact origin and
`credentials: true` — a wildcard `*` is not allowed once credentials are on.

**2. Analytics is calculated in SQL, not in JavaScript.**
The easy version is `findAll()` and then `.filter()` in Node. That means moving
every row across the network to count it. Instead the endpoint uses `COUNT` and
`GROUP BY`, so PostgreSQL returns six rows for the status chart no matter how
many applications exist.

**3. Auth0 is optional rather than required.**
Originally the server threw on startup if the Auth0 variables were missing, and
the React app refused to render. That meant nobody could run the project without
first creating an Auth0 account. Now both sides check whether Auth0 is
configured: if it is not, the app runs on email and password and the social
button is hidden. A reviewer can clone it and have it working in about a minute.

---

## Three challenges and how they were solved

**1. A fresh clone would not start.**
Two separate causes. The `.env` pointed at a database called `job_tracker_dev`
while the README said to create `job_application_tracker` — the names had drifted
apart. And the Auth0 variables were mandatory. Fixed by adding
`npm run db:create`, which reads the database name out of `DATABASE_URL` so the
two can never disagree, and by making Auth0 optional. The startup error also now
names the fix instead of only printing the raw PostgreSQL message.

**2. Charts implied activity that never happened.**
PostgreSQL only returns rows for days that have data. Handing that straight to a
line chart made it draw one long line between two distant days. `buildTimeline()`
walks the whole date range and fills every missing day with a zero.

**3. Users could have seen each other's data.**
Every query is scoped with `where: { id, userId: req.user.id }`, and `userId` on
create comes from the session rather than the request body. Asking for someone
else's row returns `404`, not `403` — a `403` would confirm the row exists.
There is a test for each of these.

---

## Testing strategy

30 tests using Node's built-in test runner and `supertest`, run with `npm test`
against a separate `job_tracker_test` database. The suite refuses to run unless
the database name contains `test`.

They cover the things that would actually hurt if they broke:

- **Authorization** — a second user cannot read, update, or delete the first
  user's application, and cannot see their numbers in analytics.
- **Authentication** — signup, login, logout, and the fact that `passwordHash`
  never appears in a response.
- **Validation** — missing fields, short passwords, duplicate emails, bad
  statuses, malformed URLs, non-numeric IDs.
- **Analytics maths** — `Saved` excluded from the rate denominator, `0` instead of
  `NaN` on an empty account, and the timeline gap-filling.
- **Regressions** — two tests exist purely because a bug was fixed: the readable
  validation message, and the `501` when Auth0 is not configured.

Not tested: React components. Say so plainly if asked — that is the honest gap.

---

## Security considerations

| Concern | What the code does |
|---|---|
| Password storage | bcrypt with 12 salt rounds. The hash is stripped in `User.prototype.toJSON`. |
| Token theft via XSS | JWT in an httpOnly cookie, so page JavaScript cannot read it. |
| Brute force | `express-rate-limit`, tighter on `/auth` than on the rest of the API. |
| Cross-user access | Every query filtered by `req.user.id`; `userId` never taken from the body. |
| SQL injection | Sequelize parameterises everything. No string-built SQL anywhere. |
| CORS | Exact origin plus `credentials: true`, never `*`. |
| Secrets | Everything from environment variables. `.env` is gitignored; `.env.example` holds placeholders. |
| Error leakage | The handler returns a generic message; details are logged server-side only. |
| Headers | `helmet()` for sensible defaults. |
| Body size | `express.json({ limit: "10kb" })`. |

---

## One honest limitation

**The voice interview room does not carry audio yet.** `socket/index.js`
implements the signalling server's room membership — who joined, who left, who is
here — but the WebRTC offer/answer/ICE exchange that actually connects two
browsers is not written. The page exists and people can join a room; they cannot
talk. It is deliberately marked Phase V1 in the code comments.

Say this in exactly those terms. "I built the signalling layer and stopped before
the WebRTC handshake" is a much better answer than being caught out on a demo.

---

## Sensible next step

Finish the WebRTC handshake, or drop the interview room and put the effort into
the AI job-description matcher described in `AI-UPGRADE-PLAN.md`. One finished
feature beats two half-built ones — and that reasoning is itself a good answer to
"what would you do next?"

---

## Ten likely questions

**1. Why PostgreSQL rather than MongoDB?**
The data is relational — users own applications, and every application has the
same fixed shape. Foreign keys and `ON DELETE CASCADE` give that for free. And
the analytics rely on SQL `GROUP BY`, which is exactly what a relational database
is good at.

**2. What does Sequelize actually do for you?**
It maps JavaScript objects to SQL rows, so `JobApplication.findAll({ where: ... })`
becomes a parameterised `SELECT`. Two benefits: validation lives on the model, and
parameterisation makes SQL injection very hard to write by accident.

**3. Why an httpOnly cookie instead of localStorage?**
`localStorage` is readable by any script on the page, so one XSS bug leaks the
token. `httpOnly` means JavaScript cannot read the cookie at all.

**4. How do you stop one user seeing another's applications?**
Every query filters on `userId: req.user.id`, and `req.user` comes from a verified
token, never from the request. On create, `userId` is taken from the session even
if the client sends its own. There is a test for it.

**5. Why 404 instead of 403 for someone else's record?**
A `403` confirms the record exists. A `404` gives an attacker nothing.

**6. Why not just count the rows in JavaScript?**
That moves every row over the network to count it. `COUNT` and `GROUP BY` return
six rows regardless of table size, so the endpoint stays flat as data grows.

**7. What is `Promise.all` doing in the analytics route?**
Three independent queries. Awaiting them one after another costs three round
trips in sequence; `Promise.all` sends them together and waits for the slowest.

**8. Why split `app.js` and `server.js`?**
`app.js` builds the Express app; `server.js` connects to the database and opens
the port. The tests import `app.js` and make real HTTP requests without starting
a listener or fighting over port 3000.

**9. How does the app handle two ways of logging in?**
`requireAuth` checks for a cookie first and verifies it with our own secret. If
there is no cookie but there is a `Bearer` header, it verifies that with Auth0's
public key. Either path ends with the same row from our `users` table on
`req.user`, so no route below has to care which was used.

**10. What would you change if this had many more users?**
Add an index on `job_applications.userId`, since every query filters on it.
Paginate `GET /api/applications` rather than returning everything. And move from
`db.sync()` to real migrations so schema changes are reviewable.

---

## Five-minute demo script

Have both servers running and the database seeded **before** you share your screen.

1. **(30s) Frame it.** "This is a job application tracker. The problem is losing
   track of where you've applied and whether you're making progress."
2. **(45s) Log in** as `dhimy@example.com` / `Password123!`. Point out that the
   token is in an httpOnly cookie — open DevTools → Application → Cookies and show
   the `HttpOnly` tick.
3. **(60s) The list.** 48 applications. Search and filter by status.
4. **(60s) Create one.** Fill the form, save, land on the detail page. Then show
   validation: submit with no company and show the readable error.
5. **(90s) The dashboard.** This is the part to spend time on. Point at the
   interview rate and explain that `Saved` is excluded from the denominator
   because a bookmarked job was never applied to. Mention the counting happens in
   SQL.
6. **(45s) The tests.** Run `npm test` in a terminal. 30 passing. Open the
   user-isolation test and read it out.
7. **(30s) Be honest.** "The interview room is signalling only — no audio yet."

Do not demo the interview room unless you are asked.

---

## Likely technical follow-ups

- *"Show me where the SQL injection risk would be if you weren't using Sequelize."*
  → `routes/analytics.routes.js` — the `fn("TO_CHAR", col("createdAt"), ...)`
  calls build SQL through Sequelize's helpers rather than string concatenation.
- *"What happens if the database goes down while the server is running?"*
  → The query rejects, `next(error)` passes it to the error handler, and the
  client gets a `500` with a generic message. Startup failure is handled
  separately in `server.js`.
- *"Your rate limiter is per-process. What breaks if you run two instances?"*
  → The counter is in memory, so each instance keeps its own. You would move it
  to Redis. Good thing to say before they say it.
- *"Why is `passwordHash` nullable?"*
  → Auth0 users have no local password. `auth0Id` is nullable for the same reason
  in reverse.
- *"Walk me through what `key={user?.id}` does on the Home route."*
  → Changing the key remounts the component, so the previous user's data cannot
  linger in state after a different person logs in.
