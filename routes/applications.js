// routes/applications.js uses the model
const router = require("express").Router();
const { JobApplication } = require("../models");

// Reject invalid IDs before they reach PostgreSQL.
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/applications
router.get("/", async (req, res, next) => {
  try {
    const applications = await JobApplication.findAll();
    order: ([["createdAt", "DESC"]], res.status(200).json(applications));
  } catch (error) {
    next(error);
  }
});

// GET /api/applications/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "Invalid application ID",
      });
    }

    const application = await JobApplication.findByPk(id);

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

// POST (create)

router.post("/", async (req, res, next) => {
  try {
    const { company, position, status, location, dateApplied, jobLink, notes } =
      req.body;

    const application = await JobApplication.create({
      company,
      position,
      status,
      location,
      dateApplied,
      jobLink,
      notes,
    });

    res.status(201).json(application);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

// PATCH (update)
router.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: "Job application not found" });
    }

    const { company, position, status, location, dateApplied, jobLink, notes } =
      req.body;
    await application.update({
      company,
      position,
      status,
      location,
      dateApplied,
      jobLink,
      notes,
    });

    res.status(200).json(application);
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

// DELETE
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const application = await JobApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: "Job application not found" });
    }

    await application.destroy();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
