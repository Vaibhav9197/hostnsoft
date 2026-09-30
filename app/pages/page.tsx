import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import {
  ArrowRight,
  Briefcase,
  Code2,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  Heart,
  Lightbulb,
  Mic,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { ButtonLink, CtaSection, Hero, Section, SectionHeading, Serif } from "../components/ds";
import { HeroDots } from "./HeroDots";
import "./pages.css";

export const metadata: Metadata = {
  title: "Showcase pages — Put your projects on one page",
  keywords: [
    "hackathon project showcase",
    "hackathon project gallery",
    "demo day page",
    "class project showcase",
    "student project showcase",
  ],
  description:
    "Create one page for every app built at your hackathon, class, demo day or workshop. Participants deploy with their AI and their apps appear, live.",
};

/* Where "Create a showcase page" goes. A logged-out visitor gets the sign-in
   screen in place, then lands back on the form. */
const CREATE_HREF = "/app/showcase/new";

type Tile = { icon: LucideIcon; kind: string; line: string };

/* The posters floating around the hero, like Luma's. Each is a kind of page
   someone could make — not a real event, so no names, dates or counts. */
const TILES: Tile[] = [
  { icon: Trophy, kind: "Hackathon", line: "48 hours. One page." },
  { icon: Gamepad2, kind: "Game jam", line: "Play every entry" },
  { icon: Mic, kind: "Demo day", line: "Every pitch, live" },
  { icon: GraduationCap, kind: "Class projects", line: "The whole class" },
  { icon: Lightbulb, kind: "Workshop", line: "Everyone ships one app today" },
  { icon: Briefcase, kind: "Hack week", line: "What the team built" },
  { icon: Sparkles, kind: "Prompt-a-thon", line: "Built with AI" },
  { icon: FlaskConical, kind: "Tech fair", line: "Walk the stalls online" },
  { icon: Rocket, kind: "Startup weekend", line: "Idea to live link" },
  { icon: Users, kind: "Build night", line: "Student club" },
  { icon: Code2, kind: "Bootcamp finals", line: "Cohort projects" },
  { icon: Heart, kind: "Social good", line: "Apps that help" },
];

/* What a showcase page can be for. Plain text, one flowing list. */
const USES = [
  "Hackathons",
  "Game jams",
  "Demo days",
  "Class projects",
  "Workshops",
  "Buildathons",
  "Build weekends",
  "AI challenges",
  "Prompt-a-thons",
  "Startup weekends",
  "Course projects",
  "Bootcamp finals",
  "Student club build nights",
  "Final-year projects",
  "Capstone projects",
  "Lab projects",
  "Science fairs",
  "Tech fairs",
  "Portfolio nights",
  "Meetup show-and-tells",
  "Conference side events",
  "Internal hack weeks",
  "Team offsite build days",
  "Innovation days",
  "Customer challenges",
  "Partner challenges",
  "Apps built on your API",
  "Monthly build challenges",
  "Discord weekend jams",
  "College tech fests",
  "Social-good hackathons",
  "Coding competitions",
  "Design sprints",
  "Summer schools",
  "Coding camps for kids",
  "School computer clubs",
  "Teacher training days",
  "University open days",
  "Research group tools",
  "Thesis demos",
  "Incubator cohorts",
  "Accelerator demo days",
  "Pitch nights",
  "Founder meetups",
  "Product launches",
  "Community showcases",
  "Open-source sprints",
  "Women-in-tech build days",
  "Civic tech challenges",
  "Climate hackathons",
  "Health tech challenges",
  "Fintech hackathons",
  "Library maker days",
  "Makerspace nights",
  "Creative coding jams",
  "Art and code shows",
  "Music tech jams",
  "Data viz challenges",
  "No-code build days",
  "Solo-founder weeks",
  "100 days of building",
  "Weekend side projects",
  "Holiday build challenges",
  "Internship final demos",
  "Graduate showcases",
  "Company town halls",
  "Sales tool builds",
  "HR tool builds",
  "Department tool libraries",
  "Client work portfolios",
  "Agency showreels",
  "Newsletter reader builds",
  "Podcast listener challenges",
  "YouTube community builds",
  "Friends-and-family apps",
];

export default function PagesPage() {
  return (
    <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased">
      <SiteHeader />

      <div className="pg-stage">
        <HeroDots />
        <ul className="pg-tiles" aria-hidden="true">
          {TILES.map(({ icon: Icon, kind, line }, i) => (
            <li key={kind} className={`pg-tile pg-tile-${i + 1}`}>
              <span className="pg-tile-art">
                <Icon strokeWidth={1.4} />
              </span>
              <span className="pg-tile-kind">{kind}</span>
              <span className="pg-tile-line">{line}</span>
            </li>
          ))}
        </ul>

        <div className="ds-wrap">
          <Hero
            className="pg-hero"
            eyebrow="Showcase pages"
            title={
              <>
                Put your projects
                <br />
                on one <Serif>page</Serif>.
              </>
            }
            sub="For hackathons, classes, demo days, workshops, communities, teams and more."
            actions={
              <div className="pg-actions">
                <ButtonLink href={CREATE_HREF} variant="primary" size="lg">
                  Create a showcase page
                </ButtonLink>
                <Link href="/showcase" className="pg-quiet">
                  See the Showcase <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            }
          />
        </div>
      </div>

      <Section labelledBy="for-h">
        <SectionHeading id="for-h" title="Made for anything people build together." />
        <p className="pg-uses">
          {USES.map((u, i) => (
            <Fragment key={u}>
              {/* A mix of ink, grey and serif so the list reads as a rhythm, not a wall. */}
              <span className={i % 5 === 2 ? "pg-use-serif" : i % 4 === 0 ? "pg-use-ink" : undefined}>{u}</span>
              {i < USES.length - 1 && (
                <>
                  {"\u00a0"}
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
        pill="Free to create"
        title={
          <>
            One link.
            <br />
            Every <Serif>project</Serif>.
          </>
        }
        line="Make the page in a minute. Share it. Watch it fill up as people deploy."
        steps={["Name it", "Share the link", "Apps appear, live"]}
        action={
          <ButtonLink href={CREATE_HREF} variant="primary" size="lg">
            Create a showcase page
          </ButtonLink>
        }
      />

      <SiteFooter />
    </main>
  );
}
