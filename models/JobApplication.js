// models/JobApplication.js defines the table
const { DataTypes } = require("sequelize");
const db = require("../db");

const STATUS_VALUES = ["Saved", "Applied", "Interview", "Offer", "Rejected", "Closed"];

const JobApplication = db.define(
  "JobApplication",
  {
    company: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: "Company is required" } },
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: "Position is required" } },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Saved",
      validate: { isIn: { args: [STATUS_VALUES], msg: "Invalid status" } },
    },
    location: { type: DataTypes.STRING, allowNull: true },
    dateApplied: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: { isDate: { msg: "Date applied must be a valid date" } },
    },
    jobLink: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: { isUrl: { msg: "Job link must be a valid URL" } },
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "job_applications" }
);

JobApplication.STATUS_VALUES = STATUS_VALUES;

module.exports = JobApplication;



