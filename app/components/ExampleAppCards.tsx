import { ArrowRight } from 'lucide-react';

import './example-apps.css';
import { Card, cx } from '@/app/components/ds';

/* The example apps, each with a small drawn preview. Decoration: none of them
   is a real listing, so nothing here claims to be. Used by /v4 and /v1. */
const CARDS = [
  ['Portfolio', 'Show your work.', 'portfolio-card'],
  ['AI tool', 'Make something useful.', 'tool-card'],
  ['Tracker', 'Keep it simple.', 'tracker-card'],
  ['Booking app', 'Let people book.', 'booking-mini-card'],
  ['Campus app', 'Build for your people.', 'campus-card'],
  ['Recipe box', 'Cook from your notes.', 'recipe-card'],
  ['Invoices', 'Get paid on time.', 'invoice-card'],
  ['Photo album', 'Share the good ones.', 'album-card'],
  ['Team notes', 'Keep everyone in sync.', 'notes-card'],
] as const;

function Preview({ kind }: { kind: string }) {
  if (kind === 'portfolio-card') return <><i className="portfolio-sun" /><i className="portfolio-line one" /><i className="portfolio-line two" /><i className="portfolio-image" /></>;
  if (kind === 'tool-card') return <><span className="tool-title">Talk to your docs</span><i className="tool-message user" /><i className="tool-message" /><span className="tool-input">Ask anything <ArrowRight /></span></>;
  if (kind === 'tracker-card') return <><span className="tracker-title">Move a little</span><span className="tracker-ring"><i /></span><span className="tracker-number">7,492</span></>;
  if (kind === 'booking-mini-card') return <><span className="booking-mini-title">Bon Aperitivo</span><span className="booking-mini-date">Fri, 8:00 pm</span><span className="booking-mini-button">Reserve</span></>;
  if (kind === 'campus-card') return <><span className="campus-top">north hall</span><span className="campus-event">Film club<br /><small>7:30 · Room 204</small></span><span className="campus-people"><i /><i /><i /></span></>;
  if (kind === 'recipe-card') return <><span className="recipe-title">Weeknight pasta</span><i className="recipe-photo" /><span className="recipe-meta">25 min · 4 people</span></>;
  if (kind === 'invoice-card') return <><span className="invoice-top">Invoice 014</span><span className="invoice-amount">£1,240</span><span className="invoice-status">Paid</span></>;
  if (kind === 'album-card') return <><i className="album-tile one" /><i className="album-tile two" /><i className="album-tile three" /><i className="album-tile four" /></>;
  return <><span className="notes-title">Sprint notes</span><i className="notes-line one" /><i className="notes-line two" /><i className="notes-line three" /><span className="notes-people"><i /><i /></span></>;
}

export function ExampleAppCards({ className }: { className?: string }) {
  return (
    <div className={cx('ex-apps', className)} aria-label="Examples of apps hosted on Embarko">
      {CARDS.map(([title, description, kind]) => (
        <Card as="article" className={`v4-gcard ${kind}`} key={title}>
          <div className="v4-gpreview" aria-hidden="true"><Preview kind={kind} /></div>
          <h3>{title}</h3>
          <p>{description}</p>
          <span className="v4-live"><i /> Live on Embarko</span>
        </Card>
      ))}
    </div>
  );
}
