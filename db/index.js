// db/index.js — creates and exports one Sequelize connection.
//
// Sequelize lets the application work with PostgreSQL using JavaScript.
// The connection URL comes from the environment so database credentials
// are never written directly into the source code.

require("dotenv").config();

const { Sequelize } = require("sequelize");

// Stop early when the database connection string is missing.
if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL — set it in your .env file.");
}

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,

  // Hosted PostgreSQL services such as Neon and Render require SSL.
  // Local development normally does not.
  dialectOptions:
    process.env.NODE_ENV === "production"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
});

module.exports = db;