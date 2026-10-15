/* ==========================================================================
   Embarko · Guide article: interaction layer
   "Deploy a Replit App for Free: Export and Host It". The engine is the one
   from the approved "How to deploy an AI app" page; this guide's scenes are
   at the end.
   Progressive enhancement only. The article is complete and readable
   without this file; everything here adds motion, state and delight.
   ========================================================================== */
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
  const state = { appName: 'your-app-name', steps: [false, false, false, false, false], finale: false, live: false };
  const LOCAL = 'my-app · in Replit';
  const ZIP_ADDR = '~/my-app/';
  const localAddr = () => (state.steps[0] ? ZIP_ADDR : LOCAL);
  const STEPS_KEY = 'embarko-steps-replit';
  const PROMPT_STEP = 2;
  const stepHooks = [];

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
  const finaleSection = $('#deploy');
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
  const liveWhenReduced = el => el.hasAttribute('data-live-reduced');

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
      toast('Couldn’t copy. Select the prompt in step 3 and copy it instead.', false);
      return;
    }
    flashCopied(btn, btn.classList.contains('btn--sm') ? 'Copied' : 'Copied — paste it into your agent');
    toast('Prompt copied. Paste it into your agent.');
    setStep(PROMPT_STEP, true);
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
    const data = { title: 'Deploy a Replit App for Free: Export and Host It', text: 'Download your Replit app as a zip, paste one prompt into your agent and get a live link.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to someone with an app in Replit.' : data.url, ok);
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
    store.set(STEPS_KEY, state.steps.map(Number).join(''));
    renderSteps();
    stepHooks.forEach(fn => fn(i, done));
    evaluateLive();
  }
  stepBtns.forEach((b, i) => b.addEventListener('click', () => setStep(i, !state.steps[i])));
  const savedSteps = store.get(STEPS_KEY);
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
        : deployed ? 'Your app is out of Replit and has its own live link. Share it.'
        : 'That’s the whole move. Now take your own app there: <a href="#steps">do the 5 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : state.steps[0] ? 'On your laptop' : 'In Replit';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Still inside Replit';
    if (arrivalNote) arrivalNote.textContent = live ? 'Anyone with the link can open it, any time.' : 'Finish the five steps and your Replit app gets its own live link.';
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
      if (whisper) whisper.textContent = 'Live. Out of Replit, and anyone with the link can open it.';
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
    local: 'Your app still lives inside Replit.',
    stuck: 'Your app still lives inside Replit.',
    near: 'Your app is one prompt away from a live link.',
    live: () => `Your app is live at ${state.appName}.embarko.app.`,
  };

  function updateJourneyAddr(animate) {
    if (!addrEl) return;
    const text = state.live ? `${state.appName}.embarko.app` : localAddr();
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
    const ready = $('#deploy');
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
    const mood = state.live ? 'live' : chapterMood === 'stuck' ? 'stuck' : chapterMood === 'near' || chapterMood === 'live' ? 'near' : 'local';
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
    manifest: ['Manifest', 'The file that tells a host what your app is: package.json for Node.js, requirements.txt or pyproject.toml for Python, index.html for a static site. Embarko looks for it at the top of the folder.'],
    targz: ['.tar.gz file', 'One compressed file that holds a whole folder, like a .zip. Your agent packs your project into one before it uploads it.'],
    dockerfile: ['Dockerfile', 'A recipe file some hosts use to build and run an app. Embarko builds the app itself and rejects an upload that includes one.'],
    pgdump: ['pg_dump', 'The export tool for a Postgres database. It writes the database into one file you can download, here called backup.dump.'],
    datadir: ['DATA_DIR', 'A folder on your running Embarko app whose files survive redeploys. It exists only on the running app, so it isn’t part of your upload.'],
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
  const fixit = $('#errors');
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
      const t = e.target.closest('[data-fixit-open], a[href="#errors"]');
      if (!t) return;
      e.preventDefault();
      closeRoute();
      openFix(t.dataset.fixit != null ? +t.dataset.fixit : null);
    });
    if (location.hash === '#errors') openFix(null);
  }

  /* ==========================================================================
     Scenes for "Deploy a Replit App for Free" (14 Oct 2026).
     Same engine, same colour script; one module per scene. Self-playing
     scenes play once when they scroll into view, then hand over to the reader.
     ========================================================================== */

  /* The journey bar follows the move: in Replit → a folder on the laptop → live. */
  const syncLocal = () => {
    updateJourneyAddr(true);
    if (state.live) return;
    if (ticketStatus) ticketStatus.textContent = state.steps[0] ? 'On your laptop' : 'In Replit';
    const arrivalLocal = $('.arrival__local');
    if (arrivalLocal) arrivalLocal.textContent = localAddr();
  };
  stepHooks.push(i => { if (i === 0) syncLocal(); });
  syncLocal();

  /* Shared by the self-playing scenes: a cursor that moves, presses and lets go. */
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
  function makeCursor(host) {
    const c = document.createElement('span');
    c.className = 'demo__cursor';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4.5 2.5 19 11.2l-6.6 1.5L9 19.3Z"/></svg>';
    host.append(c);
    const local = el => {
      const h = host.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2 - h.left, r.top + r.height / 2 - h.top];
    };
    let x = 0, y = 0;
    const put = (nx, ny) => { x = nx; y = ny; c.style.left = `${x}px`; c.style.top = `${y}px`; };
    return {
      local,
      put,
      show(el, dx = 40, dy = 60) { const [ex, ey] = local(el); put(ex + dx, ey + dy); c.classList.add('is-on'); },
      hide() { c.classList.remove('is-on', 'is-pressing'); },
      async moveTo(el, alive, ms = 700) {
        const [fx, fy] = [x, y];
        const [tx, ty] = local(el);
        await tween(ms, k => put(lerp(fx, tx, k), lerp(fy, ty, k)), alive);
      },
      async press(alive) {
        c.classList.add('is-pressing');
        await wait(180);
        if (alive()) c.classList.remove('is-pressing');
      },
    };
  }
  const onceInView = (el, fn, threshold = .5) => {
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { threshold });
    io.observe(el);
  };

  /* A scene that plays itself once in view, then hands over. Any pointer or key
     from the reader inside the scene stops the demo; "Watch again" replays it.
     Reduced-motion readers get the settled final frame and no autoplay. */
  function selfPlaying(el, { autoplay, settle, onStop, threshold = .45 }) {
    let id = 0;
    const cursor = makeCursor(el);
    const isPlaying = () => !el.classList.contains('is-played');
    const stop = () => {
      id++;
      cursor.hide();
      el.classList.add('is-played');
      onStop?.();
    };
    async function play() {
      const my = ++id;
      const alive = () => my === id;
      el.classList.remove('is-played');
      await autoplay(alive, cursor);
      if (!alive()) return;
      cursor.hide();
      el.classList.add('is-played');
    }
    $('[data-rp-replay]', el)?.addEventListener('click', () => {
      if (reduced) return;
      id++;
      cursor.hide();
      play();
    });
    const interrupt = e => {
      if (e.target.closest('[data-rp-replay]') || !isPlaying()) return;
      stop();
    };
    el.addEventListener('pointerdown', interrupt, { capture: true });
    el.addEventListener('keydown', interrupt, { capture: true });
    onceInView(el, () => {
      if (reduced) { settle?.(); el.classList.add('is-played'); return; }
      setTimeout(() => { if (isPlaying()) play(); }, 350);
    }, threshold);
    return { cursor, stop };
  }
  const flash = el => {
    if (!el || reduced) return;
    el.classList.remove('is-new');
    void el.offsetWidth;
    el.classList.add('is-new');
  };

  /* 01 · The moving box. Replit holds five things; a zip carries one.
     A cursor packs the files (they fit) and the database (it bounces back),
     then the reader drags or taps the rest. */
  const move = $('[data-rp-move]');
  if (move) {
    const rooms = $('[data-rp-rooms]', move);
    const inList = $('[data-rp-in]', move);
    const outList = $('[data-rp-out]', move);
    const box = $('[data-rp-box]', move);
    const cap = $('[data-rp-move-cap]', move);
    const items = $$('.rp-item', move);
    const byKey = Object.fromEntries(items.map(li => [li.dataset.rpItem, li]));
    const order = ['files', 'run', 'db', 'secrets', 'storage'];
    const finalCap = cap.textContent;
    const subOf = li => $('.rp-item__sub', li);
    items.forEach(li => { subOf(li).dataset.why = subOf(li).textContent; });
    const ghost = document.createElement('span');
    ghost.className = 'rp-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    move.append(ghost);
    let doneTimer;

    const flip = (el, mutate) => {
      const a = el.getBoundingClientRect();
      mutate();
      if (reduced || !el.animate) return;
      const b = el.getBoundingClientRect();
      el.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    };
    const pulse = cls => {
      box.classList.remove('is-reject', 'is-accept');
      void box.offsetWidth;
      box.classList.add(cls);
    };
    const reset = () => {
      clearTimeout(doneTimer);
      order.forEach(k => {
        const li = byKey[k];
        li.classList.remove('is-lifted');
        subOf(li).textContent = subOf(li).dataset.sub;
        rooms.append(li);
      });
      box.classList.remove('is-reject', 'is-accept', 'is-over');
      move.classList.remove('is-done');
      cap.textContent = 'Replit holds five things for your app. Which ones fit in the zip?';
    };
    const pack = li => {
      if (li.parentElement !== rooms) return;
      const fits = li.hasAttribute('data-fits');
      flip(li, () => {
        (fits ? inList : outList).append(li);
        subOf(li).textContent = subOf(li).dataset.why;
      });
      pulse(fits ? 'is-accept' : 'is-reject');
      cap.textContent = `${$('b', li).textContent}: ${subOf(li).dataset.why}`;
      if (!rooms.children.length) {
        move.classList.add('is-done');
        clearTimeout(doneTimer);
        doneTimer = setTimeout(() => { if (!rooms.children.length) cap.textContent = finalCap; }, reduced ? 0 : 2600);
      }
    };

    const placeGhost = (x, y) => { ghost.style.left = `${x}px`; ghost.style.top = `${y}px`; };
    const overBox = (cx, cy) => {
      const r = box.getBoundingClientRect();
      return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    };
    let drag = null;
    items.forEach(li => {
      const btn = $('.rp-item__btn', li);
      btn.addEventListener('pointerdown', e => {
        if (e.button !== 0 || li.parentElement !== rooms) return;
        drag = { li, x: e.clientX, y: e.clientY, moved: false };
        btn.setPointerCapture?.(e.pointerId);
      });
      btn.addEventListener('pointermove', e => {
        if (!drag || drag.li !== li) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.moved = true;
        li.classList.add('is-lifted');
        ghost.textContent = $('b', li).textContent;
        ghost.classList.add('is-on');
        const h = move.getBoundingClientRect();
        placeGhost(e.clientX - h.left, e.clientY - h.top);
        box.classList.toggle('is-over', overBox(e.clientX, e.clientY));
      });
      const end = e => {
        if (!drag || drag.li !== li) return;
        const d = drag;
        drag = null;
        li.classList.remove('is-lifted');
        ghost.classList.remove('is-on');
        box.classList.remove('is-over');
        if (!d.moved) return;
        li._skipClick = true;
        if (e.type === 'pointerup' && overBox(e.clientX, e.clientY)) pack(li);
        else cap.textContent = 'Drop it on the zip to pack it.';
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('click', () => {
        if (li._skipClick) { li._skipClick = false; return; }
        pack(li);
      });
    });

    selfPlaying(move, {
      onStop: () => {
        items.forEach(li => li.classList.remove('is-lifted'));
        ghost.classList.remove('is-on');
        box.classList.remove('is-over');
        if (rooms.children.length) cap.textContent = 'Your turn: drag the rest onto the zip, or tap one.';
      },
      autoplay: async (alive, cursor) => {
        reset();
        await wait(800);
        for (const k of ['files', 'db']) {
          if (!alive()) return;
          const li = byKey[k];
          const btn = $('.rp-item__btn', li);
          cursor.show(btn, 70, 60);
          await cursor.moveTo(btn, alive, 650);
          if (!alive()) return;
          await cursor.press(alive);
          li.classList.add('is-lifted');
          ghost.textContent = $('b', li).textContent;
          const [sx, sy] = cursor.local(btn);
          const [tx, ty] = cursor.local(box);
          placeGhost(sx, sy);
          ghost.classList.add('is-on');
          await tween(950, q => {
            const x = lerp(sx, tx, q), y = lerp(sy, ty, q);
            placeGhost(x, y);
            cursor.put(x, y);
            box.classList.toggle('is-over', q > .7);
          }, alive);
          if (!alive()) return;
          ghost.classList.remove('is-on');
          li.classList.remove('is-lifted');
          box.classList.remove('is-over');
          pack(li);
          await wait(2300);
        }
        if (!alive()) return;
        cap.textContent = 'Your turn: drag the rest onto the zip, or tap one.';
      },
    });
    if (!reduced) reset();
  }

  /* 02 · The usual road as a setup wizard. Scroll walks it job by job; a tap
     on a number takes over. */
  const wiz = $('[data-rp-wiz]');
  if (wiz) {
    const jobs = $$('.rp-wiz__job', wiz);
    const panes = $$('.rp-wiz__pane', wiz);
    const bars = $$('.rp-wiz__meter i', wiz);
    const count = $('[data-rp-wiz-count]', wiz);
    const cap = $('[data-rp-wiz-cap]', wiz);
    const titles = jobs.map(li => $('strong', li).textContent.replace(/\.$/, ''));
    let cur = -1;
    let manual = false;
    const show = (i, fin) => {
      if (i !== cur) {
        cur = i;
        jobs.forEach((li, k) => { li.classList.toggle('is-on', k === i); li.classList.toggle('is-past', k < i); });
        panes.forEach((p, k) => p.classList.toggle('is-on', k === i));
        bars.forEach((b, k) => b.classList.toggle('on', k <= i));
        count.textContent = `${i + 1} of 5`;
      }
      wiz.classList.toggle('is-done', !!fin);
      cap.textContent = fin ? 'Five jobs between “it works there” and “here’s the link”.' : `Job ${i + 1} of 5 · ${titles[i]}`;
    };
    onScrub(wiz, p => {
      if (manual) return;
      show(Math.min(4, Math.floor(clamp(p / .9) * 5)), p >= .9);
    });
    $$('.rp-wiz__n', wiz).forEach((b, i) => b.addEventListener('click', () => { manual = true; show(i, false); }));
    show(0, false);
  }

  /* 03 · Before / after. The handle sweeps once by itself, then it's the reader's. */
  const ba = $('[data-rp-ba]');
  if (ba) {
    const frame = $('.rp-ba__frame', ba);
    const range = $('[data-rp-ba-range]', ba);
    const set = v => frame.style.setProperty('--x', `${v}%`);
    let auto = 0;
    const stopAuto = () => { auto++; };
    range.addEventListener('input', () => { stopAuto(); set(range.value); });
    range.addEventListener('pointerdown', stopAuto);
    range.addEventListener('keydown', stopAuto);
    set(range.value);
    onceInView(ba, async () => {
      if (reduced) return;
      const my = ++auto;
      const alive = () => my === auto;
      const go = (to, ms) => {
        const from = +range.value;
        return tween(ms, k => { const v = lerp(from, to, k); range.value = String(v); set(v); }, alive);
      };
      await wait(500);
      if (!alive()) return;
      await go(86, 1100);
      await wait(700);
      if (!alive()) return;
      await go(14, 1500);
      await wait(700);
      if (!alive()) return;
      await go(50, 900);
    }, .55);
  }

  /* 04 · Step 1. ⋯ → Download as zip → unzip → open the folder that holds the
     manifest. Plays once, then the reader does it, which ticks the step. */
  const dl = $('[data-rp-dl]');
  if (dl) {
    const more = $('[data-rp-more]', dl);
    const menu = $('[data-rp-menu]', dl);
    const dlBtn = $('[data-rp-download]', dl);
    const unzip = $('[data-rp-unzip]', dl);
    const node = k => $$(`[data-rp-node="${k}"]`, dl);
    const picks = $$('[data-rp-open]', dl);
    const pickBox = $('[data-rp-pick]', dl);
    const cap = $('[data-rp-dl-cap]', dl);
    const say = h => { cap.innerHTML = h; };
    const st = { menu: false, zip: false, open: false };
    const render = () => {
      more.setAttribute('aria-expanded', String(st.menu));
      menu.hidden = !st.menu;
      node('zip').forEach(n => { n.hidden = !st.zip; });
      unzip.hidden = !st.zip || st.open;
      node('folder').concat(node('inner')).forEach(n => { n.hidden = !st.open; });
      pickBox.hidden = !st.open;
    };
    const clearPick = () => {
      picks.forEach(b => b.setAttribute('aria-pressed', 'false'));
      $$('.is-target', dl).forEach(n => n.classList.remove('is-target'));
      dl.classList.remove('is-ok', 'is-bad');
    };
    const reset = () => {
      Object.assign(st, { menu: false, zip: false, open: false });
      clearPick();
      render();
      say('Open the <b>⋯</b> menu at the top of the file tree.');
    };
    const doMenu = () => {
      st.menu = !st.menu;
      render();
      if (st.menu) say('Choose <b>Download as zip</b>.');
    };
    const doDownload = () => {
      st.menu = false;
      st.zip = true;
      render();
      flash(node('zip')[0]);
      if (!st.open) say('<code>my-app.zip</code> is in your Downloads. Unzip it.');
    };
    const doUnzip = () => {
      st.open = true;
      render();
      node('folder').concat(node('inner')).forEach(flash);
      say('Which folder do you open in your agent?');
    };
    const doPick = (which, byReader) => {
      clearPick();
      const good = which === 'app';
      picks.forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.rpOpen === which));
        b.classList.toggle('is-good', b.dataset.rpOpen === 'app');
        b.classList.toggle('is-bad', b.dataset.rpOpen === 'downloads');
      });
      node(good ? 'folder' : 'downloads')[0].classList.add('is-target');
      dl.classList.add(good ? 'is-ok' : 'is-bad');
      say(good
        ? 'Right folder: its manifest, <code>requirements.txt</code>, is at the top of <code>my-app/</code>.'
        : 'No manifest at the top of <code>Downloads/</code>, so the upload would fail with <code>422 no_manifest_at_root</code>. Open <code>my-app/</code>.');
      if (good && byReader) setStep(0, true);
    };
    more.addEventListener('click', doMenu);
    dlBtn.addEventListener('click', doDownload);
    unzip.addEventListener('click', doUnzip);
    picks.forEach(b => b.addEventListener('click', () => doPick(b.dataset.rpOpen, true)));
    dl.addEventListener('keydown', e => { if (e.key === 'Escape' && st.menu) { st.menu = false; render(); more.focus(); } });

    selfPlaying(dl, {
      settle: () => { Object.assign(st, { menu: false, zip: true, open: true }); render(); doPick('app', false); },
      onStop: () => { if (!st.menu && !st.zip) say('Your turn: open the <b>⋯</b> menu.'); },
      autoplay: async (alive, cursor) => {
        reset();
        await wait(600);
        if (!alive()) return;
        cursor.show(more, -80, 70);
        await cursor.moveTo(more, alive);
        if (!alive()) return;
        await cursor.press(alive);
        doMenu();
        await wait(700);
        if (!alive()) return;
        await cursor.moveTo(dlBtn, alive, 550);
        if (!alive()) return;
        await cursor.press(alive);
        doDownload();
        await wait(1200);
        if (!alive()) return;
        await cursor.moveTo(unzip, alive, 800);
        if (!alive()) return;
        await cursor.press(alive);
        doUnzip();
        await wait(1300);
        if (!alive()) return;
        await cursor.moveTo(picks[0], alive, 700);
        if (!alive()) return;
        await cursor.press(alive);
        doPick('downloads', false);
        await wait(2300);
        if (!alive()) return;
        await cursor.moveTo(picks[1], alive, 500);
        if (!alive()) return;
        await cursor.press(alive);
        doPick('app', false);
        await wait(2300);
        if (!alive()) return;
        cursor.hide();
        reset();
        say('Your turn: open the <b>⋯</b> menu and download it yourself.');
      },
    });
    if (!reduced) reset();
  }

  /* 04 · Step 2. Which tool can reach the folder on your laptop? */
  const reach = $('[data-rp-reach]');
  if (reach) {
    const btns = $$('[data-rp-tool]', reach);
    const nameEl = $('[data-rp-tool-name]', reach);
    const whereEl = $('[data-rp-tool-where]', reach);
    const sayEl = $('[data-rp-reach-say]', reach);
    const AGENT = 'It runs commands in your folder, so it can pack it and upload it. Use the deployment prompt.';
    const TOOLS = {
      code: ['Claude Code', 'in your folder', AGENT],
      cursor: ['Cursor', 'in your folder', AGENT],
      other: ['Your agent', 'in your folder', 'Any agent that can run terminal commands in your project folder works. Use the deployment prompt.'],
      connector: ['Embarko connector', 'in Claude, not on your laptop', 'The connector deploys from a public .tar.gz link, so it can’t upload a folder from your laptop. For a Replit export, use the deployment prompt.'],
    };
    const pick = (k, persist) => {
      reach.dataset.tool = k;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rpTool === k)));
      const [n, w, s] = TOOLS[k];
      nameEl.textContent = n;
      whereEl.textContent = w;
      sayEl.textContent = s;
      if (persist) store.set('embarko-replit-tool', k);
    };
    let touched = false;
    btns.forEach(b => b.addEventListener('click', () => { touched = true; pick(b.dataset.rpTool, true); }));
    const saved = store.get('embarko-replit-tool');
    if (saved && TOOLS[saved]) { touched = true; pick(saved, false); }
    /* Shown once: the connector can't see the laptop, then back to an agent that can. */
    onceInView(reach, async () => {
      if (reduced || touched) return;
      await wait(900);
      if (touched) return;
      pick('connector', false);
      await wait(2600);
      if (touched) return;
      pick('code', false);
    }, .6);
  }

  /* 04 · Step 3. The extra line types itself; the agent deploys first, then offers to keep the app.
     The reader's answer carries over to step 5. */
  let claimMode = () => {};
  const chat = $('[data-rp-chat]');
  if (chat) {
    const full = $('#replit-line').textContent;
    const typed = $('[data-rp-typed]', chat);
    const opts = $$('[data-rp-auth]', chat);
    const reply = $('[data-rp-reply]', chat);
    const REPLIES = {
      email: ['Tell me your email. Embarko mails you a token, you paste it here, and the app becomes permanent at the same address.', false],
      paste: ['Paste it here. I redeploy the same name with it, and the app becomes permanent at the same address.', false],
      connector: ['Apps the connector deploys go straight into your account, so there is nothing to keep.', false],
      skip: ['No problem. The app stays live for 24 hours, then it is deleted unless you keep it in step 5.', true],
    };
    const answer = (k, byReader) => {
      opts.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rpAuth === k)));
      reply.textContent = REPLIES[k][0];
      reply.classList.toggle('is-warn', REPLIES[k][1]);
      chat.classList.add('is-answered');
      if (byReader) claimMode(k === 'skip' ? 'skip' : 'token');
    };
    const finish = () => { typed.textContent = full; chat.classList.add('is-typed', 'is-asked'); };
    opts.forEach(b => b.addEventListener('click', () => { finish(); answer(b.dataset.rpAuth, true); }));
    chat.classList.add('is-ready');
    selfPlaying(chat, {
      settle: () => { finish(); answer('email', false); },
      onStop: finish,
      autoplay: async (alive, cursor) => {
        chat.classList.remove('is-typed', 'is-asked', 'is-answered');
        opts.forEach(b => b.setAttribute('aria-pressed', 'false'));
        typed.textContent = '';
        await wait(300);
        for (let k = 1; k <= full.length; k++) {
          if (!alive()) return;
          typed.textContent = full.slice(0, k);
          await wait(24 + Math.random() * 26);
        }
        chat.classList.add('is-typed');
        await wait(600);
        if (!alive()) return;
        chat.classList.add('is-asked');
        await wait(1200);
        if (!alive()) return;
        cursor.show(opts[0], 50, 60);
        await cursor.moveTo(opts[0], alive, 700);
        if (!alive()) return;
        await cursor.press(alive);
        answer('email', false);
        await wait(1500);
      },
    });
  }

  /* 04 · Step 4. Name the app (the naming rules check as you type), pick static
     or server, and watch the upload: 202 is "build started", not live. */
  const run = $('[data-rp-run]');
  if (run) {
    const input = $('[data-rp-name]', run);
    const ruleChars = $('[data-rule="chars"]', run);
    const ruleLen = $('[data-rule="len"]', run);
    const out = $('[data-rp-out]', run);
    const stEl = $('[data-rp-state]', run);
    const kinds = $$('[data-rp-kind]', run);
    const go = $('[data-rp-go]', run);
    let kind = 'server';
    let runId = 0;

    const check = raw => {
      const chars = /^[a-z0-9-]*$/.test(raw);
      const len = raw.length >= 3 && raw.length <= 63;
      ruleChars.classList.toggle('is-ok', chars);
      ruleChars.classList.toggle('is-bad', !chars);
      ruleLen.classList.toggle('is-ok', len);
      ruleLen.classList.toggle('is-bad', !len);
      return chars && len;
    };
    const syncFromState = () => { if (document.activeElement !== input) { input.value = state.appName; check(input.value); } };
    input.value = state.appName;
    check(input.value);
    input.addEventListener('input', () => {
      if (check(input.value)) {
        setAppName(input.value);
        if (appInput) appInput.value = state.appName;
      }
    });
    input.addEventListener('blur', () => {
      setAppName(input.value);
      input.value = state.appName;
      if (appInput) appInput.value = state.appName;
      check(input.value);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    appInput?.addEventListener('input', syncFromState);
    appInput?.addEventListener('blur', syncFromState);

    const setKind = k => { kind = k; kinds.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rpKind === k))); };
    const setState = (t, s) => { stEl.textContent = t; run.dataset.state = s; };
    const line = (label, text, cls) => {
      const s = document.createElement('span');
      s.className = `rp-l ${cls || ''}`;
      const b = document.createElement('b');
      b.textContent = label.padEnd(8, ' ');
      s.append(b, document.createTextNode(text));
      out.append(s);
      return s;
    };
    const idle = () => {
      out.textContent = '';
      line('$', 'waiting for your folder', 'rp-l--soft');
      setState('ready', 'run');
    };
    async function deploy(byReader) {
      const id = ++runId;
      const alive = () => id === runId;
      const p = ms => wait(reduced ? 0 : ms);
      const url = `https://${state.appName}.embarko.app`;
      out.textContent = '';
      setState('packing', 'run');
      line('pack', 'my-app → my-app.tar.gz');
      await p(600);
      if (!alive()) return;
      line('', 'left out: node_modules/, .git/, .env', 'rp-l--soft');
      await p(700);
      if (!alive()) return;
      setState('uploading', 'run');
      await p(700);
      if (!alive()) return;
      if (kind === 'static') {
        line('upload', `live in the first reply · ${url}`, 'rp-l--ok');
      } else {
        const l = line('upload', '202 Accepted ', 'rp-l--wait');
        const f = document.createElement('i');
        f.className = 'rp-flag';
        f.textContent = 'build started, not live yet';
        l.append(f);
        setState('202 · not live yet', 'wait');
        await p(1300);
        for (let k = 0; k < 2; k++) {
          if (!alive()) return;
          setState('checking every 10 s', 'run');
          line('status', 'building · next check in about 10 s');
          await p(1200);
        }
        if (!alive()) return;
        line('status', `live · ${url}`, 'rp-l--ok');
      }
      setState('live', 'live');
      if (byReader) setStep(3, true);
    }
    kinds.forEach(b => b.addEventListener('click', () => { runId++; setKind(b.dataset.rpKind); idle(); }));
    go.addEventListener('click', () => deploy(true));

    selfPlaying(run, {
      onStop: () => { runId++; idle(); },
      autoplay: async alive => {
        setKind('server');
        await wait(400);
        if (!alive()) return;
        await deploy(false);
      },
    });
    if (!reduced) idle();
  }

  /* 04 · Step 5. The claim page. With a token the app is already yours; without
     one, Keep saves it and hands you the prompt that carries the deploy token. */
  const claim = $('[data-rp-claim]');
  if (claim) {
    const modes = $$('[data-rp-mode]', claim);
    const note = $('[data-rp-claim-note]', claim);
    const cap = $('[data-rp-claim-cap]', claim);
    const addr = $('[data-rp-claim-addr]', claim);
    const btn = $('[data-rp-keep]', claim);
    const label = $('span', btn);
    let mode = store.get('embarko-replit-auth') === 'token' ? 'token' : 'skip';
    const render = () => {
      const done = !!state.steps[4];
      claim.dataset.mode = mode;
      modes.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rpMode === mode)));
      claim.classList.toggle('is-kept', done && mode === 'skip');
      claim.classList.toggle('is-open', done && mode === 'token');
      if (mode === 'token') {
        addr.textContent = 'your app, in your account';
        note.textContent = 'Deployed with a token, so it’s already in your account. Nothing to keep.';
        label.textContent = done ? 'Opened' : 'Open your link';
        cap.textContent = done ? 'Opened and clicked around. It stays at this address.' : 'Open it and click around.';
      } else {
        addr.textContent = 'the claim link from your agent';
        note.textContent = done ? 'Kept. The address doesn’t change.' : 'Made without a token, so it lasts 24 hours.';
        label.textContent = done ? 'Kept' : 'Keep';
        cap.textContent = done
          ? 'From now on your agent needs your deploy token to redeploy. This page gives you a prompt that carries it.'
          : 'Press Keep within 24 hours, or the app is deleted. No email will remind you.';
      }
    };
    claimMode = m => { mode = m; store.set('embarko-replit-auth', m); render(); };
    modes.forEach(b => b.addEventListener('click', () => claimMode(b.dataset.rpMode)));
    btn.addEventListener('click', () => setStep(4, !state.steps[4]));
    stepHooks.push(i => { if (i === 4) render(); });
    render();
  }

  /* 05 · The dump route. Which database, then three moves in the right order:
     download the dump, delete it from Replit, then download the project zip. */
  const dump = $('[data-rp-dump]');
  if (dump) {
    const dbBtns = $$('[data-rp-db]', dump);
    const src = $('[data-rp-db-src]', dump);
    const dbNote = $('[data-rp-db-note]', dump);
    const DB = {
      dev: ['$DATABASE_URL', '  the development database'],
      prod: ['"production connection string"', '  from the Database tool’s settings: your published app’s live data'],
    };
    const setDb = k => {
      dbBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rpDb === k)));
      src.textContent = DB[k][0];
      dbNote.textContent = DB[k][1];
    };
    dbBtns.forEach(b => b.addEventListener('click', () => setDb(b.dataset.rpDb)));

    const fReplit = $('[data-rp-f="replit"]', dump);
    const fPc = $('[data-rp-f="pc"]', dump);
    const fZip = $('[data-rp-f="zip"]', dump);
    const zipNote = $('[data-rp-zip-note]', dump);
    const acts = Object.fromEntries($$('[data-rp-act]', dump).map(b => [b.dataset.rpAct, b]));
    const resetBtn = $('[data-rp-reset]', dump);
    const cap = $('[data-rp-dump-cap]', dump);
    const finalCap = cap.textContent;
    const st = {};
    const render = () => {
      fReplit.classList.toggle('is-gone', !!st.del);
      fPc.classList.toggle('is-gone', !st.get);
      fZip.classList.toggle('is-gone', !st.zip);
      fZip.classList.toggle('is-bad', !!(st.zip && st.dumpInZip));
      fZip.classList.toggle('is-ok', !!(st.zip && !st.dumpInZip));
      zipNote.textContent = st.dumpInZip ? 'includes backup.dump' : 'files only, no dump';
      Object.entries(acts).forEach(([k, b]) => b.setAttribute('aria-pressed', String(!!st[k])));
      const ok = st.get && st.del && st.zip && !st.dumpInZip;
      dump.classList.toggle('is-ok', !!ok);
      dump.classList.toggle('is-bad', !!((st.zip && st.dumpInZip) || st.lost));
      resetBtn.hidden = !(st.get || st.del || st.zip);
    };
    const reset = () => {
      Object.assign(st, { get: false, del: false, zip: false, dumpInZip: false, lost: false });
      render();
      cap.textContent = 'pg_dump wrote backup.dump into the Replit file tree. Now move it, in the right order.';
    };
    const act = k => {
      if (st[k] || st.lost) return;
      if (k === 'get') {
        st.get = true;
        flash(fPc);
        cap.textContent = 'Downloaded. Keep it outside the folder you upload.';
      } else if (k === 'del') {
        st.del = true;
        if (st.get) cap.textContent = 'Deleted from Replit, so the project zip won’t carry it.';
        else { st.lost = true; cap.textContent = 'Deleted before you downloaded it, so the export is gone. Start over and download it first.'; }
      } else {
        st.zip = true;
        st.dumpInZip = !st.del;
        flash(fZip);
        cap.textContent = st.dumpInZip
          ? 'This zip includes backup.dump, so it would ship with your app. Delete the dump from Replit before you download the zip.'
          : 'A clean zip: files only.';
      }
      render();
      if (st.get && st.del && st.zip && !st.dumpInZip) cap.textContent = finalCap;
    };
    Object.entries(acts).forEach(([k, b]) => b.addEventListener('click', () => act(k)));
    resetBtn.addEventListener('click', reset);

    selfPlaying(dump, {
      settle: () => { setDb('prod'); Object.assign(st, { get: true, del: true, zip: true, dumpInZip: false, lost: false }); render(); },
      onStop: () => { if (!st.get && !st.del && !st.zip) cap.textContent = 'Your turn: try the three moves, in any order.'; },
      autoplay: async (alive, cursor) => {
        reset();
        setDb('dev');
        await wait(1500);
        if (!alive()) return;
        cursor.show(dbBtns[1], 40, 50);
        await cursor.moveTo(dbBtns[1], alive, 600);
        if (!alive()) return;
        await cursor.press(alive);
        setDb('prod');
        await wait(1500);
        for (const k of ['get', 'del', 'zip']) {
          if (!alive()) return;
          await cursor.moveTo(acts[k], alive, 650);
          if (!alive()) return;
          await cursor.press(alive);
          act(k);
          await wait(1500);
        }
        if (!alive()) return;
        await wait(1200);
        if (!alive()) return;
        cursor.hide();
        reset();
        cap.textContent = 'Your turn: try the three moves in another order and see what ships.';
      },
    });
    if (!reduced) { reset(); setDb('prod'); }
  }

  /* 05 · Secrets. A write alone doesn't reach the running app; apply does. */
  const env = $('[data-rp-env]');
  if (env) {
    const w = $('[data-rp-write]', env);
    const a = $('[data-rp-apply]', env);
    const val = $('[data-rp-env-val]', env);
    const read = $('[data-rp-env-read]', env);
    const cap = $('[data-rp-env-cap]', env);
    const finalCap = cap.textContent;
    const st = { written: false, applied: false };
    const render = () => {
      env.classList.toggle('is-written', st.written);
      env.classList.toggle('is-applied', st.applied);
      val.textContent = st.written ? '••••••••••' : 'no value yet';
      read.textContent = st.applied ? 'set' : 'not set';
      w.setAttribute('aria-pressed', String(st.written));
      a.setAttribute('aria-pressed', String(st.applied));
    };
    const reset = () => { st.written = false; st.applied = false; render(); cap.textContent = 'Your running app can’t see API_KEY yet.'; };
    const doWrite = () => {
      if (st.written) return;
      st.written = true;
      render();
      cap.textContent = 'Written. The running app still reads “not set”: a write alone doesn’t reach it.';
    };
    const doApply = () => {
      if (!st.written) { cap.textContent = 'Nothing to apply yet. Write the value first.'; return; }
      st.applied = true;
      render();
      cap.textContent = finalCap;
    };
    w.addEventListener('click', doWrite);
    a.addEventListener('click', doApply);
    selfPlaying(env, {
      settle: () => { st.written = true; st.applied = true; render(); },
      onStop: () => { if (!st.written) cap.textContent = 'Your turn: write the value, then apply it.'; },
      autoplay: async (alive, cursor) => {
        reset();
        await wait(700);
        if (!alive()) return;
        cursor.show(w, 50, 60);
        await cursor.moveTo(w, alive, 650);
        if (!alive()) return;
        await cursor.press(alive);
        doWrite();
        await wait(2200);
        if (!alive()) return;
        await cursor.moveTo(a, alive, 600);
        if (!alive()) return;
        await cursor.press(alive);
        doApply();
        await wait(2200);
        if (!alive()) return;
        cursor.hide();
        reset();
        cap.textContent = 'Your turn: write the value, then apply it.';
      },
    });
    if (!reduced) reset();
  }

  /* FAQ: links to #fit open that answer. */
  const fitItem = $('#fit');
  if (fitItem) {
    const openFit = () => { fitItem.open = true; };
    docOn('click', e => { if (e.target.closest('a[href="#fit"]')) openFit(); });
    if (location.hash === '#fit') openFit();
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
