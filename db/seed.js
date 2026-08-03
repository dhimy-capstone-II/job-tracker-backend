// db/seed.js — resets the database and creates a sample user
// with 48 job applications.
//
// Run with:
// npm run seed

const bcrypt = require("bcrypt");

const { db, JobApplication, User } = require("../models");

const applications = [
  {
    company: "Acme Corp",
    position: "Frontend Developer",
    status: "Applied",
    location: "New York, NY",
    dateApplied: "2026-07-10",
    jobLink: "https://example.com/acme",
    notes: "Applied through company website.",
  },
  {
    company: "Globex",
    position: "Junior Software Engineer",
    status: "Interview",
    location: "Remote",
    dateApplied: "2026-07-05",
    jobLink: "https://example.com/globex",
    notes: "Technical interview scheduled.",
  },
  {
    company: "Initech",
    position: "Full Stack Developer",
    status: "Saved",
    location: "Austin, TX",
    dateApplied: null,
    jobLink: "https://example.com/initech",
    notes: "Need to tailor resume.",
  },
  {
    company: "Stark Industries",
    position: "React Developer",
    status: "Offer",
    location: "Los Angeles, CA",
    dateApplied: "2026-06-20",
    jobLink: "https://example.com/stark",
    notes: "Received offer.",
  },
  {
    company: "Wayne Enterprises",
    position: "Software Engineer",
    status: "Rejected",
    location: "Gotham City",
    dateApplied: "2026-06-15",
    jobLink: "https://example.com/wayne",
    notes: "Rejected after final interview.",
  },
  {
    company: "Umbrella Corporation",
    position: "Backend Developer",
    status: "Closed",
    location: "Remote",
    dateApplied: "2026-05-28",
    jobLink: "https://example.com/umbrella",
    notes: "Position was closed.",
  },
  {
    company: "OpenAI",
    position: "Frontend Software Engineer",
    status: "Applied",
    location: "San Francisco, CA",
    dateApplied: "2026-07-18",
    jobLink: "https://openai.com/careers/",
    notes: "Portfolio submitted.",
  },
  {
    company: "Cyberdyne Systems",
    position: "Junior Full Stack Developer",
    status: "Saved",
    location: "Remote",
    dateApplied: null,
    jobLink: "https://example.com/cyberdyne",
    notes: "Research company first.",
  },
  {
    company: "Google",
    position: "Software Engineer I",
    status: "Interview",
    location: "New York, NY",
    dateApplied: "2026-07-12",
    jobLink: "https://careers.google.com",
    notes: "Recruiter reached out.",
  },
  {
    company: "Microsoft",
    position: "Frontend Engineer",
    status: "Applied",
    location: "Redmond, WA",
    dateApplied: "2026-07-09",
    jobLink: "https://careers.microsoft.com",
    notes: "",
  },
  {
    company: "Amazon",
    position: "Full Stack Engineer",
    status: "Saved",
    location: "Seattle, WA",
    dateApplied: null,
    jobLink: "https://amazon.jobs",
    notes: "",
  },
  {
    company: "Netflix",
    position: "UI Engineer",
    status: "Interview",
    location: "Los Gatos, CA",
    dateApplied: "2026-07-01",
    jobLink: "https://jobs.netflix.com",
    notes: "Behavioral interview completed.",
  },
  {
    company: "Meta",
    position: "Software Engineer",
    status: "Rejected",
    location: "Menlo Park, CA",
    dateApplied: "2026-06-30",
    jobLink: "https://www.metacareers.com",
    notes: "",
  },
  {
    company: "Apple",
    position: "Frontend Developer",
    status: "Applied",
    location: "Cupertino, CA",
    dateApplied: "2026-07-20",
    jobLink: "https://jobs.apple.com",
    notes: "",
  },
  {
    company: "Spotify",
    position: "React Engineer",
    status: "Offer",
    location: "Remote",
    dateApplied: "2026-06-18",
    jobLink: "https://www.lifeatspotify.com",
    notes: "Negotiating salary.",
  },
  {
    company: "Adobe",
    position: "JavaScript Developer",
    status: "Applied",
    location: "San Jose, CA",
    dateApplied: "2026-07-14",
    jobLink: "https://careers.adobe.com",
    notes: "",
  },
  {
    company: "Airbnb",
    position: "Frontend Engineer",
    status: "Interview",
    location: "Remote",
    dateApplied: "2026-07-08",
    jobLink: "https://careers.airbnb.com",
    notes: "Coding challenge completed.",
  },
  {
    company: "Salesforce",
    position: "Software Engineer",
    status: "Closed",
    location: "Chicago, IL",
    dateApplied: "2026-06-10",
    jobLink: "https://salesforce.com/careers",
    notes: "",
  },
  {
    company: "Stripe",
    position: "Full Stack Engineer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-16",
    jobLink: "https://stripe.com/jobs",
    notes: "",
  },
  {
    company: "Twilio",
    position: "Backend Engineer",
    status: "Saved",
    location: "Remote",
    dateApplied: null,
    jobLink: "https://twilio.com/company/jobs",
    notes: "",
  },
  {
    company: "IBM",
    position: "Junior Developer",
    status: "Interview",
    location: "Armonk, NY",
    dateApplied: "2026-07-11",
    jobLink: "https://www.ibm.com/careers",
    notes: "",
  },
  {
    company: "Oracle",
    position: "Software Engineer",
    status: "Rejected",
    location: "Austin, TX",
    dateApplied: "2026-06-29",
    jobLink: "https://www.oracle.com/careers",
    notes: "",
  },
  {
    company: "Dropbox",
    position: "React Developer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-13",
    jobLink: "https://jobs.dropbox.com",
    notes: "",
  },
  {
    company: "Atlassian",
    position: "Frontend Software Engineer",
    status: "Offer",
    location: "Remote",
    dateApplied: "2026-06-22",
    jobLink: "https://www.atlassian.com/company/careers",
    notes: "Waiting for final paperwork.",
  },
  {
    company: "Shopify",
    position: "Frontend Developer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-21",
    jobLink: "https://www.shopify.com/careers",
    notes: "",
  },
  {
    company: "GitHub",
    position: "Software Engineer",
    status: "Saved",
    location: "Remote",
    dateApplied: null,
    jobLink: "https://www.github.careers",
    notes: "Review engineering team openings.",
  },
  {
    company: "GitLab",
    position: "Frontend Engineer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-22",
    jobLink: "https://about.gitlab.com/jobs",
    notes: "Submitted resume and portfolio.",
  },
  {
    company: "LinkedIn",
    position: "Software Engineer I",
    status: "Interview",
    location: "Sunnyvale, CA",
    dateApplied: "2026-07-15",
    jobLink: "https://careers.linkedin.com",
    notes: "Phone screen completed.",
  },
  {
    company: "Pinterest",
    position: "UI Developer",
    status: "Saved",
    location: "San Francisco, CA",
    dateApplied: null,
    jobLink: "https://www.pinterestcareers.com",
    notes: "Need to update portfolio.",
  },
  {
    company: "Reddit",
    position: "Frontend Software Engineer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-17",
    jobLink: "https://www.redditinc.com/careers",
    notes: "",
  },
  {
    company: "Snap",
    position: "Web Developer",
    status: "Rejected",
    location: "Santa Monica, CA",
    dateApplied: "2026-06-25",
    jobLink: "https://careers.snap.com",
    notes: "Application was not selected.",
  },
  {
    company: "Uber",
    position: "Full Stack Developer",
    status: "Interview",
    location: "New York, NY",
    dateApplied: "2026-07-06",
    jobLink: "https://www.uber.com/careers",
    notes: "Technical interview scheduled.",
  },
  {
    company: "Lyft",
    position: "Frontend Engineer",
    status: "Closed",
    location: "San Francisco, CA",
    dateApplied: "2026-06-12",
    jobLink: "https://www.lyft.com/careers",
    notes: "The role was removed.",
  },
  {
    company: "DoorDash",
    position: "Software Engineer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-19",
    jobLink: "https://careers.doordash.com",
    notes: "",
  },
  {
    company: "Square",
    position: "JavaScript Engineer",
    status: "Saved",
    location: "Remote",
    dateApplied: null,
    jobLink: "https://block.xyz/careers",
    notes: "Research the team before applying.",
  },
  {
    company: "PayPal",
    position: "Frontend Developer",
    status: "Interview",
    location: "New York, NY",
    dateApplied: "2026-07-04",
    jobLink: "https://careers.pypl.com",
    notes: "Second interview scheduled.",
  },
  {
    company: "Capital One",
    position: "Associate Software Engineer",
    status: "Applied",
    location: "McLean, VA",
    dateApplied: "2026-07-23",
    jobLink: "https://www.capitalonecareers.com",
    notes: "",
  },
  {
    company: "JPMorgan Chase",
    position: "Software Engineer",
    status: "Saved",
    location: "New York, NY",
    dateApplied: null,
    jobLink: "https://careers.jpmorgan.com",
    notes: "Prepare for coding assessment.",
  },
  {
    company: "Goldman Sachs",
    position: "Frontend Engineer",
    status: "Rejected",
    location: "New York, NY",
    dateApplied: "2026-06-27",
    jobLink: "https://www.goldmansachs.com/careers",
    notes: "",
  },
  {
    company: "Bloomberg",
    position: "Software Engineer",
    status: "Interview",
    location: "New York, NY",
    dateApplied: "2026-07-07",
    jobLink: "https://www.bloomberg.com/company/careers",
    notes: "Coding interview scheduled.",
  },
  {
    company: "Datadog",
    position: "Frontend Software Engineer",
    status: "Applied",
    location: "New York, NY",
    dateApplied: "2026-07-24",
    jobLink: "https://careers.datadoghq.com",
    notes: "",
  },
  {
    company: "MongoDB",
    position: "Full Stack Engineer",
    status: "Offer",
    location: "New York, NY",
    dateApplied: "2026-06-24",
    jobLink: "https://www.mongodb.com/careers",
    notes: "Offer received.",
  },
  {
    company: "Cloudflare",
    position: "Frontend Developer",
    status: "Saved",
    location: "Remote",
    dateApplied: null,
    jobLink: "https://www.cloudflare.com/careers",
    notes: "",
  },
  {
    company: "Palantir",
    position: "Software Engineer",
    status: "Applied",
    location: "New York, NY",
    dateApplied: "2026-07-25",
    jobLink: "https://www.palantir.com/careers",
    notes: "",
  },
  {
    company: "Figma",
    position: "Product Engineer",
    status: "Interview",
    location: "San Francisco, CA",
    dateApplied: "2026-07-02",
    jobLink: "https://www.figma.com/careers",
    notes: "Portfolio review completed.",
  },
  {
    company: "Canva",
    position: "Frontend Engineer",
    status: "Saved",
    location: "Remote",
    dateApplied: null,
    jobLink: "https://www.canva.com/careers",
    notes: "Review role requirements.",
  },
  {
    company: "HubSpot",
    position: "Software Engineer",
    status: "Applied",
    location: "Remote",
    dateApplied: "2026-07-26",
    jobLink: "https://www.hubspot.com/careers",
    notes: "",
  },
  {
    company: "Notion",
    position: "Software Engineer",
    status: "Applied",
    location: "San Francisco, CA",
    dateApplied: "2026-07-27",
    jobLink: "https://www.notion.so/careers",
    notes: "Submitted application.",
  },
];

async function seed() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to seed in production.");
    }

    // Drop and recreate all tables.
    await db.sync({ force: true });
    console.log("🌱 Database reset.");

    // Create a secure hash for the demo user's password.
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create one local demo user.
    const demoUser = await User.create({
      name: "Dhimy Jean",
      username: "dhimy",
      email: "dhimy@example.com",
      passwordHash,
      auth0Id: null,
    });

    console.log("🌱 Sample user created.");

    // Connect every seeded application to the demo user.
    const applicationsWithUser = applications.map((application) => ({
      ...application,
      userId: demoUser.id,
    }));

    await JobApplication.bulkCreate(applicationsWithUser, {
      validate: true,
    });

    console.log(
      `🌱 Seeded ${applicationsWithUser.length} job applications.`,
    );
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await db.close();
    console.log("🌱 Done. Connection closed.");
  }
}

seed();
