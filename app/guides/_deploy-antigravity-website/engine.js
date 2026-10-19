/* ==========================================================================
   Embarko · Guide article: interaction layer
   "How to Deploy an Antigravity Website with One Prompt". The engine is the
   one from the approved "How to deploy an AI app" page; this guide's scenes
   are at the end.
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

  /* The reader's site. The whole article is about moving it from here to there. */
  const state = { appName: 'your-app-name', steps: [false, false, false, false], finale: false, live: false };
  const LOCAL = 'localhost:3000';
  const STEPS_KEY = 'embarko-steps-antigravity';
  const PROMPT_STEP = 1; /* copying the deployment prompt ticks step 2 on this page */
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
      toast('Couldn’t copy. Select the prompt in step 2 and copy it instead.', false);
      return;
    }
    flashCopied(btn, btn.classList.contains('btn--sm') ? 'Copied' : 'Copied — paste it into your agent');
    toast('Prompt copied. Paste it into Antigravity’s agent.');
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
    const data = { title: 'How to Deploy an Antigravity Website with One Prompt', text: 'Built a site in Antigravity? One prompt and one approval put it online.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to someone whose Antigravity agent just built a site.' : data.url, ok);
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
     06 · Four steps. Ticking them all makes the site live.
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
        : deployed ? 'Your site has a live link. Share it.'
        : 'That’s the whole trip. Now take your own site there: <a href="#steps">do the 4 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : 'On your laptop';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Only you can open it';
    if (arrivalNote) arrivalNote.textContent = live ? 'Anyone with the link can open it, any time.' : 'Finish the four steps and your site gets a live link.';
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
      if (whisper) whisper.textContent = 'Live. One prompt, one approval, and anyone with the link can open it.';
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
    local: 'Your site runs on localhost:3000. Only you can open it.',
    stuck: 'Your site is still on localhost:3000.',
    near: 'Your site is one prompt and one approval away from a live link.',
    live: () => `Your site is live at ${state.appName}.embarko.app.`,
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
    localhost: ['Localhost', 'The name your computer uses for itself. A localhost link only works on the machine that made it.'],
    hosting: ['Hosting', 'A server that stays on, your site’s files on it and a public address, all together.'],
    env: ['Environment variables', 'Settings kept on the host, outside your code. Secret keys go here: your site can read them, visitors can’t.'],
    terminal: ['Terminal commands', 'Text commands the agent runs on your computer, like packing a folder or uploading a file.'],
    sandbox: ['Sandbox', 'A restricted space where Antigravity runs the agent’s terminal commands. In the app’s Default preset it has no network access.'],
    datadir: ['DATA_DIR', 'The folder on Embarko that survives redeploys. Anything your site saves must be written here.'],
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
     Scenes for "How to deploy an Antigravity website with one prompt" (14 Oct 2026).
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


  /* Radio groups for the scenes: click, or arrow keys move the choice. */
  function radios(btns, onPick) {
    const pick = (b, focus = false) => {
      btns.forEach(x => {
        const on = x === b;
        x.setAttribute('aria-checked', String(on));
        x.tabIndex = on ? 0 : -1;
      });
      if (focus) b.focus();
      onPick(b);
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        pick(btns[(i + d + btns.length) % btns.length], true);
      });
    });
    return pick;
  }
  const until = async (test, alive, ms = 5000) => {
    const t0 = performance.now();
    while (!test() && alive() && performance.now() - t0 < ms) await wait(80);
  };

  /* Cover · the approval card presses Approve as you scroll, and the site goes live. */
  const agCover = $('[data-ag-cover]');
  if (agCover) onScrub(agCover, p => agCover.classList.toggle('is-approved', p > .42));

  /* 01 · Two computers, one link. The divider sweeps once, then the reader drags it. */
  const split = $('[data-split]');
  if (split) {
    const frame = $('[data-split-frame]', split);
    const handle = $('[data-split-handle]', split);
    const cap = $('[data-split-caption]', split);
    let pos = 50;
    let autoId = 0;
    const say = () => (pos >= 70 ? 'On your computer, localhost:3000 opens your site.'
      : pos <= 30 ? 'On your friend’s computer, the same link points at their own machine, where your site doesn’t exist.'
      : 'Same link, two computers. Only one of them has your site.');
    const set = (v, speak = true) => {
      pos = clamp(v, 0, 100);
      split.style.setProperty('--split', `${pos.toFixed(2)}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', pos >= 70 ? 'Mostly your computer' : pos <= 30 ? 'Mostly your friend’s computer' : 'Half of each computer');
      split.classList.toggle('is-mine', pos >= 70);
      split.classList.toggle('is-theirs', pos <= 30);
      if (speak) { const s = say(); if (cap.textContent !== s) cap.textContent = s; }
    };
    const stopAuto = () => { autoId++; split.classList.add('is-played'); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      split.classList.remove('is-played');
      const go = async (to, ms) => { const from = pos; await tween(ms, k => set(lerp(from, to, k)), alive); };
      await go(86, 900);
      if (!alive()) return;
      await wait(1500);
      if (!alive()) return;
      await go(14, 1500);
      if (!alive()) return;
      await wait(1900);
      if (!alive()) return;
      await go(50, 800);
      if (!alive()) return;
      cap.textContent = 'Your turn. Drag the line, or use the arrow keys.';
      split.classList.add('is-played');
    }
    let dragging = false;
    const fromX = x => { const r = frame.getBoundingClientRect(); return ((x - r.left) / r.width) * 100; };
    frame.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stopAuto();
      dragging = true;
      frame.classList.add('is-dragging');
      frame.setPointerCapture?.(e.pointerId);
      set(fromX(e.clientX));
    });
    frame.addEventListener('pointermove', e => { if (dragging) set(fromX(e.clientX)); });
    const endDrag = () => { dragging = false; frame.classList.remove('is-dragging'); };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', e => {
      const k = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
      if (k == null && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      stopAuto();
      set(e.key === 'Home' ? 0 : e.key === 'End' ? 100 : pos + k);
    });
    $('[data-split-replay]', split)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    set(50, false);
    onceInView(split, () => {
      if (reduced) { split.classList.add('is-played'); return; }
      setTimeout(() => { if (!split.classList.contains('is-played')) autoplay(); }, 300);
    }, .55);
  }

  /* 01 · The three parts of hosting light up in turn. */
  const three = $('[data-three]');
  if (three) {
    const parts = $$('li', three);
    onScrub(three, p => parts.forEach((li, i) => li.classList.toggle('is-on', p >= .12 + i * .22)));
  }

  /* 02 · The tab pile: every requirement opens one more window. Point at a line
     of the list to pull its window to the front. */
  const pile = $('[data-pile]');
  if (pile) {
    const wins = $$('.ag-win', pile);
    const rows = $$('.ag-pile__list li', pile);
    const cap = $('[data-pile-caption]', pile);
    let shown = -1;
    let held = -1;
    const front = i => {
      wins.forEach((w, k) => w.classList.toggle('is-front', k === i));
      rows.forEach((r, k) => r.classList.toggle('is-lit', k === i && held >= 0));
    };
    onScrub(pile, p => {
      const n = Math.round(clamp(p / .9) * wins.length);
      if (n === shown) return;
      shown = n;
      wins.forEach((w, k) => w.classList.toggle('is-open', k < n || k === held));
      rows.forEach((r, k) => r.classList.toggle('is-in', k < n));
      pile.classList.toggle('is-full', n === wins.length);
      cap.textContent = n === 0 ? 'It runs on localhost:3000. Now the usual route starts opening windows…'
        : n < wins.length ? `${n} of 5 open between “it runs” and “here’s the link”.`
        : 'Five windows open, and the last one is waiting for you.';
      if (held < 0) front(n - 1);
    });
    rows.forEach((r, i) => {
      const hold = () => { held = i; wins[i].classList.add('is-open'); front(i); };
      const release = () => {
        if (held !== i) return;
        held = -1;
        wins[i].classList.toggle('is-open', i < shown);
        front(shown - 1);
      };
      r.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold(); });
      r.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') release(); });
      r.addEventListener('focus', hold);
      r.addEventListener('blur', release);
      r.addEventListener('click', () => { if (held === i) return; hold(); });
    });
  }

  /* 03 · Who does each job. Flips row by row once, then the reader switches. */
  const who = $('[data-who]');
  if (who) {
    const btns = $$('[data-who-mode]', who);
    const rows = $$('tbody tr', who);
    const nEl = $('[data-who-n]', who);
    const label = $('[data-who-label]', who);
    let autoId = 0;
    const tally = () => {
      const n = rows.filter(r => !r.classList.contains('is-flipped')).length;
      nEl.textContent = String(n);
      label.textContent = n === 0 ? 'jobs on your plate. The agent and Embarko do the rest.' : n === 1 ? 'job on your plate' : 'jobs on your plate';
      who.classList.toggle('is-clear', n === 0);
      const m = n === 0 ? 'embarko' : n === rows.length ? 'usual' : 'mixed';
      who.dataset.mode = m;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.whoMode === m)));
      if (!reduced) { nEl.classList.remove('is-ticking'); void nEl.offsetWidth; nEl.classList.add('is-ticking'); }
    };
    const setAll = m => { rows.forEach(r => r.classList.toggle('is-flipped', m === 'embarko')); tally(); };
    const stopAuto = () => { autoId++; who.classList.add('is-played'); };
    btns.forEach(b => b.addEventListener('click', () => { stopAuto(); setAll(b.dataset.whoMode); }));
    rows.forEach(r => r.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      stopAuto();
      r.classList.toggle('is-flipped');
      tally();
    }));
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      setAll('usual');
      await wait(1100);
      for (const r of rows) {
        if (!alive()) return;
        r.classList.add('is-flipped');
        tally();
        await wait(750);
      }
      if (alive()) who.classList.add('is-played');
    }
    who.classList.add('is-ready');
    tally();
    onceInView(who, () => {
      if (reduced) { setAll('embarko'); who.classList.add('is-played'); return; }
      autoplay();
    }, .5);
  }

  /* 04 · Spot the network call: of the three moves, only the upload leaves the computer. */
  const plan = $('[data-plan]');
  if (plan) {
    const rows = $$('[data-plan-row]', plan);
    const cap = $('[data-plan-caption]', plan);
    const SAY = [
      'Packing happens on your computer. The terminal runs it, and nothing leaves the machine yet.',
      'This one. The upload is a network call from a terminal command, and Antigravity controls both parts. This is where it may stop and ask you.',
      'That’s the agent writing back to you in the chat, with your live link.',
    ];
    let autoId = 0;
    const pick = (i, speak = true) => {
      rows.forEach((r, k) => {
        r.setAttribute('aria-pressed', String(k === i));
        r.classList.toggle('is-net', k === i && i === 1);
        r.classList.toggle('is-local', k === i && i !== 1);
      });
      if (speak) cap.textContent = SAY[i];
    };
    const stopAuto = () => { autoId++; rows.forEach(r => r.classList.remove('is-scan')); plan.classList.add('is-played'); };
    rows.forEach((r, i) => r.addEventListener('click', () => { stopAuto(); pick(i); }));
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      plan.classList.remove('is-played');
      pick(-1, false);
      cap.textContent = 'Which step needs the network?';
      await wait(700);
      for (let lap = 0; lap < 2; lap++) {
        for (let k = 0; k < rows.length; k++) {
          if (!alive()) return;
          rows.forEach((r, j) => r.classList.toggle('is-scan', j === k));
          await wait(lap ? 260 : 380);
        }
      }
      if (!alive()) return;
      rows.forEach(r => r.classList.remove('is-scan'));
      pick(1);
      await wait(3600);
      if (!alive()) return;
      cap.textContent = 'Your turn. Tap any step to see what it touches.';
      plan.classList.add('is-played');
    }
    $('[data-plan-replay]', plan)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    onceInView(plan, () => {
      if (reduced) { pick(1); plan.classList.add('is-played'); return; }
      setTimeout(() => { if (!plan.classList.contains('is-played')) autoplay(); }, 300);
    }, .5);
  }

  /* 05 · The permission simulator. Pick the Antigravity and its setting, run the
     upload, and see whether it goes through, asks, asks to leave the sandbox or
     hits the sandbox wall. Plays the default macOS/Linux case once by itself. */
  const perm = $('[data-perm]');
  if (perm) {
    const OUT = {
      'app:default': ['outside', true, 'The Default preset runs terminal commands in a sandbox with no network access. The upload has to run outside it, so the agent asks first, unless an allow rule covers it. Read the command and approve it.'],
      'app:review': ['ask', false, 'Under Request Review the sandbox is off and terminal commands always ask. Read the upload command and approve it.'],
      'win:previous': ['ask', false, 'Windows uses Google’s previous permission system, where commands you haven’t allowed ask for approval. Read the upload command and approve it.'],
      'cli:off': ['ask', false, 'The CLI’s sandbox is off by default. Approve the command if the agent asks.'],
      'cli:on': ['outside', true, 'With the CLI’s sandbox on, sandboxed commands get no network access by default. Approve the run outside the sandbox.'],
      'ide:review': ['ask', false, 'The IDE’s sandboxing is off by default. With Terminal command auto execution on Request Review, the agent asks before running the command.'],
      'ide:proceed': ['run', false, 'Sandboxing is off and Terminal command auto execution is on Always Proceed, so the agent runs the upload without asking first.'],
      'ide:nonet': ['blocked', true, 'Terminal sandboxing is on with network access denied, which is also what Strict mode sets. The upload fails with a network error and nothing is deployed. Turn on the sandbox’s network access setting, or run the upload in your own terminal.'],
      'ide:net': ['run', true, 'Terminal sandboxing is on and so is its network access setting, so the upload can reach Embarko. Terminal command auto execution still decides whether the agent asks first.'],
    };
    const surfBtns = $$('[data-surface]', perm);
    const groups = $$('[data-perm-for]', perm);
    const stage = $('[data-perm-stage]', perm);
    const ask = $('[data-perm-ask]', perm);
    const askTitle = $('[data-perm-ask-title]', perm);
    const out = $('[data-perm-out]', perm);
    const code = $('[data-perm-code]', perm);
    const cap = $('[data-perm-caption]', perm);
    const runBtn = $('[data-perm-run]', perm);
    const yes = $('[data-perm-yes]', perm);
    const no = $('[data-perm-no]', perm);
    const tableRows = $$('[data-perm-table] tbody tr');
    const chosen = { app: 'default', win: 'previous', cli: 'off', ide: 'review' };
    let surface = 'app';
    let runId = 0;
    let answer = null;
    let autoId = 0;
    const pause = ms => wait(reduced ? 0 : ms);
    const key = () => `${surface}:${chosen[surface]}`;

    const reset = () => {
      runId++;
      if (answer) { answer(false); answer = null; }
      ask.hidden = true;
      stage.dataset.phase = 'idle';
      stage.dataset.sandbox = OUT[key()][1] ? 'on' : 'off';
      perm.classList.remove('is-ok', 'is-fail');
      out.textContent = 'ready';
      code.textContent = 'waiting';
    };
    const lightRow = () => tableRows.forEach(r => r.classList.toggle('is-lit', r.dataset.row === surface));

    const pickSurface = radios(surfBtns, b => {
      surface = b.dataset.surface;
      groups.forEach(g => { g.hidden = g.dataset.permFor !== surface; });
      reset();
      lightRow();
      cap.textContent = 'Now press “Run the upload”.';
    });
    const pickSet = {};
    groups.forEach(g => {
      pickSet[g.dataset.permFor] = radios($$('[data-set]', g), b => {
        chosen[g.dataset.permFor] = b.dataset.set;
        reset();
        cap.textContent = 'Setting changed. Press “Run the upload”.';
      });
    });

    async function run() {
      reset();
      const id = runId;
      const alive = () => id === runId;
      const [kind] = OUT[key()];
      const say = OUT[key()][2];
      stage.dataset.phase = 'go';
      out.textContent = 'running the upload…';
      cap.textContent = 'The agent runs the upload command…';
      await pause(1000);
      if (!alive()) return;
      if (kind === 'blocked') {
        stage.dataset.phase = 'blocked';
        out.textContent = 'network error';
        code.textContent = 'never reached';
        perm.classList.add('is-fail');
        cap.textContent = say;
        return;
      }
      if (kind === 'ask' || kind === 'outside') {
        stage.dataset.phase = kind === 'outside' ? 'wall' : 'hold';
        askTitle.textContent = kind === 'outside' ? 'Run outside the sandbox?' : 'Run this command?';
        out.textContent = 'waiting for your approval';
        ask.hidden = false;
        cap.textContent = say;
        const ok = await new Promise(res => { answer = res; });
        answer = null;
        if (!alive()) return;
        ask.hidden = true;
        if (!ok) {
          stage.dataset.phase = 'rejected';
          out.textContent = 'rejected';
          code.textContent = 'nothing deployed';
          perm.classList.add('is-fail');
          cap.textContent = 'Rejected, so nothing was deployed. Run it again when you’re ready, and approve it after reading it.';
          return;
        }
      }
      stage.dataset.phase = kind === 'outside' ? 'escape' : 'through';
      out.textContent = 'uploading';
      await pause(1100);
      if (!alive()) return;
      stage.dataset.phase = 'done';
      out.textContent = 'uploaded';
      code.textContent = '202 Accepted';
      perm.classList.add('is-ok');
      cap.textContent = kind === 'outside' ? 'Approved. The upload ran outside the sandbox, where it has no sandbox protection, which is why you read the command first.'
        : kind === 'ask' ? 'Approved. The upload went through.'
        : say;
    }

    const cursor = makeCursor(stage);
    const stopAuto = () => { autoId++; cursor.hide(); perm.classList.add('is-played'); };
    runBtn.addEventListener('click', () => { stopAuto(); run(); });
    yes.addEventListener('click', () => { stopAuto(); answer?.(true); });
    no.addEventListener('click', () => { stopAuto(); answer?.(false); });
    $('.ag-perm__controls', perm).addEventListener('pointerdown', () => stopAuto(), { capture: true });
    ask.addEventListener('pointerdown', () => stopAuto(), { capture: true });

    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      perm.classList.remove('is-played');
      pickSurface(surfBtns[0]);
      pickSet.app($('[data-set="default"]', groups[0]));
      cap.textContent = 'The app on macOS or Linux, Default preset. Watch the upload.';
      await wait(900);
      if (!alive()) return;
      const r = run();
      await until(() => !ask.hidden, alive);
      if (!alive()) return;
      await wait(1400);
      if (!alive()) return;
      cursor.show(yes, 60, 70);
      await cursor.moveTo(yes, alive, 800);
      if (!alive()) return;
      await cursor.press(alive);
      answer?.(true);
      await r;
      cursor.hide();
      await wait(3200);
      if (!alive()) return;
      cap.textContent = 'Your turn. Pick your Antigravity and its setting, then run the upload.';
      perm.classList.add('is-played');
    }
    $('[data-perm-replay]', perm)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    reset();
    lightRow();
    onceInView(perm, () => {
      if (reduced) { perm.classList.add('is-played'); return; }
      setTimeout(() => { if (!perm.classList.contains('is-played')) autoplay(); }, 350);
    }, .45);
  }

  /* 06 · Step 1: open the folder that holds the site. */
  const openEl = $('[data-open]');
  if (openEl) {
    const dirs = $$('[data-folder]', openEl);
    const peek = $('[data-open-peek]', openEl);
    const say = $('[data-open-say]', openEl);
    const go = $('[data-open-go]', openEl);
    const FOLDERS = [
      { files: ['my-site/', 'old-portfolio/', 'notes.txt'], pick: 'Every project you have, not just this site.', open: 'That’s the folder above your site. Whatever folder you open is what gets uploaded, so open the one that holds your site.' },
      { files: ['index.html', 'style.css', 'script.js', 'assets/'], pick: 'index.html sits at the top. This is your site.', open: 'Opened. This folder holds your site with index.html at the top, and it’s what gets uploaded.', ok: true },
      { files: ['logo.png', 'photo.jpg'], pick: 'Only pictures, and no index.html at the top.', open: 'That’s a folder inside your site. index.html isn’t at the top of it, so open my-site/ instead.' },
    ];
    let cur = -1;
    const show = i => {
      peek.textContent = '';
      FOLDERS[i].files.forEach(f => {
        const li = document.createElement('li');
        li.textContent = f;
        if (f === 'index.html') li.className = 'is-key';
        peek.append(li);
      });
    };
    const pick = radios(dirs, b => {
      cur = +b.dataset.folder;
      show(cur);
      say.textContent = FOLDERS[cur].pick;
      go.disabled = false;
      openEl.classList.remove('is-opened', 'is-wrong');
    });
    go.addEventListener('click', () => {
      if (cur < 0) return;
      const f = FOLDERS[cur];
      say.textContent = f.open;
      openEl.classList.toggle('is-opened', !!f.ok);
      openEl.classList.toggle('is-wrong', !f.ok);
      if (f.ok) setStep(0, true);
    });
    if (state.steps[0]) { pick(dirs[1]); openEl.classList.add('is-opened'); say.textContent = FOLDERS[1].open; }
  }

  /* 06 · Step 4: the app is live and the agent offers to keep it; each answer follows the copy. */
  const signin = $('[data-signin]');
  if (signin) {
    const opts = $$('[data-signin-opt]', signin);
    const reply = $('[data-signin-reply]', signin);
    const R = {
      keep: ['ok', 'Give the agent your email. Embarko emails you a token (check spam too). Paste it into the chat and the agent redeploys the same name. Your site is permanent at the same address.'],
      token: ['ok', 'Paste your deploy token into the chat. You can create one at embarko.ai/app/tokens. The agent redeploys the same name and your site is permanent at the same address.'],
      later: ['wait', 'The site stays online until the time the agent gave you, 24 hours after the first deploy. There is no reminder email, so ask the agent to keep it before then.'],
    };
    const choose = b => {
      opts.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const [st, text] = R[b.dataset.signinOpt];
      signin.dataset.state = st;
      reply.textContent = text;
    };
    let autoId = 0;
    opts.forEach(b => b.addEventListener('click', () => {
      autoId++;
      cursor.hide();
      choose(b);
      if (signin.dataset.state === 'ok') setStep(3, true);
    }));
    const cursor = makeCursor(signin);
    onceInView(signin, async () => {
      if (reduced) return;
      const my = ++autoId;
      const alive = () => my === autoId;
      await wait(500);
      if (!alive()) return;
      cursor.show(opts[0], 40, 50);
      await cursor.moveTo(opts[0], alive, 700);
      if (!alive()) return;
      await cursor.press(alive);
      choose(opts[0]);
      await wait(900);
      cursor.hide();
    }, .7);
  }

  /* 06 · Step 3: read the command, then approve it. The log runs to live. */
  const read = $('[data-read]');
  if (read) {
    const check = $('[data-read-check]', read);
    const lines = $$('[data-read-log] li', read);
    const yes = $('[data-read-yes]', read);
    const no = $('[data-read-no]', read);
    const yesLabel = $('span', yes);
    const defaultCheck = check.textContent;
    let runId = 0;
    read.classList.add('is-ready');
    const checked = () => {
      read.classList.remove('is-scanning');
      read.classList.add('is-checked');
      check.textContent = 'It sends your project to ship.embarko.ai, and nowhere else. Safe to approve.';
    };
    const finish = () => {
      read.classList.add('is-approved');
      lines.forEach(l => l.classList.add('is-in'));
      yes.disabled = true;
      no.disabled = true;
      yesLabel.textContent = 'Approved';
      check.textContent = 'Live. The agent hands you the link.';
    };
    const resetRead = () => {
      runId++;
      read.classList.remove('is-approved', 'is-rejected');
      lines.forEach(l => l.classList.remove('is-in'));
      yes.disabled = false;
      no.disabled = false;
      yesLabel.textContent = 'Approve';
      check.textContent = read.classList.contains('is-checked') ? 'It sends your project to ship.embarko.ai, and nowhere else. Safe to approve.' : defaultCheck;
    };
    yes.addEventListener('click', async () => {
      const id = ++runId;
      checked();
      read.classList.remove('is-rejected');
      read.classList.add('is-approved');
      yes.disabled = true;
      no.disabled = true;
      check.textContent = 'Approved. The agent packs, uploads and checks.';
      const gaps = [650, 1200, 1500, 1300];
      for (let k = 0; k < lines.length; k++) {
        if (id !== runId) return;
        lines[k].classList.add('is-in');
        await wait(reduced ? 0 : gaps[k]);
      }
      if (id !== runId) return;
      finish();
      setStep(2, true);
    });
    no.addEventListener('click', () => {
      runId++;
      read.classList.add('is-rejected');
      lines.forEach(l => l.classList.remove('is-in'));
      check.textContent = 'Rejected. Nothing was deployed. When you’re ready, ask the agent to run it again and approve it.';
    });
    stepHooks.push((i, done) => {
      if (i !== 2) return;
      if (done && !read.classList.contains('is-approved')) { checked(); finish(); }
      if (!done && read.classList.contains('is-approved')) resetRead();
    });
    if (state.steps[2]) { checked(); finish(); }
    onceInView(read, async () => {
      if (read.classList.contains('is-checked')) return;
      if (reduced) { checked(); return; }
      read.classList.add('is-scanning');
      check.textContent = 'Reading the command…';
      await wait(1700);
      if (!read.classList.contains('is-approved')) checked();
    }, .6);
  }

  /* 07 · The redeploy machine. Saving next to the code is wiped on redeploy;
     DATA_DIR survives; rollback brings old code back and leaves the data alone. */
  const redo = $('[data-redo]');
  if (redo) {
    const verEl = $('[data-redo-ver]', redo);
    const codeEl = $('[data-redo-code]', redo);
    const serving = $('[data-redo-serving]', redo);
    const cap = $('[data-redo-caption]', redo);
    const shelves = { else: $('[data-redo-items="else"]', redo), data: $('[data-redo-items="data"]', redo) };
    const whereBtns = $$('[data-redo-where]', redo);
    const saveBtn = $('[data-redo-save]', redo);
    const deployBtn = $('[data-redo-deploy]', redo);
    const backBtn = $('[data-redo-back]', redo);
    let ver = 1;
    let max = 1;
    let n = 0;
    let where = 'else';
    let autoId = 0;
    const setVer = () => {
      verEl.textContent = `v${ver}`;
      serving.textContent = `serving v${ver}`;
      codeEl.classList.remove('is-new');
      if (!reduced) { void codeEl.offsetWidth; codeEl.classList.add('is-new'); }
      backBtn.disabled = ver <= 1;
    };
    const pickWhere = radios(whereBtns, b => { where = b.dataset.redoWhere; });
    const save = () => {
      n++;
      const s = document.createElement('span');
      s.className = 'ag-redo__item mono';
      s.textContent = `entry-${n}`;
      shelves[where].append(s);
      cap.textContent = where === 'data' ? `A visitor sends a form. entry-${n} is saved under DATA_DIR.` : `A visitor sends a form. entry-${n} is saved next to the code, outside DATA_DIR.`;
    };
    const deploy = async () => {
      max++;
      ver = max;
      setVer();
      const gone = $$('.ag-redo__item', shelves.else);
      gone.forEach(g => g.classList.add('is-wiped'));
      redo.classList.add('is-deploying');
      const kept = shelves.data.children.length;
      cap.textContent = `Redeployed as v${ver}. ${gone.length ? `${gone.length === 1 ? 'The entry' : 'The entries'} outside DATA_DIR ${gone.length === 1 ? 'is' : 'are'} wiped.` : 'Everything outside DATA_DIR is wiped on each redeploy.'}${kept ? ' Everything under DATA_DIR is still there.' : ''}`;
      await wait(reduced ? 0 : 700);
      gone.forEach(g => g.remove());
      redo.classList.remove('is-deploying');
    };
    const back = () => {
      if (ver <= 1) return;
      ver--;
      setVer();
      cap.textContent = `Rolled back to v${ver}, at the same address. Rollback restores code, never data.`;
    };
    const clearAll = () => {
      ver = 1; max = 1; n = 0;
      shelves.else.textContent = '';
      shelves.data.textContent = '';
      setVer();
      codeEl.classList.remove('is-new');
    };
    const cursor = makeCursor(redo);
    const stopAuto = () => { autoId++; cursor.hide(); redo.classList.add('is-played'); };
    saveBtn.addEventListener('click', save);
    deployBtn.addEventListener('click', deploy);
    backBtn.addEventListener('click', back);
    $('.ag-redo__controls', redo).addEventListener('pointerdown', () => stopAuto(), { capture: true });
    $('.ag-redo__controls', redo).addEventListener('keydown', () => stopAuto(), { capture: true });

    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      const tap = async (el, fn, after = 1500) => {
        await cursor.moveTo(el, alive, 650);
        if (!alive()) return false;
        await cursor.press(alive);
        if (!alive()) return false;
        await fn();
        await wait(after);
        return alive();
      };
      redo.classList.remove('is-played');
      clearAll();
      pickWhere(whereBtns[0]);
      cap.textContent = 'Version 1 is live. Watch what a redeploy keeps.';
      await wait(900);
      if (!alive()) return;
      cursor.show(saveBtn, 30, 60);
      if (!(await tap(saveBtn, save, 1300))) return;
      if (!(await tap(deployBtn, deploy, 2300))) return;
      if (!(await tap(whereBtns[1], () => pickWhere(whereBtns[1]), 500))) return;
      if (!(await tap(saveBtn, save, 1300))) return;
      if (!(await tap(deployBtn, deploy, 2400))) return;
      if (!(await tap(backBtn, back, 2300))) return;
      cursor.hide();
      cap.textContent = 'Your turn. Choose where the site saves, then send a form, redeploy or roll back.';
      redo.classList.add('is-played');
    }
    $('[data-redo-replay]', redo)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    setVer();
    onceInView(redo, () => {
      if (reduced) { redo.classList.add('is-played'); return; }
      setTimeout(() => { if (!redo.classList.contains('is-played')) autoplay(); }, 300);
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
