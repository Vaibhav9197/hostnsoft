'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, Circle,
  Cloud, Copy, Database, FileUp, Globe2, Heart, KeyRound, LayoutDashboard,
  MapPin, Plane, Plus, ShieldCheck, Sparkles, Upload,
} from 'lucide-react';
import { siClaude, siCursor, siGithubcopilot, siGooglegemini, siReplit } from 'simple-icons';
import barcelonaMorning from './barcelona-morning.png';
import { CopyPromptButton as SharedCopyPromptButton, COPIED_LABEL } from '../components/CopyPromptButton';

const showcases = [
  { id: 'weekend', name: 'Weekend', type: 'Travel planner', domain: 'weekend.embarko.app', mark: 'W', color: 'amber' },
  { id: 'ledger', name: 'Ledger', type: 'Expense tracker', domain: 'ledger.embarko.app', mark: 'L', color: 'blue' },
  { id: 'table', name: 'Table 4', type: 'Booking app', domain: 'table4.embarko.app', mark: '4', color: 'coral' },
] as const;

type ShowcaseId = (typeof showcases)[number]['id'];

const agents = [
  { name: 'Claude', icon: siClaude },
  { name: 'Gemini', icon: siGooglegemini },
  { name: 'Cursor', icon: siCursor },
  { name: 'Copilot', icon: siGithubcopilot },
  { name: 'Replit', icon: siReplit },
] as const;

function Wordmark() {
  return <a className="wordmark" href="#top" aria-label="Embarko home"><span className="wordmark-mark" aria-hidden="true"><span /></span>embarko</a>;
}

function LiveMark() {
  return <span className="live-mark"><i /> Live on Embarko</span>;
}

function AgentIcon({ icon, label }: { icon: { path: string; hex: string }; label: string }) {
  return <svg className="agent-brand-icon" viewBox="0 0 24 24" role="img" aria-label={label}><path fill={'#' + icon.hex} d={icon.path} /></svg>;
}

function SceneCta({ href = '#ready', children }: { href?: string; children: React.ReactNode }) {
  return <a className="scene-cta" href={href}>{children}<ArrowRight aria-hidden="true" /></a>;
}

function CopyPromptButton({ compact = false }: { compact?: boolean }) {
  return <SharedCopyPromptButton
    className={compact ? 'copy-button copy-button-small' : 'copy-button'}
    copiedChildren={<><Check aria-hidden="true" />{COPIED_LABEL}{!compact && <span className="copy-key">⌘ C</span>}</>}
  >
    <Copy aria-hidden="true" />
    Copy the Embarko prompt
    {!compact && <span className="copy-key">⌘ C</span>}
  </SharedCopyPromptButton>;
}

function Steps() {
  return <ol className="steps" aria-label="How it works">
    <li className="step-current"><span>1</span> Copy</li>
    <li><span>2</span> Paste into your AI agent</li>
    <li><span>3</span> Ask it to deploy</li>
  </ol>;
}

function TravelApp() {
  return <div className="showcase-screen travel-screen">
    <div className="travel-photo"><img src={barcelonaMorning.src} alt="Sagrada Família in Barcelona" /><span className="travel-place"><MapPin aria-hidden="true" /> Barcelona, Spain</span><span className="date-chip"><strong>08</strong><small>JUN<br />MON</small></span></div>
    <div className="travel-side"><span className="tiny-label">Eight sunlit days</span><h3>Barcelona</h3><p className="trip-line"><Plane aria-hidden="true" /> 8 – 15 June 2026</p>
      <div className="trip-stats"><div><strong>12</strong><span>places saved</span></div><div><strong>4</strong><span>stays &amp; tables</span></div><div><strong>1</strong><span>slow afternoon</span></div></div>
      <div className="itinerary"><div className="itinerary-title"><span>Monday</span><span>8 June</span></div><div className="plan-item"><span className="time">10:00</span><i className="plan-dot gold" /><p><strong>Sagrada Família</strong><small>Morning architecture walk</small></p></div><div className="plan-item"><span className="time">13:30</span><i className="plan-dot coral" /><p><strong>Can Culleretes</strong><small>Lunch in the Gothic Quarter</small></p></div></div>
    </div>
  </div>;
}

function LedgerApp() {
  return <div className="showcase-screen ledger-screen">
    <aside className="ledger-sidebar"><span className="ledger-logo"><i /> ledger</span><span className="side-active"><LayoutDashboard aria-hidden="true" /> Overview</span><span><Circle aria-hidden="true" /> Transactions</span><span><Circle aria-hidden="true" /> Budgets</span></aside>
    <div className="ledger-main"><div className="ledger-heading"><div><p>May 2026</p><h3>Your money, quietly clear.</h3></div><button aria-label="Add transaction"><Plus aria-hidden="true" /></button></div><div className="balance-card"><span>Available this month</span><strong>$2,840.20</strong><small><ArrowDown aria-hidden="true" /> 8% less than last month</small></div><div className="chart-card"><div className="chart-title"><span>Spending</span><span>May</span></div><div className="bar-chart" aria-label="Spending chart"><i style={{ height: '28%' }} /><i style={{ height: '47%' }} /><i style={{ height: '35%' }} /><i style={{ height: '66%' }} /><i style={{ height: '48%' }} /><i className="today" style={{ height: '84%' }} /><i style={{ height: '57%' }} /></div></div><div className="recent-row"><span className="merchant-dot">M</span><p><strong>Mesa Cafe</strong><small>Today · Food</small></p><b>− $18.50</b></div></div>
  </div>;
}

function BookingApp() {
  return <div className="showcase-screen booking-screen">
    <div className="booking-nav"><span><i className="booking-logo" /> table four</span><nav><a href="#menu">Menu</a><a href="#reserve">Reserve</a><a href="#about">About</a></nav><button>Book a table</button></div>
    <div className="booking-content"><div className="booking-copy"><p>LONG LUNCHES · SHORT WALKS</p><h3>A table worth staying at.</h3><span>Small plates, good bottles, no rush.</span><button>Find a table <ArrowRight aria-hidden="true" /></button></div><div className="booking-photo"><i className="plate plate-one" /><i className="plate plate-two" /><span>12:48</span></div></div>
    <div className="booking-footer"><span>THU 12 JUN</span><span>2 guests</span><span>7:30 pm</span><button>Check availability <ArrowRight aria-hidden="true" /></button></div>
  </div>;
}

function HeroApp({ activeApp }: { activeApp: ShowcaseId }) {
  const current = showcases.find((app) => app.id === activeApp) ?? showcases[0];
  return <div className="app-shell" aria-label={current.name + ', a ' + current.type + ' hosted on Embarko'}>
    <div className="app-topbar"><div className={'app-brand ' + current.color}><i /> {current.name === 'Weekend' ? <>week<span>end</span></> : current.name.toLowerCase()}</div><nav><a href="#overview">Overview</a><a className="is-active" href="#app">Live app</a><a href="#saved">Saved</a></nav><div className="profile-cluster"><button className="avatar" aria-label="Open profile">M</button><ChevronDown aria-hidden="true" /></div></div>
    {activeApp === 'weekend' && <TravelApp />}{activeApp === 'ledger' && <LedgerApp />}{activeApp === 'table' && <BookingApp />}
    <div className="app-livebar"><LiveMark /><span>{current.domain}</span><ArrowUpRight aria-hidden="true" /></div>
  </div>;
}

function DeployScene() {
  return <section className="scene deploy-scene" id="how-it-works"><div className="scene-copy"><h2>Tell your agent to deploy.</h2><p>That’s the whole handoff.</p><CopyPromptButton compact /></div><div className="agent-window" aria-label="A conversation with Claude"><div className="agent-product-bar"><div className="agent-product-name"><AgentIcon icon={siClaude} label="Claude" /><strong>Claude</strong><ChevronDown aria-hidden="true" /></div><span>New chat</span><span>•••</span></div><div className="agent-chat"><p className="chat-date">Today</p><div className="agent-message user-message">The app is ready. Deploy this to Embarko.</div><div className="agent-message agent-message-reply"><span className="agent-spark"><AgentIcon icon={siClaude} label="Claude" /></span><p>I’ll deploy it now.<small>Creating your live app…</small></p></div><div className="agent-deploying"><span className="deploy-progress"><i /></span><p><strong>Deploying to Embarko</strong><small>Installing · building · making it live</small></p><span className="deploy-percent">82%</span></div></div><div className="agent-support-row"><span>Works with the agent you use</span><div>{agents.map((agent) => <span className="agent-support-icon" key={agent.name} title={agent.name}><AgentIcon icon={agent.icon} label={agent.name} /></span>)}</div></div></div></section>;
}

function LiveScene() {
  return <section className="scene live-scene" id="live"><div className="live-scene-inner"><div className="scene-copy centered"><h2>Your app is live.</h2><p>The same app. Now on the internet.</p></div><div className="browser-card"><div className="browser-bar"><span className="browser-controls"><i /><i /><i /></span><span className="browser-url"><ShieldCheck aria-hidden="true" /> weekend.embarko.app</span><span /></div><div className="browser-content"><div className="live-panel"><span className="browser-live"><i /> Live</span><h3>Barcelona<br />is ready.</h3><p>Eight bright days, held in one place.</p><button>Open itinerary <ArrowUpRight aria-hidden="true" /></button></div><img src={barcelonaMorning.src} alt="" /></div></div><div className="live-fleet"><div className="fleet-copy"><strong>And the rest are live too.</strong><span>Every app gets its own home.</span></div><div className="fleet-apps" aria-label="More live Embarko apps"><span><i className="fleet-mark amber">W</i><b>weekend</b><LiveMark /></span><span><i className="fleet-mark blue">L</i><b>ledger</b><LiveMark /></span><span><i className="fleet-mark coral">4</i><b>table four</b><LiveMark /></span><span className="fleet-more">+ more</span></div><SceneCta href="#examples">See example apps</SceneCta></div></div></section>;
}

function HostingScene() {
  const items = [['Domain', Globe2], ['Database', Database], ['Login', KeyRound], ['Files', FileUp], ['HTTPS', ShieldCheck], ['Backups', Cloud], ['Updates', Upload]] as const;
  return <section className="scene hosting-scene"><div className="scene-copy centered"><h2>Everything your app needs to stay online.</h2><p>You don’t have to set it up yourself.</p><SceneCta>Copy the prompt</SceneCta></div><div className="hosting-orbit" aria-label="Hosting features managed by Embarko">{items.map(([label, Icon], index) => <div className={'orbit-item orbit-' + (index + 1)} key={label}><Icon aria-hidden="true" /><span>{label}</span></div>)}<div className="embarko-core"><span className="wordmark-mark"><span /></span><strong>embarko</strong><small><i /> All set</small></div></div></section>;
}

function RealAppScene() {
  return <section className="scene real-app-scene"><div className="scene-copy"><h2>Apps people can use.</h2><p>Sign in. Save things. Share them. It stays there.</p><SceneCta href="#examples">See what you can host</SceneCta></div><div className="study-app"><div className="study-top"><span><i /> study circle</span><LiveMark /></div><div className="study-main"><div className="study-intro"><span>MONDAY, 8 JUNE</span><h3>Linear algebra<br />week four.</h3><p>Everything for the next study session.</p><button>Open notes <ArrowUpRight aria-hidden="true" /></button></div><div className="note-stack"><article className="note-card"><span className="note-label">SHARED NOTE</span><strong>Eigenvalues, explained simply.</strong><p>Four notes · 3 people</p><div><i className="student one" /><i className="student two" /><i className="student three" /><span>Saved</span></div></article><article className="file-card"><FileUp aria-hidden="true" /><p><strong>week-four.pdf</strong><small>Available to everyone</small></p><Check aria-hidden="true" /></article></div></div><div className="study-bottom"><span><KeyRound aria-hidden="true" /> Sign in</span><span><Heart aria-hidden="true" /> Save</span><span><FileUp aria-hidden="true" /> Share</span><span><Upload aria-hidden="true" /> Update</span></div></div></section>;
}

function AppGallery() {
  const cards = [['Portfolio', 'Show your work.', 'portfolio-card'], ['AI tool', 'Make something useful.', 'tool-card'], ['Tracker', 'Keep it simple.', 'tracker-card'], ['Booking app', 'Let people book.', 'booking-mini-card'], ['Campus app', 'Build for your people.', 'campus-card']] as const;
  function Preview({ className }: { className: string }) {
    if (className === 'portfolio-card') return <><i className="portfolio-sun" /><i className="portfolio-line one" /><i className="portfolio-line two" /><i className="portfolio-image" /></>;
    if (className === 'tool-card') return <><span className="tool-title">Talk to your docs</span><i className="tool-message user" /><i className="tool-message" /><span className="tool-input">Ask anything <ArrowRight /></span></>;
    if (className === 'tracker-card') return <><span className="tracker-title">Move a little</span><span className="tracker-ring"><i /></span><span className="tracker-number">7,492</span></>;
    if (className === 'booking-mini-card') return <><span className="booking-mini-title">Bon Aperitivo</span><span className="booking-mini-date">Fri, 8:00 pm</span><span className="booking-mini-button">Reserve</span></>;
    return <><span className="campus-top">north hall</span><span className="campus-event">Film club<br /><small>7:30 · Room 204</small></span><span className="campus-people"><i /><i /><i /></span></>;
  }
  return <section className="scene gallery-scene" id="examples"><div className="gallery-intro"><h2>Whatever your agent builds.</h2><p>Embarko gives it a home online.</p><SceneCta>Copy the prompt</SceneCta></div><div className="gallery-rail" aria-label="Examples of apps hosted on Embarko">{cards.map(([title, description, className]) => <article className={'gallery-card ' + className} key={title}><div className="gallery-preview" aria-hidden="true"><Preview className={className} /></div><div className="gallery-card-copy"><p>{title}</p><span>{description}</span><LiveMark /></div></article>)}</div></section>;
}

function AgentScene() {
  return <section className="scene agents-scene"><div className="scene-copy centered"><h2>Use the AI agent you already use.</h2><p>Keep building the way you build.</p><CopyPromptButton compact /></div><div className="agent-connection"><div className="agent-list">{agents.map((agent) => <span key={agent.name}><AgentIcon icon={agent.icon} label={agent.name} />{agent.name}</span>)}</div><div className="connection-line"><i /><ArrowRight aria-hidden="true" /></div><div className="connection-embarko"><span className="wordmark-mark"><span /></span><strong>embarko</strong><small>hosts your app</small></div><div className="connection-line out"><ArrowRight aria-hidden="true" /><i /></div><div className="tiny-live-app"><i /><p><strong>your-app.embarko.app</strong><LiveMark /></p></div></div></section>;
}

function WorldScene() {
  const apps = [['Portfolio', 'sunrise'], ['Little tools', 'mint'], ['Project board', 'paper'], ['Bookings', 'peach'], ['Study tracker', 'blue'], ['Game night', 'ink']] as const;
  return <section className="scene world-scene"><div className="world-copy"><h2>Everything you build can have a home online.</h2><p>Your agents keep creating. Embarko keeps it all live.</p><SceneCta>Bring your next app online</SceneCta></div><div className="app-world" aria-label="A calm world of applications hosted on Embarko">{apps.map(([name, color], index) => <div className={'world-app world-' + (index + 1) + ' ' + color} key={name}><div className="world-window"><i /><i /><i /></div><strong>{name}</strong><LiveMark /></div>)}</div></section>;
}

function FinalScene() {
  return <section className="final-scene" id="ready"><div><h2>Got an app ready?</h2><p>Copy the prompt. Let your agent put it online.</p><CopyPromptButton /><Steps /></div></section>;
}

export default function Home() {
  const [activeApp, setActiveApp] = useState<ShowcaseId>('weekend');
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveApp((current) => {
        const index = showcases.findIndex((app) => app.id === current);
        return showcases[(index + 1) % showcases.length].id;
      });
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);

  const structuredData = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Embarko', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Instant hosting for every app you build with AI.' };
  return <main className="site-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <header className="site-header"><Wordmark /><div className="header-actions"><a className="pricing-link" href="#pricing">Pricing</a><a className="signin-link" href="#signin">Sign in <ArrowUpRight aria-hidden="true" /></a></div></header>
    <section id="top" className="hero" aria-labelledby="hero-title"><div className="hero-intro"><p className="eyebrow"><Sparkles aria-hidden="true" /> Hosting for apps already built by your agent</p><h1 id="hero-title">Instant hosting for every app you build with AI</h1><div className="hero-action"><CopyPromptButton /></div><Steps /></div><HeroApp activeApp={activeApp} /><div className="showcase-dots" aria-label="Choose a sample app">{showcases.map((app) => <button type="button" key={app.id} className={activeApp === app.id ? 'is-selected' : ''} onClick={() => setActiveApp(app.id)} aria-pressed={activeApp === app.id}><span className="sr-only">Show {app.name}</span></button>)}</div><p className="hero-note">Your agent builds it. Embarko hosts it.</p></section>
    <DeployScene /><LiveScene /><HostingScene /><RealAppScene /><AppGallery /><AgentScene /><WorldScene /><section className="benefit-scene"><p>Spend your time building.<br />Not hosting.</p><SceneCta>Copy the Embarko prompt</SceneCta></section><FinalScene />
    <footer className="site-footer"><Wordmark /><span>© 2026 Embarko</span><a href="#terms">Terms</a><a href="#privacy">Privacy</a></footer>
  </main>;
}
