'use client';

import { useEffect } from 'react';
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, Cloud, Copy, Database, FileUp,
  Globe2, KeyRound, ShieldCheck, Sparkles, Upload,
} from 'lucide-react';
import { siClaude, siCursor, siGithubcopilot, siGooglegemini, siReplit } from 'simple-icons';
import { trackPageView, trackCTA, trackDeployment } from '../lib/tracking';
import barcelonaMorning from './barcelona-morning.png';
import { CopyPromptButton as SharedCopyPromptButton, COPIED_LABEL } from '../components/CopyPromptButton';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';

const agents = [
  { name: 'Claude', icon: siClaude },
  { name: 'Gemini', icon: siGooglegemini },
  { name: 'Cursor', icon: siCursor },
  { name: 'Copilot', icon: siGithubcopilot },
  { name: 'Replit', icon: siReplit },
] as const;

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
    copiedChildren={<><Check aria-hidden="true" />{COPIED_LABEL}</>}
    onClicked={() => trackCTA('copy')}
  >
    <Copy aria-hidden="true" />
    Copy the deploy prompt
  </SharedCopyPromptButton>;
}

function Steps() {
  return <ol className="steps" aria-label="How it works">
    <li><span>1</span> Copy prompt</li>
    <li><span>2</span> Paste into your AI agent</li>
    <li><span>3</span> Ask it to deploy</li>
  </ol>;
}


function DeployScene() {
  return <section className="scene deploy-scene" id="how-it-works"><div className="scene-copy"><h2>Tell your agent to deploy.</h2><p>That’s the whole handoff.</p><CopyPromptButton compact /></div><div className="agent-window" aria-label="A conversation with Claude"><div className="agent-product-bar"><div className="agent-product-name"><AgentIcon icon={siClaude} label="Claude" /><strong>Claude</strong><ChevronDown aria-hidden="true" /></div><span>New chat</span><span>•••</span></div><div className="agent-chat"><p className="chat-date">Today</p><div className="agent-message user-message">The app is ready. Deploy this to Embarko.</div><div className="agent-message agent-message-reply"><span className="agent-spark"><AgentIcon icon={siClaude} label="Claude" /></span><p>I’ll deploy it now.<small>Creating your live app…</small></p></div><div className="agent-deploying"><span className="deploy-progress"><i /></span><p><strong>Deploying to Embarko</strong><small>Installing · building · making it live</small></p><span className="deploy-percent">82%</span></div></div><div className="agent-support-row"><span>Works with the agent you use</span><div>{agents.map((agent) => <span className="agent-support-icon" key={agent.name} title={agent.name}><AgentIcon icon={agent.icon} label={agent.name} /></span>)}</div></div></div></section>;
}

function LiveScene() {
  return <section className="scene live-scene" id="live"><div className="live-scene-inner"><div className="scene-copy centered"><h2>Your app is live.</h2><p>The same app. Now on the internet.</p></div><div className="browser-card"><div className="browser-bar"><span className="browser-controls"><i /><i /><i /></span><span className="browser-url"><ShieldCheck aria-hidden="true" /> weekend.embarko.app</span><span /></div><div className="browser-content"><div className="live-panel"><span className="browser-live"><i /> Live</span><h3>Barcelona<br />is ready.</h3><p>Eight bright days, held in one place.</p><button>Open itinerary <ArrowUpRight aria-hidden="true" /></button></div><img src={barcelonaMorning.src} alt="" /></div></div></div></section>;
}

function HostingScene() {
  const items = [['Domain', Globe2], ['Database', Database], ['Login', KeyRound], ['Files', FileUp], ['HTTPS', ShieldCheck], ['Backups', Cloud], ['Updates', Upload]] as const;
  return <section className="scene hosting-scene"><div className="scene-copy centered"><h2>Everything your app needs to stay online.</h2><p>You don’t have to set it up yourself.</p><SceneCta>Copy the deploy prompt</SceneCta></div><div className="hosting-orbit" aria-label="Hosting features managed by Embarko">{items.map(([label, Icon], index) => <div className={'orbit-item orbit-' + (index + 1)} key={label}><Icon aria-hidden="true" /><span>{label}</span></div>)}<div className="embarko-core"><strong>embarko</strong><small><i /> All set</small></div></div></section>;
}

function AppGallery() {
  const cards = [['Portfolio', 'Show your work.', 'portfolio-card'], ['AI tool', 'Make something useful.', 'tool-card'], ['Tracker', 'Keep it simple.', 'tracker-card'], ['Booking app', 'Let people book.', 'booking-mini-card'], ['Campus app', 'Build for your people.', 'campus-card'], ['Recipe box', 'Cook from your notes.', 'recipe-card'], ['Invoices', 'Get paid on time.', 'invoice-card'], ['Photo album', 'Share the good ones.', 'album-card'], ['Team notes', 'Keep everyone in sync.', 'notes-card']] as const;
  function Preview({ className }: { className: string }) {
    if (className === 'portfolio-card') return <><i className="portfolio-sun" /><i className="portfolio-line one" /><i className="portfolio-line two" /><i className="portfolio-image" /></>;
    if (className === 'tool-card') return <><span className="tool-title">Talk to your docs</span><i className="tool-message user" /><i className="tool-message" /><span className="tool-input">Ask anything <ArrowRight /></span></>;
    if (className === 'tracker-card') return <><span className="tracker-title">Move a little</span><span className="tracker-ring"><i /></span><span className="tracker-number">7,492</span></>;
    if (className === 'booking-mini-card') return <><span className="booking-mini-title">Bon Aperitivo</span><span className="booking-mini-date">Fri, 8:00 pm</span><span className="booking-mini-button">Reserve</span></>;
    if (className === 'campus-card') return <><span className="campus-top">north hall</span><span className="campus-event">Film club<br /><small>7:30 · Room 204</small></span><span className="campus-people"><i /><i /><i /></span></>;
    if (className === 'recipe-card') return <><span className="recipe-title">Weeknight pasta</span><i className="recipe-photo" /><span className="recipe-meta">25 min · 4 people</span></>;
    if (className === 'invoice-card') return <><span className="invoice-top">Invoice 014</span><span className="invoice-amount">£1,240</span><span className="invoice-status">Paid</span></>;
    if (className === 'album-card') return <><i className="album-tile one" /><i className="album-tile two" /><i className="album-tile three" /><i className="album-tile four" /></>;
    return <><span className="notes-title">Sprint notes</span><i className="notes-line one" /><i className="notes-line two" /><i className="notes-line three" /><span className="notes-people"><i /><i /></span></>;
  }
  return <section className="scene gallery-scene" id="examples"><div className="gallery-intro"><h2>Whatever your agent builds.</h2><p>Embarko gives it a home online.</p><SceneCta>Copy the deploy prompt</SceneCta></div><div className="gallery-rail" aria-label="Examples of apps hosted on Embarko">{cards.map(([title, description, className]) => <article className={'gallery-card ' + className} key={title}><div className="gallery-preview" aria-hidden="true"><Preview className={className} /></div><div className="gallery-card-copy"><p>{title}</p><span>{description}</span><LiveMark /></div></article>)}</div></section>;
}

function AgentScene() {
  return <section className="scene agents-scene"><div className="scene-copy centered"><h2>Use the AI agent you already use.</h2><p>Keep building the way you build.</p><CopyPromptButton compact /></div><div className="agent-connection"><div className="agent-list">{agents.map((agent) => <span key={agent.name}><AgentIcon icon={agent.icon} label={agent.name} />{agent.name}</span>)}</div><div className="connection-line"><i /><ArrowRight aria-hidden="true" /></div><div className="connection-embarko"><strong>embarko</strong><small>hosts your app</small></div><div className="connection-line out"><ArrowRight aria-hidden="true" /><i /></div><div className="tiny-live-app"><i /><p><strong>your-app.embarko.app</strong><LiveMark /></p></div></div></section>;
}

function WorldScene() {
  const apps = [['Portfolio', 'sunrise'], ['Little tools', 'mint'], ['Project board', 'paper'], ['Bookings', 'peach'], ['Study tracker', 'blue'], ['Game night', 'ink']] as const;
  return <section className="scene world-scene"><div className="world-copy"><h2>Everything you build can have a home online.</h2><p>Your agents keep creating. Embarko keeps it all live.</p><SceneCta>Bring your next app online</SceneCta></div><div className="app-world" aria-label="A calm world of applications hosted on Embarko">{apps.map(([name, color], index) => <div className={'world-app world-' + (index + 1) + ' ' + color} key={name}><div className="world-window"><i /><i /><i /></div><strong>{name}</strong><LiveMark /></div>)}</div></section>;
}

function FinalScene() {
  return <section className="final-scene" id="ready"><div><h2>Got an app ready?</h2><p>Copy the prompt. Let your agent put it online.</p><CopyPromptButton /><Steps /></div></section>;
}

export default function Home() {
  useEffect(() => {
    trackPageView();
  }, []);
  const structuredData = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Embarko', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Instant hosting for every app you build with AI.' };
  return <main className="site-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <SiteHeader />
    <section id="top" className="hero" aria-labelledby="hero-title"><div className="hero-intro"><p className="eyebrow"><Sparkles aria-hidden="true" /> Hosting for apps already built by your agent</p><h1 id="hero-title">Instant hosting for every app you build with AI</h1><div className="hero-action"><CopyPromptButton /></div><Steps /></div><p className="hero-note">Your agent builds it. Embarko hosts it.</p></section>
    <DeployScene /><LiveScene /><HostingScene /><AppGallery /><AgentScene /><WorldScene /><section className="benefit-scene"><p>Spend your time building.<br />Not hosting.</p><SceneCta>Copy the deploy prompt</SceneCta></section><FinalScene />
    <SiteFooter />
  </main>;
}
