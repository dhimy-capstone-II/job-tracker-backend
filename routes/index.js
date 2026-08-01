// routes/index.js — collects all routers.

const applicationsRouter = require("./applications");
const authRouter = require("./auth");

module.exports = {
  applicationsRouter,
  authRouter,
};