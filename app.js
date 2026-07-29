// app.js starts Express and connects to PostgreSQL
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { db } = require("./models");
const applicationsRouter = require("./routes/applications");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Health-check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Application routes
app.use("/api/applications", applicationsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// General error handler
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: "Internal server error",
  });
});

// Connect to PostgreSQL and start Express
async function startApp() {
  try {
    await db.authenticate();
    console.log("Database connected successfully.");

    await db.sync();
    console.log("Database synced successfully.");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startApp();



// // app.js starts Express and connects to PostgreSQL
// require("dotenv").config();

// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");

// const { db } = require("./models");
// const applicationsRouter = require("./routes/application");

// const app = express();
// const PORT = process.env.PORT || 3000;

// // allows frontend to access resources from the backend
// app.use(cors({ origin: process.env.CLIENT_URL }));
// // app.use(cors());
// app.use(morgan("dev"));
// app.use(express.json());

// app.get("/api/health", (req, res) => {
//   res.status(200).json({ status: "ok" });
// });

// app.use("/api/applications", applicationsRouter);

// app.use((req, res) => {
//   res.status(404).json({ error: "Route not found" });
// });

// app.use((error, req, res, next) => {
//   console.error(error);
//   res.status(500).json({ error: "Internal server error" });
// });


// async function startApp() {
//   // connect to your db here before the express server listens
//   try {
//     await db.sync();
//     console.log("Database synced successfully.");

//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error("Failed to sync database:", error);
//   }
// }

// startApp();



// // async function startApp() {
// //   try {
// //     await db.authenticate();
// //     console.log("Database connected.");
// //     await db.sync();
// //     app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
// //   } catch (error) {
// //     console.error("Failed to start:", error);
// //     process.exit(1);
// //   }
// // }

// // startApp();




