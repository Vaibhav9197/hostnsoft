"use client";

import { useState } from "react";

import { Header } from "../components/Header";
import { LoginModal } from "../components/LoginModal";

/**
 * The shared site header plus its login modal, bundled into one client
 * component so app/v1/page.tsx can stay a server component — Header takes an
 * onAuthClick callback, and a function cannot cross the server/client boundary.
 *
 * Mirrors how v3 wires these two together: the page owns the modal instance and
 * hands the trigger to the header.
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
