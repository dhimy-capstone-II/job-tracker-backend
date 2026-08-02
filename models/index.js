// models/index.js — one place to collect all models and relationships.
//
// Other files can import from here:
// const { JobApplication, User } = require("../models");

const db = require("../db");

const JobApplication = require("./JobApplication.model");
const User = require("./user.model");

// ---------- associations ----------

// One user can have many job applications.
User.hasMany(JobApplication, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});

// Each job application belongs to one user.
// This adds a userId column to job_applications.
JobApplication.belongsTo(User, {
  foreignKey: "userId",
});

module.exports = {
  db,
  JobApplication,
  User,
};