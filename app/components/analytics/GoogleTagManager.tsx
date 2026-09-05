import Script from "next/script";

import { GTM_ID } from "@/app/lib/gtm";

/**
 * The GTM container snippet.
 *
 * The inline script does three things in one pass, in this order, because the
 * order is what makes it correct:
 *
 *   1. creates `dataLayer`
 *   2. seeds the A/B bucket onto it
 *   3. loads gtm.js
 *
 * Seeding before step 3 is the point. middleware.ts rewrites `/` to one of
 * four landing variants and records the bucket in the `lp_variant` cookie; the
 * `x-lp-variant` response header it also sets is NOT readable from client JS
 * on a document navigation, so the cookie is the only usable source. If the
 * variant were pushed from a React effect instead, it would land after gtm.js
 * had already fired the first pageview, and the four variants would be
 * indistinguishable in reporting — which defeats the experiment.
 *
 * Renders nothing when NEXT_PUBLIC_GTM_ID is unset, so dev and preview builds
 * don't pollute the container.
 */
export function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){
w[l]=w[l]||[];
var m=d.cookie.match(/(?:^|;\\s*)lp_variant=([^;]*)/);
w[l].push({lp_variant:m?decodeURIComponent(m[1]):null});
w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
    </>
  );
}

/** The <noscript> half of the snippet. Must be the first thing in <body>. */
export function GoogleTagManagerNoScript() {
  if (!GTM_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
