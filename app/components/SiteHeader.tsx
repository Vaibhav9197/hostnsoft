"use client";

import { useState } from "react";

import { Header, type HeaderLink } from "./Header";
import { LoginModal } from "./LoginModal";

/**
 * The shared site header plus its login modal, bundled into one client
 * component so a server-component page (app/v1) can render it — Header takes an
 * onAuthClick callback, and a function cannot cross the server/client boundary.
 *
 * The page owns the modal instance and hands the trigger to the header. Shared
 * by the landing-page variants.
 *
 * `links` is forwarded straight through for pages that want in-page section
 * anchors in the header's centre slot.
 */
export function SiteHeader({ links }: { links?: readonly HeaderLink[] }) {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <Header onAuthClick={() => setLoginOpen(true)} links={links} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
