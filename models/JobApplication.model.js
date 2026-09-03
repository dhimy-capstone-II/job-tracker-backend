// models/JobApplication.model.js — the JobApplication table.
//
// A model describes one database table.
// Each field below becomes a column in the job_applications table.
//
// Sequelize automatically adds:
// id, createdAt, and updatedAt.

const { DataTypes } = require("sequelize");
const db = require("../db");

// These are the only valid application status values.
const STATUS_VALUES = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Closed",
];

// db.define(modelName, columns, options)
const JobApplication = db.define(
  "JobApplication",
  {
    // Company name is required.
    company: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        // notNull fires when the field is missing entirely; notEmpty fires when
        // it is present but blank. Both are set so the user sees the same clear
        // message instead of Sequelize's internal "Model.field cannot be null".
        notNull: {
          msg: "Company is required",
        },
        notEmpty: {
          msg: "Company is required",
        },
      },
    },

    // Position title is required.
    position: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        // notNull fires when the field is missing entirely; notEmpty fires when
        // it is present but blank. Both are set so the user sees the same clear
        // message instead of Sequelize's internal "Model.field cannot be null".
        notNull: {
          msg: "Position is required",
        },
        notEmpty: {
          msg: "Position is required",
        },
      },
    },

    // Track the current stage of the application.
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Saved",
      validate: {
        isIn: {
          args: [STATUS_VALUES],
          msg: "Invalid status",
        },
      },
    },

    // Optional job location.
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Optional date when the application was submitted.
    dateApplied: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: {
          msg: "Date applied must be a valid date",
        },
      },
    },

    // Optional link to the original job posting.
    jobLink: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: {
          msg: "Job link must be a valid URL",
        },
      },
    },

    // Optional notes about the application.
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "job_applications",
  },
);

// Make the valid statuses available to other files.
JobApplication.STATUS_VALUES = STATUS_VALUES;

module.exports = JobApplication;