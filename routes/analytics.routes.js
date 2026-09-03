/**
 * analytics.routes.js — read-only statistics about the logged-in user's applications.
 *
 * app.js mounts this router at /api/analytics.
 *
 *   GET /api/analytics/summary          -> counts, rates, timeline, recent activity
 *   GET /api/analytics/summary?days=7   -> same, but the timeline covers 7 days
 *
 * These routes expect requireAuth to run before them, so req.user is the
 * logged-in user. Every query is filtered by req.user.id, which means one
 * user can never see another user's numbers.
 *
 * All of the counting happens inside PostgreSQL. We never load the full list
 * of applications into Node just to count it, so this endpoint stays fast
 * whether the user has 10 applications or 10,000.
 */

const express = require("express");
const { fn, col, Op } = require("sequelize");

const { JobApplication } = require("../models");

const router = express.Router();

// The six valid statuses, read from the model so the two can never drift apart.
const STATUS_VALUES = JobApplication.STATUS_VALUES;

// "Saved" means the job was bookmarked, not applied to. It is left out of the
// denominator when we calculate the interview and offer rates.
const BOOKMARK_STATUS = "Saved";

// Timeline settings.
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;

// How many applications to show in the "recent activity" list.
const RECENT_LIMIT = 5;

// The date format PostgreSQL will use, and the one the frontend expects.
const DATE_FORMAT = "YYYY-MM-DD";

// ---------- small helpers ----------

// Read ?days=N from the URL.
// Anything missing or invalid falls back to 30, and anything huge is clamped
// so a user cannot ask the database for 100,000 days of history.
function parseDays(value) {
  const days = Number(value);

  if (!Number.isInteger(days) || days < 1) {
    return DEFAULT_RANGE_DAYS;
  }

  return Math.min(days, MAX_RANGE_DAYS);
}

// Midnight UTC, (days - 1) days ago.
// Subtracting one means ?days=7 gives seven buckets: today plus the six
// days before it, rather than eight.
function getRangeStart(days) {
  const start = new Date();

  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return start;
}

// Turn a Date into the same "YYYY-MM-DD" string PostgreSQL gives us, so both
// sides of the comparison are in the same format.
//
// Note: days are grouped in UTC. An application saved late at night in a
// western timezone can land on the next day's bucket. That is a known
// simplification for this version.
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Percentage rounded to one decimal place.
// Returns 0 when there is nothing to divide by, so the response can never
// contain NaN or Infinity.
function toPercent(part, whole) {
  if (!whole) {
    return 0;
  }

  return Math.round((part / whole) * 1000) / 10;
}

// PostgreSQL only returns rows for statuses that actually exist. The chart
// needs all six every time, so start every status at zero and then fill in
// whatever came back.
function buildStatusCounts(rows) {
  const counts = {};

  for (const status of STATUS_VALUES) {
    counts[status] = 0;
  }

  for (const row of rows) {
    // COUNT() arrives from PostgreSQL as a string, so convert it to a number.
    counts[row.status] = Number(row.count);
  }

  return counts;
}

// A chart needs one point per day, but PostgreSQL only returns the days that
// have at least one application. Walk the whole range and fill the gaps with
// zero, otherwise the chart would connect two distant days and imply activity
// that never happened.
function buildTimeline(rows, days, rangeStart) {
  const countsByDate = new Map();

  for (const row of rows) {
    countsByDate.set(row.date, Number(row.count));
  }

  const timeline = [];
  const cursor = new Date(rangeStart);

  for (let index = 0; index < days; index += 1) {
    const date = toDateKey(cursor);

    timeline.push({
      date,
      count: countsByDate.get(date) || 0,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return timeline;
}

// ---------- SUMMARY — GET /api/analytics/summary ----------

router.get("/summary", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const days = parseDays(req.query.days);
    const rangeStart = getRangeStart(days);

    // Run the three queries at the same time instead of one after another.
    // Each one is a separate round trip to the database, so awaiting them in
    // sequence would make this endpoint about three times slower.
    const [statusRows, timelineRows, recentApplications] = await Promise.all([
      // 1. How many applications are in each status?
      JobApplication.findAll({
        where: { userId },
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),

      // 2. How many applications were added on each day of the range?
      //    TO_CHAR turns the timestamp into a plain "YYYY-MM-DD" string, so
      //    the dates arrive as text instead of as JavaScript Date objects.
      JobApplication.findAll({
        where: {
          userId,
          createdAt: { [Op.gte]: rangeStart },
        },
        attributes: [
          [fn("TO_CHAR", col("createdAt"), DATE_FORMAT), "date"],
          [fn("COUNT", col("id")), "count"],
        ],
        group: [fn("TO_CHAR", col("createdAt"), DATE_FORMAT)],
        order: [[fn("TO_CHAR", col("createdAt"), DATE_FORMAT), "ASC"]],
        raw: true,
      }),

      // 3. The five most recent applications, for the activity list.
      //    Only the columns the dashboard actually displays are selected.
      JobApplication.findAll({
        where: { userId },
        attributes: ["id", "company", "position", "status", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: RECENT_LIMIT,
      }),
    ]);

    const statusCounts = buildStatusCounts(statusRows);

    // Add up the per-status counts instead of running a fourth COUNT query.
    const totalApplications = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Bookmarked jobs were never applied to, so they are not part of the
    // denominator when working out how often an application leads somewhere.
    const submittedApplications =
      totalApplications - statusCounts[BOOKMARK_STATUS];

    // Someone holding an offer clearly interviewed first, so "Offer" counts
    // towards the interview number too.
    const interviewCount = statusCounts.Interview + statusCounts.Offer;
    const offerCount = statusCounts.Offer;

    res.status(200).json({
      rangeDays: days,
      totalApplications,
      submittedApplications,
      statusCounts,
      interviewCount,
      offerCount,
      interviewRate: toPercent(interviewCount, submittedApplications),
      offerRate: toPercent(offerCount, submittedApplications),
      applicationsOverTime: buildTimeline(timelineRows, days, rangeStart),
      recentApplications,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
