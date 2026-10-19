/* ============================================================
   Embarko · Guides — scene library (ported from the design hand-off as an ES module)
   ------------------------------------------------------------
   The card artwork. Each scene is an inline SVG on a 640x400
   viewBox, drawn from shared product-vignette primitives so the
   whole set reads as one family.

   Why vector and not photography: these sit inside a card that
   is ~520px wide on desktop and ~340px on a phone. Vector stays
   razor sharp on every display, weighs ~2KB instead of ~200KB,
   inherits the palette from tokens.css (so a brand tweak costs
   one variable, not a re-shoot), and never looks like stock.

   Adding a scene: write a function that returns an SVG string
   and register it in SCENES. It automatically becomes available
   to every guide in data.js.
   ============================================================ */



  /* ---------- shared primitives ---------- */

  // Paper backdrop: dot grid + a soft radial lift behind the subject.
  function paper(id, accent) {
    return `
      <defs>
        <pattern id="dots-${id}" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill="var(--g-grid)"/>
        </pattern>
        <radialGradient id="glow-${id}" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stop-color="${accent}" stop-opacity=".13"/>
          <stop offset="60%" stop-color="${accent}" stop-opacity=".04"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="sheen-${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity=".9"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="640" height="400" fill="var(--surface-2)"/>
      <rect width="640" height="400" fill="url(#dots-${id})"/>
      <rect width="640" height="400" fill="url(#glow-${id})"/>`;
  }

  // Browser window chrome. The workhorse — most scenes sit inside one.
  function win(opts) {
    const o = Object.assign(
      { x: 56, y: 60, w: 528, h: 280, label: "localhost:3000", live: false, dim: false },
      opts
    );
    const { x, y, w, h } = o;
    const pillW = Math.max(150, o.label.length * 7.2 + (o.live ? 54 : 28));
    const pillX = x + (w - pillW) / 2;
    return `
      <g class="sc-win">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18"
              fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1"/>
        <path d="M${x} ${y + 18}a18 18 0 0 1 18-18h${w - 36}a18 18 0 0 1 18 18v22H${x}z"
              fill="var(--surface-2)" opacity=".55"/>
        <line x1="${x}" y1="${y + 40}" x2="${x + w}" y2="${y + 40}"
              stroke="var(--line)" stroke-width="1"/>
        ${[0, 1, 2]
          .map(
            (i) =>
              `<circle cx="${x + 20 + i * 15}" cy="${y + 20}" r="4.5"
                       fill="var(--line-control)" opacity=".5"/>`
          )
          .join("")}
        <rect x="${pillX}" y="${y + 9}" width="${pillW}" height="22" rx="11"
              fill="var(--bg)" stroke="var(--line)" stroke-width="1"/>
        ${
          o.live
            ? `<circle cx="${pillX + 15}" cy="${y + 20}" r="3.5" fill="var(--live)">
                 <animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/>
               </circle>`
            : `<path d="M${pillX + 12} ${y + 21}v-4a3.2 3.2 0 0 1 6.4 0v4"
                     fill="none" stroke="var(--ink-soft)" stroke-width="1.4"/>
               <rect x="${pillX + 10.6}" y="${y + 20}" width="9.2" height="7" rx="1.8"
                     fill="var(--ink-soft)" opacity=".75"/>`
        }
        <text x="${pillX + 26}" y="${y + 24.5}" font-family="var(--mono)" font-size="11"
              fill="var(--ink-soft)" letter-spacing="-.1">${o.label}</text>
        ${o.dim ? `<rect x="${x}" y="${y + 41}" width="${w}" height="${h - 41}" fill="var(--surface-2)" opacity=".42"/>` : ""}
      </g>`;
  }

  // Status pill — "Live", "$0", "Claimed", etc.
  function pill(x, y, text, kind, accent) {
    const w = text.length * 6.6 + (kind === "live" ? 32 : 22);
    const map = {
      live: { bg: "var(--ok-soft)", bd: "rgba(22,163,74,.3)", fg: "var(--ok-ink)" },
      accent: { bg: `${accent}1f`, bd: `${accent}4d`, fg: accent },
      plain: { bg: "var(--bg)", bd: "var(--line)", fg: "var(--ink-soft)" },
    };
    const c = map[kind] || map.plain;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${w}" height="24" rx="12"
              fill="${c.bg}" stroke="${c.bd}" stroke-width="1"/>
        ${
          kind === "live"
            ? `<circle cx="${x + 13}" cy="${y + 12}" r="3.6" fill="var(--live)">
                 <animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/>
               </circle>`
            : ""
        }
        <text x="${x + (kind === "live" ? 24 : 11)}" y="${y + 16}" font-family="var(--font)"
              font-size="11" font-weight="600" fill="${c.fg}">${text}</text>
      </g>`;
  }

  // Skeleton text line — stands in for body copy without faking words.
  function tl(x, y, w, op) {
    return `<rect x="${x}" y="${y}" width="${w}" height="7" rx="3.5"
                  fill="var(--ink)" opacity="${op || 0.12}"/>`;
  }

  // Progress bar with an animated fill.
  function progress(x, y, w, pct, accent) {
    return `
      <g>
        <rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="var(--surface-3)" opacity=".6"/>
        <rect x="${x}" y="${y}" width="${(w * pct) / 100}" height="8" rx="4" fill="${accent}">
          <animate attributeName="width" values="0;${(w * pct) / 100}"
                   dur="1.6s" begin="0s" fill="freeze" calcMode="spline"
                   keySplines=".2 .8 .2 1"/>
        </rect>
      </g>`;
  }

  // Small app vignette. The content comes from the guide's own
  // `preview` block, so no two cards show the same mock app.
  function appCard(x, y, w, accent, c) {
    const rows = (c && c.rows) || [
      ["Sagrada Família", "10:00"],
      ["Park Güell", "09:30"],
      ["La Boqueria", "12:00"],
    ];
    return `
      <g>
        <text x="${x}" y="${y + 14}" font-family="var(--serif)" font-size="22"
              fill="var(--ink)">${(c && c.title) || "Barcelona"}</text>
        <text x="${x}" y="${y + 33}" font-family="var(--font)" font-size="11"
              fill="var(--ink-soft)">${(c && c.sub) || "3 days · 12 places"}</text>
        ${rows
          .map(
            (r, i) => `
          <g transform="translate(${x}, ${y + 48 + i * 34})">
            <rect width="${w}" height="28" rx="9" fill="var(--bg)"
                  stroke="var(--line)" stroke-width="1"/>
            <circle cx="16" cy="14" r="4" fill="${accent}" opacity=".55"/>
            <text x="30" y="18" font-family="var(--font)" font-size="11"
                  fill="var(--ink)">${r[0]}</text>
            <text x="${w - 14}" y="18" text-anchor="end" font-family="var(--mono)"
                  font-size="10" fill="var(--ink-soft)">${r[1]}</text>
          </g>`
          )
          .join("")}
      </g>`;
  }

  function wrap(id, accent, body) {
    return `<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg"
                 preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
              ${paper(id, accent)}${body}
            </svg>`;
  }

  /* ---------- the scenes ---------- */

  const SCENES = {
    // 1. The app as it exists today: on your laptop, dimmed, private.
    idea: (a, id, c) =>
      wrap(
        id,
        a,
        `${win({ label: "localhost:3000", dim: true })}
         ${appCard(92, 128, 300, a, c)}
         <g transform="translate(416, 150)">
           <rect width="128" height="128" rx="16" fill="var(--bg)"
                 stroke="var(--line)" stroke-width="1" stroke-dasharray="4 4"/>
           <path d="M64 56v-9a11 11 0 0 1 22 0v9" transform="translate(-11,0)"
                 fill="none" stroke="var(--ink-soft)" stroke-width="2.4"/>
           <rect x="39" y="56" width="50" height="38" rx="8" fill="var(--ink)" opacity=".8"/>
           <circle cx="64" cy="73" r="3.6" fill="var(--surface)"/>
           <text x="64" y="112" text-anchor="middle" font-family="var(--font)"
                 font-size="10.5" font-weight="600" fill="var(--ink-soft)">Only you</text>
         </g>`
      ),

    // 2. The handoff moment: one prompt, pasted into the agent.
    chat: (a, id) =>
      wrap(
        id,
        a,
        `${win({ label: "Claude", h: 280 })}
         <g transform="translate(84, 124)">
           <text font-family="var(--mono)" font-size="9.5" letter-spacing="1.2"
                 fill="var(--ink-faint)">TODAY</text>
           <g transform="translate(118, 16)">
             <rect width="354" height="42" rx="14" fill="var(--ink)"/>
             <text x="20" y="26" font-family="var(--font)" font-size="12.5"
                   fill="var(--surface)">The app is ready. Deploy this to Embarko.</text>
           </g>
           <g transform="translate(0, 74)">
             <circle cx="13" cy="13" r="13" fill="${a}" opacity=".16"/>
             <path d="M13 6.5v13M6.5 13h13M8.4 8.4l9.2 9.2M17.6 8.4l-9.2 9.2"
                   stroke="${a}" stroke-width="1.8" stroke-linecap="round"/>
             <g transform="translate(36, 0)">
               <rect width="246" height="42" rx="14" fill="var(--bg)"
                     stroke="var(--line)" stroke-width="1"/>
               <text x="18" y="26" font-family="var(--font)" font-size="12.5"
                     fill="var(--ink)">I'll deploy it now.</text>
             </g>
           </g>
           <g transform="translate(36, 130)">
             ${progress(0, 10, 246, 64, a)}
             <text y="4" font-family="var(--mono)" font-size="10"
                   fill="var(--ink-soft)">Creating your live app…</text>
           </g>
         </g>`
      ),

    // 3. The build itself. The only "machine" scene in the set.
    deploying: (a, id) =>
      wrap(
        id,
        a,
        `<g transform="translate(96, 94)">
           <rect width="448" height="212" rx="20" fill="var(--ink)"/>
           <rect width="448" height="212" rx="20" fill="url(#sheen-${id})" opacity=".05"/>
           <g transform="translate(32, 40)">
             <text font-family="var(--font)" font-size="17" font-weight="700"
                   fill="#fdfdfb" letter-spacing="-.4">Deploying to Embarko</text>
             <text y="24" font-family="var(--mono)" font-size="11"
                   fill="#fdfdfb" opacity=".55">installing · building · making it live</text>
             <g transform="translate(0, 52)">
               <rect width="384" height="8" rx="4" fill="#fdfdfb" opacity=".14"/>
               <rect width="315" height="8" rx="4" fill="var(--live)">
                 <animate attributeName="width" values="0;315" dur="1.8s"
                          fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1"/>
               </rect>
             </g>
             <text y="84" font-family="var(--mono)" font-size="22" font-weight="700"
                   fill="#fdfdfb" letter-spacing="-1">82%</text>
             <g transform="translate(300, 62)" font-family="var(--mono)" font-size="10"
                fill="#fdfdfb" opacity=".45">
               <text y="0">✓ deps</text>
               <text y="16">✓ build</text>
               <text y="32">· boot</text>
             </g>
           </g>
         </g>`
      ),

    // 4. The payoff. Bright, open, shareable.
    live: (a, id, c) =>
      wrap(
        id,
        a,
        `${win({ label: (c && c.host) || "your-app.embarko.app", live: true })}
         ${appCard(92, 128, 296, a, c)}
         <g transform="translate(416, 128)">
           ${pill(0, 0, "Live", "live", a)}
           <text y="52" font-family="var(--mono)" font-size="10.5"
                 fill="var(--ink-soft)">HTTPS · 12ms</text>
           <g transform="translate(0, 72)">
             <rect width="128" height="60" rx="14" fill="var(--bg)"
                   stroke="var(--line)" stroke-width="1"/>
             <text x="16" y="24" font-family="var(--font)" font-size="10.5"
                   font-weight="600" fill="var(--ink-soft)">Anyone, any time</text>
             <g transform="translate(16, 34)">
               ${[0, 1, 2]
                 .map(
                   (i) =>
                     `<circle cx="${12 + i * 17}" cy="10" r="9"
                              fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1"/>`
                 )
                 .join("")}
               <circle cx="63" cy="10" r="9" fill="${a}" opacity=".18"/>
               <text x="63" y="13.5" text-anchor="middle" font-family="var(--font)"
                     font-size="8.5" font-weight="700" fill="${a}">+9</text>
             </g>
           </g>
         </g>`
      ),

    // 5. The Embarko connector handshake.
    connector: (a, id) =>
      wrap(
        id,
        a,
        `<g transform="translate(78, 136)">
           <rect width="176" height="128" rx="20" fill="var(--surface)"
                 stroke="var(--line-strong)" stroke-width="1"/>
           <g transform="translate(28, 30)">
             <circle cx="17" cy="17" r="17" fill="${a}" opacity=".14"/>
             <path d="M17 7v20M7 17h20M10.1 10.1l13.8 13.8M23.9 10.1L10.1 23.9"
                   stroke="${a}" stroke-width="2" stroke-linecap="round"/>
           </g>
           <text x="28" y="100" font-family="var(--font)" font-size="13"
                 font-weight="700" fill="var(--ink)" letter-spacing="-.3">Claude</text>
         </g>
         <g transform="translate(386, 136)">
           <rect width="176" height="128" rx="20" fill="var(--surface)"
                 stroke="var(--line-strong)" stroke-width="1"/>
           <g transform="translate(28, 30)">
             <rect width="34" height="34" rx="10" fill="var(--ink)"/>
             <path d="M10 22l6-11 6 11M13 18h7" stroke="#fdfdfb" stroke-width="1.8"
                   stroke-linecap="round" fill="none" transform="translate(1,1)"/>
           </g>
           <text x="28" y="100" font-family="var(--font)" font-size="13"
                 font-weight="700" fill="var(--ink)" letter-spacing="-.3">Embarko</text>
         </g>
         <g>
           <line x1="262" y1="200" x2="382" y2="200" stroke="var(--line-strong)"
                 stroke-width="2" stroke-dasharray="5 5">
             <animate attributeName="stroke-dashoffset" values="20;0" dur="1.2s"
                      repeatCount="indefinite"/>
           </line>
           <circle cx="322" cy="200" r="15" fill="var(--surface)"
                   stroke="var(--line-strong)" stroke-width="1"/>
           <path d="M316 200l4 4 8-8" stroke="var(--ok)" stroke-width="2.2"
                 fill="none" stroke-linecap="round" stroke-linejoin="round"/>
         </g>
         ${pill(252, 268, "Connected", "live", a)}`
      ),

    // 6. The agent working inside the editor.
    editor: (a, id) =>
      wrap(
        id,
        a,
        `${win({ label: "your-project", h: 280 })}
         <g transform="translate(57, 101)">
           <rect width="132" height="238" fill="var(--surface-2)" opacity=".5"/>
           <line x1="132" y1="0" x2="132" y2="238" stroke="var(--line)" stroke-width="1"/>
           ${["src", "app.py", "index.html", "styles.css", "data.json"]
             .map(
               (f, i) => `
             <g transform="translate(18, ${22 + i * 26})">
               <rect x="-6" y="-11" width="120" height="22" rx="6"
                     fill="${i === 1 ? "var(--surface)" : "transparent"}"/>
               <rect width="8" height="8" rx="2" y="-4"
                     fill="${i === 1 ? a : "var(--ink)"}" opacity="${i === 1 ? ".65" : ".22"}"/>
               <text x="16" y="3.5" font-family="var(--mono)" font-size="10"
                     fill="var(--ink${i === 1 ? "" : "-soft"})">${f}</text>
             </g>`
             )
             .join("")}
         </g>
         <g transform="translate(206, 120)">
           ${[210, 160, 240, 120, 190, 150]
             .map((w, i) => tl(0, i * 20, w, i % 3 === 0 ? 0.2 : 0.1))
             .join("")}
         </g>
         <g transform="translate(206, 258)">
           <rect width="334" height="62" rx="14" fill="var(--bg)"
                 stroke="${a}" stroke-width="1" stroke-opacity=".35"/>
           <circle cx="22" cy="22" r="7" fill="${a}" opacity=".2"/>
           <circle cx="22" cy="22" r="3" fill="${a}"/>
           <text x="40" y="20" font-family="var(--font)" font-size="11"
                 font-weight="600" fill="var(--ink)">Agent</text>
           <text x="40" y="38" font-family="var(--mono)" font-size="10"
                 fill="var(--ink-soft)">Deploy this to Embarko</text>
           ${progress(40, 46, 272, 72, a)}
         </g>`
      ),

    // 7. The sandbox error and its one-line fix.
    sandbox: (a, id) =>
      wrap(
        id,
        a,
        `<g transform="translate(88, 96)">
           <rect width="464" height="208" rx="18" fill="var(--ink)"/>
           <g transform="translate(26, 36)" font-family="var(--mono)" font-size="11">
             <text fill="#fdfdfb" opacity=".4">$ embarko deploy</text>
             <text y="24" fill="#fdfdfb" opacity=".4">› packaging project…</text>
             <g transform="translate(0, 48)">
               <rect x="-10" y="-13" width="424" height="26" rx="7"
                     fill="var(--danger)" opacity=".16"/>
               <text fill="#f8b4b4">✕ EACCES: sandbox blocked write</text>
             </g>
             <g transform="translate(0, 86)">
               <rect x="-10" y="-13" width="424" height="26" rx="7"
                     fill="var(--live)" opacity=".16"/>
               <text fill="#86efac">✓ allow the folder, then re-run</text>
             </g>
             <text y="124" fill="#fdfdfb" opacity=".4">› uploading · 2.1 MB</text>
           </g>
         </g>
         ${pill(88, 324, "The sandbox fix", "accent", a)}`
      ),

    // 8. A folder on the desktop — no repo, no Docker.
    folder: (a, id, c) =>
      wrap(
        id,
        a,
        `<g transform="translate(96, 128)">
           <path d="M0 18a14 14 0 0 1 14-14h42l16 18h66a14 14 0 0 1 14 14v94a14 14 0 0 1-14 14H14A14 14 0 0 1 0 130z"
                 fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1"/>
           <g transform="translate(22, 52)">
             ${["index.html", "app.js", "style.css"]
               .map(
                 (f, i) => `
               <g transform="translate(0, ${i * 24})">
                 <rect width="10" height="12" rx="2" fill="${a}" opacity=".5"/>
                 <text x="18" y="10" font-family="var(--mono)" font-size="10"
                       fill="var(--ink-soft)">${f}</text>
               </g>`
               )
               .join("")}
           </g>
         </g>
         <g transform="translate(268, 182)">
           <line x1="0" y1="14" x2="54" y2="14" stroke="var(--line-strong)" stroke-width="2"/>
           <path d="M50 8l8 6-8 6" fill="none" stroke="var(--line-strong)"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
         </g>
         <g transform="translate(348, 124)">
           <rect width="196" height="152" rx="18" fill="var(--surface)"
                 stroke="var(--line-strong)" stroke-width="1"/>
           <g transform="translate(24, 28)">
             ${pill(0, 0, "Live", "live", a)}
             <text y="54" font-family="var(--mono)" font-size="10.5"
                   fill="var(--ink-soft)">${(c && c.host) || "name.embarko.app"}</text>
             ${[0, 1, 2].map((i) => tl(0, 72 + i * 16, [136, 104, 120][i])).join("")}
           </g>
         </g>
         <g transform="translate(96, 300)">
           <text font-family="var(--mono)" font-size="10.5" fill="var(--ink-faint)"
                 text-decoration="line-through" opacity=".6">git init</text>
           <text x="72" font-family="var(--mono)" font-size="10.5" fill="var(--ink-faint)"
                 text-decoration="line-through" opacity=".6">Dockerfile</text>
           <text x="168" font-family="var(--mono)" font-size="10.5"
                 fill="var(--ink-faint)" opacity=".6">— not needed</text>
         </g>`
      ),

    // 9. Exported Replit project, zipped and on its way up.
    zip: (a, id) =>
      wrap(
        id,
        a,
        `<g transform="translate(112, 142)">
           <rect width="150" height="130" rx="16" fill="var(--surface)"
                 stroke="var(--line-strong)" stroke-width="1"/>
           <g transform="translate(60, 22)">
             <rect width="30" height="54" rx="4" fill="${a}" opacity=".16"/>
             ${[0, 1, 2, 3]
               .map(
                 (i) =>
                   `<rect x="${i % 2 ? 11 : 8}" y="${6 + i * 13}" width="11" height="7"
                          rx="1.6" fill="${a}" opacity=".6"/>`
               )
               .join("")}
           </g>
           <text x="75" y="100" text-anchor="middle" font-family="var(--mono)"
                 font-size="10.5" fill="var(--ink-soft)">project.zip</text>
           <text x="75" y="116" text-anchor="middle" font-family="var(--mono)"
                 font-size="9.5" fill="var(--ink-faint)" opacity=".7">2.1 MB</text>
         </g>
         <g transform="translate(286, 190)">
           <path d="M0 16h42" stroke="var(--line-strong)" stroke-width="2"
                 stroke-dasharray="5 4">
             <animate attributeName="stroke-dashoffset" values="18;0" dur="1.1s"
                      repeatCount="indefinite"/>
           </path>
           <path d="M36 10l8 6-8 6" fill="none" stroke="var(--line-strong)"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
         </g>
         <g transform="translate(360, 132)">
           <rect width="184" height="150" rx="18" fill="var(--ink)"/>
           <g transform="translate(24, 32)">
             <path d="M18 26V8M11 14l7-7 7 7" stroke="var(--live)" stroke-width="2.2"
                   fill="none" stroke-linecap="round" stroke-linejoin="round"/>
             <path d="M4 30h28" stroke="#fdfdfb" stroke-width="2.2" opacity=".3"
                   stroke-linecap="round"/>
             <text y="62" font-family="var(--font)" font-size="12.5" font-weight="700"
                   fill="#fdfdfb">Uploading</text>
             ${progress(0, 76, 136, 58, "var(--live)")}
             <text y="106" font-family="var(--mono)" font-size="10"
                   fill="#fdfdfb" opacity=".45">no GitHub needed</text>
           </g>
         </g>`
      ),

    // 10. A student's project wall.
    campus: (a, id, c) =>
      wrap(
        id,
        a,
        `${win({ label: (c && c.host) || "your-portfolio.embarko.app", live: true, h: 280 })}
         <g transform="translate(88, 124)">
           <text font-family="var(--serif)" font-size="24" fill="var(--ink)">Final year, live.</text>
           <g transform="translate(0, 24)">
             ${[
               ["Portfolio", 0, 0],
               ["Hackathon", 160, 0],
               ["Class demo", 0, 86],
               ["Side project", 160, 86],
             ]
               .map(
                 (c) => `
               <g transform="translate(${c[1]}, ${c[2]})">
                 <rect width="146" height="72" rx="12" fill="var(--bg)"
                       stroke="var(--line)" stroke-width="1"/>
                 <rect x="14" y="14" width="40" height="5" rx="2.5" fill="${a}" opacity=".5"/>
                 <text x="14" y="42" font-family="var(--font)" font-size="11.5"
                       font-weight="600" fill="var(--ink)">${c[0]}</text>
                 <circle cx="20" cy="56" r="3" fill="var(--live)"/>
                 <text x="30" y="59" font-family="var(--mono)" font-size="9"
                       fill="var(--ink-soft)">live</text>
               </g>`
               )
               .join("")}
           </g>
         </g>
         <g transform="translate(400, 150)">
           <rect width="144" height="132" rx="16" fill="var(--surface)"
                 stroke="${a}" stroke-width="1" stroke-opacity=".3"/>
           <text x="72" y="56" text-anchor="middle" font-family="var(--font)"
                 font-size="38" font-weight="800" fill="${a}" letter-spacing="-2">$0</text>
           <text x="72" y="80" text-anchor="middle" font-family="var(--font)"
                 font-size="11" font-weight="600" fill="var(--ink-soft)">for students</text>
           <line x1="22" y1="96" x2="122" y2="96" stroke="var(--line)" stroke-width="1"/>
           <text x="72" y="116" text-anchor="middle" font-family="var(--mono)"
                 font-size="9.5" fill="var(--ink-faint)">verify with .edu</text>
         </g>`
      ),

    // 11. The 24-hour claim window.
    claim: (a, id) =>
      wrap(
        id,
        a,
        `<g transform="translate(120, 120)">
           <rect width="400" height="164" rx="20" fill="var(--surface)"
                 stroke="var(--line-strong)" stroke-width="1"/>
           <line x1="248" y1="16" x2="248" y2="148" stroke="var(--line)"
                 stroke-width="1" stroke-dasharray="4 5"/>
           <g transform="translate(32, 44)">
             <text font-family="var(--mono)" font-size="9.5" letter-spacing="1.2"
                   fill="var(--ink-faint)">CLAIM YOUR APP</text>
             <text y="34" font-family="var(--serif)" font-size="26"
                   fill="var(--ink)">Within 24 hours</text>
             <text y="60" font-family="var(--font)" font-size="11.5"
                   fill="var(--ink-soft)">Deploy first. Make an account after.</text>
           </g>
           <g transform="translate(286, 56)">
             <circle cx="42" cy="42" r="38" fill="none" stroke="var(--line)" stroke-width="6"/>
             <circle cx="42" cy="42" r="38" fill="none" stroke="${a}" stroke-width="6"
                     stroke-linecap="round" stroke-dasharray="239"
                     stroke-dashoffset="72" transform="rotate(-90 42 42)">
               <animate attributeName="stroke-dashoffset" values="239;72" dur="1.8s"
                        fill="freeze" calcMode="spline" keySplines=".2 .8 .2 1"/>
             </circle>
             <text x="42" y="40" text-anchor="middle" font-family="var(--font)"
                   font-size="22" font-weight="800" fill="var(--ink)"
                   letter-spacing="-1">24</text>
             <text x="42" y="56" text-anchor="middle" font-family="var(--mono)"
                   font-size="9" fill="var(--ink-soft)">hours</text>
           </g>
         </g>`
      ),
  };

  /* ---------- public API ---------- */

  let uid = 0;
  function render(sceneId, accentVar, ctx) {
    const fn = SCENES[sceneId] || SCENES.live;
    return fn(accentVar, "s" + uid++, ctx);
  }

/** Scene ids every guide may use in its `scenes` list. */
export const SCENE_IDS = Object.keys(SCENES);

export { render as renderScene };
