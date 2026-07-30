const { db, JobApplication } = require("./models");

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
    jobLink: "https://example.com/openai",
    notes: "Portfolio submitted.",
  },
  {
    company: "Cyberdyne Systems",
    position: "Junior Full Stack Developer",
    status: "Saved",
    location: "Remote",
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
    notes: "Behavioral completed.",
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
];

async function seed() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to seed in production.");
    }

    await db.sync({ force: true });

    await JobApplication.bulkCreate(applications, {
      validate: true,
    });

    console.log(`Seeded ${applications.length} job applications.`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

seed();