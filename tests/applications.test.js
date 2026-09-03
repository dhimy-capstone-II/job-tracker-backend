// tests/applications.test.js — job application CRUD, validation, and the rule
// that one user can never see or touch another user's data.

const test = require("node:test");
const assert = require("node:assert/strict");

const { app, request, db, resetDatabase, signUpAgent } = require("./helpers");

test.before(resetDatabase);
test.after(async () => db.close());

const VALID_APPLICATION = {
  company: "Acme Corp",
  position: "Software Engineering Intern",
  status: "Applied",
  location: "New York, NY",
  dateApplied: "2026-09-01",
  jobLink: "https://example.com/jobs/1",
  notes: "Referred by a TTP alum.",
};

test("a user can create an application and read it back", async () => {
  const { agent } = await signUpAgent({
    username: "creator",
    email: "creator@example.com",
  });

  const created = await agent.post("/api/applications").send(VALID_APPLICATION);

  assert.equal(created.status, 201);
  assert.equal(created.body.company, "Acme Corp");
  assert.equal(created.body.status, "Applied");

  const list = await agent.get("/api/applications");

  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].id, created.body.id);
});

test("a new account starts with an empty list", async () => {
  const { agent } = await signUpAgent({
    username: "freshuser",
    email: "fresh@example.com",
  });

  const response = await agent.get("/api/applications");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});

// Regression test: this used to return Sequelize's internal message,
// "JobApplication.company cannot be null", which leaked the model name.
test("a missing company returns a readable error, not the model name", async () => {
  const { agent } = await signUpAgent({
    username: "validator",
    email: "validator@example.com",
  });

  const response = await agent
    .post("/api/applications")
    .send({ position: "Developer" });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Company is required");
  assert.doesNotMatch(response.body.error, /JobApplication/);
});

test("an invalid status is rejected", async () => {
  const { agent } = await signUpAgent({
    username: "statususer",
    email: "status@example.com",
  });

  const response = await agent
    .post("/api/applications")
    .send({ company: "Acme", position: "Dev", status: "Definitely Not Real" });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Invalid status");
});

test("a malformed job link is rejected", async () => {
  const { agent } = await signUpAgent({
    username: "linkuser",
    email: "link@example.com",
  });

  const response = await agent
    .post("/api/applications")
    .send({ company: "Acme", position: "Dev", jobLink: "not-a-url" });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /valid URL/i);
});

test("the client cannot choose which user an application belongs to", async () => {
  const { agent } = await signUpAgent({
    username: "spoofer",
    email: "spoofer@example.com",
  });

  const { user: victim } = await signUpAgent({
    username: "victim",
    email: "victim@example.com",
  });

  const response = await agent
    .post("/api/applications")
    .send({ ...VALID_APPLICATION, userId: victim.id });

  assert.equal(response.status, 201);
  assert.notEqual(
    response.body.userId,
    victim.id,
    "userId must come from the session, never from the request body",
  );
});

test("PATCH updates only the fields that were sent", async () => {
  const { agent } = await signUpAgent({
    username: "patcher",
    email: "patcher@example.com",
  });

  const created = await agent.post("/api/applications").send(VALID_APPLICATION);

  const patched = await agent
    .patch(`/api/applications/${created.body.id}`)
    .send({ status: "Interview" });

  assert.equal(patched.status, 200);
  assert.equal(patched.body.status, "Interview");
  assert.equal(patched.body.company, "Acme Corp", "other fields must survive");
});

test("DELETE removes the application", async () => {
  const { agent } = await signUpAgent({
    username: "deleter",
    email: "deleter@example.com",
  });

  const created = await agent.post("/api/applications").send(VALID_APPLICATION);

  const deleted = await agent.delete(`/api/applications/${created.body.id}`);
  assert.equal(deleted.status, 204);

  const after = await agent.get(`/api/applications/${created.body.id}`);
  assert.equal(after.status, 404);
});

test("a non-numeric id is rejected before it reaches the database", async () => {
  const { agent } = await signUpAgent({
    username: "badid",
    email: "badid@example.com",
  });

  const response = await agent.get("/api/applications/not-a-number");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Invalid application ID");
});

// The most important security rule in the whole project.
test("one user cannot read, update, or delete another user's application", async () => {
  const { agent: owner } = await signUpAgent({
    username: "owner",
    email: "owner@example.com",
  });

  const { agent: stranger } = await signUpAgent({
    username: "stranger",
    email: "stranger@example.com",
  });

  const created = await owner.post("/api/applications").send(VALID_APPLICATION);
  const id = created.body.id;

  assert.equal((await stranger.get(`/api/applications/${id}`)).status, 404);

  assert.equal(
    (await stranger.patch(`/api/applications/${id}`).send({ status: "Offer" }))
      .status,
    404,
  );

  assert.equal((await stranger.delete(`/api/applications/${id}`)).status, 404);

  // The owner's record must be untouched after all of that.
  const stillThere = await owner.get(`/api/applications/${id}`);
  assert.equal(stillThere.status, 200);
  assert.equal(stillThere.body.status, "Applied");

  // And the stranger's own list must still be empty.
  const strangerList = await stranger.get("/api/applications");
  assert.deepEqual(strangerList.body, []);
});
