/* ==========================================================================
   Embarko · Guide article: interaction layer
   "How to Deploy from Cursor with One Prompt". The engine is the one from the
   approved "How to deploy an AI app" page; this guide's scenes are at the end.
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
  const state = { appName: 'your-app-name', steps: [false, false, false, false], finale: false, live: false };
  const LOCAL = 'localhost:3000';
  const STEPS_KEY = 'embarko-steps-cursor';
  const PROMPT_STEP = 1; /* copying the deployment prompt is part of step 2 here */
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
  $$('.rv, .chapter > h2, .chapter > .eyebrow').forEach(el => revealIO.observe(el));
  $$('.compare tbody tr').filter(r => !r.closest('[data-cu-close]')).forEach(el => revealIO.observe(el));

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
    toast('Prompt copied. Paste it into a new agent chat in Cursor.');
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
    const data = { title: 'How to Deploy from Cursor with One Prompt', text: 'Paste one prompt into Cursor’s agent and get a live HTTPS link, plus the sandbox fix.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to someone whose Cursor app only runs on their laptop.' : data.url, ok);
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
        : deployed ? 'Your Cursor app has a live link. Share it, and keep improving it in Cursor.'
        : 'That’s the whole trip. Now take your own app there: <a href="#steps">do the 4 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : 'On your laptop';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Only you can open it';
    if (arrivalNote) arrivalNote.textContent = live ? 'Anyone with the link can open it, any time.' : 'Finish the four steps and your app gets a live link.';
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
      if (whisper) whisper.textContent = 'Live. Out of Cursor, through the sandbox, open to anyone with the link.';
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
    local: 'Your app runs in Cursor at localhost:3000. Only you can open it.',
    stuck: 'Your app is still on your laptop, at localhost:3000.',
    near: 'Your app is one prompt away from a live link.',
    live: () => `Your app is live at ${state.appName}.embarko.app.`,
  };

  function updateJourneyAddr(animate) {
    if (!addrEl) return;
    const text = state.live ? `${state.appName}.embarko.app` : LOCAL;
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
    localhost: ['Localhost', 'The name your computer uses for itself. A link that starts with localhost only works on the machine that made it.'],
    server: ['Server', 'A computer that stays on all the time, so the apps on it are always reachable.'],
    hosting: ['Hosting', 'A server that stays on, your app’s files on it and a public address, all together.'],
    dockerfile: ['Dockerfile', 'A recipe file some hosts use to build and run an app. Embarko builds the app itself and rejects an upload that includes one.'],
    env: ['Environment variables', 'Settings kept on the host, outside your code. Secret keys go here, not in your project files.'],
    sandbox: ['Cursor’s sandbox', 'A restricted space where Cursor runs agent commands. Network access inside it is blocked by default and opened by your network mode and sandbox.json.'],
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
     Scenes for "How to deploy from Cursor with one prompt" (14 Oct 2026).
     Same engine, same colour script; one module per scene. Every demo plays
     itself once when it scrolls into view, then hands over to the reader.
     ========================================================================== */

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
  const replayFor = (fig, fn) => $('[data-cu-replay]', fig)?.addEventListener('click', () => { if (!reduced) fn(); });

  /* 01 · Spot the problem. localhost:3000 goes to a friend's laptop and finds
     nothing; the cursor blames "localhost", then sends a hosted link instead. */
  const spot = $('[data-cu-spot]');
  if (spot) {
    const friend = $('[data-spot-friend]', spot);
    const msg = $('[data-spot-msg]', spot);
    const addr = $('[data-spot-addr]', spot);
    const note = $('[data-spot-note]', spot);
    const cap = $('[data-spot-caption]', spot);
    const parts = $$('[data-spot-part]', spot);
    const sendBtn = $('[data-spot-send]', spot);
    const sendLabel = $('span', sendBtn);
    const cursor = makeCursor(spot);
    let timers = [];
    let mode = 'local';
    let autoId = 0;
    const later = (fn, ms) => timers.push(setTimeout(fn, reduced ? 0 : ms));
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const say = t => { cap.textContent = t; };

    const send = kind => {
      clearTimers();
      mode = kind;
      spot.classList.toggle('is-live', kind === 'live');
      spot.classList.remove('is-hosted');
      msg.textContent = kind === 'live' ? `${state.appName}.embarko.app` : 'localhost:3000';
      msg.classList.remove('is-flying');
      void msg.offsetWidth;
      if (!reduced) msg.classList.add('is-flying');
      sendLabel.textContent = kind === 'live' ? 'Send localhost:3000 again' : 'Send a hosted link instead';
      friend.dataset.view = 'idle';
      addr.textContent = 'waiting for a link';
      note.innerHTML = '&nbsp;';
      say(kind === 'live' ? 'Sending the hosted link…' : 'Sending localhost:3000 to a friend…');
      later(() => {
        addr.textContent = msg.textContent;
        friend.dataset.view = 'load';
        say('Your friend opens the link…');
      }, 850);
      later(() => {
        if (kind === 'live') {
          friend.dataset.view = 'app';
          note.textContent = 'hosted · open to anyone';
          spot.classList.add('is-hosted');
          say('It opens. A server that stays on, your app’s files on it and a public address: together that’s called hosting.');
        } else {
          friend.dataset.view = 'fail';
          note.textContent = 'localhost = this laptop · no app here';
          say('Nothing. The link points at your friend’s own computer, where your app doesn’t exist. Which part of the link is to blame?');
        }
      }, 1950);
    };
    const pick = which => {
      parts.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.spotPart === which)));
      spot.dataset.pick = which;
      spot.classList.toggle('is-solved', which === 'host');
      say(which === 'host'
        ? '“Localhost” simply means “this computer”, so a link that starts with it only works for you. Your app needs a host instead.'
        : 'Not quite. :3000 is the port, the number your app listens on. The trouble is the computer the link points at.');
    };
    const reset = () => {
      clearTimers();
      spot.classList.remove('is-live', 'is-hosted', 'is-solved');
      delete spot.dataset.pick;
      parts.forEach(b => b.setAttribute('aria-pressed', 'false'));
      friend.dataset.view = 'idle';
      addr.textContent = 'waiting for a link';
      sendLabel.textContent = 'Send a hosted link instead';
      mode = 'local';
    };
    const stopAuto = () => { autoId++; cursor.hide(); spot.classList.add('is-played'); };

    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      spot.classList.remove('is-played');
      reset();
      send('local');
      await wait(3700);
      if (!alive()) return;
      cursor.show(parts[1], 30, 60);
      await cursor.moveTo(parts[0], alive);
      if (!alive()) return;
      await cursor.press(alive);
      pick('host');
      await wait(2800);
      if (!alive()) return;
      await cursor.moveTo(sendBtn, alive);
      if (!alive()) return;
      await cursor.press(alive);
      send('live');
      await wait(3400);
      if (!alive()) return;
      cursor.hide();
      say('Your turn: send either link, or tap the part of localhost:3000 that’s the problem.');
      spot.classList.add('is-played');
    }

    parts.forEach(b => b.addEventListener('click', () => { stopAuto(); pick(b.dataset.spotPart); }));
    sendBtn.addEventListener('click', () => { stopAuto(); send(mode === 'live' ? 'local' : 'live'); });
    replayFor(spot, autoplay);
    reset();
    onceInView(spot, () => {
      if (reduced) { spot.classList.add('is-played'); send('local'); return; }
      setTimeout(() => { if (!spot.classList.contains('is-played')) autoplay(); }, 400);
    }, .45);
  }

  /* 02 · The tab pile-up: every job on the usual route opens another tab. */
  const pile = $('[data-cu-pile]');
  if (pile) {
    const items = $$('[data-pile-item]', pile);
    const tabs = $$('[data-pile-tab]', pile);
    const views = $$('[data-pile-view]', pile);
    const countEl = $('[data-pile-count]', pile);
    const labelEl = $('[data-pile-label]', pile);
    let open = -1;
    let lastAct = -1;
    const show = i => {
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-pressed', String(k === i)); });
      views.forEach((v, k) => v.classList.toggle('is-on', k === i));
      items.forEach((it, k) => it.classList.toggle('is-active', k + 1 === i));
    };
    const setOpen = n => {
      if (n === open) return;
      open = n;
      tabs.forEach((t, k) => t.classList.toggle('is-open', k <= n));
      countEl.textContent = String(n + 1);
      labelEl.textContent = n === 0 ? 'tab open · it runs' : 'tabs open · still no link';
      pile.classList.toggle('is-full', n === tabs.length - 1);
      if (!reduced) { countEl.classList.remove('is-ticking'); void countEl.offsetWidth; countEl.classList.add('is-ticking'); }
    };
    onScrub(pile, p => {
      const line = innerHeight * .55;
      let act = 0;
      items.forEach((it, k) => {
        const r = it.getBoundingClientRect();
        if (r.top < line) act = k + 1;
        it.classList.toggle('is-passed', r.bottom <= line);
      });
      if (p >= .999) act = items.length;
      setOpen(act);
      if (act !== lastAct) { lastAct = act; show(act); }
    });
    tabs.forEach((t, k) => t.addEventListener('click', () => { if (t.classList.contains('is-open')) show(k); }));
    setOpen(0);
  }

  /* 03 · The same tabs close as each usual-route job turns into one prompt. */
  const closer = $('[data-cu-close]');
  if (closer) {
    const rows = $$('tbody tr', closer);
    const tabs = $$('[data-close-tab]', closer);
    const nEl = $('[data-close-n]', closer);
    const label = $('[data-close-label]', closer);
    let last = -1;
    let playing = false;
    let playId = 0;
    const draw = k => {
      if (k === last) return;
      last = k;
      rows.forEach((r, i) => r.classList.toggle('in', i < k));
      tabs.forEach((t, i) => t.classList.toggle('is-closed', i < k));
      const left = rows.length - k;
      nEl.textContent = String(left);
      label.textContent = left === rows.length ? 'tabs on the usual route'
        : left === 0 ? 'tabs left. One prompt, one live link.'
        : left === 1 ? 'tab left' : 'tabs left';
      closer.classList.toggle('is-clear', left === 0);
    };
    onScrub(closer, p => { if (!playing) draw(Math.round(clamp(p / .85) * rows.length)); });
    $('[data-close-replay]', closer)?.addEventListener('click', async () => {
      const my = ++playId;
      playing = true;
      draw(0);
      for (let k = 1; k <= rows.length; k++) {
        await wait(reduced ? 0 : 700);
        if (my !== playId) return;
        draw(k);
      }
      playing = false;
    });
  }

  /* 04 · The agent's run, as a timeline. It plays once; then the reader scrubs
     it by dragging, tapping the track or with the arrow keys. */
  const run = $('[data-cu-run]');
  if (run) {
    const handle = $('[data-run-handle]', run);
    const track = $('[data-run-track]', run);
    const evs = $$('[data-run-at]', run);
    const stateEl = $('[data-run-state]', run);
    const cap = $('[data-run-caption]', run);
    const MARKS = [0, .25, .5, .75, 1];
    const ZONES = [
      [0, 'ready', 'Paste the prompt', 'You paste the deployment prompt into a new agent chat and send it.'],
      [.22, 'packing', 'Pack', 'The agent runs a command in your terminal: it packs the folder, leaving out node_modules, .git and .env.'],
      [.44, 'uploading', 'Upload', 'It uploads the archive to Embarko and sends cursor as its agent name. “202 Accepted” only means the build has started.'],
      [.6, 'checking every 10 s', 'Check', 'It checks the status about every 10 seconds until it says live.'],
      [.94, 'live', 'Live', 'It reports the live link. Once you keep the app, its deploy history shows that cursor made this deploy.'],
    ];
    let t = 0;
    let lastZone = -1;
    const render = v => {
      t = clamp(v);
      run.style.setProperty('--t', t.toFixed(4));
      evs.forEach(el => el.classList.toggle('is-in', t >= +el.dataset.runAt));
      let z = 0;
      ZONES.forEach((zn, k) => { if (t >= zn[0]) z = k; });
      run.classList.toggle('is-packed', t >= .22);
      run.classList.toggle('is-live', t >= .94);
      handle.setAttribute('aria-valuenow', String(Math.round(t * 100)));
      if (z === lastZone) return;
      lastZone = z;
      run.dataset.zone = String(z);
      stateEl.textContent = ZONES[z][1];
      handle.setAttribute('aria-valuetext', ZONES[z][2]);
      cap.textContent = ZONES[z][3];
    };
    const fromX = x => {
      const r = track.getBoundingClientRect();
      return clamp((x - r.left - r.width * .1) / (r.width * .8));
    };

    let autoId = 0;
    const stopAuto = () => { autoId++; run.classList.remove('is-auto'); run.classList.add('is-played'); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      run.classList.remove('is-played');
      run.classList.add('is-auto');
      render(0);
      await wait(600);
      let from = 0;
      for (const to of MARKS.slice(1)) {
        if (!alive()) return;
        const f = from;
        await tween(1300, k => render(lerp(f, to, k)), alive);
        if (!alive()) return;
        from = to;
        await wait(800);
      }
      if (!alive()) return;
      run.classList.remove('is-auto');
      run.classList.add('is-played');
      cap.textContent = 'Your turn: drag the timeline, or use the arrow keys, to see any moment of the run.';
    }

    let dragging = false;
    track.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stopAuto();
      dragging = true;
      track.classList.add('is-dragging');
      track.setPointerCapture?.(e.pointerId);
      render(fromX(e.clientX));
      handle.focus({ preventScroll: true });
    });
    track.addEventListener('pointermove', e => { if (dragging) render(fromX(e.clientX)); });
    const endDrag = () => { dragging = false; track.classList.remove('is-dragging'); };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', e => {
      let v = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = MARKS.find(m => m > t + .001) ?? 1;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = [...MARKS].reverse().find(m => m < t - .001) ?? 0;
      if (e.key === 'Home') v = 0;
      if (e.key === 'End') v = 1;
      if (v == null) return;
      e.preventDefault();
      stopAuto();
      render(v);
    });
    replayFor(run, autoplay);
    render(0);
    onceInView(run, () => {
      if (reduced) { render(1); run.classList.add('is-played'); return; }
      setTimeout(() => { if (!run.classList.contains('is-played')) autoplay(); }, 350);
    }, .5);
  }

  /* 05 · The sandbox wall. The deploy's requests cross Cursor's sandbox only
     for hosts in sandbox.json; approving the command runs it outside. */
  const sbx = $('[data-cu-sbx]');
  if (sbx) {
    const HOSTS = ['embarko.ai', 'ship.embarko.ai', '*.embarko.app'];
    const code = $('[data-sbx-code]', sbx);
    const note = $('[data-sbx-note]', sbx);
    const toggles = $$('[data-sbx-host]', sbx);
    const adminBtn = $('[data-sbx-admin]', sbx);
    const lanes = $$('[data-lane]', sbx);
    const out = $('[data-sbx-out]', sbx);
    const runBtn = $('[data-sbx-run]', sbx);
    const approveBtn = $('[data-sbx-approve]', sbx);
    const cap = $('[data-sbx-caption]', sbx);
    const cursor = makeCursor(sbx);
    const allow = [false, false, false];
    let admin = false;
    let runId = 0;
    let autoId = 0;

    const renderCode = fresh => {
      const on = HOSTS.filter((h, i) => allow[i]);
      const list = !on.length ? '"allow": []'
        : `"allow": [\n${on.map((h, i) => `      <span class="cu-sbx__h${h === fresh ? ' is-new' : ''}">"${h}"</span>${i < on.length - 1 ? ',' : ''}`).join('\n')}\n    ]`;
      code.innerHTML = `{\n  "networkPolicy": {\n    ${list}\n  }\n}`;
    };
    const log = (text, cls = '') => {
      const s = document.createElement('span');
      s.className = `cu-sbx__l ${cls}`;
      s.textContent = text;
      out.append(s);
    };
    const idle = () => {
      out.textContent = '';
      log('$ press “Run the deploy”', 'cu-sbx__l--soft');
    };
    const resetNet = () => {
      runId++;
      lanes.forEach(l => { l.dataset.st = ''; l.style.setProperty('--x', '0'); l.style.setProperty('--y', '0'); l.classList.remove('is-over'); });
      approveBtn.hidden = true;
      sbx.classList.remove('is-ok', 'is-blocked');
    };
    const syncLanes = () => lanes.forEach((l, i) => l.classList.toggle('is-allowed', allow[i] && !admin));
    const setHost = (i, on) => {
      allow[i] = on;
      toggles[i].setAttribute('aria-pressed', String(on));
      $('use', toggles[i]).setAttribute('href', on ? '#i-check' : '#i-plus');
      renderCode(on ? HOSTS[i] : null);
      syncLanes();
      resetNet();
      idle();
    };
    const setAdmin = on => {
      admin = on;
      adminBtn.setAttribute('aria-pressed', String(on));
      note.hidden = !on;
      sbx.classList.toggle('is-admin', on);
      syncLanes();
      resetNet();
      idle();
    };

    const fly = async (lane, how, alive) => {
      lane.classList.toggle('is-over', how === 'over');
      lane.dataset.st = 'go';
      if (reduced) {
        lane.style.setProperty('--x', how === 'block' ? '.4' : '1');
        lane.dataset.st = how === 'block' ? 'blocked' : 'ok';
        return;
      }
      if (how === 'block') {
        await tween(650, k => lane.style.setProperty('--x', (k * .47).toFixed(3)), alive);
        if (!alive()) return;
        lane.dataset.st = 'blocked';
        await tween(300, k => lane.style.setProperty('--x', (.47 - k * .07).toFixed(3)), alive);
      } else {
        await tween(1050, k => {
          lane.style.setProperty('--x', k.toFixed(3));
          if (how === 'over') lane.style.setProperty('--y', (Math.sin(Math.PI * k) * 18).toFixed(1));
        }, alive);
        if (alive()) lane.dataset.st = 'ok';
      }
    };

    async function deploy(outside = false) {
      resetNet();
      const id = runId;
      const alive = () => id === runId;
      out.textContent = '';
      const ok = HOSTS.map((h, i) => outside || (!admin && allow[i]));
      log(outside ? '$ deploy · approved, running outside the sandbox' : '$ deploy · running inside Cursor’s sandbox', 'cu-sbx__l--soft');
      cap.textContent = outside ? 'Approved: the command runs again outside the sandbox.' : 'The agent runs the deploy inside Cursor’s sandbox…';
      await Promise.all(lanes.map((l, i) => wait(reduced ? 0 : i * 240).then(() => (alive() ? fly(l, outside ? 'over' : ok[i] ? 'pass' : 'block', alive) : null))));
      if (!alive()) return;
      HOSTS.forEach((h, i) => { if (!ok[i]) log(`${h} · network error, blocked by the sandbox`, 'cu-sbx__l--bad'); });
      if (ok[1]) {
        log('upload → ship.embarko.ai · 202 Accepted');
        await wait(reduced ? 0 : 600);
        if (!alive()) return;
        log(`status: live · https://${state.appName}.embarko.app`, 'cu-sbx__l--ok');
        sbx.classList.add('is-ok');
        cap.textContent = !ok.every(Boolean)
          ? 'The upload went through, but not every Embarko host is allowed. Add all three so nothing else gets blocked.'
          : outside ? 'Live. You approved the command, so it ran outside the sandbox. Check that it only sends your project to ship.embarko.ai.'
          : 'Live. All three hosts are in sandbox.json, so the deploy reaches Embarko from inside the sandbox.';
      } else {
        log('upload failed · nothing was deployed', 'cu-sbx__l--bad');
        sbx.classList.add('is-blocked');
        if (admin) {
          cap.textContent = 'Blocked. Your team admin’s network allowlist replaces your sandbox.json, so ask the admin to add these hosts.';
        } else {
          cap.textContent = 'Blocked, and nothing was deployed. Allow Embarko’s hosts in sandbox.json, or approve the command.';
          approveBtn.hidden = false;
        }
      }
    }

    const stopAuto = () => { autoId++; cursor.hide(); sbx.classList.add('is-played'); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      sbx.classList.remove('is-played');
      [0, 1, 2].forEach(i => setHost(i, false));
      setAdmin(false);
      cap.textContent = 'An empty allow list. Watch the deploy run into the sandbox wall.';
      cursor.show(runBtn, 50, 46);
      await wait(800);
      if (!alive()) return;
      await cursor.press(alive);
      await deploy();
      if (!alive()) return;
      await wait(1800);
      if (!alive()) return;
      cap.textContent = 'Now add Embarko’s three hosts to networkPolicy.allow…';
      for (const i of [0, 1, 2]) {
        await cursor.moveTo(toggles[i], alive, 650);
        if (!alive()) return;
        await cursor.press(alive);
        setHost(i, true);
        cap.textContent = 'Now add Embarko’s three hosts to networkPolicy.allow…';
        await wait(380);
        if (!alive()) return;
      }
      await cursor.moveTo(runBtn, alive);
      if (!alive()) return;
      await cursor.press(alive);
      await deploy();
      if (!alive()) return;
      cursor.hide();
      await wait(2200);
      if (!alive()) return;
      cap.textContent = 'Your turn: take a host out, switch on a team allowlist, or empty the list and approve the command instead.';
      sbx.classList.add('is-played');
    }

    toggles.forEach((b, i) => b.addEventListener('click', () => { stopAuto(); setHost(i, !allow[i]); cap.textContent = 'sandbox.json changed. Run the deploy.'; }));
    adminBtn.addEventListener('click', () => { stopAuto(); setAdmin(!admin); cap.textContent = admin ? 'Your team admin’s allowlist now replaces your sandbox.json. Run the deploy.' : 'Back to your own sandbox.json. Run the deploy.'; });
    runBtn.addEventListener('click', () => { stopAuto(); deploy(); });
    approveBtn.addEventListener('click', () => { stopAuto(); deploy(true); });
    $('.cu-sbx__grid', sbx).addEventListener('pointerdown', () => { if (sbx.classList.contains('is-played')) return; stopAuto(); }, { capture: true });
    replayFor(sbx, autoplay);

    [0, 1, 2].forEach(i => setHost(i, false));
    onceInView(sbx, () => {
      if (reduced) { [0, 1, 2].forEach(i => setHost(i, true)); sbx.classList.add('is-played'); deploy(); return; }
      setTimeout(() => { if (!sbx.classList.contains('is-played')) autoplay(); }, 400);
    }, .35);
  }

  /* 06 · Step 1: opening the right folder ticks the step. */
  const opener = $('[data-cu-open]');
  if (opener) {
    const rows = $$('[data-open-dir]', opener);
    const msg = $('[data-open-msg]', opener);
    const sync = () => {
      const done = !!state.steps[0];
      opener.classList.toggle('is-open', done);
      if (done) {
        rows.forEach(r => r.setAttribute('aria-pressed', String(r.dataset.openDir === 'my-app')));
        msg.textContent = 'Opened my-app. This folder is what gets uploaded.';
      }
    };
    rows.forEach(r => {
      r.setAttribute('aria-pressed', 'false');
      r.addEventListener('click', () => {
        if (r.dataset.openDir === 'my-app') { setStep(0, true); sync(); return; }
        rows.forEach(x => x.setAttribute('aria-pressed', String(x === r)));
        opener.classList.remove('is-open');
        msg.textContent = `${r.dataset.openDir} doesn’t hold your app. Open the folder your project is in.`;
      });
    });
    stepHooks.push((i, done) => {
      if (i !== 0) return;
      if (!done) {
        rows.forEach(x => x.setAttribute('aria-pressed', 'false'));
        msg.textContent = 'Pick the folder that holds your app.';
      }
      sync();
    });
    sync();
  }

  /* 06 · Step 2: what each sign-in answer leads to. */
  const signin = $('[data-cu-signin]');
  if (signin) {
    const opts = $$('[data-signin]', signin);
    const outEl = $('[data-signin-out]', signin);
    const SAY = {
      connector: ['no', 'Skip this one. Cursor doesn’t have an Embarko connector; Claude is the only AI tool with one.'],
      email: ['yes', 'Give your email, then paste the token from your inbox. With a token, the app goes into your account and is kept from the start.'],
      token: ['yes', 'Create a token at embarko.ai/app/tokens and paste it into the chat. The app goes into your account and is kept from the start.'],
      skip: ['wait', 'The app still works for 24 hours. Keep it in step 4 so it stays.'],
    };
    opts.forEach(b => b.addEventListener('click', () => {
      const [kind, text] = SAY[b.dataset.signin];
      opts.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      signin.dataset.answer = kind;
      outEl.textContent = text;
      if (!reduced) { outEl.classList.remove('is-new'); void outEl.offsetWidth; outEl.classList.add('is-new'); }
    }));
  }

  /* 06 · Step 3: the app-name rules, live. It types a bad name once, fixes it,
     then the reader tries their own; "Use this name" renames the whole page. */
  const namer = $('[data-cu-name]');
  if (namer) {
    const input = $('[data-name-input]', namer);
    const rules = { len: $('[data-rule="len"]', namer), chars: $('[data-rule="chars"]', namer), ends: $('[data-rule="ends"]', namer) };
    const lenEl = $('[data-name-len]', namer);
    const verdict = $('[data-name-verdict]', namer);
    const useBtn = $('[data-name-use]', namer);
    let autoId = 0;
    const check = () => {
      const v = input.value;
      const r = { len: v.length >= 3 && v.length <= 63, chars: v.length > 0 && /^[a-z0-9-]+$/.test(v), ends: v.length > 0 && !/^-|-$/.test(v) };
      Object.entries(r).forEach(([k, ok]) => { rules[k].dataset.ok = ok ? 'yes' : 'no'; });
      lenEl.textContent = String(v.length);
      const ok = r.len && r.chars && r.ends;
      namer.classList.toggle('is-valid', ok);
      useBtn.disabled = !ok;
      verdict.textContent = ok ? `${v}.embarko.app follows the rules. It must also be unique across Embarko: if it’s taken, the agent picks another.`
        : !r.chars ? 'Only lowercase letters, numbers and dashes.'
        : !r.ends ? 'Take the dash off the start or the end.'
        : 'Use 3 to 63 characters.';
      return ok;
    };
    input.addEventListener('input', () => { autoId++; check(); });
    input.addEventListener('focus', () => { autoId++; });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') useBtn.click(); });
    useBtn.addEventListener('click', () => {
      if (!check()) return;
      setAppName(input.value);
      toast(`Every example on this page now uses ${state.appName}.embarko.app.`);
    });
    input.value = state.appName;
    check();
    onceInView(namer, async () => {
      if (reduced) return;
      const my = ++autoId;
      const alive = () => my === autoId;
      const typeIn = async text => {
        for (let k = 0; k <= text.length; k++) {
          if (!alive()) return;
          input.value = text.slice(0, k);
          check();
          await wait(90);
        }
      };
      await wait(500);
      await typeIn('-My_App');
      if (!alive()) return;
      await wait(1300);
      await typeIn('my-app');
      if (!alive()) return;
      await wait(2200);
      if (!alive()) return;
      input.value = state.appName;
      check();
    }, .7);
  }

  /* 06 · Step 4: the reader drives the "make it permanent" conversation. */
  const claim = $('[data-cu-claim]');
  if (claim) {
    const logEl = $('[data-claim-log]', claim);
    const next = $('[data-claim-next]', claim);
    const label = $('[data-claim-label]', claim);
    const badge = $('[data-claim-badge]', claim);
    const first = logEl.firstElementChild.cloneNode(true);
    const LABELS = ['Make it permanent', 'you@example.com', 'Paste the token'];
    const SCRIPT = [
      ['Make my app permanent.', () => 'What’s your email? Embarko will email you a token.'],
      ['you@example.com', () => 'Embarko emailed you a token. Paste it here.'],
      ['••••••••••••', () => `Redeployed ${state.appName} with your token. The link stays the same: ${state.appName}.embarko.app.`],
    ];
    let at = 0;
    let busy = false;
    const bubble = (who, text) => {
      const li = document.createElement('li');
      li.className = `cu-claim__b cu-claim__b--${who}`;
      li.textContent = text;
      logEl.append(li);
      return li;
    };
    const reset = () => {
      logEl.replaceChildren(first.cloneNode(true));
      $$('[data-app-name]', logEl).forEach(e => { e.textContent = state.appName; });
      at = 0;
      label.textContent = LABELS[0];
      claim.classList.remove('is-kept');
      badge.textContent = '24 h link';
    };
    const finish = () => {
      at = SCRIPT.length;
      claim.classList.add('is-kept');
      badge.textContent = 'Kept';
      label.textContent = 'Start over';
    };
    const fill = () => {
      reset();
      SCRIPT.forEach(([me, ai]) => { bubble('me', me); bubble('ai', ai()); });
      finish();
    };
    next.addEventListener('click', async () => {
      if (busy) return;
      if (at >= SCRIPT.length) { reset(); return; }
      const [me, ai] = SCRIPT[at];
      busy = true;
      next.disabled = true;
      bubble('me', me);
      const typing = bubble('ai', '…');
      typing.classList.add('is-typing');
      await wait(reduced ? 0 : 750);
      typing.classList.remove('is-typing');
      typing.textContent = ai();
      at++;
      busy = false;
      next.disabled = false;
      if (at === SCRIPT.length) { finish(); setStep(3, true); } else label.textContent = LABELS[at];
    });
    stepHooks.push((i, done) => {
      if (i !== 3 || busy) return;
      if (done && at < SCRIPT.length) fill();
      if (!done && at >= SCRIPT.length) reset();
    });
    if (state.steps[3]) fill();
  }

  /* 07 · Setting a key is a write; applying it is what reaches the running app. */
  const env = $('[data-cu-env]');
  if (env) {
    const kinds = $$('[data-env-kind]', env);
    const setBtn = $('[data-env-set]', env);
    const applyBtn = $('[data-env-apply]', env);
    const stored = $('[data-env-stored]', env);
    const empty = $('[data-env-empty]', env);
    const app = $('[data-env-app]', env);
    const gate = $('[data-env-gate]', env);
    const cap = $('[data-env-caption]', env);
    const cursor = makeCursor(env);
    const st = { kind: 'server', set: false, applied: false };
    let autoId = 0;
    const draw = () => {
      const isStatic = st.kind === 'static';
      kinds.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.envKind === st.kind)));
      env.dataset.kind = st.kind;
      stored.hidden = !st.set;
      empty.hidden = st.set;
      empty.textContent = isStatic ? 'Static sites can’t have environment variables' : 'No environment variables yet';
      env.classList.toggle('is-set', st.set);
      env.classList.toggle('is-applied', st.applied);
      app.textContent = isStatic ? 'Static site · no environment variables' : st.applied ? 'API key: loaded' : 'API key: missing';
      gate.textContent = isStatic ? 'server apps only' : st.applied ? 'applied' : st.set ? 'not applied yet' : 'nothing to apply';
      setBtn.disabled = isStatic;
      applyBtn.disabled = isStatic || !st.set || st.applied;
      $('span', setBtn).textContent = st.set ? 'Change the API key' : 'Set the API key';
    };
    const doSet = () => {
      st.set = true;
      st.applied = false;
      draw();
      cap.textContent = 'Stored on Embarko, encrypted. The running app still doesn’t have it: a write alone doesn’t reach the running app.';
    };
    const doApply = () => {
      st.applied = true;
      draw();
      cap.textContent = 'Applied. Now the running app reads the key.';
    };
    const doKind = k => {
      st.kind = k;
      st.set = false;
      st.applied = false;
      draw();
      cap.textContent = k === 'static' ? 'Static sites can’t have environment variables, only server apps can.' : 'A server app: set a key, then apply it.';
    };
    const stopAuto = () => { autoId++; cursor.hide(); env.classList.add('is-played'); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      env.classList.remove('is-played');
      doKind('server');
      cap.textContent = 'You kept the app. Now the agent sets your API key…';
      cursor.show(setBtn, 40, 50);
      await wait(900);
      if (!alive()) return;
      await cursor.moveTo(setBtn, alive, 500);
      if (!alive()) return;
      await cursor.press(alive);
      doSet();
      await wait(2600);
      if (!alive()) return;
      await cursor.moveTo(applyBtn, alive);
      if (!alive()) return;
      await cursor.press(alive);
      doApply();
      await wait(2000);
      if (!alive()) return;
      cursor.hide();
      cap.textContent = 'Your turn: change the key and apply it again, or switch to a static site.';
      env.classList.add('is-played');
    }
    kinds.forEach(b => b.addEventListener('click', () => { stopAuto(); doKind(b.dataset.envKind); }));
    setBtn.addEventListener('click', () => { stopAuto(); doSet(); });
    applyBtn.addEventListener('click', () => { stopAuto(); doApply(); });
    replayFor(env, autoplay);
    draw();
    onceInView(env, () => {
      if (reduced) { st.set = true; st.applied = true; draw(); env.classList.add('is-played'); return; }
      setTimeout(() => { if (!env.classList.contains('is-played')) autoplay(); }, 350);
    }, .55);
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
