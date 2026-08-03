/**
 * applications.routes.js — owns all CRUD endpoints for job applications.
 *
 * app.js mounts this router at /api/applications.
 *
 * CRUD:
 *   Create  -> POST    /api/applications
 *   Read    -> GET     /api/applications
 *              GET     /api/applications/:id
 *   Update  -> PUT     /api/applications/:id
 *   Update  -> PATCH   /api/applications/:id
 *   Delete  -> DELETE  /api/applications/:id
 *
 * These routes expect requireAuth to run before them.
 * After requireAuth succeeds, the logged-in user is available as req.user.
 */

const express = require("express");
const { JobApplication } = require("../models");

const router = express.Router();

// Fields users are allowed to create or update.
const ALLOWED_FIELDS = [
  "company",
  "position",
  "status",
  "location",
  "dateApplied",
  "jobLink",
  "notes",
];

// Reject invalid IDs before they reach PostgreSQL.
function parseId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

// Copy only approved fields from req.body.
function getAllowedFields(body) {
  const data = {};

  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  return data;
}

// Return a clean Sequelize validation error.
function handleValidationError(error, res, next) {
  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: error.errors[0].message,
    });
  }

  return next(error);
}

// READ ALL — GET /api/applications
router.get("/", async (req, res, next) => {
  try {
    const applications = await JobApplication.findAll({// you ccan only see application associate to your login
    
      where: {
        userId: req.user.id,
      },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(applications);
  } catch (error) {
    next(error);
  }
});

// READ ONE — GET /api/applications/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "Invalid application ID",
      });
    }

    const application = await JobApplication.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!application) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    res.status(200).json(application);
  } catch (error) {
    next(error);
  }
});

// CREATE — POST /api/applications
router.post("/", async (req, res, next) => {
  try {
    const applicationData = getAllowedFields(req.body);

    const application = await JobApplication.create({
      ...applicationData,

      // Never trust the frontend to provide userId.
      // Use the authenticated user's ID.
      userId: req.user.id,
    });

    res.status(201).json(application);
  } catch (error) {
    handleValidationError(error, res, next);
  }
});

// FULL UPDATE — PUT /api/applications/:id
// The client should send every editable application field.
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "Invalid application ID",
      });
    }

    const application = await JobApplication.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!application) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    const applicationData = getAllowedFields(req.body);

    await application.update(applicationData);

    res.status(200).json(application);
  } catch (error) {
    handleValidationError(error, res, next);
  }
});

// PARTIAL UPDATE — PATCH /api/applications/:id
// Only fields included in the request body are changed.
router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "Invalid application ID",
      });
    }

    const application = await JobApplication.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!application) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    const updates = getAllowedFields(req.body);

    await application.update(updates);

    res.status(200).json(application);
  } catch (error) {
    handleValidationError(error, res, next);
  }
});

// DELETE — DELETE /api/applications/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "Invalid application ID",
      });
    }

    const application = await JobApplication.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!application) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    await application.destroy();

    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;