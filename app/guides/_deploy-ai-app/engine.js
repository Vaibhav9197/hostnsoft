/* ==========================================================================
   Embarko · Guide article: interaction layer
   Progressive enhancement only. The article is complete and readable
/* eslint-disable */
export function initDeployGuide(host) {
  'use strict';
  window.__embarkoBlog = true;
  /* Every window and document listener goes through one AbortController, so
     leaving the page (client-side navigation) removes them all. */
  const ac = new AbortController();
  const sig = o => (o && typeof o === 'object' ? { ...o, signal: ac.signal } : { capture: !!o, signal: ac.signal });
  const addEventListener = (t, f, o) => window.addEventListener(t, f, sig(o));
  const docOn = (t, f, o) => document.addEventListener(t, f, sig(o));

  const root = host;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  motionQuery.addEventListener?.('change', e => { reduced = e.matches; requestTick(); });

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: fine */ } },
  };

  /* The reader's app. The whole article is about moving it from here to there. */
  const state = { appName: 'your-app-name', steps: [false, false, false], finale: false, live: false };

  const measurers = [];
  const measureAll = () => measurers.forEach(fn => fn());

  /* Shared elements, declared early because several modules update them. */
  const journey = $('#journey');
  const addrEl = $('[data-journey-addr]');
  const ticketStatus = $('[data-ticket-status]');
  const ticketCta = $('.ticket__cta');
  const ticketCtaDefault = ticketCta?.innerHTML;
  const arrivalBadge = $('[data-arrival-badge]');
  const arrivalNote = $('[data-arrival-note]');
  const omni = $('[data-omni]');
  const finaleSection = $('#ready');
  let lastMood = '';
  let checkFinale = () => {};

  /* ------------------------------------------------------------------------
     Scroll engine: elements with [data-scrub] get --p (0 → 1) while they
     cross the viewport, and an optional callback for richer choreography.
     ------------------------------------------------------------------------ */
  const scrubbers = new Map();
  const active = new Set();
  const scrubIO = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting ? active.add(e.target) : active.delete(e.target)));
    requestTick();
  }, { rootMargin: '30% 0px 30% 0px' });

  function onScrub(el, fn) {
    if (!el) return;
    scrubbers.set(el, fn || null);
    scrubIO.observe(el);
  }
  $$('[data-scrub]').forEach(el => { if (!scrubbers.has(el)) onScrub(el, null); });

  /* Decorative scrubs settle on their final frame for reduced-motion readers. */
  const liveWhenReduced = el => el.hasAttribute('data-evening');

  let ticking = false;
  function requestTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }
  function frame() {
    ticking = false;
    const vh = innerHeight;
    const reads = [];
    active.forEach(el => {
      const r = el.getBoundingClientRect();
      const start = vh * parseFloat(el.dataset.scrubStart ?? 1);
      const end = vh * parseFloat(el.dataset.scrubEnd ?? 0);
      let p = clamp((start - r.top) / (r.height + start - end || 1));
      if (reduced && !liveWhenReduced(el)) p = 1;
      reads.push([el, p]);
    });
    reads.forEach(([el, p]) => {
      if (el._p === p) return;
      el._p = p;
      el.style.setProperty('--p', p.toFixed(4));
      const fn = scrubbers.get(el);
      if (fn) fn(p);
    });
    updateJourney(vh);
    checkFinale(vh);
  }
  addEventListener('scroll', requestTick, { passive: true });
  addEventListener('resize', () => { measureAll(); requestTick(); });

  /* ------------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------------ */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  $$('.rv, .chapter > h2, .chapter > .eyebrow, .compare tbody tr').forEach(el => revealIO.observe(el));

  /* ------------------------------------------------------------------------
     Theme: follows the system, remembers an explicit choice, and spreads
     from the button with a view transition where supported.
     ------------------------------------------------------------------------ */
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => root.getAttribute('data-theme') || (darkQuery.matches ? 'dark' : 'light');
  function syncThemeLabels() {
    const label = currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    $$('[data-theme-toggle]').forEach(b => b.setAttribute('aria-label', label));
  }
  function toggleTheme(e) {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.setAttribute('data-theme', next);
      store.set('embarko-theme', next);
      syncThemeLabels();
    };
    if (!document.startViewTransition || reduced) return apply();
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', toggleTheme));
  darkQuery.addEventListener?.('change', syncThemeLabels);
  syncThemeLabels();

  /* ------------------------------------------------------------------------
     Toast, clipboard, share
     ------------------------------------------------------------------------ */
  const toastEl = $('.toast');
  const toastText = $('[data-toast-text]', toastEl);
  const toastIcon = $('use', toastEl);
  let toastTimer;
  function toast(msg, ok = true) {
    toastText.textContent = msg;
    toastEl.classList.toggle('is-error', !ok);
    toastIcon?.setAttribute('href', ok ? '#i-check' : '#i-x');
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function flashCopied(btn, label) {
    const labelEl = $('[data-copy-label]', btn);
    const use = $('use', btn);
    if (!btn.dataset.label) btn.dataset.label = labelEl.textContent;
    if (use && !btn.dataset.icon) btn.dataset.icon = use.getAttribute('href');
    btn.classList.add('is-copied');
    labelEl.textContent = label;
    use?.setAttribute('href', '#i-check');
    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(() => {
      btn.classList.remove('is-copied');
      labelEl.textContent = btn.dataset.label;
      if (use) use.setAttribute('href', btn.dataset.icon);
    }, 2400);
  }

  const promptText = () => ($('#deploy-prompt')?.textContent || '').trim();

  $$('[data-copy-prompt]').forEach(btn => btn.addEventListener('click', async () => {
    if (!(await copyText(promptText()))) {
      toast('Couldn’t copy. Select the prompt in step 1 and copy it instead.', false);
      return;
    }
    flashCopied(btn, btn.classList.contains('btn--sm') ? 'Copied' : 'Copied — paste it into your agent');
    toast('Prompt copied. Paste it into your AI tool.');
    setStep(0, true);
  }));

  $$('[data-copy-text]').forEach(btn => btn.addEventListener('click', async () => {
    const src = document.getElementById(btn.dataset.copyText);
    if (!src || !(await copyText(src.textContent.trim()))) {
      toast('Couldn’t copy that. Select it and copy instead.', false);
      return;
    }
    flashCopied(btn, 'Copied');
    toast('Copied. Paste it into your AI tool.');
    if (btn.dataset.completes) setStep(Number(btn.dataset.completes), true);
  }));

  const shareUrl = () => $('link[rel="canonical"]')?.href || location.href.split('#')[0];
  $$('[data-share]').forEach(btn => btn.addEventListener('click', async () => {
    const data = { title: 'How to Deploy an AI App: From Idea to Live Link', text: 'Built an app with AI? Here’s how to put it online with one prompt.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to someone whose AI just built an app.' : data.url, ok);
  }));

  /* ------------------------------------------------------------------------
     Name your app: every "your-app-name" in the article follows along.
     Mirrors Embarko's naming rule (lowercase letters, numbers and dashes).
     ------------------------------------------------------------------------ */
  const slugify = v => v.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');

  function setAppName(raw, persist = true) {
    const slug = slugify(raw) || 'your-app-name';
    state.appName = slug;
    $$('[data-app-name]').forEach(el => { if (el.textContent !== slug) el.textContent = slug; });
    if (finaleSection?.classList.contains('is-arrived') && omni) omni.textContent = `${slug}.embarko.app`;
    updateJourneyAddr(false);
    if (persist) store.set('embarko-app-name', slug === 'your-app-name' ? '' : slug);
  }

  const appInput = $('[data-app-input]');
  if (appInput) {
    const fit = () => { appInput.size = Math.max(3, appInput.value.length || 13); };
    appInput.addEventListener('input', () => {
      const pos = appInput.selectionStart;
      const cleaned = appInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').slice(0, 40);
      if (cleaned !== appInput.value) {
        appInput.value = cleaned;
        try { appInput.setSelectionRange(pos, pos); } catch { /* not focusable */ }
      }
      fit();
      setAppName(appInput.value);
    });
    appInput.addEventListener('focus', () => { if (appInput.value === 'your-app-name') appInput.select(); });
    appInput.addEventListener('blur', () => {
      appInput.value = slugify(appInput.value) || 'your-app-name';
      fit();
      setAppName(appInput.value);
    });
    appInput.addEventListener('keydown', e => { if (e.key === 'Enter') appInput.blur(); });
    const saved = store.get('embarko-app-name');
    if (saved) {
      appInput.value = saved;
      setAppName(saved, false);
    }
    fit();
  }

  /* ------------------------------------------------------------------------
     Intro statement: words ink in as you read, then the key ideas get marked.
     ------------------------------------------------------------------------ */
  const answer = $('[data-ink]');
  if (answer) {
    const words = [];
    const split = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            frag.appendChild(w);
            words.push(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          split(n);
        }
      });
    };
    split(answer);
    let lastLit = -1;
    onScrub(answer, p => {
      const lit = Math.round(clamp(p * 1.12) * words.length);
      if (lit === lastLit) return;
      lastLit = lit;
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
      answer.classList.toggle('is-marked', lit >= words.length);
    });
  }

  /* ------------------------------------------------------------------------
     Route segments: the line between chapters fills as you travel it.
     ------------------------------------------------------------------------ */
  $$('.route-seg').forEach(seg => onScrub(seg, p => seg.parentElement.classList.toggle('is-reached', p > .97)));

  /* ------------------------------------------------------------------------
     01 · Four stages. The rider sails through 1 and 2, then stalls at 3.
     It only reaches "Share it" once the reader's app is live.
     ------------------------------------------------------------------------ */
  const stages = $('.stages');
  if (stages) {
    const nums = $$('.stage__num', stages);
    const stageEls = $$('.stage', stages);
    let pts = [];
    let stalled = false;
    let vertical = false;

    const render = () => {
      if (pts.length !== 4) return;
      const p = stages._p ?? 0;
      const pos = state.live ? 3 : 2 * easeOut(clamp(p / .78));
      const i = Math.min(Math.floor(pos), 2);
      const t = pos - i;
      const a = pts[i];
      const b = pts[Math.min(i + 1, 3)];
      const x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t);
      stages.style.setProperty('--rx', `${x}px`);
      stages.style.setProperty('--ry', `${y}px`);
      stages.style.setProperty('--fill', `${Math.max(0, vertical ? y - pts[0].y : x - pts[0].x)}px`);
      stageEls.forEach((s, k) => s.classList.toggle('is-passed', pos >= k - .001 && (k !== 2 || state.live)));
      const atStall = !state.live && pos >= 1.97;
      stageEls[2].classList.toggle('is-current', atStall);
      if (atStall && !stalled) { stalled = true; stages.classList.add('is-stalled'); }
      if (!atStall && stalled && pos < 1.8) { stalled = false; stages.classList.remove('is-stalled'); }
    };

    const measure = () => {
      const fr = stages.getBoundingClientRect();
      pts = nums.map(n => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - fr.left, y: r.top + r.height / 2 - fr.top };
      });
      vertical = Math.abs(pts[1].y - pts[0].y) > 10;
      stages.classList.toggle('is-vertical', vertical);
      pts.forEach((pt, k) => {
        stages.style.setProperty(`--n${k + 1}x`, `${pt.x}px`);
        stages.style.setProperty(`--n${k + 1}y`, `${pt.y}px`);
      });
      stages.classList.add('is-measured');
      render();
    };
    measurers.push(measure);
    onScrub(stages, render);
    stages._render = render;
  }

  /* ------------------------------------------------------------------------
     02 · Send a link to a friend. localhost goes nowhere; the live link works.
     ------------------------------------------------------------------------ */
  const demo = $('[data-demo]');
  if (demo) {
    const stageEl = $('.demo__stage', demo);
    const phone = $('.phone', demo);
    const flight = $('[data-flight]', demo);
    const caption = $('[data-demo-caption]', demo);
    const bubble = $('.phone__bubble', demo);
    const bubbleLink = $('[data-phone-link]', demo);
    const fromAddr = $('.demo__device--laptop .addr', demo);
    const buttons = $$('[data-send]', demo);
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, reduced ? 0 : ms));

    const urlOf = kind => (kind === 'live' ? `${state.appName}.embarko.app` : 'localhost:3000');
    const defaultCaption = caption.textContent;
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* The link has reached the phone: it shows up in the chat, gets tapped, opens (or doesn't). */
    const deliver = kind => {
      phone.dataset.phone = 'chat';
      bubbleLink.textContent = urlOf(kind);
      caption.textContent = 'Your friend taps the link…';
      later(() => { bubble.classList.add('is-tapped'); }, 600);
      later(() => {
        bubble.classList.remove('is-tapped');
        if (kind === 'live') {
          phone.dataset.phone = 'live';
          caption.textContent = 'It opens. The link points at a server that stays on, so it works on any device, any time.';
        } else {
          phone.dataset.phone = 'error';
          caption.textContent = 'Nothing. Their phone looks for the app on itself, and your app isn’t on it.';
        }
      }, 1050);
    };

    /* Tap a link: it flies from the laptop's address bar to the phone. */
    const send = kind => {
      clearTimers();
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.send === kind)));
      const url = urlOf(kind);

      const sr = stageEl.getBoundingClientRect();
      const fr = fromAddr.getBoundingClientRect();
      const pr = phone.getBoundingClientRect();
      flight.textContent = url;
      flight.classList.toggle('is-live', kind === 'live');
      const x0 = fr.left - sr.left + 12;
      const y0 = fr.top - sr.top - 4;
      flight.style.left = `${x0}px`;
      flight.style.top = `${y0}px`;
      flight.style.setProperty('--fx', `${pr.left - sr.left + 18 - x0}px`);
      flight.style.setProperty('--fy', `${pr.top - sr.top + pr.height * .55 - y0}px`);
      flight.classList.remove('is-flying');
      void flight.offsetWidth;
      if (!reduced) flight.classList.add('is-flying');

      phone.dataset.phone = 'idle';
      bubbleLink.textContent = url;
      caption.textContent = 'Sending…';
      later(() => deliver(kind), 900);
    };

    /* Drag a link onto the phone. The ghost lives inside the figure, so it scrolls with it. */
    const ghost = document.createElement('span');
    ghost.className = 'demo__ghost mono';
    ghost.setAttribute('aria-hidden', 'true');
    const cursor = document.createElement('span');
    cursor.className = 'demo__cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4.5 2.5 19 11.2l-6.6 1.5L9 19.3Z"/></svg>';
    demo.append(ghost, cursor);

    const toLocal = (x, y) => { const r = demo.getBoundingClientRect(); return [x - r.left, y - r.top]; };
    const centerOf = el => { const r = el.getBoundingClientRect(); return toLocal(r.left + r.width / 2, r.top + r.height / 2); };
    const put = (el, x, y) => { el.style.left = `${x}px`; el.style.top = `${y}px`; };
    const overPhone = (x, y) => {
      const r = phone.getBoundingClientRect();
      return x > r.left - 28 && x < r.right + 28 && y > r.top - 28 && y < r.bottom + 28;
    };

    const pickUp = btn => {
      clearTimers();
      flight.classList.remove('is-flying');
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      ghost.textContent = urlOf(btn.dataset.send);
      ghost.classList.toggle('is-live', btn.dataset.send === 'live');
      ghost.classList.remove('is-dropping');
      ghost.classList.add('is-on');
      btn.classList.add('is-lifted');
      phone.dataset.phone = 'idle';
      phone.classList.add('is-target');
      caption.textContent = 'Drop it on your friend’s phone.';
    };
    const letGo = btn => {
      btn.classList.remove('is-lifted');
      phone.classList.remove('is-target', 'is-over');
    };
    const dropOnPhone = btn => {
      letGo(btn);
      ghost.classList.add('is-dropping');
      later(() => ghost.classList.remove('is-on', 'is-dropping'), 300);
      deliver(btn.dataset.send);
    };
    const putBack = btn => {
      letGo(btn);
      ghost.classList.remove('is-on');
      buttons.forEach(b => b.setAttribute('aria-pressed', 'false'));
      caption.textContent = defaultCaption;
    };

    /* It plays itself once: localhost first (nothing), then the live link (it opens). */
    let autoId = 0;
    const tween = (ms, fn, alive) => new Promise(done => {
      const t0 = performance.now();
      const step = now => {
        if (!alive()) return done();
        const k = clamp((now - t0) / ms);
        fn(easeInOut(k));
        if (k < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    const arc = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;
    const stopAuto = () => {
      autoId++;
      cursor.classList.remove('is-on', 'is-pressing');
      ghost.classList.remove('is-on');
      buttons.forEach(b => b.classList.remove('is-lifted'));
      phone.classList.remove('is-target', 'is-over');
    };
    async function autoplay() {
      stopAuto();
      const my = autoId;
      const alive = () => my === autoId;
      demo.classList.remove('is-played');
      phone.dataset.phone = 'idle';
      caption.textContent = defaultCaption;
      let [x, y] = centerOf(buttons[0]);
      x -= 40; y += 70;
      put(cursor, x, y);
      cursor.classList.add('is-on');
      for (const btn of buttons) {
        const [bx, by] = centerOf(btn);
        const [fx, fy] = [x, y];
        await tween(700, k => put(cursor, lerp(fx, bx, k), lerp(fy, by, k)), alive);
        if (!alive()) return;
        cursor.classList.add('is-pressing');
        put(ghost, bx, by);
        pickUp(btn);
        await wait(260);
        if (!alive()) return;
        const [px, py] = centerOf(phone);
        const cx = (bx + px) / 2;
        const cy = Math.min(by, py) - 60;
        await tween(1200, k => {
          const ax = arc(bx, cx, px, k);
          const ay = arc(by, cy, py, k);
          put(cursor, ax, ay);
          put(ghost, ax, ay);
          phone.classList.toggle('is-over', k > .78);
        }, alive);
        if (!alive()) return;
        cursor.classList.remove('is-pressing');
        dropOnPhone(btn);
        [x, y] = [px + 30, py + 40];
        await wait(btn.dataset.send === 'local' ? 3000 : 1400);
        if (!alive()) return;
      }
      cursor.classList.remove('is-on');
      demo.classList.add('is-played');
    }

    let drag = null;
    buttons.forEach(btn => {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        stopAuto();
        demo.classList.add('is-played');
        drag = { btn, x0: e.clientX, y0: e.clientY, moved: false };
        btn.setPointerCapture?.(e.pointerId);
      });
      btn.addEventListener('pointermove', e => {
        if (!drag || drag.btn !== btn) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        if (!drag.moved) { drag.moved = true; pickUp(btn); }
        put(ghost, ...toLocal(e.clientX, e.clientY));
        phone.classList.toggle('is-over', overPhone(e.clientX, e.clientY));
      });
      const end = e => {
        if (!drag || drag.btn !== btn) return;
        const d = drag;
        drag = null;
        if (!d.moved) return;
        btn._dragged = true;
        setTimeout(() => { btn._dragged = false; }, 0);
        if (e.type === 'pointerup' && overPhone(e.clientX, e.clientY)) dropOnPhone(btn); else putBack(btn);
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('click', () => {
        if (btn._dragged) return;
        stopAuto();
        demo.classList.add('is-played');
        send(btn.dataset.send);
      });
    });

    $('[data-demo-replay]', demo)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (!entries.some(en => en.isIntersecting)) return;
        io.disconnect();
        if (reduced || demo.classList.contains('is-played')) { demo.classList.add('is-played'); return; }
        setTimeout(() => { if (!demo.classList.contains('is-played')) autoplay(); }, 450);
      }, { threshold: .6 });
      io.observe(stageEl);
    }
  }

  /* ------------------------------------------------------------------------
     03 · server + files + address = hosting
     ------------------------------------------------------------------------ */
  const equation = $('.equation');
  if (equation) {
    equation.style.setProperty('--q', '0');
    equation.style.setProperty('--r', '0');
    onScrub(equation, p => {
      equation.style.setProperty('--q', smooth(.3, .78, p).toFixed(3));
      equation.style.setProperty('--r', smooth(.68, .92, p).toFixed(3));
    });
  }

  /* ------------------------------------------------------------------------
     04 · The evening disappears. A clock runs from 6pm to almost midnight
     while the reader scrolls through everything the usual route asks for.
     ------------------------------------------------------------------------ */
  const evening = $('[data-evening]');
  if (evening) {
    const items = $$('.obstacle', evening);
    const timeEl = $('[data-clock-time]', evening);
    const ampmEl = $('[data-clock-ampm]', evening);
    const capEl = $('[data-clock-caption]', evening);
    const hHand = $('[data-clock-h]', evening);
    const mHand = $('[data-clock-m]', evening);
    const ticks = $('.clock__ticks', evening);
    const NS = 'http://www.w3.org/2000/svg';
    for (let k = 0; k < 12; k++) {
      const a = (k * 30 * Math.PI) / 180;
      const r1 = k % 3 ? 47 : 43;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', (60 + r1 * Math.sin(a)).toFixed(2));
      line.setAttribute('y1', (60 - r1 * Math.cos(a)).toFixed(2));
      line.setAttribute('x2', (60 + 51 * Math.sin(a)).toFixed(2));
      line.setAttribute('y2', (60 - 51 * Math.cos(a)).toFixed(2));
      ticks.appendChild(line);
    }
    evening.classList.add('is-tracking');

    const START = 18 * 60;
    const END = 23 * 60 + 58;
    let lastCaption = '';
    const setCaption = text => {
      if (text === lastCaption) return;
      lastCaption = text;
      capEl.textContent = text;
      capEl.classList.remove('is-changing');
      void capEl.offsetWidth;
      capEl.classList.add('is-changing');
    };

    onScrub(evening, p => {
      const mins = Math.round(lerp(START, END, p));
      const h24 = Math.floor(mins / 60);
      const m = mins % 60;
      timeEl.textContent = `${((h24 + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
      ampmEl.textContent = h24 >= 12 ? 'pm' : 'am';
      hHand.style.transform = `rotate(${180 + (mins - START) * .5}deg)`;
      mHand.style.transform = `rotate(${(mins - START) * 6}deg)`;
      evening.style.setProperty('--night', smooth(.08, .9, p).toFixed(3));

      const line = innerHeight * .55;
      let activeIdx = -1;
      items.forEach((it, k) => {
        const r = it.getBoundingClientRect();
        const isActive = r.top < line && r.bottom > line;
        if (isActive) activeIdx = k;
        it.classList.toggle('is-active', isActive);
        it.classList.toggle('is-passed', r.bottom <= line);
      });
      if (p >= .985) setCaption('Still on your laptop');
      else if (activeIdx >= 0) setCaption(`${items[activeIdx].dataset.caption}…`);
      else if (p < .05) setCaption('Your evening starts here');
    });
  }

  /* ------------------------------------------------------------------------
     05 · Seven chores collapse into one prompt.
     ------------------------------------------------------------------------ */
  const collapse = $('.collapse');
  if (collapse) {
    onScrub(collapse, p => {
      const q = easeInOut(smooth(.08, .8, p));
      collapse.style.setProperty('--q', q.toFixed(4));
      collapse.style.setProperty('--fade', smooth(.55, .9, q).toFixed(3));
      collapse.style.setProperty('--one', smooth(.78, 1, q).toFixed(3));
    });
  }

  /* ------------------------------------------------------------------------
     06 · Three steps. Ticking them all makes the app live.
     ------------------------------------------------------------------------ */
  const stepsList = $('[data-steps]');
  const stepBtns = $$('.step__check');
  state.steps = stepBtns.map(() => false);
  const doneCount = $('[data-done-count]');
  const meterBars = $$('.meter i');

  function renderSteps() {
    const count = state.steps.filter(Boolean).length;
    if (doneCount) doneCount.textContent = String(count);
    meterBars.forEach((bar, k) => bar.classList.toggle('on', state.steps[k]));
    if (!stepsList || !stepBtns.length) return;
    const first = stepBtns[0].getBoundingClientRect();
    const end = stepBtns[stepBtns.length - 1].getBoundingClientRect();
    stepsList.style.setProperty('--rail-h', `${end.top - first.top}px`);
    const last = state.steps.lastIndexOf(true);
    const target = last < 0 ? first : stepBtns[last].getBoundingClientRect();
    stepsList.style.setProperty('--fill-h', `${target.top - first.top}px`);
  }
  measurers.push(renderSteps);

  function setStep(i, done, silent = false) {
    if (!stepBtns[i] || state.steps[i] === done) return;
    state.steps[i] = done;
    const btn = stepBtns[i];
    btn.setAttribute('aria-pressed', String(done));
    btn.closest('.step')?.classList.toggle('is-done', done);
    if (done && !silent) {
      btn.classList.remove('just-done');
      void btn.offsetWidth;
      btn.classList.add('just-done');
    }
    store.set('embarko-steps', state.steps.map(Number).join(''));
    renderSteps();
    evaluateLive();
  }
  stepBtns.forEach((b, i) => b.addEventListener('click', () => setStep(i, !state.steps[i])));
  const savedSteps = store.get('embarko-steps');
  if (savedSteps && new RegExp(`^[01]{${stepBtns.length}}$`).test(savedSteps)) savedSteps.split('').forEach((c, i) => setStep(i, c === '1', true));

  const promptCard = $('[data-prompt-card]');
  const promptToggle = $('[data-prompt-toggle]');
  promptToggle?.addEventListener('click', () => {
    const open = !promptCard.classList.contains('is-open');
    promptCard.classList.toggle('is-open', open);
    promptToggle.setAttribute('aria-expanded', String(open));
    promptToggle.textContent = open ? 'Show less' : 'Show the full prompt';
  });

  /* Tool tabs: remembers where the reader built their app. */
  const tabs = $('[data-tabs]');
  if (tabs) {
    const tabBtns = $$('[role="tab"]', tabs);
    const ink = $('.tools__ink', tabs);
    const moveInk = btn => {
      if (!btn) return;
      ink.style.setProperty('--x', `${btn.offsetLeft}px`);
      ink.style.setProperty('--y', `${btn.offsetTop}px`);
      ink.style.setProperty('--w', `${btn.offsetWidth}px`);
      ink.style.setProperty('--h', `${btn.offsetHeight}px`);
    };
    const select = (btn, { focus = false, persist = true, animate = true } = {}) => {
      tabBtns.forEach(b => {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on && animate && !reduced) {
          panel.classList.remove('is-entering');
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        }
      });
      moveInk(btn);
      if (focus) btn.focus();
      if (persist) store.set('embarko-tool', btn.dataset.tool);
    };
    tabBtns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', e => {
        const keys = { ArrowRight: (i + 1) % tabBtns.length, ArrowLeft: (i - 1 + tabBtns.length) % tabBtns.length, Home: 0, End: tabBtns.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select(tabBtns[keys[e.key]], { focus: true });
      });
    });
    const savedTool = store.get('embarko-tool');
    select(tabBtns.find(b => b.dataset.tool === savedTool) || tabBtns[0], { persist: false, animate: false });
    requestAnimationFrame(() => requestAnimationFrame(() => ink.classList.add('is-ready')));
    measurers.push(() => moveInk(tabBtns.find(b => b.getAttribute('aria-selected') === 'true')));
  }

  /* ------------------------------------------------------------------------
     Live state: the payoff. Steps done, or the reader reached the finale.
     ------------------------------------------------------------------------ */
  function evaluateLive() {
    const deployed = state.steps.every(Boolean);
    const live = deployed || state.finale;
    if (ticketCta) {
      ticketCta.innerHTML = !live ? ticketCtaDefault
        : deployed ? 'Your app has a live link. Share it, get feedback and keep improving it.'
        : 'That’s the whole journey. Now take your own app there: <a href="#deploy-with-one-prompt">do the 6 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : 'On your laptop';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Only you can open it';
    if (arrivalNote) arrivalNote.textContent = live ? 'Anyone with the link can open it, any time.' : 'Finish the six steps and your app gets a live link.';
    stages?._render?.();
    updateJourneyAddr(true);
    lastMood = '';
    requestTick();
  }

  /* Finale: the address bar deletes localhost and types the live link. */
  const finaleStage = $('[data-finale]');
  if (finaleStage && finaleSection && omni) {
    const whisper = $('[data-finale-whisper]', finaleSection);
    const arrive = () => {
      finaleSection.classList.add('is-arrived');
      if (whisper) whisper.textContent = 'Live. Anyone with the link can open it, any time.';
      state.finale = true;
      evaluateLive();
    };
    const play = async () => {
      const target = `${state.appName}.embarko.app`;
      if (reduced) { omni.textContent = target; arrive(); return; }
      await wait(380);
      let s = omni.textContent;
      while (s.length) {
        s = s.slice(0, -1);
        omni.textContent = s;
        await wait(26);
      }
      await wait(240);
      for (let k = 1; k <= target.length; k++) {
        omni.textContent = target.slice(0, k);
        await wait(34 + Math.random() * 34);
      }
      await wait(260);
      arrive();
    };
    /* Checked every scroll frame, so it also fires for readers who jump past it. */
    let played = false;
    checkFinale = vh => {
      if (played || finaleStage.getBoundingClientRect().top > vh * .55) return;
      played = true;
      play();
    };
  }

  /* ------------------------------------------------------------------------
     Journey bar: app status, chapter, progress and the route menu.
     ------------------------------------------------------------------------ */
  const chapters = $$('[data-chapter]');
  const routeItems = $$('.route-list li');
  const progressEl = $('[data-journey-progress]');
  const numEl = $('[data-journey-num]');
  const titleEl = $('[data-journey-title]');
  const chapterWrap = $('.journey__chapter');
  const statusLink = $('.journey__status');
  const cover = $('#cover');
  const body = $('#article-body');
  const menuBtn = $('.journey__menu');
  const panel = $('#journey-route');
  let journeyOn = false;
  let currentIdx = -2;
  let trackStart = 0;
  let trackEnd = 1;

  const moodLabels = {
    local: 'Your app is on your laptop at localhost:3000. Only you can open it.',
    stuck: 'Your app is still on your laptop.',
    near: 'Your app is one prompt away from a live link.',
    live: () => `Your app is live at ${state.appName}.embarko.app.`,
  };

  function updateJourneyAddr(animate) {
    if (!addrEl) return;
    const text = state.live ? `${state.appName}.embarko.app` : 'localhost:3000';
    if (addrEl.textContent === text) return;
    addrEl.textContent = text;
    if (animate && !reduced) {
      addrEl.classList.remove('is-swapping');
      void addrEl.offsetWidth;
      addrEl.classList.add('is-swapping');
    }
  }

  function measureTrack() {
    if (!body) return;
    const top = body.getBoundingClientRect().top + scrollY;
    const ready = $('#ready');
    const endEl = ready || body;
    const bottom = endEl.getBoundingClientRect().bottom + scrollY;
    trackStart = top - innerHeight * .35;
    trackEnd = Math.max(trackStart + 1, bottom - innerHeight * .9);
  }
  measurers.push(measureTrack);

  function closeRoute() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    menuBtn?.setAttribute('aria-expanded', 'false');
  }
  function openRoute() {
    if (!panel) return;
    panel.hidden = false;
    menuBtn?.setAttribute('aria-expanded', 'true');
  }

  function updateJourney(vh) {
    if (!journey) return;
    const show = cover ? cover.getBoundingClientRect().bottom < 90 : scrollY > vh * .6;
    if (show !== journeyOn) {
      journeyOn = show;
      journey.classList.toggle('is-on', show);
      journey.toggleAttribute('inert', !show);
      if (!show) closeRoute();
    }

    progressEl?.style.setProperty('--progress', clamp((scrollY - trackStart) / (trackEnd - trackStart)).toFixed(4));

    let idx = -1;
    for (let k = 0; k < chapters.length; k++) {
      if (chapters[k].getBoundingClientRect().top < vh * .42) idx = k;
    }
    if (idx !== currentIdx) {
      currentIdx = idx;
      const total = String(chapters.length).padStart(2, '0');
      numEl.textContent = `${String(Math.max(idx, 0) + (idx < 0 ? 0 : 1)).padStart(2, '0')}/${total}`;
      titleEl.textContent = idx < 0 ? 'Introduction' : chapters[idx].dataset.chapter;
      chapterWrap.classList.remove('is-changing');
      void chapterWrap.offsetWidth;
      chapterWrap.classList.add('is-changing');
      routeItems.forEach((li, k) => {
        li.classList.toggle('is-past', k < idx);
        li.classList.toggle('is-current', k === idx);
      });
    }

    const chapterMood = idx >= 0 ? chapters[idx].dataset.mood : '';
    const mood = state.live ? 'live' : chapterMood === 'stuck' ? 'stuck' : chapterMood === 'near' || chapterMood === 'live' || idx >= 5 ? 'near' : 'local';
    if (mood !== lastMood) {
      lastMood = mood;
      journey.dataset.state = mood;
      const label = typeof moodLabels[mood] === 'function' ? moodLabels[mood]() : moodLabels[mood];
      statusLink.setAttribute('aria-label', `${label} Jump to the steps.`);
      statusLink.title = label;
      updateJourneyAddr(mood === 'live');
    }
  }

  menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    panel.hidden ? openRoute() : closeRoute();
  });
  panel?.addEventListener('click', e => { if (e.target.closest('a')) closeRoute(); });
  docOn('click', e => { if (panel && !panel.hidden && !journey.contains(e.target)) closeRoute(); });
  docOn('keydown', e => {
    if (e.key === 'Escape' && panel && !panel.hidden) {
      closeRoute();
      menuBtn?.focus();
    }
  });
  journey?.toggleAttribute('inert', true);

  /* ------------------------------------------------------------------------
     FAQ: smooth open and close
     ------------------------------------------------------------------------ */
  $$('.faq__item').forEach(d => {
    const summary = $('summary', d);
    const answerEl = $('.faq__a', d);
    summary.addEventListener('click', e => {
      if (reduced || !answerEl.animate) return;
      e.preventDefault();
      if (d.open) {
        d.classList.add('is-closing');
        const h = answerEl.offsetHeight;
        const anim = answerEl.animate({ height: [`${h}px`, '0px'], opacity: [1, 0] }, { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
        anim.onfinish = () => { d.open = false; d.classList.remove('is-closing'); };
      } else {
        d.open = true;
        const h = answerEl.offsetHeight;
        answerEl.animate({ height: ['0px', `${h}px`], opacity: [0, 1] }, { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    });
  });

  /* ------------------------------------------------------------------------
     Glossary: plain-English definitions on hover, focus or tap.
     ------------------------------------------------------------------------ */
  const DEFS = {
    localhost: ['Localhost', 'The name your computer uses for itself. A localhost link only works on the machine that made it.'],
    server: ['Server', 'A computer in a data center that stays on all the time, so the apps on it are always reachable.'],
    hosting: ['Hosting', 'A server, your app’s files on it and a public address, all together.'],
    dockerfile: ['Dockerfile', 'A recipe file some hosts use to build and run an app. Embarko doesn’t need one.'],
    port: ['Port', 'The number after the colon, as in localhost:3000. Hosts tell your app which port to listen on.'],
    env: ['Environment variables', 'Settings kept on the host, outside your code. Secret keys go here: your app can read them, visitors can’t.'],
  };
  const tip = $('#term-tip');
  let tipFor = null;
  let tipHideTimer;
  let lastPointer = 'mouse';
  addEventListener('pointerdown', e => { lastPointer = e.pointerType; }, { passive: true, capture: true });

  function showTip(el) {
    const def = DEFS[el.dataset.term];
    if (!def || !tip) return;
    clearTimeout(tipHideTimer);
    if (tipFor && tipFor !== el) { tipFor.classList.remove('is-open'); tipFor.removeAttribute('aria-describedby'); }
    tip.textContent = '';
    const b = document.createElement('b');
    b.textContent = def[0];
    tip.append(b, document.createTextNode(def[1]));
    tip.hidden = false;
    tipFor = el;
    el.classList.add('is-open');
    el.setAttribute('aria-describedby', 'term-tip');
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const x = clamp(r.left + r.width / 2 - tw / 2, 12, innerWidth - tw - 12);
    let y = r.top - th - 10;
    if (y < 72) y = r.bottom + 10;
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    requestAnimationFrame(() => tip.classList.add('is-on'));
  }
  function hideTip() {
    if (!tipFor || !tip) return;
    tip.classList.remove('is-on');
    tipFor.classList.remove('is-open');
    tipFor.removeAttribute('aria-describedby');
    tipFor = null;
    tipHideTimer = setTimeout(() => { tip.hidden = true; }, 220);
  }
  $$('.term').forEach(t => {
    t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(t); });
    t.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTip(); });
    t.addEventListener('focus', () => { if (t.matches(':focus-visible')) showTip(t); });
    t.addEventListener('blur', hideTip);
    t.addEventListener('click', e => {
      if (lastPointer === 'mouse') return;
      e.stopPropagation();
      tipFor === t ? hideTip() : showTip(t);
    });
  });
  addEventListener('scroll', () => { if (tipFor) hideTip(); }, { passive: true });
  docOn('click', e => { if (tipFor && !e.target.closest('.term')) hideTip(); });
  docOn('keydown', e => { if (e.key === 'Escape') hideTip(); });


  /* ------------------------------------------------------------------------
     Added chapters (14 Oct 2026): same scroll engine, same colour script.
     ------------------------------------------------------------------------ */

  /* 05 · Three lines, one destination. Every line covers the same distance at
     the same speed, but each stop costs time, so the fewest stops arrive first. */
  const linesEl = $('[data-lines]');
  if (linesEl) {
    const PAUSE = .4;
    const ranks = ['1st', '2nd', '3rd'];
    const plans = $$('.line', linesEl).map(row => {
      const stops = $$('.line__stops > li', row);
      const stateEl = $('[data-line-state]', row);
      const legs = stops.length - 1;
      return { row, stops, stateEl, legs, idle: stateEl.textContent, total: 1 + (legs - 1) * PAUSE };
    });
    const longest = Math.max(...plans.map(pl => pl.total));
    [...plans].sort((x, y) => x.total - y.total).forEach((pl, k) => (pl.rank = ranks[k]));

    const drawLines = time => {
      plans.forEach(pl => {
        const leg = 1 / pl.legs;
        let t = time, pos = 0, at = -1;
        for (let k = 0; k < pl.legs; k++) {
          if (t < leg) { pos = k + easeInOut(clamp(t / leg)); break; }
          t -= leg;
          pos = k + 1;
          if (k + 1 < pl.legs) {
            if (t < PAUSE) { at = k + 1; break; }
            t -= PAUSE;
          }
        }
        const moving = time > 0;
        const live = moving && pos >= pl.legs - 1e-6;
        pl.row.style.setProperty('--t', (moving ? pos / pl.legs : 0).toFixed(4));
        pl.row.classList.toggle('is-moving', moving);
        pl.row.classList.toggle('is-live', live);
        pl.stops.forEach((st, k) => {
          st.classList.toggle('is-passed', moving && pos >= k - 1e-6);
          st.classList.toggle('is-here', k === at);
        });
        const next = pl.stops[Math.min(pl.legs, Math.floor(pos) + 1)];
        const label = !moving ? pl.idle : live ? `Live · ${pl.rank}` : at > 0 ? `at ${pl.stops[at].textContent}` : `next: ${next.textContent}`;
        if (pl.stateEl.textContent !== label) pl.stateEl.textContent = label;
      });
      linesEl.classList.toggle('is-first', plans.some(pl => pl.row.classList.contains('is-live')));
    };

    let playId = 0;
    let playing = false;
    onScrub(linesEl, p => { if (!playing) drawLines(clamp(p / .9) * longest); });
    $('[data-lines-replay]', linesEl)?.addEventListener('click', () => {
      if (reduced) { drawLines(longest); return; }
      const my = ++playId;
      const t0 = performance.now();
      playing = true;
      const run = now => {
        if (my !== playId) return;
        const k = clamp((now - t0) / 3600);
        drawLines(k * longest);
        if (k < 1) requestAnimationFrame(run); else playing = false;
      };
      requestAnimationFrame(run);
    });
  }

  /* 08 · Step 3: files ride the belt into the box; the junk drops out. */
  const pack = $('[data-pack]');
  if (pack) {
    const statusEl = $('[data-pack-status]', pack);
    let lastS = '';
    onScrub(pack, p => {
      pack.style.setProperty('--out', smooth(.05, .35, p).toFixed(3));
      pack.style.setProperty('--in', smooth(.3, .62, p).toFixed(3));
      const label = p < .3 ? 'packing' : p < .62 ? 'uploading' : p < .95 ? 'checking every 10s' : `${state.appName}.embarko.app`;
      if (label !== lastS) { lastS = label; statusEl.textContent = label; pack.classList.toggle('is-live', p >= .95); }
    });
  }

  /* 08 · Step 4: answering the dialog ticks the step. */
  const approve = $('[data-approve]');
  if (approve) {
    $('[data-approve-allow]', approve).addEventListener('click', e => {
      approve.classList.add('is-allowed');
      e.currentTarget.textContent = 'Allowed';
      e.currentTarget.disabled = true;
      setStep(3, true);
    });
  }

  /* 08 · Step 5: the page boots from 202 to live; three checks tick the step. */
  const confirmEl = $('[data-confirm]');
  if (confirmEl) {
    const code = $('[data-confirm-code]', confirmEl);
    let lastC = '';
    onScrub(confirmEl, p => {
      confirmEl.style.setProperty('--boot', smooth(.25, .85, p).toFixed(3));
      const c = p < .3 ? '202 Accepted' : p < .85 ? 'building…' : 'live';
      if (c !== lastC) { lastC = c; code.textContent = c; confirmEl.classList.toggle('is-live', c === 'live'); }
    });
    const checks = $$('.confirm__check', confirmEl);
    checks.forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      if (checks.every(x => x.getAttribute('aria-pressed') === 'true')) setStep(4, true);
    }));
  }

  /* 09 · Pick a symptom; the console types the cause and the fix. */
  const doctor = $('[data-doctor]');
  if (doctor) {
    const rowsE = $$('table.errors tbody tr');
    const chipsD = $$('.doctor__chip', doctor);
    const out = $('[data-doctor-out]', doctor);
    let run = 0;
    const type = async (el, text, speed) => {
      if (reduced) { el.textContent = text; return; }
      for (let k = 1; k <= text.length; k++) {
        if (el._run !== run) return;
        el.textContent = text.slice(0, k);
        await wait(speed);
      }
    };
    chipsD.forEach((c, i) => c.addEventListener('click', async () => {
      chipsD.forEach((x, k) => x.setAttribute('aria-pressed', String(k === i)));
      const row = rowsE[i];
      const see = row.querySelector('th').textContent.trim();
      const cause = row.children[1].textContent.trim();
      const fix = row.children[2].textContent.trim();
      run++;
      const my = run;
      out.innerHTML = '<span class="doctor__l doctor__l--see"></span><span class="doctor__l doctor__l--cause"></span><span class="doctor__l doctor__l--fix"></span><span class="doctor__caret" aria-hidden="true"></span>';
      const [l1, l2, l3] = $$('.doctor__l', out);
      [l1, l2, l3].forEach(l => (l._run = my));
      await type(l1, `$ ${see}`, 14);
      if (my !== run) return;
      await wait(reduced ? 0 : 160);
      await type(l2, `cause  ${cause}`, 12);
      if (my !== run) return;
      await wait(reduced ? 0 : 160);
      await type(l3, `fix    ${fix}`, 10);
    }));
  }

  /* Troubleshooting lives in a dialog. Any "Stuck?" link opens it, and a link
     that names a symptom opens it with that symptom already diagnosed. */
  const fixit = $('#if-something-goes-wrong');
  if (fixit && typeof fixit.showModal === 'function') {
    const docChips = $$('.doctor__chip', fixit);
    const openFix = sym => {
      if (!fixit.open) {
        fixit.showModal();
        root.classList.add('has-modal'); document.documentElement.classList.add('ek-modal');
      }
      if (sym != null && docChips[sym]) docChips[sym].click();
      $('.fixit__sheet', fixit).scrollTop = 0;
    };
    fixit.addEventListener('close', () => { root.classList.remove('has-modal'); document.documentElement.classList.remove('ek-modal'); });
    fixit.addEventListener('click', e => { if (e.target === fixit) fixit.close(); });
    $$('[data-fixit-close]', fixit).forEach(b => b.addEventListener('click', () => fixit.close()));
    docOn('click', e => {
      const t = e.target.closest('[data-fixit-open], a[href="#if-something-goes-wrong"]');
      if (!t) return;
      e.preventDefault();
      closeRoute();
      openFix(t.dataset.fixit != null ? +t.dataset.fixit : null);
    });
    if (location.hash === '#if-something-goes-wrong') openFix(null);
  }

  /* 10 · After it's live: the conversation plays as you scroll. */
  const chat = $('[data-afterchat]');
  if (chat) {
    const items = $$('[data-at]', chat);
    onScrub(chat, p => items.forEach(el => el.classList.toggle('is-in', p >= +el.dataset.at)));
  }

  /* ------------------------------------------------------------------------
     Mobile site menu
     ------------------------------------------------------------------------ */
  const navToggle = $('.nav-toggle');
  const siteNav = $('#site-nav');
  const setNav = open => {
    siteNav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle?.addEventListener('click', e => { e.stopPropagation(); setNav(!siteNav.classList.contains('is-open')); });
  docOn('click', e => { if (siteNav?.classList.contains('is-open') && !e.target.closest('.site-header')) setNav(false); });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  const relayout = () => { measureAll(); requestTick(); };
  if ('ResizeObserver' in window && body) {
    let raf = 0;
    new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(relayout); }).observe(body);
  }
  document.fonts?.ready.then(relayout);
  addEventListener('load', relayout);
  renderSteps();
  relayout();
  return () => {
    ac.abort();
    document.documentElement.classList.remove('ek-modal');
  };
}
