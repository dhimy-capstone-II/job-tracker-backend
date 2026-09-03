# Learning Notes — Job Application Tracker

What was changed, why the old behaviour was wrong, and what to study.
Written for you, not for a recruiter.

---

## 1. The server would not start on a clean machine

### What was wrong

Two separate causes, both invisible until someone tried a fresh clone.

**Cause A — the database name had drifted.** `.env` said:

```
DATABASE_URL=postgresql://localhost:5432/job_tracker_dev
```

but `README.md` said to run `createdb job_application_tracker`. Two different
names. Following your own README produced:

```
❌ Unable to start server: database "job_tracker_dev" does not exist
```

**Cause B — Auth0 was mandatory.** `middleware/requireAuth.js` had this at the
top level of the file:

```js
if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
  throw new Error("Missing Auth0 environment variables — ...");
}
```

A `throw` at the top level of a module runs the instant something `require`s it.
`app.js` requires it, so the whole server died before reaching the first line of
`startApp()`. The React app had the same problem in `main.jsx`: it rendered a
"Missing Auth0 settings" screen *instead of* the app.

The result: nobody could run your project without first creating an Auth0
account — even though email and password login worked perfectly on its own.

### Why the new solution works

`npm run db:create` reads the database name **out of `DATABASE_URL` itself**, so
the name it creates and the name the app connects to are the same string by
construction. They cannot drift apart again.

Auth0 became a feature flag instead of a requirement:

```js
const AUTH0_ENABLED = Boolean(
  process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE,
);
```

When it is off, `jwtCheck` returns a clear `501` instead of crashing, and the
React buttons are hidden behind `{AUTH0_ENABLED && (...)}`.

### The idea worth remembering

**Optional things must not be checked like required things.** Ask yourself: "can
someone use the main feature without this?" If yes, it is optional, and a missing
value should downgrade the app, not kill it. Fail loudly for what is genuinely
required (`JWT_SECRET`), degrade gracefully for what is not (Auth0).

---

## 2. Brute-force protection had been switched off

### What was wrong

In `routes/auth.routes.js`:

```js
const authLimiter = rateLimit({
  // windowMs: 15 * 60 * 1000,
  // limit: 20,
  windowMs: 60 * 1000,
  limit: 1000,
```

The real limit was commented out during testing and never restored. 1000 login
attempts a minute is not a rate limit.

### Why the new solution works

Instead of choosing between "safe" and "convenient", it now picks based on
environment — the same pattern `app.js` already used for the general limiter:

```js
const isProd = process.env.NODE_ENV === "production";
limit: isProd ? 20 : 200,
```

### The idea worth remembering

When you loosen a security setting to test something, change it to an
**environment-based value** rather than commenting the real one out. A commented
line looks like a decision; it is actually a landmine.

---

## 3. An error message leaked internal names

### What was wrong

Posting an application with no company returned:

```json
{ "error": "JobApplication.company cannot be null" }
```

That is Sequelize's own wording. The model had a friendly message:

```js
validate: { notEmpty: { msg: "Company is required" } }
```

but it never fired. `allowNull: false` and `notEmpty` catch **different things**.
`allowNull: false` is a NOT NULL check that runs first when the field is missing
entirely; `notEmpty` only runs when a value is present but blank.

### Why the new solution works

Adding `notNull` alongside `notEmpty` covers both cases with the same wording:

```js
validate: {
  notNull:  { msg: "Company is required" },
  notEmpty: { msg: "Company is required" },
},
```

### The idea worth remembering

Error messages are part of your interface. A user should never see your class
names. There is a regression test for this now.

---

## 4. `app.js` was doing two jobs, so nothing could be tested

### What was wrong

`app.js` built the Express app **and** called `startApp()` at the bottom. Any
test that imported it would connect to the database and try to grab port 3000.
That is why the project had zero tests.

### Why the new solution works

- `app.js` builds the app and does `module.exports = app`.
- `server.js` imports it, connects to the database, attaches Socket.IO, listens.

`supertest` can now start the app on a random port per test and make real HTTP
requests. `package.json` `main` and the `start`/`dev` scripts point at `server.js`.

### The idea worth remembering

**Separate building a thing from starting it.** A module that does work when
imported is hard to test and hard to reuse. This one change is what made 30 tests
possible.

---

## 5. Everyone downloaded the charting library

### What was wrong

One bundle, 1,020 kB (305 kB gzipped). Recharts is most of it. Someone who only
opened the login page still downloaded the entire charting library.

### Why the new solution works

`React.lazy()` turns an import into a separate file fetched on demand:

```js
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
```

Anything lazy must sit inside `<Suspense fallback={...}>`, which is what React
shows while the file downloads.

Measured with `npm run build`:

| | Initial JS (gzipped) |
|---|---|
| Before | 305 kB |
| After | **181 kB** |

### The idea worth remembering

Split on **routes**, not components. A route is a natural boundary because the
user has to navigate to it. And measure before and after — "it feels faster" is
not a number.

---

## Concepts to study

1. **httpOnly cookies vs localStorage** — why one survives XSS and the other does not.
2. **CORS with credentials** — why `origin: "*"` is rejected once `credentials: true` is set.
3. **SQL `GROUP BY` and aggregates** — the difference between counting in the database and in your app.
4. **`Promise.all`** — running independent async work at the same time instead of in sequence.
5. **`React.lazy` and `Suspense`** — code splitting.
6. **Sequelize validators** — `allowNull` vs `notNull` vs `notEmpty`.
7. **Module side effects** — why a top-level `throw` or `listen()` makes code untestable.
8. **Test isolation** — why the suite uses its own database and refuses to run against one without "test" in the name.

## Files to read

Read them in this order — it follows one request through the system:

1. `client/src/api/client.js` — where every frontend request starts.
2. `app.js` — middleware order and how routers are mounted.
3. `middleware/requireAuth.js` — the most interesting file.
4. `routes/applications.routes.js` — CRUD and the ownership rule.
5. `routes/analytics.routes.js` — the SQL aggregation.
6. `tests/applications.test.js` — how the rules are proven.

## Commands to remember

```bash
npm run db:create   # create the database from DATABASE_URL
npm run seed        # reset tables, load 48 sample rows
npm run dev         # start with auto-restart
npm test            # 30 tests, separate database
npm run build       # (client) production build + bundle sizes

git shortlog -sne   # who actually wrote this repository
```

---

## Five practice questions

**1. Why did a `throw` at the top of `requireAuth.js` stop the whole server,
even though nothing had called `requireAuth` yet?**

Because top-level code runs at `require()` time. `app.js` requires the module
while building the app, the throw fires immediately, and `startApp()` is never
reached.

**2. The model had `msg: "Company is required"` but the API returned
`"JobApplication.company cannot be null"`. Why?**

`allowNull: false` is a NOT NULL check that runs before the `notEmpty` validator
and has its own default message. `notEmpty` only runs when a value is present but
blank. The fix was to add `notNull` with the same message.

**3. Why does asking for another user's application return 404 and not 403?**

`403` means "this exists but you cannot have it", which confirms the record is
there. `404` reveals nothing. The query filters on both `id` and
`userId: req.user.id`, so a row belonging to someone else simply is not found.

**4. What breaks if you delete `credentials: "include"` from `client.js`?**

The browser stops attaching the login cookie, so every protected request arrives
without one and `requireAuth` returns `401`. You would appear logged out
immediately after logging in successfully.

**5. Why must a `React.lazy()` component be wrapped in `<Suspense>`?**

Its code is fetched over the network, so there is a moment where the component
does not exist yet. `Suspense` provides what to render during that gap. Without
it React throws.
