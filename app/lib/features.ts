import { Activity, CalendarClock, Database, FolderOpen, Globe, HardDrive, History, KeyRound, Lock, Mail, Plug, Workflow, type LucideIcon } from "lucide-react";

/* What Embarko gives an app, in one list. The tabs on /v3 and /v4
   (FeatureShowcase) and the tiles on /v1 and /v2 (FeatureTiles) both read it,
   so the pages can never disagree about what works.

   Every line is checked against content/docs/capabilities.md: a feature is
   listed as working only if an agent can do it today. "Upcoming" marks what
   Embarko can't do yet — don't promise it. Shipped first, then upcoming: a
   list that opens on something the owner can't have yet sells the wrong
   thing. */

export type Feature = {
  id: string;
  /* The short name. One or two words: it is read as a list. */
  label: string;
  Icon: LucideIcon;
  headline: string;
  body: string;
  /* What the owner types into their agent. Written as speech, because that is
     what it is — not commands, and not a CLI. */
  prompts: string[];
  /* Not built yet. Says so everywhere the feature appears. */
  upcoming?: boolean;
  /* How the feature is named mid-sentence in the docs link. Defaults to the
     lowercased label, which is wrong for anything carrying an acronym. */
  linkLabel?: string;
};

export const FEATURES: Feature[] = [
    {
      id: "domain",
      label: "Domain",
      Icon: Globe,
      headline: "A live address, the moment it deploys",
      body: "Every deploy comes back with a URL you can send to anyone. Bring your own domain when you are ready and your agent points it here.",
      prompts: ["“Deploy this to Embarko”", "“Point shop.mysite.com at it”", "“Is it live yet?”"],
    },
    {
      id: "database",
      label: "Database",
      Icon: Database,
      headline: "Somewhere to keep what your app saves",
      body: "Orders, notes, sign-ups. Your app can write and read from its first deploy — nothing to provision, no connection string to paste in.",
      prompts: ["“Save the sign-ups”", "“Add a table for orders”", "“What’s in the database?”"],
    },
    {
      id: "tools",
      label: "Connect tools",
      Icon: Plug,
      headline: "Connect the tools you already pay for",
      body: "Payments, AI, a spreadsheet — paste the key once and your app gets it on every deploy. Keys stay out of the code, and your agent never has to ask you for one twice.",
      prompts: ["“Take payments with my Stripe key”", "“Read orders from my Google Sheet”", "“Use my OpenAI key for the chat”"],
      linkLabel: "connecting tools",
    },
    {
      id: "uptime",
      label: "Uptime",
      Icon: Activity,
      headline: "It stays up while you are not looking",
      body: "Embarko restarts the app if it stops and renews HTTPS before it lapses. When something does need you, it says so in plain words.",
      prompts: ["“Is anything wrong?”", "“Why did it restart?”", "“Check on my app”"],
    },
    {
      id: "logs",
      label: "Logs & fixes",
      Icon: History,
      headline: "When it breaks, your agent fixes it",
      body: "Your agent reads the logs to find out what went wrong. If a new version breaks the app, it can go back to the last one that worked in seconds.",
      prompts: ["“My app broke. Find out why”", "“Go back to the last version”", "“What changed today?”"],
      linkLabel: "logs",
    },
    {
      id: "email",
      label: "Email",
      Icon: Mail,
      headline: "Send email from your app",
      body: "Welcome emails, receipts, password resets. Soon your app can send them without you setting up an email service.",
      prompts: ["“Send a welcome email when someone signs up”", "“Email a receipt after each order”", "“Email me when someone books”"],
      upcoming: true,
    },
    {
      id: "login",
      label: "Login",
      Icon: KeyRound,
      headline: "Let people sign in without building it",
      body: "Accounts, sessions and password resets, ready to switch on. You will ask for them and they appear, instead of sitting down to design a login flow.",
      prompts: ["“Add login to this”", "“Only let my team in”", "“Add Google sign-in”"],
      upcoming: true,
    },
    {
      id: "files",
      label: "Files",
      Icon: FolderOpen,
      headline: "Room for whatever people upload",
      body: "Photos, PDFs, spreadsheets. Your app will take files and hand them back, with the space for them growing as it fills.",
      prompts: ["“Let people upload photos”", "“Keep the PDFs”", "“Show the uploads as a gallery”"],
      upcoming: true,
    },
    {
      id: "backups",
      label: "Backups",
      Icon: HardDrive,
      headline: "Yesterday is still there",
      body: "Your data copied on a schedule and kept, so when something goes wrong your agent can put an earlier version back.",
      prompts: ["“Roll back to yesterday”", "“When was the last backup?”", "“Restore what I deleted”"],
      upcoming: true,
    },
    {
      id: "sharing",
      label: "Private sharing",
      Icon: Lock,
      headline: "Only your people get in",
      body: "Apps are public to anyone with the link. Soon you can make one private, so only the people you invite can open it.",
      prompts: ["“Only let my team open it”", "“Invite dana@studio.co”"],
      upcoming: true,
    },
    {
      id: "schedules",
      label: "Schedules",
      Icon: CalendarClock,
      headline: "Run things on a timer",
      body: "Weekly reports, nightly clean-ups — set a time and your app does the job on its own.",
      prompts: ["“Email me a report every Monday”", "“Clear old carts each night”"],
      upcoming: true,
    },
    {
      id: "jobs",
      label: "Background jobs",
      Icon: Workflow,
      headline: "Long work, off the main app",
      body: "Big imports and batches of photos run in the background, so the app stays quick while they finish.",
      prompts: ["“Resize the photos in the background”", "“Import the list without slowing the app”"],
      upcoming: true,
    },
  ];
