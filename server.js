// server.js — starts the application.
//
// app.js builds the Express app. This file is what actually runs it:
// it checks the database connection, creates the tables, attaches Socket.IO,
// opens the port, and shuts everything down cleanly on Ctrl+C.
//
// Run with:
//   npm run dev     (auto-restarts on file changes)
//   npm start

require("dotenv").config();

const http = require("http");

const app = require("./app");
const { db } = require("./models");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function startApp() {
  try {
    // Check that PostgreSQL is reachable.
    await db.authenticate();
    console.log("🐘 Database connection established.");

    // Create missing tables without deleting existing data.
    await db.sync();
    console.log("🧩 Models synced.");

    // Express and Socket.IO share one HTTP server, so both answer on the
    // same port. app.listen() would create its own server internally and
    // leave Socket.IO with nothing to attach to, so we build it by hand.
    const server = http.createServer(app);

    initSocket(server, FRONTEND_URL);
    console.log("🎙️  Voice signaling ready.");

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

    // Close Express and PostgreSQL safely when the process stops.
    function shutdown() {
      console.log("\n👋 Shutting down...");

      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    }

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    // The most common first-run failure is a database that has not been created
    // yet, so point straight at the fix instead of only printing the raw error.
    console.error("❌ Unable to start server:", error.message);

    if (/does not exist/i.test(error.message)) {
      console.error(
        "\n   The database in DATABASE_URL has not been created yet. Try:\n" +
          "     npm run db:create\n" +
          "     npm run seed\n",
      );
    }

    process.exit(1);
  }
}

startApp();
