// tests/auth.test.js — signup, login, and the rules that protect the API.

const test = require("node:test");
const assert = require("node:assert/strict");

const { app, request, db, resetDatabase, signUpAgent } = require("./helpers");

test.before(resetDatabase);
test.after(async () => db.close());

test("GET /api/health reports ok", async () => {
  const response = await request(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("unknown routes return 404 as JSON", async () => {
  const response = await request(app).get("/api/does-not-exist");

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Route not found");
});

test("protected routes reject anonymous requests", async () => {
  const response = await request(app).get("/api/applications");

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Authentication required");
});

test("signup creates a user and never returns the password hash", async () => {
  const response = await request(app).post("/auth/signup").send({
    username: "alice",
    email: "alice@example.com",
    password: "secret123",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.username, "alice");
  assert.equal(
    response.body.passwordHash,
    undefined,
    "the password hash must never leave the server",
  );
  assert.ok(
    response.headers["set-cookie"]?.some((cookie) => cookie.startsWith("token=")),
    "signup should log the user in by setting the token cookie",
  );
});

test("signup rejects a password shorter than 6 characters", async () => {
  const response = await request(app).post("/auth/signup").send({
    username: "shorty",
    email: "shorty@example.com",
    password: "123",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /at least 6 characters/);
});

test("signup rejects missing fields", async () => {
  const response = await request(app)
    .post("/auth/signup")
    .send({ username: "nobody" });

  assert.equal(response.status, 400);
});

test("signup rejects a duplicate email with 409", async () => {
  await request(app).post("/auth/signup").send({
    username: "firstuser",
    email: "taken@example.com",
    password: "secret123",
  });

  const response = await request(app).post("/auth/signup").send({
    username: "seconduser",
    email: "taken@example.com",
    password: "secret123",
  });

  assert.equal(response.status, 409);
  assert.match(response.body.error, /already exists/);
});

test("login succeeds with the right password and fails with the wrong one", async () => {
  await request(app).post("/auth/signup").send({
    username: "bob",
    email: "bob@example.com",
    password: "secret123",
  });

  const good = await request(app)
    .post("/auth/login")
    .send({ identifier: "bob@example.com", password: "secret123" });

  assert.equal(good.status, 200);
  assert.equal(good.body.username, "bob");

  const bad = await request(app)
    .post("/auth/login")
    .send({ identifier: "bob@example.com", password: "wrong-password" });

  assert.equal(bad.status, 401);
  // The message must not reveal whether the email exists — that would let
  // someone check which addresses are registered.
  assert.match(bad.body.error, /Invalid email\/username or password/);
});

test("login with an unknown account returns the same generic error", async () => {
  const response = await request(app)
    .post("/auth/login")
    .send({ identifier: "ghost@example.com", password: "secret123" });

  assert.equal(response.status, 401);
  assert.match(response.body.error, /Invalid email\/username or password/);
});

test("GET /auth/me returns the logged-in user", async () => {
  const { agent } = await signUpAgent({
    username: "carol",
    email: "carol@example.com",
  });

  const response = await agent.get("/auth/me");

  assert.equal(response.status, 200);
  assert.equal(response.body.username, "carol");
});

test("logout clears the session so /auth/me stops working", async () => {
  const { agent } = await signUpAgent({
    username: "dave",
    email: "dave@example.com",
  });

  assert.equal((await agent.get("/auth/me")).status, 200);

  const loggedOut = await agent.post("/auth/logout");
  assert.equal(loggedOut.status, 200);

  assert.equal((await agent.get("/auth/me")).status, 401);
});

// Regression test: the server used to crash on startup when Auth0 was not
// configured. Now it starts, and the social-login door answers with a clear 501.
test("a bearer token returns 501 when Auth0 is not configured", async () => {
  const response = await request(app)
    .get("/api/applications")
    .set("Authorization", "Bearer some.fake.token");

  assert.equal(response.status, 501);
  assert.match(response.body.error, /not configured/i);
});
