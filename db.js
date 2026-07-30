/*
.env
  ↓
db.js creates Sequelize connection
  ↓
models/JobApplication.js defines the table
  ↓
models/index.js exports db and models
  ↓
routes/applications.js uses the model
  ↓
app.js starts Express and connects to PostgreSQL
*/

// db.js creates Sequelize connection
require("dotenv").config();
const { Sequelize } = require("sequelize");

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
});

module.exports = db;

