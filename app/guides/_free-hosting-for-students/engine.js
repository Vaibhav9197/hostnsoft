/* ==========================================================================
   Embarko · Guide article: interaction layer
   "Free Hosting for Students: Put Your Project Online". The engine is the one
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
  const LOCAL = 'localhost:3000';
  const STEPS_KEY = 'embarko-steps-students';
  /* Copying the deployment prompt is step 2 here (index 1); step 1 is running the project locally. */
  const PROMPT_STEP = 1;
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
  $$('.compare tbody tr').filter(r => !r.closest('[data-st-close]')).forEach(el => revealIO.observe(el));

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
    const data = { title: 'Free Hosting for Students: Put Your Project Online', text: 'Put a portfolio, college project or hackathon demo online for $0 with your AI agent.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to a classmate with a project due.' : data.url, ok);
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
     07 · Five steps. Ticking them all makes the project live.
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
        : deployed ? 'Your project has a free live link. Hand it in.'
        : 'That’s the whole trip. Now take your own project there: <a href="#steps">do the 5 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : 'On your laptop';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Only you can open it';
    if (arrivalNote) arrivalNote.textContent = live ? 'A teacher, a recruiter or a judge can open it, for $0.' : 'Finish the five steps and your project gets a free live link.';
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
      if (whisper) whisper.textContent = 'Live, for $0. Anyone with the link can open it.';
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
    local: 'Your project only runs on your laptop. Only you can open it.',
    stuck: 'Your project is still on your laptop.',
    near: 'Your project is one prompt away from a free live link.',
    live: () => `Your project is live at ${state.appName}.embarko.app.`,
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
    localhost: ['localhost', 'An address that points at your own computer. localhost:3000 only opens on the machine the project is running on.'],
    static: ['Static website', 'Plain files (HTML, CSS, JavaScript). No server code runs; the host just serves the files.'],
    dynamic: ['Dynamic app', 'Anything that runs a server, such as Express, Flask or FastAPI. The Free plan has room for one.'],
    vps: ['VPS', 'A virtual private server: a machine you log into and manage yourself, including installing and updating things.'],
    dockerfile: ['Dockerfile', 'A recipe file some hosts use to build and run an app. Embarko builds the app itself and rejects an upload that includes one.'],
    envvar: ['Environment variable', 'A setting, such as an API key, stored on the host instead of in your code. The running app reads it.'],
    manifest: ['Manifest', 'The file that says what your project needs: package.json for Node.js, requirements.txt or pyproject.toml for Python.'],
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
     Scenes for "Free Hosting for Students" (14 Oct 2026).
     Same engine, same colour script; one module per scene.
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


  /* FLIP: run a DOM change, then let each element glide from where it was. */
  function flip(els, mutate, ms = 560) {
    const first = new Map(els.map(el => [el, el.getBoundingClientRect()]));
    mutate();
    if (reduced) return;
    els.forEach(el => {
      const a = first.get(el);
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  /* The reader's project (chapter 01) follows them to chapters 02 and 05. */
  const PROJECT_KEY = 'embarko-student-project';
  const projectHooks = [];
  let project = store.get(PROJECT_KEY) || '';
  const setProject = p => {
    project = p;
    store.set(PROJECT_KEY, p);
    projectHooks.forEach(fn => fn(p));
  };

  /* How the reader signs in (step 3) decides whether step 5 still needs Keep. */
  const SIGNIN_KEY = 'embarko-student-signin';
  const KEPT_WAYS = ['email', 'tokens', 'connector'];
  let signinWay = store.get(SIGNIN_KEY) || '';
  const signinHooks = [];
  const keptBySignin = () => KEPT_WAYS.includes(signinWay);

  /* 01 · Which project is yours? The list is the copy; the window previews it. */
  const pick = $('[data-st-pick]');
  if (pick) {
    const opts = $$('[data-st-project]', pick);
    const pages = $$('[data-st-page]', pick);
    const cap = $('[data-st-pick-cap]', pick);
    const SAY = {
      portfolio: 'A portfolio is plain files. It needs somewhere to serve them.',
      backend: 'A backend runs code, so it needs a host that runs code.',
      demo: 'A demo has to be live on the day, and keep working while judges try it.',
    };
    const view = key => pages.forEach(pg => pg.classList.toggle('is-on', pg.dataset.stPage === key));
    const mark = key => opts.forEach(o => o.setAttribute('aria-pressed', String(o.dataset.stProject === key)));
    let autoId = 0;
    const cursor = makeCursor(pick);
    const stopAuto = () => { autoId++; cursor.hide(); pick.classList.add('is-played'); };
    const settle = () => { view(project || 'portfolio'); mark(project); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      pick.classList.remove('is-played');
      cursor.show(opts[0], 90, 60);
      for (const o of opts) {
        await cursor.moveTo($('.st-pick__dot', o), alive, 650);
        if (!alive()) return;
        await cursor.press(alive);
        if (!alive()) return;
        mark(o.dataset.stProject);
        view(o.dataset.stProject);
        cap.textContent = SAY[o.dataset.stProject];
        await wait(2000);
        if (!alive()) return;
      }
      cursor.hide();
      settle();
      cap.textContent = 'Your turn: pick your project. The rest of the guide follows your pick.';
      pick.classList.add('is-played');
    }
    opts.forEach(o => o.addEventListener('click', () => {
      stopAuto();
      const key = o.dataset.stProject;
      mark(key);
      view(key);
      setProject(key);
      cap.textContent = `${SAY[key]} The rest of the guide remembers your pick.`;
    }));
    $('[data-st-pick-replay]', pick)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    settle();
    onceInView(pick, () => {
      if (reduced || pick.classList.contains('is-played')) { stopAuto(); return; }
      setTimeout(() => { if (!pick.classList.contains('is-played')) autoplay(); }, 350);
    }, .5);
  }

  /* 02 · Who runs what. Scroll stacks the layers, bottom first; tap a kind to compare. */
  const stack = $('[data-st-stack]');
  if (stack) {
    const cols = $$('.st-stack__col', stack);
    const cap = $('[data-st-stack-cap]', stack);
    const rows = $$('[data-st-row]');
    const defaultCap = cap.textContent;
    const layers = [];
    cols.forEach(c => $$('.st-layer', c).reverse().forEach(l => layers.push(l)));
    let lastK = -1;
    onScrub(stack, p => {
      const k = Math.round(clamp(p / .9) * layers.length);
      if (k === lastK) return;
      lastK = k;
      layers.forEach((l, i) => l.classList.toggle('is-in', i < k));
    });
    const SAY = {
      static: 'Static site hosting serves plain files. No server code runs.',
      app: 'App hosting runs your code and serves the result. You upload the app and the platform runs it.',
      vps: 'A free server or VPS is a machine you log into and manage yourself.',
    };
    const choose = key => {
      const again = cols.find(c => c.dataset.stKind === key)?.getAttribute('aria-pressed') === 'true';
      const k = again ? '' : key;
      cols.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.stKind === k)));
      stack.classList.toggle('has-choice', !!k);
      rows.forEach(r => r.classList.toggle('is-hl', r.dataset.stRow === k));
      cap.textContent = k ? SAY[k] : defaultCap;
    };
    cols.forEach(c => c.addEventListener('click', () => choose(c.dataset.stKind)));
    const FITS = { portfolio: ['static', 'your portfolio'], backend: ['app', 'your college project'] };
    const pin = p => {
      const fit = FITS[p];
      cols.forEach(c => c.classList.toggle('is-yours', !!fit && c.dataset.stKind === fit[0]));
      if (fit) $$('[data-st-pin]', stack).forEach(el => { el.textContent = fit[1]; });
    };
    projectHooks.push(pin);
    pin(project);
  }

  /* 03 · Every setup job opens another tab as you scroll. */
  const tabsEl = $('[data-st-tabs]');
  if (tabsEl) {
    const tabs = $$('.st-tab', tabsEl);
    const pagesT = $$('.st-bpage', tabsEl);
    const titles = pagesT.map(pg => $('b', pg).textContent);
    const nEl = $('[data-st-tabs-n]', tabsEl);
    const label = $('[data-st-tabs-label]', tabsEl);
    const cap = $('[data-st-tabs-cap]', tabsEl);
    let open = -1;
    let chosen = -1;
    const view = i => {
      tabs.forEach((t, k) => t.setAttribute('aria-pressed', String(k === i)));
      pagesT.forEach((pg, k) => pg.classList.toggle('is-on', k === i));
    };
    onScrub(tabsEl, p => {
      const k = Math.round(clamp(p / .85) * tabs.length);
      if (k === open) return;
      open = k;
      tabs.forEach((t, i) => {
        const on = i < k;
        if (on && !t.classList.contains('is-open') && !reduced) {
          t.classList.remove('is-new');
          void t.offsetWidth;
          t.classList.add('is-new');
        }
        t.classList.toggle('is-open', on);
      });
      if (chosen >= k) chosen = -1;
      view(k ? (chosen >= 0 ? chosen : k - 1) : -1);
      nEl.textContent = String(k);
      label.textContent = k === 1 ? 'tab open · 0 links to hand in' : 'tabs open · 0 links to hand in';
      if (!reduced) { nEl.classList.remove('is-ticking'); void nEl.offsetWidth; nEl.classList.add('is-ticking'); }
      cap.textContent = k === 0 ? 'Scroll, and the usual setup opens one tab at a time.'
        : k < tabs.length ? `Tab ${k}: ${titles[k - 1]}.`
        : 'Five tabs, and still no link to hand in. Click any tab to see what it asks for.';
    });
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      chosen = i;
      view(i);
      cap.textContent = `Tab ${i + 1}: ${titles[i]}.`;
    }));
  }

  /* 04 · Each row of the comparison closes its tab; one tab stays, one opens. */
  const closeEl = $('[data-st-close]');
  if (closeEl) {
    const rowsC = $$('tbody tr', closeEl);
    const ctabs = $$('[data-st-ctab]', closeEl);
    const note = $('[data-st-close-note]', closeEl);
    let lastC = -1;
    onScrub(closeEl, p => {
      const k = Math.round(clamp(p / .85) * rowsC.length);
      if (k === lastC) return;
      lastC = k;
      rowsC.forEach((r, i) => r.classList.toggle('in', i < k));
      ctabs.forEach((t, i) => { if (i < rowsC.length) t.classList.toggle('is-closed', i < k); });
      const done = k === rowsC.length;
      ctabs[rowsC.length]?.classList.toggle('is-kept', done);
      closeEl.classList.toggle('is-done', done);
      const left = ctabs.length - k;
      note.textContent = done ? 'Four tabs closed. Still yours: API keys, added as environment variables after you press Keep.'
        : `${left} tabs open`;
    });
  }

  /* 05 · The Free plan board. It fills itself once, then the reader drags or taps. */
  const plan = $('[data-st-plan]');
  if (plan) {
    const tray = $('[data-st-tray]', plan);
    const drops = { static: $('[data-st-drop="static"]', plan), dynamic: $('[data-st-drop="dynamic"]', plan) };
    const zones = { static: $('[data-st-zone="static"]', plan), dynamic: $('[data-st-zone="dynamic"]', plan) };
    const cap = $('[data-st-plan-cap]', plan);
    const items = $$('.st-plan__item', plan);
    const build = $('[data-st-build]', plan);
    const reactSub = $('[data-st-react-sub]', plan);
    const item = key => $(`[data-st-item="${key}"]`, plan);
    const chipOf = it => $('.st-chip', it);
    const nameOf = it => $('b', it).textContent;
    const kindOf = it => chipOf(it).dataset.kind;
    const whereOf = it => (it.parentElement === drops.static ? 'static' : it.parentElement === drops.dynamic ? 'dynamic' : 'tray');
    const syncZones = () => zones.dynamic.classList.toggle('is-full', drops.dynamic.children.length > 0);
    const move = (it, to) => {
      if (whereOf(it) === to) return;
      flip(items, () => { (to === 'tray' ? tray : drops[to]).append(it); syncZones(); });
    };
    const flash = (el, cls) => {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
      clearTimeout(el._flash);
      el._flash = setTimeout(() => el.classList.remove(cls), 650);
    };

    function place(it, aimed) {
      const kind = kindOf(it);
      const name = nameOf(it);
      if (kind === 'dynamic') {
        const occupant = drops.dynamic.firstElementChild;
        if (occupant && occupant !== it) {
          flash(zones.dynamic, 'is-reject');
          flash(chipOf(it), 'is-bounce');
          move(it, 'tray');
          cap.textContent = it.dataset.stItem === 'react'
            ? `The dynamic slot is taken by the ${nameOf(occupant).toLowerCase()}. Build the React app first and upload dist, and it goes on the static shelf instead.`
            : `Your one dynamic app is already the ${nameOf(occupant).toLowerCase()}. Tap it to take it off first.`;
          return false;
        }
      }
      move(it, kind);
      if (aimed && aimed !== kind) {
        cap.textContent = kind === 'static'
          ? `The ${name.toLowerCase()} is plain files, so it’s a static website. It goes on the shelf.`
          : `The ${name.toLowerCase()} runs a server, so it counts as your one dynamic app.`;
      } else {
        cap.textContent = kind === 'static'
          ? `The ${name.toLowerCase()} is a static website. The Free plan lists them as unlimited.`
          : `The ${name.toLowerCase()} runs a server, so it uses your one dynamic app.`;
      }
      return true;
    }
    function unplace(it) {
      move(it, 'tray');
      cap.textContent = `The ${nameOf(it).toLowerCase()} is off the plan.`;
    }
    function setBuild(on, quiet = false) {
      const react = item('react');
      build.setAttribute('aria-pressed', String(on));
      chipOf(react).dataset.kind = on ? 'static' : 'dynamic';
      reactSub.textContent = on ? 'Vite · build output (dist)' : 'Vite · uploaded as source';
      if (quiet) return;
      const at = whereOf(react);
      if (at !== 'tray' && at !== kindOf(react) && !place(react, null)) return;
      cap.textContent = on
        ? 'Built first and uploaded as dist, the React app is published as a static site and doesn’t use your dynamic app.'
        : 'Uploaded as source, the React app needs a build step, so it runs as a server app and uses your one dynamic app.';
    }

    let swallow = false;
    items.forEach(it => chipOf(it).addEventListener('click', () => {
      if (swallow) { swallow = false; return; }
      stopAuto();
      if (whereOf(it) === 'tray') place(it, null); else unplace(it);
    }));
    build.addEventListener('click', () => { stopAuto(); setBuild(build.getAttribute('aria-pressed') !== 'true'); });

    /* Drag with a pointer (mouse or touch); the chip leaves a ghost that follows. */
    const local = (x, y) => { const r = plan.getBoundingClientRect(); return [x - r.left, y - r.top]; };
    const centre = el => { const r = el.getBoundingClientRect(); return local(r.left + r.width / 2, r.top + r.height / 2); };
    const makeGhost = chip => {
      const g = chip.cloneNode(true);
      g.classList.add('st-ghost');
      g.classList.remove('is-yours', 'is-bounce');
      g.removeAttribute('data-st-chip');
      g.setAttribute('aria-hidden', 'true');
      g.tabIndex = -1;
      plan.append(g);
      return g;
    };
    const putGhost = (g, x, y) => { g.style.left = `${x}px`; g.style.top = `${y}px`; };
    const zoneAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const z = el && el.closest('[data-st-zone]');
      if (z && plan.contains(z)) return z.dataset.stZone;
      return el && el.closest('.st-plan__tray') ? 'tray' : null;
    };
    let drag = null;
    plan.addEventListener('pointerdown', e => {
      const chip = e.target.closest('.st-chip');
      if (!chip || e.button !== 0 || chip.classList.contains('st-ghost')) return;
      drag = { chip, it: chip.closest('.st-plan__item'), x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    });
    plan.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.on = true;
        stopAuto();
        drag.ghost = makeGhost(drag.chip);
        drag.chip.classList.add('is-lifted');
        plan.classList.add('is-dragging');
        try { drag.chip.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
      }
      putGhost(drag.ghost, ...local(e.clientX, e.clientY));
      const z = zoneAt(e.clientX, e.clientY);
      Object.entries(zones).forEach(([k, el]) => el.classList.toggle('is-over', k === z));
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.on) return;
      swallow = true;
      setTimeout(() => { swallow = false; }, 0);
      d.ghost.remove();
      d.chip.classList.remove('is-lifted');
      plan.classList.remove('is-dragging');
      Object.values(zones).forEach(el => el.classList.remove('is-over'));
      const z = e.type === 'pointercancel' ? null : zoneAt(e.clientX, e.clientY);
      if (z === 'static' || z === 'dynamic') place(d.it, z);
      else if (z === 'tray' && whereOf(d.it) !== 'tray') unplace(d.it);
    };
    plan.addEventListener('pointerup', endDrag);
    plan.addEventListener('pointercancel', endDrag);

    const markYours = p => items.forEach(it => chipOf(it).classList.toggle('is-yours', it.dataset.stItem === p));
    projectHooks.push(markYours);
    markYours(project);

    /* The self-playing round. */
    const cursor = makeCursor(plan);
    let autoId = 0;
    function stopAuto() {
      autoId++;
      cursor.hide();
      $$('.st-ghost', plan).forEach(g => g.remove());
      $$('.st-chip.is-lifted', plan).forEach(c => c.classList.remove('is-lifted'));
      Object.values(zones).forEach(el => el.classList.remove('is-over'));
      plan.classList.add('is-played');
    }
    const reset = () => {
      setBuild(false, true);
      items.forEach(it => tray.append(it));
      syncZones();
    };
    async function demoDrag(it, zoneKey, alive) {
      const chip = chipOf(it);
      await cursor.moveTo(chip, alive, 700);
      if (!alive()) return;
      await cursor.press(alive);
      if (!alive()) return;
      const g = makeGhost(chip);
      chip.classList.add('is-lifted');
      const [x0, y0] = centre(chip);
      const target = zones[zoneKey];
      const [x1, y1] = centre($('.st-zone__drop', target));
      putGhost(g, x0, y0);
      target.classList.add('is-over');
      await Promise.all([
        cursor.moveTo($('.st-zone__drop', target), alive, 950),
        tween(950, k => putGhost(g, lerp(x0, x1, k), lerp(y0, y1, k)), alive),
      ]);
      target.classList.remove('is-over');
      g.remove();
      chip.classList.remove('is-lifted');
      if (!alive()) return;
      place(it, zoneKey);
    }
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      plan.classList.remove('is-played');
      reset();
      cap.textContent = 'Watch: four student projects, one Free plan.';
      cursor.show(item('portfolio'), 80, 70);
      await wait(500);
      if (!alive()) return;
      await demoDrag(item('portfolio'), 'static', alive);
      if (!alive()) return;
      await wait(1700);
      if (!alive()) return;
      await demoDrag(item('backend'), 'dynamic', alive);
      if (!alive()) return;
      await wait(1700);
      if (!alive()) return;
      await demoDrag(item('react'), 'dynamic', alive);
      if (!alive()) return;
      await wait(2600);
      if (!alive()) return;
      await cursor.moveTo(build, alive, 700);
      if (!alive()) return;
      await cursor.press(alive);
      if (!alive()) return;
      setBuild(true);
      await wait(900);
      if (!alive()) return;
      place(item('react'), null);
      cap.textContent = 'Built first and uploaded as dist, the React app is a static site. The dynamic slot stays with the college project.';
      await wait(2600);
      if (!alive()) return;
      cursor.hide();
      cap.textContent = 'Your turn: drag a project onto the plan, or tap it. Try adding the hackathon demo.';
      plan.classList.add('is-played');
    }
    $('[data-st-plan-replay]', plan)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    onceInView(plan, () => {
      if (reduced || plan.classList.contains('is-played')) { stopAuto(); return; }
      setTimeout(() => { if (!plan.classList.contains('is-played')) autoplay(); }, 350);
    }, .45);
  }

  /* 06 · Who does the server work: the chores slide between "You" and "Done for you". */
  const swap = $('[data-st-swap]');
  if (swap) {
    const lanes = { you: $('[data-st-lane="you"]', swap), host: $('[data-st-lane="host"]', swap) };
    const chores = $$('.st-chore', swap);
    const modeBtns = $$('[data-st-mode]', swap);
    const cap = $('[data-st-swap-cap]', swap);
    const ORDER = ['upload', 'build', 'run', 'serve', 'patch'];
    const setMode = m => {
      modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.stMode === m)));
      swap.classList.toggle('is-vps', m === 'vps');
      flip(chores, () => ORDER.forEach(key => {
        const c = chores.find(x => x.dataset.stChore === key);
        const em = $('em', c);
        (m === 'vps' || key === 'patch' ? lanes.you : lanes.host).append(c);
        c.classList.toggle('is-struck', m !== 'vps' && key === 'patch');
        em.textContent = m === 'vps' ? em.dataset.byVps : em.dataset.byEk;
      }), 650);
      cap.textContent = m === 'vps'
        ? 'On a free VPS every job is yours: you log in and install and update things yourself.'
        : 'With Embarko, your agent uploads and Embarko builds, runs and serves it. Nothing to install or patch.';
    };
    let autoId = 0;
    const cursor = makeCursor(swap);
    const stopAuto = () => { autoId++; cursor.hide(); swap.classList.add('is-played'); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      swap.classList.remove('is-played');
      setMode('vps');
      await wait(2400);
      if (!alive()) return;
      const ek = modeBtns.find(b => b.dataset.stMode === 'embarko');
      cursor.show(modeBtns[0], 20, 50);
      await cursor.moveTo(ek, alive, 800);
      if (!alive()) return;
      await cursor.press(alive);
      if (!alive()) return;
      setMode('embarko');
      await wait(2600);
      if (!alive()) return;
      cursor.hide();
      cap.textContent = 'Your turn: switch between a free VPS and Embarko.';
      swap.classList.add('is-played');
    }
    modeBtns.forEach(b => b.addEventListener('click', () => { stopAuto(); setMode(b.dataset.stMode); }));
    $('[data-st-swap-replay]', swap)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    onceInView(swap, () => {
      if (reduced || swap.classList.contains('is-played')) { stopAuto(); return; }
      setTimeout(() => { if (!swap.classList.contains('is-played')) autoplay(); }, 300);
    }, .5);
  }

  /* 07 · Step 1: the project runs on the laptop first. */
  const runEl = $('[data-st-run]');
  if (runEl) {
    const lines = $$('.st-run__l', runEl);
    const btn = $('[data-st-done]', runEl);
    const btnLabel = $('span', btn);
    const cmd = lines[0].textContent;
    onceInView(runEl, async () => {
      if (reduced) { lines.forEach(l => l.classList.add('is-in')); return; }
      lines[0].textContent = '';
      lines[0].classList.add('is-in');
      for (let k = 1; k <= cmd.length; k++) {
        lines[0].textContent = cmd.slice(0, k);
        await wait(55);
      }
      for (const l of lines.slice(1)) {
        await wait(650);
        l.classList.add('is-in');
      }
    }, .7);
    btn.addEventListener('click', () => setStep(0, !state.steps[0]));
    const sync = () => {
      btn.classList.toggle('is-done', !!state.steps[0]);
      btnLabel.textContent = state.steps[0] ? 'Runs on my computer' : 'It runs on my computer';
    };
    stepHooks.push(sync);
    sync();
  }

  /* 07 · Step 3: four ways to sign in, and what each means for keeping the project. */
  const signin = $('[data-st-signin]');
  if (signin) {
    const ways = $$('[role="radio"]', signin);
    const flow = $('[data-st-signin-flow]', signin);
    const result = $('[data-st-signin-result]', signin);
    const KEPT = 'Kept from the start, so there’s nothing to keep later.';
    const WAYS = {
      email: { flow: ['Give your agent your email', 'Paste the token from your inbox', 'Your agent deploys into your account'], result: KEPT },
      tokens: { flow: ['Sign in at embarko.ai/app/tokens', 'Create a token', 'Paste it to your agent'], result: KEPT },
      connector: { flow: ['Add the Embarko connector in Claude', 'Claude deploys from a public .tar.gz link', 'The app goes straight into your account'], result: `${KEPT} For a project on your laptop, the token by email is usually simpler.` },
      skip: { flow: ['Your agent deploys without a token', 'You get a live link and a claim link'], result: 'Live for 24 hours. Press Keep in step 5, or it’s deleted.' },
    };
    const select = (way, { focus = false, persist = true } = {}) => {
      ways.forEach(b => {
        const on = b.dataset.stWay === way;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      const btn = ways.find(b => b.dataset.stWay === way);
      if (focus) btn?.focus();
      const w = WAYS[way];
      if (!w) return;
      flow.textContent = '';
      w.flow.forEach(t => { const li = document.createElement('li'); li.textContent = t; flow.append(li); });
      result.textContent = w.result;
      signin.dataset.kept = KEPT_WAYS.includes(way) ? 'yes' : 'no';
      signinWay = way;
      if (persist) store.set(SIGNIN_KEY, way);
      signinHooks.forEach(fn => fn());
    };
    ways.forEach((b, i) => {
      b.addEventListener('click', () => { select(b.dataset.stWay); setStep(2, true); });
      b.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        select(ways[(i + d + ways.length) % ways.length].dataset.stWay, { focus: true });
        setStep(2, true);
      });
    });
    if (WAYS[signinWay]) select(signinWay, { persist: false });
  }

  /* 07 · Step 4: three lamps. 202 is amber ("not live yet"), building blinks blue, live is green.
     The sandbox switch shows the other ending: 403, nothing deployed, and the fix. */
  const statusEl = $('[data-st-status]');
  if (statusEl) {
    const items = $$('[data-st-log="ok"] li', statusEl);
    const okLog = $('[data-st-log="ok"]', statusEl);
    const blockLog = $('[data-st-log="blocked"]', statusEl);
    const st = $('[data-st-state]', statusEl);
    const sw = $('[data-st-sandbox]', statusEl);
    let blocked = false;
    let lastS = '';
    const render = () => {
      let s;
      if (blocked) {
        s = '403 · nothing deployed';
        statusEl.dataset.state = 'blocked';
      } else {
        const p = statusEl._p ?? 0;
        items.forEach(el => el.classList.toggle('is-in', p >= +el.dataset.at));
        s = p < .2 ? 'packing' : p < .42 ? '202 · not live yet' : p < .82 ? 'building · checks every 10 s' : 'live';
        statusEl.dataset.state = s === 'live' ? 'live' : s.startsWith('202') ? 'wait' : s.startsWith('building') ? 'build' : 'pack';
      }
      if (s !== lastS) { lastS = s; st.textContent = s; }
    };
    onScrub(statusEl, render);
    sw.addEventListener('click', () => {
      blocked = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(blocked));
      okLog.hidden = blocked;
      blockLog.hidden = !blocked;
      render();
    });
  }

  /* 07 · Step 5: the demo-day week. An unkept link lives 24 hours; Keep turns the week green. */
  const week = $('[data-st-week]');
  if (week) {
    const grid = $('[data-st-week-grid]', week);
    const bar = $('.st-week__bar', week);
    const flag = $('[data-st-flag]', week);
    const verdict = $('[data-st-week-verdict]', week);
    const keepBtn = $('[data-st-keep]', week);
    const keepLabel = $('span', keepBtn);
    const cap = $('[data-st-week-cap]', week);
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const START = 10 / 24 / 7;
    const DAY = 1 / 7;
    const isKept = () => !!state.steps[4] || keptBySignin();
    let day = 4;
    let life = reduced || isKept() ? 1 : 0;
    const render = () => {
      const kept = isKept();
      grid.style.setProperty('--day', String(day));
      bar.style.setProperty('--w', String(kept ? 1 - START : DAY * life));
      week.classList.toggle('is-kept', kept);
      week.classList.toggle('is-gone', !kept && life >= 1);
      const d = DAYS[day];
      flag.setAttribute('aria-valuenow', String(day));
      flag.setAttribute('aria-valuetext', d);
      let text;
      let ok = null;
      if (kept) { text = `Demo day, ${d}: it opens, at the same address.`; ok = true; }
      else if (day === 0) { text = `Demo day, ${d}: it still opens, but only until Tuesday at 10:00.`; ok = true; }
      else if (life < 1) { text = 'The link is live, and its 24 hours are running…'; }
      else { text = `Demo day, ${d}: the link is gone. It was deleted on Tuesday at 10:00, and no email came.`; ok = false; }
      if (verdict.textContent !== text) verdict.textContent = text;
      week.classList.toggle('is-ok', ok === true);
      week.classList.toggle('is-bad', ok === false);
      keepLabel.textContent = !kept ? 'Keep' : state.steps[4] ? 'Kept' : 'Kept at sign-in';
    };
    const dayAt = x => { const r = grid.getBoundingClientRect(); return clamp(Math.floor((x - r.left) / r.width * 7), 0, 6); };
    const setDay = d => { if (d !== day) { day = d; render(); } };

    let autoId = 0;
    const cursor = makeCursor(week);
    function stopAuto() {
      autoId++;
      cursor.hide();
      week.classList.remove('is-dragging');
      life = 1;
      week.classList.add('is-played');
      render();
    }
    let dragging = false;
    flag.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stopAuto();
      dragging = true;
      week.classList.add('is-dragging');
      try { flag.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    });
    flag.addEventListener('pointermove', e => { if (dragging) setDay(dayAt(e.clientX)); });
    const endDrag = () => { dragging = false; week.classList.remove('is-dragging'); };
    flag.addEventListener('pointerup', endDrag);
    flag.addEventListener('pointercancel', endDrag);
    flag.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      let d;
      if (step) d = clamp(day + step, 0, 6);
      else if (e.key === 'Home') d = 0;
      else if (e.key === 'End') d = 6;
      else return;
      e.preventDefault();
      stopAuto();
      setDay(d);
    });
    $('.st-week__track', week).addEventListener('click', e => { stopAuto(); setDay(dayAt(e.clientX)); });
    keepBtn.addEventListener('click', () => {
      stopAuto();
      setStep(4, !state.steps[4]);
      cap.textContent = state.steps[4]
        ? 'Kept. The address doesn’t change. Now keep your own copy of the code too.'
        : 'Not kept: the link would be deleted 24 hours after its first deploy.';
    });
    stepHooks.push(render);
    signinHooks.push(render);

    async function walkFlag(to, alive) {
      while (day !== to) {
        setDay(day + (to > day ? 1 : -1));
        await cursor.moveTo(flag, alive, 260);
        if (!alive()) return;
      }
    }
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      week.classList.remove('is-played');
      day = 4;
      if (isKept()) {
        life = 1;
        render();
        cap.textContent = 'Already kept, so every day of the week finds it. Drag the demo-day flag to check.';
        week.classList.add('is-played');
        return;
      }
      life = 0;
      render();
      cap.textContent = 'Monday, 10:00: deployed without signing in. The 24 hours start.';
      await wait(600);
      if (!alive()) return;
      await tween(2600, k => { life = k; render(); }, alive);
      if (!alive()) return;
      life = 1;
      render();
      cap.textContent = 'Tuesday, 10:00: never kept, so it’s deleted. No reminder email comes.';
      await wait(2400);
      if (!alive()) return;
      cursor.show(flag, 40, 46);
      await cursor.moveTo(flag, alive, 600);
      if (!alive()) return;
      await cursor.press(alive);
      week.classList.add('is-dragging');
      await walkFlag(0, alive);
      if (!alive()) return;
      cap.textContent = 'Only a Monday demo would still find it.';
      await wait(2000);
      if (!alive()) return;
      await walkFlag(4, alive);
      if (!alive()) return;
      week.classList.remove('is-dragging');
      cursor.hide();
      cap.textContent = 'Your turn: press Keep, or drag the demo-day flag to any day.';
      week.classList.add('is-played');
    }
    $('[data-st-week-replay]', week)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    render();
    onceInView(week, () => {
      if (reduced || week.classList.contains('is-played')) { stopAuto(); return; }
      setTimeout(() => { if (!week.classList.contains('is-played')) autoplay(); }, 300);
    }, .55);
  }

  /* 08 · Before demo day: set the key, then apply it, so the running app can read it. */
  const keys = $('[data-st-keys]');
  if (keys) {
    const setBtn = $('[data-st-keys-set]', keys);
    const applyBtn = $('[data-st-keys-apply]', keys);
    const sw = $('[data-st-keys-static]', keys);
    const stored = $('[data-st-keys-stored]', keys);
    const storedText = $('span', stored);
    const stateEl = $('[data-st-keys-state]', keys);
    const cap = $('[data-st-keys-cap]', keys);
    const k = { set: false, applied: false, static: false };
    const TEXT = {
      missing: 'running app: key missing',
      written: 'running app: key missing (written, not applied)',
      loaded: 'running app: key loaded',
      static: 'static site: no environment variables',
    };
    const render = () => {
      const s = k.static ? 'static' : k.applied ? 'loaded' : k.set ? 'written' : 'missing';
      if (keys.dataset.state !== s) {
        keys.dataset.state = s;
        if (!reduced) { stateEl.classList.remove('is-swap'); void stateEl.offsetWidth; stateEl.classList.add('is-swap'); }
      }
      stateEl.textContent = TEXT[s];
      storedText.textContent = k.static ? 'not available' : k.set ? 'stored, encrypted' : 'not set';
      stored.classList.toggle('is-stored', k.set && !k.static);
      setBtn.disabled = k.static;
      applyBtn.disabled = k.static || !k.set || k.applied;
      setBtn.classList.toggle('is-done', k.set && !k.static);
      applyBtn.classList.toggle('is-done', k.applied && !k.static);
      sw.setAttribute('aria-checked', String(k.static));
    };
    const SAY = {
      set: 'Written. The running app still can’t see it: a write alone doesn’t reach the running app.',
      apply: 'Applied. The running app reads the key now, and it never sat in your code.',
    };
    let autoId = 0;
    const cursor = makeCursor(keys);
    const stopAuto = () => { autoId++; cursor.hide(); keys.classList.add('is-played'); };
    setBtn.addEventListener('click', () => { stopAuto(); k.set = true; k.applied = false; render(); cap.textContent = SAY.set; });
    applyBtn.addEventListener('click', () => { stopAuto(); k.applied = true; render(); cap.textContent = SAY.apply; });
    sw.addEventListener('click', () => {
      stopAuto();
      k.static = !k.static;
      render();
      cap.textContent = k.static ? 'Static sites can’t have environment variables.' : 'A server app again: set the key, then apply it.';
    });
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      keys.classList.remove('is-played');
      Object.assign(k, { set: false, applied: false, static: false });
      render();
      cap.textContent = 'Watch: the key goes in as an environment variable, not into the code.';
      cursor.show(setBtn, 60, 60);
      await cursor.moveTo(setBtn, alive, 800);
      if (!alive()) return;
      await cursor.press(alive);
      if (!alive()) return;
      k.set = true;
      render();
      cap.textContent = SAY.set;
      await wait(2600);
      if (!alive()) return;
      await cursor.moveTo(applyBtn, alive, 700);
      if (!alive()) return;
      await cursor.press(alive);
      if (!alive()) return;
      k.applied = true;
      render();
      cap.textContent = SAY.apply;
      await wait(2600);
      if (!alive()) return;
      cursor.hide();
      Object.assign(k, { set: false, applied: false, static: false });
      render();
      cap.textContent = 'Your turn: set the key, then apply it. Or switch to a static site.';
      keys.classList.add('is-played');
    }
    $('[data-st-keys-replay]', keys)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    render();
    onceInView(keys, () => {
      if (reduced || keys.classList.contains('is-played')) { stopAuto(); return; }
      setTimeout(() => { if (!keys.classList.contains('is-played')) autoplay(); }, 300);
    }, .5);
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
