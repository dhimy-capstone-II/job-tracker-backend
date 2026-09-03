// db/create.js — creates the database named in DATABASE_URL if it is missing.
//
// A fresh clone fails on first run because PostgreSQL has the server running
// but no database with our name inside it. Sequelize can create TABLES, but it
// cannot create the DATABASE itself — that has to exist before it connects.
//
// This script connects to the built-in "postgres" database instead, and issues
// a CREATE DATABASE from there. It never drops or overwrites anything: if the
// database already exists it reports that and exits successfully, so it is safe
// to run repeatedly.
//
// Run with:
//   npm run db:create

require("dotenv").config();

const { Client } = require("pg");

async function createDatabase() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("❌ Missing DATABASE_URL — copy .env.example to .env first.");
    process.exit(1);
  }

  const parsed = new URL(url);

  // The database name is the path, minus the leading slash.
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));

  if (!databaseName) {
    console.error("❌ DATABASE_URL does not include a database name.");
    process.exit(1);
  }

  // Connect to the maintenance database so we are not connected to the one we
  // are about to create.
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();

    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );

    if (existing.rowCount > 0) {
      console.log(`✅ Database "${databaseName}" already exists.`);
      return;
    }

    // Identifiers cannot be passed as query parameters, so the name is quoted
    // instead. It comes from our own .env file, not from user input.
    await client.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);

    console.log(`✅ Created database "${databaseName}".`);
  } catch (error) {
    console.error("❌ Could not create the database:", error.message);
    console.error(
      "   Check that PostgreSQL is running and that the user in " +
        "DATABASE_URL is allowed to create databases.",
    );
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
