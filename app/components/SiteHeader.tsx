"use client";

import { useState } from "react";

import { Header } from "./Header";
import { LoginModal } from "./LoginModal";

/**
 * The shared site header plus its login modal, bundled into one client
 * component so a server-component page (app/v1) can render it — Header takes an
 * onAuthClick callback, and a function cannot cross the server/client boundary.
 *
 * Mirrors how v3 wires these two together: the page owns the modal instance and
 * hands the trigger to the header. Shared by the landing-page variants.
 */
export function SiteHeader() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <Header onAuthClick={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
