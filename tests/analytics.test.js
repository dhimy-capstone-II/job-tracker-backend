// tests/analytics.test.js — the dashboard numbers.
//
// These are the calculations an interviewer is most likely to ask about, and
// the easiest ones to get subtly wrong, so they are tested directly.

const test = require("node:test");
const assert = require("node:assert/strict");

const { app, request, db, resetDatabase, signUpAgent } = require("./helpers");

test.before(resetDatabase);
test.after(async () => db.close());

async function createApplications(agent, statuses) {
  for (const [index, status] of statuses.entries()) {
    const response = await agent
      .post("/api/applications")
      .send({ company: `Company ${index}`, position: "Engineer", status });

    assert.equal(response.status, 201, `failed to seed a "${status}" row`);
  }
}

test("summary counts every status, including the ones with no rows", async () => {
  const { agent } = await signUpAgent({
    username: "analytics1",
    email: "analytics1@example.com",
  });

  await createApplications(agent, ["Applied", "Applied", "Interview", "Saved"]);

  const response = await agent.get("/api/analytics/summary");

  assert.equal(response.status, 200);
  assert.equal(response.body.totalApplications, 4);

  // All six statuses must be present so the chart never has missing bars.
  assert.deepEqual(response.body.statusCounts, {
    Saved: 1,
    Applied: 2,
    Interview: 1,
    Offer: 0,
    Rejected: 0,
    Closed: 0,
  });
});

test('"Saved" is excluded from the rate denominator because it was never applied to', async () => {
  const { agent } = await signUpAgent({
    username: "analytics2",
    email: "analytics2@example.com",
  });

  // 3 submitted (Applied, Interview, Offer) + 1 bookmarked (Saved).
  await createApplications(agent, ["Applied", "Interview", "Offer", "Saved"]);

  const { body } = await agent.get("/api/analytics/summary");

  assert.equal(body.totalApplications, 4);
  assert.equal(body.submittedApplications, 3);

  // An offer implies an interview happened, so Offer counts toward both.
  assert.equal(body.interviewCount, 2);
  assert.equal(body.offerCount, 1);

  // 2 of 3 submitted = 66.7%, not 2 of 4 = 50%.
  assert.equal(body.interviewRate, 66.7);
  assert.equal(body.offerRate, 33.3);
});

test("rates are 0 rather than NaN when nothing has been submitted", async () => {
  const { agent } = await signUpAgent({
    username: "analytics3",
    email: "analytics3@example.com",
  });

  await createApplications(agent, ["Saved", "Saved"]);

  const { body } = await agent.get("/api/analytics/summary");

  assert.equal(body.submittedApplications, 0);
  assert.equal(body.interviewRate, 0);
  assert.equal(body.offerRate, 0);
});

test("an empty account returns zeros instead of failing", async () => {
  const { agent } = await signUpAgent({
    username: "analytics4",
    email: "analytics4@example.com",
  });

  const { body } = await agent.get("/api/analytics/summary");

  assert.equal(body.totalApplications, 0);
  assert.equal(body.interviewRate, 0);
  assert.deepEqual(body.recentApplications, []);
});

test("the timeline has one entry per day, including days with no activity", async () => {
  const { agent } = await signUpAgent({
    username: "analytics5",
    email: "analytics5@example.com",
  });

  await createApplications(agent, ["Applied"]);

  const { body } = await agent.get("/api/analytics/summary?days=7");

  assert.equal(body.rangeDays, 7);
  assert.equal(body.applicationsOverTime.length, 7);

  // Today is the last bucket and holds the row we just created.
  const today = body.applicationsOverTime.at(-1);
  assert.equal(today.count, 1);

  // Every earlier day must be filled in with a zero, not omitted.
  for (const day of body.applicationsOverTime.slice(0, -1)) {
    assert.equal(day.count, 0);
    assert.match(day.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("an absurd ?days value is clamped instead of hammering the database", async () => {
  const { agent } = await signUpAgent({
    username: "analytics6",
    email: "analytics6@example.com",
  });

  const huge = await agent.get("/api/analytics/summary?days=999999");
  assert.equal(huge.body.rangeDays, 365);

  const nonsense = await agent.get("/api/analytics/summary?days=banana");
  assert.equal(nonsense.body.rangeDays, 30);

  const negative = await agent.get("/api/analytics/summary?days=-5");
  assert.equal(negative.body.rangeDays, 30);
});

test("analytics never mixes in another user's applications", async () => {
  const { agent: mine } = await signUpAgent({
    username: "analytics7",
    email: "analytics7@example.com",
  });

  const { agent: theirs } = await signUpAgent({
    username: "analytics8",
    email: "analytics8@example.com",
  });

  await createApplications(mine, ["Applied", "Offer"]);
  await createApplications(theirs, ["Rejected", "Rejected", "Rejected"]);

  const { body } = await mine.get("/api/analytics/summary");

  assert.equal(body.totalApplications, 2);
  assert.equal(body.statusCounts.Rejected, 0);
});

test("analytics requires authentication", async () => {
  const response = await request(app).get("/api/analytics/summary");

  assert.equal(response.status, 401);
});
