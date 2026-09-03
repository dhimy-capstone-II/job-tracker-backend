// routes/index.js — collects all routers.
//
// app.js can import them from one place:
// const { applicationsRouter, authRouter, analyticsRouter } = require("./routes");

const applicationsRouter = require("./applications.routes");
const authRouter = require("./auth.routes");
const analyticsRouter = require("./analytics.routes");

module.exports = {
  applicationsRouter,
  authRouter,
  analyticsRouter,
};
