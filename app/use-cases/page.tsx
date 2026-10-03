import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { CtaSection, Hero, PrimaryCta, Section, SectionHeading, Serif } from "../components/ds";
import { AppCards } from "./AppCards";
import { Parallax } from "./Parallax";
/* The flowing list below reuses the /pages styles. */
import "../pages/pages.css";
import "./use-cases.css";

export const metadata: Metadata = {
  title: "Use cases — The small apps your work runs on",
  keywords: [
    "internal tools for small teams",
    "small apps built with AI",
    "leave tracker app",
    "attendance app",
    "IT helpdesk app",
    "deploy AI built app",
  ],
  description:
    "Todo lists, leave trackers, helpdesks, wikis and hundreds more. Ask your AI to build the app your team needs — Embarko puts it online.",
};

/* Every small app a team might ask for. Plain text, one flowing list. */
const APPS = [
  "Todo lists",
  "Daily standups",
  "Attendance",
  "Leave trackers",
  "Work-from-home trackers",
  "Employee directories",
  "Office calendars",
  "Shift rosters",
  "Meeting room booking",
  "Visitor logs",
  "Office inventory",
  "IT asset trackers",
  "Laptop assignment",
  "Software license trackers",
  "Stationery stock",
  "Consumables trackers",
  "Asset returns",
  "Purchase requests",
  "Stock in, stock out",
  "Employee profiles",
  "Onboarding checklists",
  "Offboarding checklists",
  "Skills directories",
  "Birthday reminders",
  "Work anniversaries",
  "Emergency contacts",
  "Org charts",
  "Performance goals",
  "Employee feedback",
  "Expense trackers",
  "Expense approvals",
  "Petty cash",
  "Invoice trackers",
  "Purchase orders",
  "Vendor lists",
  "Reimbursements",
  "Budget trackers",
  "Company wikis",
  "Knowledge bases",
  "SOP libraries",
  "Policy libraries",
  "Important links",
  "Access directories",
  "Document expiry reminders",
  "Form builders",
  "Announcement boards",
  "Feedback boxes",
  "Polls and voting",
  "Suggestion boxes",
  "Team updates",
  "Complaint trackers",
  "FAQ pages",
  "IT helpdesks",
  "Bug trackers",
  "Service requests",
  "Maintenance logs",
  "Network issue logs",
  "Software access requests",
  "Permission trackers",
  "Release trackers",
  "Project trackers",
  "Team roadmaps",
  "Sprint boards",
  "Meeting action items",
  "Milestone trackers",
  "Event planners",
  "Campaign planners",
  "OKR trackers",
  "Lunch orders",
  "Cab sharing",
  "Parking spots",
  "Desk booking",
  "Hot-desk maps",
  "Courier logs",
  "Key registers",
  "Fire drill checklists",
  "Cleaning rotas",
  "Snack requests",
  "Office move planners",
  "Interview schedulers",
  "Candidate trackers",
  "Referral boards",
  "Job boards",
  "Training trackers",
  "Course sign-ups",
  "Certificate trackers",
  "Mentor matching",
  "Kudos walls",
  "Team quizzes",
  "Secret Santa",
  "Potluck sign-ups",
  "Offsite planners",
  "Travel requests",
  "Timesheets",
  "Overtime logs",
  "Holiday calendars",
  "Client lists",
  "Lead trackers",
  "Sales pipelines",
  "Quote builders",
  "Contract trackers",
  "Renewal reminders",
  "Customer feedback",
  "Support queues",
  "Order trackers",
  "Delivery logs",
  "Returns desks",
  "Price lists",
  "Product catalogues",
  "Booking pages",
  "Appointment slots",
  "Waitlists",
  "Content calendars",
  "Social post planners",
  "Brand asset libraries",
  "Press lists",
  "Newsletter archives",
  "Survey pages",
  "Event check-in",
  "RSVP pages",
  "Raffle draws",
  "Sign-up sheets",
  "Volunteer rotas",
  "Donation trackers",
  "Member directories",
  "Club notice boards",
  "Class timetables",
  "Homework trackers",
  "Library loans",
  "Lab bookings",
  "Equipment loans",
  "Vehicle logs",
  "Fuel logs",
  "Site inspection checklists",
  "Safety incident logs",
  "Quality checklists",
  "Daily reports",
  "Weekly reports",
  "KPI boards",
  "Goal trackers",
  "Habit trackers",
  "Reading lists",
  "Recipe books",
  "Grocery lists",
  "Chore charts",
  "Family calendars",
  "Wedding planners",
  "Gift registries",
  "Trip planners",
  "Bill splitters",
  "Rent trackers",
  "Plant watering reminders",
  "Pet care logs",
  "Workout logs",
  "Study planners",
  "Flashcards",
  "Link-in-bio pages",
  "Portfolios",
  "Price calculators",
  "Unit converters",
  "Countdown pages",
  "Status pages",
];

export default function UseCasesPage() {
  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <div className="uc-stage">
        <Parallax />
        <AppCards />

        <div className="ds-wrap">
          <Hero
            className="uc-hero"
            eyebrow="Use cases"
            title={
              <>
                The small apps
                <br />
                your work <Serif>runs</Serif> on.
              </>
            }
            sub="Ask your AI for the app your team needs. Embarko puts it online, on its own link."
            actions={
              <div className="pg-actions">
                <PrimaryCta />
                <Link href="/showcase" className="pg-quiet">
                  See apps people made <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            }
          />
        </div>
      </div>

      <Section labelledBy="for-h" className="pg-for">
        <SectionHeading id="for-h" title="Made for anything a team needs." />
        <p className="pg-uses">
          {APPS.map((u, i) => (
            <Fragment key={u}>
              {/* A mix of ink, grey and serif so the list reads as a rhythm, not a wall. */}
              <span className={i % 5 === 2 ? "pg-use-serif" : i % 4 === 0 ? "pg-use-ink" : undefined}>{u}</span>
              {i < APPS.length - 1 && (
                <>
                  {" "}
                  <span className="pg-uses-dot" aria-hidden="true">
                    ·
                  </span>{" "}
                </>
              )}
            </Fragment>
          ))}
        </p>
      </Section>

      <CtaSection
        id="start"
        title={
          <>
            Your team&apos;s next app
            <br />
            is one <Serif>prompt</Serif> away.
          </>
        }
        line="Copy the prompt, ask your AI for the app, and share the link with your team."
      />

      <SiteFooter />
    </main>
  );
}
