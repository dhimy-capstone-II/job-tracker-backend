const { db, JobApplication } = require("./models");

const applications = [
  {
    company: "Acme Corp",
    position: "Frontend Developer",
    status: "Applied",
    location: "New York, NY",
    dateApplied: "2026-07-10",
    jobLink: "https://example.com/acme",
    notes: "Applied through the website.",
  },
  {
    company: "Globex",
    position: "Junior Software Engineer",
    status: "Interview",
    location: "Remote",
    dateApplied: "2026-07-05",
    jobLink: "https://example.com/globex",
    notes: "Phone screen scheduled.",
  },
  { company: "Initech", position: "Full Stack Developer", status: "Saved" },
  // ...through Offer, Rejected, and Closed
];

async function seed() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to seed in production.");
    }

    await db.sync({ force: true });
    await JobApplication.bulkCreate(applications, { validate: true });
    console.log(`Seeded ${applications.length} job applications.`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

seed();
