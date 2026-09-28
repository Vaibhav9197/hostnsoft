import "./showcase.css";

/* Scopes showcase.css to these routes. The serif accent font and the design
   tokens are site-wide (app/layout.tsx, app/design.css). No metadata here:
   each page sets its own (docs/SEO.md). */
export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  return <div className="sc">{children}</div>;
}
