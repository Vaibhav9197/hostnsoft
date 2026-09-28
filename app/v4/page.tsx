'use client';

import { useEffect } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, ShieldCheck, Sparkles } from 'lucide-react';
import { siClaude, siCursor, siGithubcopilot, siGooglegemini, siReplit } from 'simple-icons';
import { trackPageView, trackCTA } from '../lib/tracking';
import barcelonaMorning from './barcelona-morning.png';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { FeatureShowcase } from '../components/FeatureShowcase';
import { InfrastructureTrust, WhyEmbarko } from '../components/WhyEmbarko';
import { Card, CtaSection, GlowBackdrop, Hero, PrimaryCta, Section, SectionHeading, Serif } from '@/app/components/ds';

const agents = [
  { name: 'Claude', icon: siClaude },
  { name: 'Gemini', icon: siGooglegemini },
  { name: 'Cursor', icon: siCursor },
  { name: 'Copilot', icon: siGithubcopilot },
  { name: 'Replit', icon: siReplit },
] as const;

function LiveMark() {
  return <span className="v4-live"><i /> Live on Embarko</span>;
}

function AgentIcon({ icon, label }: { icon: { path: string; hex: string }; label: string }) {
  return <svg className="v4-agent-icon" viewBox="0 0 24 24" role="img" aria-label={label}><path fill={'#' + icon.hex} d={icon.path} /></svg>;
}

/* Every section's one primary action. Same tracking as before. */
function Cta({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return <PrimaryCta size={size} onClicked={() => trackCTA('copy')} />;
}

function DeployScene() {
  return <Section id="how-it-works" labelledBy="v4-deploy-h" className="v4-scroll">
    <div className="v4-split">
      <div className="v4-copy">
        <SectionHeading id="v4-deploy-h" kicker="01 — Deploy" title={<>Tell your agent to <Serif>deploy</Serif>.</>} sub="That’s the whole handoff." />
        <Cta />
      </div>
      <Card className="v4-agent" >
        <div className="v4-agent-bar" aria-hidden="true"><div className="v4-agent-name"><AgentIcon icon={siClaude} label="Claude" /><strong>Claude</strong><ChevronDown /></div><span>New chat</span></div>
        <div className="v4-chat" aria-label="A conversation with Claude">
          <p className="v4-chat-date">Today</p>
          <div className="v4-msg v4-msg-user">The app is ready. Deploy this to Embarko.</div>
          <div className="v4-msg v4-msg-reply"><span className="v4-spark"><AgentIcon icon={siClaude} label="Claude" /></span><p>I’ll deploy it now.<small>Creating your live app…</small></p></div>
          <div className="v4-deploying"><span className="v4-progress"><i /></span><p><strong>Deploying to Embarko</strong><small>Installing · building · making it live</small></p><span className="v4-percent">82%</span></div>
        </div>
        <div className="v4-support"><span>Works with the agent you use</span><div>{agents.map((a) => <span className="v4-support-icon" key={a.name} title={a.name}><AgentIcon icon={a.icon} label={a.name} /></span>)}</div></div>
      </Card>
    </div>
  </Section>;
}

function LiveScene() {
  return <Section id="live" labelledBy="v4-live-h" className="v4-scroll">
    <GlowBackdrop position="full" />
    <SectionHeading center id="v4-live-h" kicker="02 — Live" title={<>Your app is <Serif grad>live</Serif>.</>} sub="The same app. Now on the internet." />
    <div className="v4-center"><Cta /></div>
    <div className="v4-browser" aria-hidden="true">
      <div className="v4-browser-bar"><span className="v4-dots"><i /><i /><i /></span><span className="v4-url"><ShieldCheck /> weekend.embarko.app</span><span /></div>
      <div className="v4-browser-body">
        <div className="v4-live-panel"><span className="v4-live"><i /> Live</span><h3>Barcelona<br />is ready.</h3><p>Eight bright days, held in one place.</p><span className="v4-fake-btn">Open itinerary <ArrowUpRight /></span></div>
        <img src={barcelonaMorning.src} alt="" />
      </div>
    </div>
  </Section>;
}

/* The shared showcase picks one feature at a time and prints the sentence you
   would say to your agent to get it. */
function HostingScene() {
  return <Section className="v4-shared">
    <FeatureShowcase tone="token" className="mx-auto" />
    <div className="v4-center v4-after"><Cta /></div>
  </Section>;
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
  return <Section id="examples" labelledBy="v4-gallery-h" className="v4-scroll">
    <SectionHeading id="v4-gallery-h" kicker="03 — Examples" title={<>Whatever your agent <Serif>builds</Serif>.</>} sub="Embarko gives it a home online." action={<Cta />} />
    <div className="v4-gallery" aria-label="Examples of apps hosted on Embarko">{cards.map(([title, description, className]) => <Card as="article" className={'v4-gcard ' + className} key={title}><div className="v4-gpreview" aria-hidden="true"><Preview className={className} /></div><h3>{title}</h3><p>{description}</p><LiveMark /></Card>)}</div>
    <div className="v4-center v4-after v4-mobile-cta"><Cta /></div>
  </Section>;
}

function AgentScene() {
  return <Section labelledBy="v4-agents-h">
    <SectionHeading center id="v4-agents-h" kicker="04 — Agents" title={<>Use the AI agent you <Serif>already</Serif> use.</>} sub="Keep building the way you build." />
    <div className="v4-center"><Cta /></div>
    <div className="v4-flow" aria-hidden="true">
      <div className="v4-flow-agents">{agents.map((a) => <span key={a.name}><AgentIcon icon={a.icon} label={a.name} />{a.name}</span>)}</div>
      <ArrowRight className="v4-flow-arrow" />
      <Card className="v4-flow-embarko"><strong>embarko</strong><small>hosts your app</small></Card>
      <ArrowRight className="v4-flow-arrow" />
      <Card className="v4-flow-app"><strong>your-app.embarko.app</strong><LiveMark /></Card>
    </div>
  </Section>;
}

function WorldScene() {
  const apps = [['Portfolio', 'sunrise'], ['Little tools', 'mint'], ['Project board', 'paper'], ['Bookings', 'peach'], ['Study tracker', 'blue'], ['Game night', 'ink']] as const;
  return <Section labelledBy="v4-world-h">
    <GlowBackdrop position="bottom" />
    <SectionHeading center id="v4-world-h" kicker="05 — Your world" title={<>Everything you build can have a <Serif>home</Serif> online.</>} sub="Your agents keep creating. Embarko keeps it all live." />
    <div className="v4-center"><Cta /></div>
    <div className="v4-world" aria-label="A calm world of applications hosted on Embarko">{apps.map(([name, color], i) => <div className={'v4-world-app w' + (i + 1) + ' ' + color} key={name}><div className="v4-world-top" aria-hidden="true"><i /><i /><i /></div><strong>{name}</strong><LiveMark /></div>)}</div>
  </Section>;
}

export default function Home() {
  useEffect(() => {
    trackPageView();
  }, []);
  return <main className="min-h-[100dvh] bg-background pt-16 text-foreground antialiased v4-page">
    <SiteHeader />
    <div className="ds-wrap" id="top">
      <Hero
        eyebrow={<><Sparkles aria-hidden="true" /> Hosting for apps already built by your agent</>}
        title={<>Instant hosting for every app you build with <Serif grad>AI</Serif></>}
        sub="Your agent builds it. Embarko hosts it."
        actions={<Cta size="lg" />}
        steps
      />
    </div>
    <DeployScene />
    <LiveScene />
    <HostingScene />
    <div className="ds-section v4-shared"><WhyEmbarko tone="token" className="bg-transparent py-0" cta={<Cta />} /></div>
    <AppGallery />
    <AgentScene />
    <WorldScene />
    <div className="ds-section v4-shared"><InfrastructureTrust tone="token" className="bg-transparent py-0" cta={<Cta />} /></div>
    <Section labelledBy="v4-benefit-h">
      <Card className="v4-benefit">
        <h2 id="v4-benefit-h">Spend your time <Serif>building</Serif>.<br />Not hosting.</h2>
        <Cta />
      </Card>
    </Section>
    <div className="ds-wrap">
      <CtaSection id="ready" pill={<><Sparkles aria-hidden="true" /> Your turn</>} title={<>Got an app <Serif>ready</Serif>?</>} line="Copy the prompt. Let your agent put it online." action={<Cta size="lg" />} />
    </div>
    <SiteFooter />
  </main>;
}
