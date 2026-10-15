/* ==========================================================================
   Embarko · Guide article: interaction layer
   "How to Deploy an App Without GitHub". The engine is the one from the
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
  const LOCAL = '~/my-app/';
  const STEPS_KEY = 'embarko-steps-nogh';
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
  $$('.compare tbody tr').filter(r => !r.closest('[data-ledger]')).forEach(el => revealIO.observe(el));

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
    const data = { title: 'How to Deploy an App Without GitHub (No Repo, No Docker)', text: 'Your AI tool can put your app online without GitHub: one prompt, no repo, no Dockerfile.', url: shareUrl() };
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
        : deployed ? 'Your folder has a live link, and there’s no repo anywhere. Share it.'
        : 'That’s the whole trip. Now take your own folder there: <a href="#steps">do the 4 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : 'On your laptop';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Only you can open it';
    if (arrivalNote) arrivalNote.textContent = live ? 'Anyone with the link can open it, any time.' : 'Finish the four steps and your folder gets a live link.';
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
      if (whisper) whisper.textContent = 'Live. Same files, no repo, and anyone with the link can open it.';
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
    local: 'Your app is a folder on your laptop. Only you can open it.',
    stuck: 'Your app is still a folder on your laptop.',
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
    repo: ['Repository', 'A project folder kept on a service like GitHub, with a history of every change. Many hosts watch one and rebuild your app when it changes.'],
    targz: ['.tar.gz file', 'One compressed file that holds a whole folder, like a .zip. Your AI tool packs your project into one before it uploads it.'],
    dockerfile: ['Dockerfile', 'A recipe file some hosts use to build and run an app. Embarko builds the app itself and rejects an upload that includes one.'],
    subdomain: ['Subdomain', 'The first part of an address, like your-app-name in your-app-name.embarko.app. It is your app’s name, so it must be unique.'],
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
     Scenes for "How to deploy an app without GitHub" (14 Oct 2026).
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

  /* 01 · The Git road: the folder is stopped at four gates before it reaches a link. */
  const gatesEl = $('[data-gates]');
  if (gatesEl) {
    const nodes = $$('.gates__node', gatesEl);
    const items = $$('.gate', gatesEl);
    const cap = $('[data-gates-caption]', gatesEl);
    const titles = items.map(li => $('strong', li).textContent);
    const PAUSE = .7;
    const LEGS = nodes.length - 1;
    const TOTAL = LEGS + (LEGS - 1) * PAUSE;
    let pts = [];
    let vertical = false;
    let lastCap = '';
    const setCap = t => { if (t !== lastCap) { lastCap = t; cap.textContent = t; } };

    const render = () => {
      if (pts.length !== nodes.length) return;
      const p = gatesEl._p ?? 0;
      let t = clamp(p / .9) * TOTAL, pos = 0, at = -1;
      for (let k = 0; k < LEGS; k++) {
        if (t < 1) { pos = k + easeInOut(t); break; }
        t -= 1;
        pos = k + 1;
        if (k + 1 < LEGS) {
          if (t < PAUSE) { at = k; break; }
          t -= PAUSE;
        }
      }
      const i = Math.min(Math.floor(pos), LEGS - 1);
      const f = pos - i;
      const x = lerp(pts[i].x, pts[i + 1].x, f);
      const y = lerp(pts[i].y, pts[i + 1].y, f);
      gatesEl.style.setProperty('--tx', `${x}px`);
      gatesEl.style.setProperty('--ty', `${y}px`);
      gatesEl.style.setProperty('--fill', `${Math.max(0, vertical ? y - pts[0].y : x - pts[0].x)}px`);
      items.forEach((li, k) => {
        li.classList.toggle('is-here', at === k);
        li.classList.toggle('is-passed', pos >= k + 1 && at !== k);
      });
      const done = pos >= LEGS - 1e-6;
      gatesEl.classList.toggle('is-done', done);
      gatesEl.classList.toggle('is-moving', p > .002);
      setCap(done ? 'Four gates, then a link. After that, every push rebuilds the app.'
        : at >= 0 ? `Gate ${at + 1} of 4 · ${titles[at]}`
        : pos > LEGS - 1 ? 'Through the last gate…'
        : p < .02 ? 'Four things to set up before the first link.'
        : `On the way to gate ${Math.floor(pos) + 1}…`);
    };

    const measure = () => {
      const fr = gatesEl.getBoundingClientRect();
      pts = nodes.map(n => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - fr.left, y: r.top + r.height / 2 - fr.top };
      });
      vertical = Math.abs(pts[1].y - pts[0].y) > 10;
      gatesEl.classList.toggle('is-vertical', vertical);
      gatesEl.style.setProperty('--x0', `${pts[0].x}px`);
      gatesEl.style.setProperty('--y0', `${pts[0].y}px`);
      gatesEl.style.setProperty('--x1', `${pts[LEGS].x}px`);
      gatesEl.style.setProperty('--y1', `${pts[LEGS].y}px`);
      gatesEl.classList.add('is-measured');
      render();
    };
    measurers.push(measure);
    onScrub(gatesEl, render);
  }

  /* 02 · The folder simulator. It deploys an example folder by itself, then
     adds a Dockerfile and gets turned away; after that the reader drives. */
  const sim = $('[data-sim]');
  if (sim) {
    const out = $('[data-sim-out]', sim);
    const cap = $('[data-sim-caption]', sim);
    const stations = $$('[data-station]', sim);
    const runBtn = $('[data-sim-run]', sim);
    const toggles = $$('[data-sim-toggle]', sim);
    const dockerRow = $('[data-file="docker"]', sim);
    const nestRow = $('[data-file="nest"]', sim);
    const manifestRow = $('[data-file="manifest"]', sim);
    const junk = $$('.sim__file--junk', sim);
    const opts = { docker: false, nest: false };
    let runId = 0;
    let autoId = 0;

    const clearLog = () => {
      out.textContent = '';
      const s = document.createElement('span');
      s.className = 'sim__l sim__l--soft';
      s.textContent = '$ waiting for a folder';
      out.append(s);
    };
    const resetPipe = () => {
      sim.classList.remove('is-ok', 'is-fail', 'is-running');
      stations.forEach(s => { s.dataset.state = ''; });
      junk.forEach(j => j.classList.remove('is-dropped'));
    };
    const setOpt = (key, on) => {
      opts[key] = on;
      $(`[data-sim-toggle="${key}"]`, sim).setAttribute('aria-pressed', String(on));
      if (key === 'docker') dockerRow.hidden = !on;
      if (key === 'nest') {
        nestRow.hidden = !on;
        manifestRow.classList.toggle('is-nested', on);
      }
      [dockerRow, manifestRow].forEach(r => r.classList.remove('is-new'));
      const changed = key === 'docker' ? dockerRow : manifestRow;
      if (on && !reduced) { void changed.offsetWidth; changed.classList.add('is-new'); }
    };

    const addLine = (label, cls) => {
      const s = document.createElement('span');
      s.className = `sim__l ${cls || ''}`;
      const b = document.createElement('b');
      b.textContent = label.padEnd(7, ' ');
      const t = document.createTextNode('');
      s.append(b, t);
      if (out.firstChild?.textContent === '$ waiting for a folder') out.textContent = '';
      out.append(s);
      return t;
    };
    const typeLine = async (id, label, text, cls) => {
      const t = addLine(label, cls);
      if (reduced) { t.textContent = text; return; }
      for (let k = 1; k <= text.length; k++) {
        if (id !== runId) return;
        t.textContent = text.slice(0, k);
        await wait(11);
      }
    };
    const station = (i, st) => { stations[i].dataset.state = st; };
    const pause = ms => wait(reduced ? 0 : ms);

    async function run() {
      const id = ++runId;
      const alive = () => id === runId;
      resetPipe();
      out.textContent = '';
      sim.classList.add('is-running');
      cap.textContent = 'Packing the folder…';
      station(0, 'on');
      await typeLine(id, 'pack', 'my-app → my-app.tar.gz');
      if (!alive()) return;
      junk.forEach(j => j.classList.add('is-dropped'));
      await typeLine(id, '', 'left out: node_modules/, .git/, .env', 'sim__l--soft');
      await pause(380);
      if (!alive()) return;
      station(0, 'ok');
      station(1, 'on');
      cap.textContent = 'Uploading the archive straight to Embarko…';
      await pause(520);
      if (!alive()) return;
      const fail = async (lineA, fix, msg) => {
        station(1, 'fail');
        await typeLine(id, 'upload', lineA, 'sim__l--bad');
        if (!alive()) return;
        await typeLine(id, 'fix', fix, 'sim__l--fix');
        if (!alive()) return;
        sim.classList.remove('is-running');
        sim.classList.add('is-fail');
        cap.textContent = msg;
      };
      if (opts.docker) {
        return fail('rejected: the upload includes a Dockerfile', 'delete the Dockerfile. Embarko builds the app itself.',
          'Turned away. Embarko builds the app itself, so it rejects an upload that includes a Dockerfile.');
      }
      if (opts.nest) {
        return fail('422 no_manifest_at_root', 'package.json is in a subfolder. Repackage so it’s at the top level.',
          'Stopped. Embarko looks for package.json at the top of the folder, and this one is inside app/.');
      }
      await typeLine(id, 'upload', '202 Accepted, build started');
      if (!alive()) return;
      station(1, 'ok');
      station(2, 'on');
      cap.textContent = 'Building. Embarko works out the language from your files…';
      await pause(700);
      if (!alive()) return;
      await typeLine(id, 'build', 'package.json found → Node.js');
      await pause(380);
      if (!alive()) return;
      station(2, 'ok');
      station(3, 'on');
      await typeLine(id, 'serve', `live at https://${state.appName}.embarko.app`, 'sim__l--ok');
      if (!alive()) return;
      station(3, 'ok');
      sim.classList.remove('is-running');
      sim.classList.add('is-ok');
      cap.textContent = 'Live. Packed, uploaded, built and served, with no repository anywhere on the way.';
    }

    const cursor = makeCursor(sim);
    const stopAuto = () => { autoId++; cursor.hide(); sim.classList.add('is-played'); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      sim.classList.remove('is-played');
      setOpt('docker', false);
      setOpt('nest', false);
      await run();
      if (!alive()) return;
      await wait(1500);
      if (!alive()) return;
      cursor.show(runBtn);
      await cursor.moveTo(toggles[0], alive);
      if (!alive()) return;
      await cursor.press(alive);
      setOpt('docker', true);
      resetPipe();
      clearLog();
      cap.textContent = 'Now the same folder, with a Dockerfile your AI tool added.';
      await wait(900);
      if (!alive()) return;
      await cursor.moveTo(runBtn, alive);
      if (!alive()) return;
      await cursor.press(alive);
      await run();
      if (!alive()) return;
      cursor.hide();
      await wait(1800);
      if (!alive()) return;
      cap.textContent = 'Your turn. Take the Dockerfile out and deploy again, or move package.json into a subfolder and see what happens.';
      sim.classList.add('is-played');
    }

    toggles.forEach(b => b.addEventListener('click', () => {
      stopAuto();
      runId++;
      setOpt(b.dataset.simToggle, b.getAttribute('aria-pressed') !== 'true');
      resetPipe();
      clearLog();
      cap.textContent = 'Folder changed. Press “Deploy this folder”.';
    }));
    runBtn.addEventListener('click', () => { stopAuto(); run(); });
    $('.sim__controls', sim).addEventListener('pointerdown', () => { if (autoId) stopAuto(); }, { capture: true });
    $('[data-sim-replay]', sim)?.addEventListener('click', () => { if (!reduced) { cursor.hide(); autoplay(); } });

    resetPipe();
    clearLog();
    onceInView(sim, () => {
      if (reduced || sim.classList.contains('is-played')) { sim.classList.add('is-played'); run(); return; }
      setTimeout(() => { if (!sim.classList.contains('is-played')) autoplay(); }, 350);
    }, .45);
  }

  /* 03 · The ledger: each usual-route job is struck as you scroll; the count runs to zero. */
  const ledger = $('[data-ledger]');
  if (ledger) {
    const rows = $$('tbody tr', ledger);
    const nEl = $('[data-ledger-n]', ledger);
    const label = $('[data-ledger-label]', ledger);
    let last = -1;
    onScrub(ledger, p => {
      const k = Math.round(clamp(p / .85) * rows.length);
      if (k === last) return;
      last = k;
      rows.forEach((r, i) => r.classList.toggle('in', i < k));
      const left = rows.length - k;
      nEl.textContent = String(left);
      label.textContent = left === rows.length ? 'setup jobs on the usual route'
        : left === 0 ? 'setup jobs left. Paste one prompt, then approve and keep.'
        : left === 1 ? 'setup job left' : 'setup jobs left';
      ledger.classList.toggle('is-clear', left === 0);
      if (!reduced) { nEl.classList.remove('is-ticking'); void nEl.offsetWidth; nEl.classList.add('is-ticking'); }
    });
  }

  /* 04 · Step 2: the example ask types itself into a chat box. */
  const composer = $('[data-composer]');
  if (composer) {
    const full = $('#ask-line').textContent;
    const typed = $('[data-composer-typed]', composer);
    composer.classList.add('is-ready');
    onceInView(composer, async () => {
      if (reduced) { typed.textContent = full; composer.classList.add('is-typed'); return; }
      await wait(250);
      for (let k = 1; k <= full.length; k++) {
        typed.textContent = full.slice(0, k);
        await wait(28 + Math.random() * 30);
      }
      composer.classList.add('is-typed');
    }, .8);
  }

  /* 04 · Step 3: the status log fills in as you scroll; 202 is flagged as "not live yet". */
  const poll = $('[data-poll]');
  if (poll) {
    const items = $$('[data-at]', poll);
    const st = $('[data-poll-state]', poll);
    let lastS = '';
    onScrub(poll, p => {
      items.forEach(el => el.classList.toggle('is-in', p >= +el.dataset.at));
      const s = p < .2 ? 'packing' : p < .4 ? '202 · not live yet' : p < .82 ? 'checking every 10 s' : 'live';
      if (s === lastS) return;
      lastS = s;
      st.textContent = s;
      poll.dataset.state = s === 'live' ? 'live' : s.startsWith('202') ? 'wait' : 'run';
    });
  }

  /* 04 · Step 4: the 24-hour clock runs down with the scroll. Keep stops it. */
  const keep = $('[data-keep]');
  if (keep) {
    const hEl = $('[data-keep-h]', keep);
    const note = $('[data-keep-note]', keep);
    const cap = $('[data-keep-caption]', keep);
    const btn = $('[data-keep-btn]', keep);
    const btnLabel = $('span', btn);
    const defaults = { note: note.textContent, cap: cap.textContent };
    let revived = false;
    let lastH = -1;

    const render = () => {
      if (state.steps[3]) return;
      const p = keep._p ?? 0;
      const hours = reduced || revived ? 24 : Math.max(0, Math.round(24 * (1 - clamp(p / .92))));
      keep.style.setProperty('--left', (hours / 24).toFixed(3));
      if (hours === lastH) return;
      lastH = hours;
      hEl.textContent = String(hours);
      const gone = hours === 0;
      keep.classList.toggle('is-gone', gone);
      keep.classList.toggle('is-low', hours > 0 && hours <= 6);
      btnLabel.textContent = gone ? 'Deploy again' : 'Keep';
      note.textContent = gone ? 'Never kept. The link is gone.' : defaults.note;
      cap.textContent = gone ? 'No email came. Deploy it again, and press Keep this time.'
        : hours <= 6 ? 'A few hours left, and no email will remind you.'
        : defaults.cap;
    };
    const syncKept = () => {
      const kept = !!state.steps[3];
      keep.classList.toggle('is-kept', kept);
      if (kept) {
        keep.classList.remove('is-gone', 'is-low');
        keep.style.setProperty('--left', '1');
        btnLabel.textContent = 'Kept';
        note.textContent = 'Kept. It stays at the same address.';
        cap.textContent = 'That’s the whole trip: a folder on your laptop to a live link, with no repo.';
      } else {
        lastH = -1;
        render();
      }
    };
    btn.addEventListener('click', () => {
      if (keep.classList.contains('is-gone')) {
        revived = true;
        lastH = -1;
        render();
        cap.textContent = 'Deployed again: a fresh 24 hours. Press Keep now.';
        return;
      }
      setStep(3, !state.steps[3]);
    });
    stepHooks.push(syncKept);
    onScrub(keep, render);
    syncKept();
  }

  /* 05 · Deploy history. v3 ships and breaks the menu; the live pin rolls back to v2.
     Then the reader picks any version, by tap, arrow keys or by dragging the pin. */
  const hist = $('[data-history]');
  if (hist) {
    const track = $('[data-history-track]', hist);
    const versions = $$('.history__v', hist);
    const pages = $$('.history__page', hist);
    const serving = $('[data-history-serving]', hist);
    const cap = $('[data-history-caption]', hist);
    let cur = 1;

    const placePin = () => {
      const tr = track.getBoundingClientRect();
      const dot = $('.history__dot', versions[cur]).getBoundingClientRect();
      const first = $('.history__dot', versions[0]).getBoundingClientRect();
      const lastShown = versions.filter(v => !v.hidden).pop();
      const end = $('.history__dot', lastShown).getBoundingClientRect();
      track.style.setProperty('--pin', `${dot.left + dot.width / 2 - tr.left}px`);
      track.style.setProperty('--rail0', `${first.left + first.width / 2 - tr.left}px`);
      track.style.setProperty('--rail1', `${end.left + end.width / 2 - tr.left}px`);
      track.style.setProperty('--dot-y', `${dot.top + dot.height / 2 - tr.top}px`);
    };
    const select = (i, { say = true, focus = false } = {}) => {
      cur = i;
      versions.forEach((v, k) => {
        v.setAttribute('aria-checked', String(k === i));
        v.tabIndex = k === i ? 0 : -1;
      });
      pages.forEach((pg, k) => pg.classList.toggle('is-on', k === i));
      const broken = i === 2;
      hist.classList.toggle('is-broken', broken);
      serving.textContent = `serving v${i + 1}`;
      placePin();
      if (focus) versions[i].focus();
      if (say) cap.textContent = broken ? 'v3 is live, and its menu links are broken. Roll back to a build that worked.'
        : `v${i + 1} is live, at the same address.`;
    };
    versions.forEach((v, i) => {
      v.addEventListener('click', () => { stopAuto(); select(i); });
      v.addEventListener('keydown', e => {
        const shown = versions.filter(x => !x.hidden);
        const idx = shown.indexOf(v);
        const k = { ArrowRight: idx + 1, ArrowDown: idx + 1, ArrowLeft: idx - 1, ArrowUp: idx - 1 }[e.key];
        if (k == null) return;
        e.preventDefault();
        stopAuto();
        select(versions.indexOf(shown[(k + shown.length) % shown.length]), { focus: true });
      });
    });

    /* Drag the pin along the track; it snaps to the nearest deploy. */
    let dragging = false;
    const nearest = x => {
      let best = cur, bestD = Infinity;
      versions.forEach((v, k) => {
        if (v.hidden) return;
        const r = $('.history__dot', v).getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - x);
        if (d < bestD) { bestD = d; best = k; }
      });
      return best;
    };
    const pin = $('.history__pin', hist);
    pin.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stopAuto();
      dragging = true;
      track.classList.add('is-dragging');
      pin.setPointerCapture?.(e.pointerId);
    });
    pin.addEventListener('pointermove', e => {
      if (!dragging) return;
      const tr = track.getBoundingClientRect();
      track.style.setProperty('--pin', `${clamp(e.clientX - tr.left, 0, tr.width)}px`);
      const n = nearest(e.clientX);
      if (n !== cur) { cur = n; pages.forEach((pg, k) => pg.classList.toggle('is-on', k === n)); }
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      select(cur);
    };
    pin.addEventListener('pointerup', endDrag);
    pin.addEventListener('pointercancel', endDrag);

    let autoId = 0;
    const cursor = makeCursor(hist);
    function stopAuto() { autoId++; cursor.hide(); hist.classList.add('is-played'); }
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      hist.classList.remove('is-played');
      versions[2].hidden = true;
      select(1, { say: false });
      cap.textContent = 'v2 is live. You ask your tool to redeploy with the same app name…';
      await wait(1500);
      if (!alive()) return;
      versions[2].hidden = false;
      versions[2].classList.add('is-new');
      select(2, { say: false });
      cap.textContent = 'v3 goes out to the same address. Its new menu broke the links.';
      await wait(2200);
      if (!alive()) return;
      cursor.show(versions[2], 30, 50);
      await cursor.moveTo(versions[1], alive, 900);
      if (!alive()) return;
      await cursor.press(alive);
      select(1, { say: false });
      cap.textContent = 'Rolled back to v2, a recent successful build. Same address.';
      await wait(900);
      if (!alive()) return;
      cursor.hide();
      await wait(1400);
      if (!alive()) return;
      cap.textContent = 'Your turn: tap a version, or drag the live pin.';
      hist.classList.add('is-played');
    }
    $('[data-history-replay]', hist)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    measurers.push(placePin);
    hist.classList.add('is-ready');
    versions[2].hidden = true;
    select(1, { say: false });
    onceInView(hist, () => {
      if (reduced) { versions[2].hidden = false; select(1, { say: false }); placePin(); hist.classList.add('is-played'); return; }
      setTimeout(autoplay, 300);
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
