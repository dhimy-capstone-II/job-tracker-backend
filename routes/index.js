// routes/index.js — collects all routers.
//
// app.js can import them from one place:
// const { applicationsRouter, authRouter } = require("./routes");

const applicationsRouter = require("./applications.routes");
const authRouter = require("./auth.routes");

module.exports = {
  applicationsRouter,
  authRouter,
};