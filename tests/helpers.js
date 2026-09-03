// tests/helpers.js — shared setup for the API tests.
//
// IMPORTANT: this file sets environment variables BEFORE anything else is
// required. db/index.js reads DATABASE_URL the moment it is imported, and
// dotenv never overwrites a variable that is already set, so setting them here
// first is what keeps the tests pointed at the throwaway test database instead
// of the development one.

process.env.NODE_ENV = "test";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://localhost:5432/job_tracker_test";

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-only-secret-value-not-used-anywhere-real";

// Blank (but defined) so dotenv leaves them alone. This makes the tests run
// against the "Auth0 not configured" path, which is how a fresh clone behaves.
process.env.AUTH0_DOMAIN = "";
process.env.AUTH0_AUDIENCE = "";

const request = require("supertest");

const app = require("../app");
const { db, User, JobApplication } = require("../models");

// Guard rail: force-syncing drops every table, so refuse to run unless the
// database name clearly says "test". This is what stops a mistyped
// TEST_DATABASE_URL from wiping real development data.
function assertUsingTestDatabase() {
  const name = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");

  if (!name.includes("test")) {
    throw new Error(
      `Refusing to run tests against "${name}" — the database name must contain "test".`,
    );
  }
}

async function resetDatabase() {
  assertUsingTestDatabase();
  await db.sync({ force: true });
}

// Sign up a user and return an agent that keeps their login cookie, so later
// requests in a test are authenticated as that person.
async function signUpAgent({ username, email, password = "secret123" }) {
  const agent = request.agent(app);

  const response = await agent
    .post("/auth/signup")
    .send({ username, email, password });

  if (response.status !== 201) {
    throw new Error(
      `Test setup failed: signup returned ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return { agent, user: response.body };
}

module.exports = {
  app,
  request,
  db,
  User,
  JobApplication,
  resetDatabase,
  signUpAgent,
};
