/* ==========================================================================
   Embarko · Guide article: interaction layer
   "How to Host a Website Built with Claude". The engine is the one from the
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
  const state = { appName: 'your-site-name', steps: [false, false, false, false], finale: false, live: false };
  const LOCAL = 'localhost:3000';
  const STEPS_KEY = 'embarko-steps-claude';
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
    toast('Prompt copied. Paste it into Claude Code.');
    if (btn.dataset.completes) setStep(Number(btn.dataset.completes), true);
  }));

  $$('[data-copy-text]').forEach(btn => btn.addEventListener('click', async () => {
    const src = document.getElementById(btn.dataset.copyText);
    if (!src || !(await copyText(src.textContent.trim()))) {
      toast('Couldn’t copy that. Select it and copy instead.', false);
      return;
    }
    flashCopied(btn, 'Copied');
    toast('Copied. Paste it into Claude Code.');
    if (btn.dataset.completes) setStep(Number(btn.dataset.completes), true);
  }));

  const shareUrl = () => $('link[rel="canonical"]')?.href || location.href.split('#')[0];
  $$('[data-share]').forEach(btn => btn.addEventListener('click', async () => {
    const data = { title: 'How to Host a Website Built with Claude', text: 'Built a website with Claude? Ask Claude Code to deploy it and get a live HTTPS link.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to someone whose Claude just built them a website.' : data.url, ok);
  }));

  /* ------------------------------------------------------------------------
     Name your site: every "your-site-name" in the article follows along.
     Mirrors Embarko's naming rule (lowercase letters, numbers and dashes).
     ------------------------------------------------------------------------ */
  const slugify = v => v.toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');

  function setAppName(raw, persist = true) {
    const slug = slugify(raw) || 'your-site-name';
    state.appName = slug;
    $$('[data-app-name]').forEach(el => { if (el.textContent !== slug) el.textContent = slug; });
    if (finaleSection?.classList.contains('is-arrived') && omni) omni.textContent = `${slug}.embarko.app`;
    updateJourneyAddr(false);
    if (persist) store.set('embarko-app-name', slug === 'your-site-name' ? '' : slug);
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
    appInput.addEventListener('focus', () => { if (appInput.value === 'your-site-name') appInput.select(); });
    appInput.addEventListener('blur', () => {
      appInput.value = slugify(appInput.value) || 'your-site-name';
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

  /* Option tabs (skill or prompt): remembers the reader's choice. */
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
      if (persist) store.set('embarko-claude-option', btn.dataset.tool);
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
    const savedTool = store.get('embarko-claude-option');
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
        : deployed ? 'Your site has a live link, and Claude Code did the hosting work. Share it.'
        : 'That’s the whole trip. Now take your own site there: <a href="#steps">do the 4 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live' : 'On your computer';
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
      if (whisper) whisper.textContent = 'Live. Same site, and anyone with the link can open it.';
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
    local: 'Your site is on your computer at localhost:3000. Only you can open it.',
    stuck: 'Your site is still at localhost:3000.',
    near: 'Your site is one ask in Claude Code away from a live link.',
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
    server: ['Server', 'A computer in a data center that stays on all the time, so the sites on it are always reachable.'],
    hosting: ['Hosting', 'A server, your site’s files on it and a public address, all together.'],
    dockerfile: ['Dockerfile', 'A recipe file some hosts use to build and run an app. Embarko builds the site itself and rejects an upload that includes one.'],
    env: ['Environment variables', 'Settings kept on the host, outside your code. Secret keys go here: your site can read them, visitors can’t.'],
    subdomain: ['Subdomain', 'The first part of an address, like your-site-name in your-site-name.embarko.app. It is your site’s name, so it must be unique.'],
    dns: ['DNS record', 'An entry at your domain’s DNS provider that tells browsers where your domain points.'],
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


  /* Troubleshooting · Pick a symptom; the console types the cause and the fix. */
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
     Scenes for "How to host a website built with Claude" (14 Oct 2026).
     Same engine, same colour script; one module per scene. Each self-playing
     scene plays once when it scrolls into view, then hands over to the reader.
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
      el: c,
      pos: () => [x, y],
      show(el, dx = 40, dy = 60) { const [ex, ey] = local(el); put(ex + dx, ey + dy); c.classList.add('is-on'); },
      hide() { c.classList.remove('is-on', 'is-pressing'); },
      hold(on) { c.classList.toggle('is-pressing', on); },
      async moveTo(el, alive, ms = 700, each) {
        const [fx, fy] = [x, y];
        const [tx, ty] = local(el);
        await tween(ms, k => { put(lerp(fx, tx, k), lerp(fy, ty, k)); each?.(x, y); }, alive);
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
  const joinList = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

  /* A roving-tabindex tablist: arrows, Home and End move the choice. */
  function makePicker(list, onPick) {
    const tabs = $$('[role="tab"]', list);
    const select = (i, { focus = false, user = true } = {}) => {
      tabs.forEach((b, k) => {
        const on = k === i;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tabs[i].focus();
      onPick(i, user);
    };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', e => {
        const k = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (k == null) return;
        e.preventDefault();
        select((k + tabs.length) % tabs.length, { focus: true });
      });
    });
    return { tabs, select };
  }

  /* 01 · The hosting kit. A friend's phone opens your link; it only works once
     the kit holds all three parts: a server, your files on it, a public address. */
  const kit = $('[data-kit]');
  if (kit) {
    const parts = $$('.cl-part', kit);
    const tray = $('[data-kit-tray]', kit);
    const view = $('.cl-kit__view', kit);
    const slots = Object.fromEntries($$('.cl-slot', kit).map(s => [s.dataset.slot, s]));
    const cap = $('[data-kit-caption]', kit);
    const errTitle = $('[data-kit-err-title]', kit);
    const errText = $('[data-kit-err]', kit);
    const ORDER = ['server', 'files', 'address'];
    const NAMES = { server: 'a server that stays on', files: 'your site’s files on it', address: 'a public address' };
    const docked = new Set(ORDER);
    const addrEl = $('[data-kit-addr]', kit);
    addrEl.innerHTML = '<span class="cl-phone__local">localhost:3000</span><span class="cl-phone__public"><span data-app-name></span>.embarko.app</span>';
    $('[data-app-name]', addrEl).textContent = state.appName;

    const render = (say = true) => {
      parts.forEach(p => p.setAttribute('aria-pressed', String(docked.has(p.dataset.part))));
      ORDER.forEach(k => slots[k].classList.toggle('is-in', docked.has(k)));
      const all = docked.size === ORDER.length;
      const missing = ORDER.filter(k => !docked.has(k)).map(k => NAMES[k]);
      kit.classList.toggle('is-hosted', all);
      kit.classList.toggle('has-address', docked.has('address'));
      if (!docked.size) {
        errTitle.textContent = 'This site can’t be reached';
        errText.textContent = 'localhost:3000 points at this phone, and your site isn’t on it.';
      } else if (!all) {
        errTitle.textContent = docked.has('address') ? 'Nothing answers here yet' : 'This site can’t be reached';
        errText.textContent = `Still missing: ${joinList(missing)}.`;
      }
      if (!say) return;
      cap.textContent = all ? 'Server + files + address = hosting. Your friend opens the site.'
        : !docked.size ? 'Your friend opens your link and gets nothing. Hosting is three parts.'
        : `${docked.size} of 3 in the kit. Still missing: ${joinList(missing)}.`;
    };
    const toggle = (key, on) => { on ? docked.add(key) : docked.delete(key); render(); };

    const ghost = document.createElement('span');
    ghost.className = 'cl-kit__ghost';
    ghost.setAttribute('aria-hidden', 'true');
    kit.append(ghost);
    const toLocal = (x, y) => { const r = kit.getBoundingClientRect(); return [x - r.left, y - r.top]; };
    const putGhost = (x, y) => { ghost.style.left = `${x}px`; ghost.style.top = `${y}px`; };
    const lift = p => {
      ghost.innerHTML = $('.cl-part__icon', p).innerHTML;
      ghost.append(document.createTextNode($('b', p).textContent));
      ghost.classList.add('is-on');
      p.classList.add('is-lifted');
    };
    const drop = p => { ghost.classList.remove('is-on'); p.classList.remove('is-lifted'); tray.classList.remove('is-over'); };
    const overTray = (x, y) => {
      const r = tray.getBoundingClientRect();
      return x > r.left - 20 && x < r.right + 20 && y > r.top - 20 && y < r.bottom + 20;
    };

    let autoId = 0;
    const cursor = makeCursor(kit);
    const stopAuto = () => {
      autoId++;
      cursor.hide();
      ghost.classList.remove('is-on');
      parts.forEach(p => p.classList.remove('is-lifted'));
      tray.classList.remove('is-over');
      kit.classList.add('is-played');
    };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      kit.classList.remove('is-played');
      docked.clear();
      render();
      await wait(1500);
      if (!alive()) return;
      cursor.show(parts[0], 60, 70);
      for (const p of parts) {
        await cursor.moveTo(p, alive, 650);
        if (!alive()) return;
        cursor.hold(true);
        putGhost(...cursor.pos());
        lift(p);
        await wait(220);
        if (!alive()) return;
        await cursor.moveTo(slots[p.dataset.part], alive, 900, (x, y) => {
          putGhost(x, y);
          tray.classList.toggle('is-over', true);
        });
        if (!alive()) return;
        cursor.hold(false);
        drop(p);
        toggle(p.dataset.part, true);
        await wait(1500);
        if (!alive()) return;
      }
      cursor.hide();
      await wait(900);
      if (!alive()) return;
      cap.textContent = 'Your turn: drag a part out of the kit, or tap it, and watch the phone.';
      kit.classList.add('is-played');
    }

    let drag = null;
    parts.forEach(p => {
      p.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        stopAuto();
        drag = { p, x0: e.clientX, y0: e.clientY, moved: false };
        p.setPointerCapture?.(e.pointerId);
      });
      p.addEventListener('pointermove', e => {
        if (!drag || drag.p !== p) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        if (!drag.moved) { drag.moved = true; lift(p); }
        putGhost(...toLocal(e.clientX, e.clientY));
        tray.classList.toggle('is-over', overTray(e.clientX, e.clientY));
      });
      const end = e => {
        if (!drag || drag.p !== p) return;
        const d = drag;
        drag = null;
        if (!d.moved) return;
        p._dragged = true;
        setTimeout(() => { p._dragged = false; }, 0);
        drop(p);
        if (e.type === 'pointerup') toggle(p.dataset.part, overTray(e.clientX, e.clientY));
      };
      p.addEventListener('pointerup', end);
      p.addEventListener('pointercancel', end);
      p.addEventListener('click', () => {
        if (p._dragged) return;
        stopAuto();
        toggle(p.dataset.part, !docked.has(p.dataset.part));
      });
    });
    $('[data-kit-replay]', kit)?.addEventListener('click', () => { if (!reduced) autoplay(); });

    if (!reduced) { docked.clear(); render(); }
    onceInView(kit, () => {
      if (reduced || kit.classList.contains('is-played')) { kit.classList.add('is-played'); return; }
      setTimeout(() => { if (!kit.classList.contains('is-played')) autoplay(); }, 300);
    }, .45);
  }

  /* 02 · The tab pile. Every job on the usual route opens another tab; the
     site itself stays at localhost:3000. Open tabs can be clicked afterwards. */
  const pile = $('[data-pile]');
  if (pile) {
    const items = $$('.cl-pile__item', pile);
    const tabs = $$('.cl-tab', pile);
    const panes = $$('.cl-pane', pile);
    const urlEl = $('[data-pile-url]', pile);
    const statusEl = $('[data-pile-status]', pile);
    const cap = $('[data-pile-caption]', pile);
    const URLS = ['localhost:3000', 'github.com/new', 'host.example/signup', 'host.example/settings/build', 'host.example/settings/env', 'host.example/deploys/logs'];
    const LABELS = tabs.map(t => t.textContent.trim());
    let opened = -1;
    let picked = null;

    const show = k => {
      tabs.forEach((t, i) => { t.classList.toggle('is-on', i === k); t.setAttribute('aria-pressed', String(i === k)); });
      panes.forEach((p, i) => p.classList.toggle('is-on', i === k));
      urlEl.textContent = URLS[k];
    };
    const render = () => {
      const line = innerHeight * .55;
      let n = 0;
      items.forEach((it, k) => { if (it.getBoundingClientRect().top < line) n = k + 1; });
      if (reduced) n = items.length;
      items.forEach((it, k) => {
        it.classList.toggle('is-active', k === n - 1);
        it.classList.toggle('is-passed', k < n - 1);
      });
      if (n === opened) return;
      opened = n;
      picked = null;
      tabs.forEach((t, i) => { t.classList.toggle('is-open', i <= n); t.tabIndex = i <= n ? 0 : -1; });
      show(n);
      statusEl.textContent = n ? `Your site: still localhost:3000 · ${n + 1} tabs open` : 'Your site: localhost:3000';
      cap.textContent = n === 0 ? 'One tab: your site, on your computer.'
        : n === items.length ? 'Five more tabs, and your site is still at localhost:3000.'
        : `Tab ${n + 1}: ${LABELS[n]}. The site hasn’t moved.`;
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      if (!t.classList.contains('is-open')) return;
      picked = i;
      show(i);
      cap.textContent = i === 0 ? 'Your site, still at localhost:3000.' : `${LABELS[i]}: one more thing to set up before the first link.`;
    }));
    onScrub(pile, render);
    measurers.push(() => { opened = -1; render(); });
  }

  /* 03 · Before/after wipe. The handle sweeps once by itself; then the reader
     drags it, uses the arrow keys or taps either end. */
  const wipeEl = $('[data-wipe]');
  if (wipeEl) {
    const frame = $('[data-wipe-frame]', wipeEl);
    const handle = $('[data-wipe-handle]', wipeEl);
    const cap = $('[data-wipe-caption]', wipeEl);
    const defaultCap = cap.textContent;
    let x = 50;
    const set = (v, say = true) => {
      x = clamp(v, 0, 100);
      wipeEl.style.setProperty('--x', `${x.toFixed(2)}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(x)));
      handle.setAttribute('aria-valuetext', x >= 97 ? 'All of the usual route' : x <= 3 ? 'All of Embarko' : `${Math.round(x)}% usual route, ${Math.round(100 - x)}% Embarko`);
      if (!say) return;
      cap.textContent = x >= 97 ? 'The usual route: four jobs before the first link.'
        : x <= 3 ? 'With Embarko: one ask, and Claude Code covers all four.'
        : defaultCap;
    };
    let autoId = 0;
    const stopAuto = () => { autoId++; wipeEl.classList.add('is-played'); };
    const glide = async (to, ms, alive) => { const from = x; await tween(ms, k => set(lerp(from, to, k)), alive); };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      wipeEl.classList.remove('is-played');
      set(100);
      await wait(1100);
      if (!alive()) return;
      await glide(0, 2800, alive);
      if (!alive()) return;
      await wait(1300);
      if (!alive()) return;
      await glide(50, 900, alive);
      if (!alive()) return;
      cap.textContent = 'Your turn: drag the handle, or tap either end.';
      wipeEl.classList.add('is-played');
    }
    const fromPointer = e => { const r = frame.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    let dragging = false;
    frame.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      stopAuto();
      dragging = true;
      wipeEl.classList.add('is-dragging');
      frame.setPointerCapture?.(e.pointerId);
      fromPointer(e);
    });
    frame.addEventListener('pointermove', e => { if (dragging) fromPointer(e); });
    const endDrag = () => { dragging = false; wipeEl.classList.remove('is-dragging'); };
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
    handle.addEventListener('keydown', e => {
      const v = { ArrowLeft: x - 5, ArrowDown: x - 5, ArrowRight: x + 5, ArrowUp: x + 5, Home: 0, End: 100, PageDown: x - 20, PageUp: x + 20 }[e.key];
      if (v == null) return;
      e.preventDefault();
      stopAuto();
      set(v);
    });
    $$('[data-wipe-to]', wipeEl).forEach(b => b.addEventListener('click', () => {
      stopAuto();
      const my = autoId;
      if (reduced) set(+b.dataset.wipeTo); else glide(+b.dataset.wipeTo, 700, () => my === autoId);
    }));
    $('[data-wipe-replay]', wipeEl)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    set(50, false);
    onceInView(wipeEl, () => {
      if (reduced) { wipeEl.classList.add('is-played'); return; }
      setTimeout(() => { if (!wipeEl.classList.contains('is-played')) autoplay(); }, 300);
    }, .55);
  }

  /* 04 · Route finder. Pick where the site lives; its route draws to a live
     link. The Claude chat and Artifact routes fork on one question each. */
  const finder = $('[data-finder]');
  if (finder) {
    const panels = $$('.cl-finder__panel', finder);
    const cap = $('[data-finder-caption]', finder);
    const KEYS = ['code', 'app', 'artifact'];
    const SAY = {
      code: 'Claude Code: the agent packs the folder and uploads it. Nothing to host first.',
      'app-yes': 'Connector added: Claude sends the site’s files with deploy_app, and the site lands in your account.',
      'app-no': 'No connector yet: add it once, then ask Claude to deploy. The site is permanent from the start.',
      'artifact-no': 'Put the artifact’s files in a project and deploy it with the connector or Claude Code.',
      'artifact-yes': 'window.storage is rejected at deploy. Switch to SQLite under DATA_DIR, and it becomes a server app.',
    };
    let cur = 0;
    const draw = panel => {
      $$('.cl-route', panel).forEach(r => {
        r.classList.remove('is-drawn');
        void r.offsetWidth;
        r.classList.add('is-drawn');
      });
    };
    const say = () => {
      const p = panels[cur];
      const key = p.dataset.branch ? `${KEYS[cur]}-${p.dataset.branch}` : KEYS[cur];
      cap.textContent = SAY[key];
    };
    const setFork = (panel, val) => {
      panel.dataset.branch = val;
      $$('[data-fork]', panel).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fork === val)));
      draw(panel);
      say();
    };
    let autoId = 0;
    const stopAuto = () => { autoId++; cursor.hide(); finder.classList.add('is-played'); };
    const picker = makePicker($('.cl-finder__picks', finder), (i, user) => {
      cur = i;
      if (user) { stopAuto(); store.set('embarko-claude-setup', KEYS[i]); }
      draw(panels[i]);
      say();
    });
    panels.forEach(panel => $$('[data-fork]', panel).forEach(b => b.addEventListener('click', () => { stopAuto(); setFork(panel, b.dataset.fork); })));
    const cursor = makeCursor(finder);
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      finder.classList.remove('is-played');
      panels.forEach(p => { if (p.dataset.branch) setFork(p, 'no'); });
      picker.select(0, { user: false });
      await wait(2300);
      if (!alive()) return;
      cursor.show(picker.tabs[0], 30, 40);
      for (const i of [1, 2]) {
        await cursor.moveTo(picker.tabs[i], alive, 750);
        if (!alive()) return;
        await cursor.press(alive);
        picker.select(i, { user: false });
        await wait(2200);
        if (!alive()) return;
        const yes = $('[data-fork="yes"]', panels[i]);
        await cursor.moveTo(yes, alive, 650);
        if (!alive()) return;
        await cursor.press(alive);
        setFork(panels[i], 'yes');
        await wait(2700);
        if (!alive()) return;
      }
      cursor.hide();
      const saved = KEYS.indexOf(store.get('embarko-claude-setup'));
      panels.forEach(p => { if (p.dataset.branch) setFork(p, 'no'); });
      picker.select(saved < 0 ? 0 : saved, { user: false });
      cap.textContent = 'Your turn: pick where your site lives, and answer its question.';
      finder.classList.add('is-played');
    }
    $('[data-finder-replay]', finder)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    const saved = KEYS.indexOf(store.get('embarko-claude-setup'));
    picker.select(saved < 0 ? 0 : saved, { user: false });
    onceInView(finder, () => {
      if (reduced) { finder.classList.add('is-played'); return; }
      setTimeout(() => { if (!finder.classList.contains('is-played')) autoplay(); }, 300);
    }, .4);
  }

  /* 05 · Folder X-ray. Pick what Claude built; a scan finds the file that
     decides it, then stamps static site or server app. */
  const xray = $('[data-xray]');
  if (xray) {
    const panels = $$('.cl-xray__panel', xray);
    const cap = $('[data-xray-caption]', xray);
    const SAY = [
      'Static site: index.html at the top and no build step. Usually live within seconds.',
      'Server app: package.json has a build step, so it’s built first, then run.',
      'Server app, one process: the backend runs as one process. Keep data in SQLite under DATA_DIR.',
    ];
    let scanTimer;
    const scan = i => {
      clearTimeout(scanTimer);
      const p = panels[i];
      panels.forEach(x => x.classList.remove('is-scanning', 'is-scanned'));
      if (reduced) { p.classList.add('is-scanned'); cap.textContent = SAY[i]; return; }
      void p.offsetWidth;
      p.classList.add('is-scanning');
      cap.textContent = 'Scanning the folder…';
      scanTimer = setTimeout(() => {
        p.classList.remove('is-scanning');
        p.classList.add('is-scanned');
        cap.textContent = SAY[i];
      }, 1350);
    };
    let autoId = 0;
    const cursor = makeCursor(xray);
    const stopAuto = () => { autoId++; cursor.hide(); xray.classList.add('is-played'); };
    const picker = makePicker($('.cl-xray__picks', xray), (i, user) => {
      if (user) stopAuto();
      scan(i);
    });
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      xray.classList.remove('is-played');
      picker.select(0, { user: false });
      await wait(2800);
      if (!alive()) return;
      cursor.show(picker.tabs[0], 30, 40);
      for (const i of [1, 2]) {
        await cursor.moveTo(picker.tabs[i], alive, 750);
        if (!alive()) return;
        await cursor.press(alive);
        picker.select(i, { user: false });
        await wait(2900);
        if (!alive()) return;
      }
      cursor.hide();
      cap.textContent = 'Your turn: pick what Claude built for you.';
      xray.classList.add('is-played');
    }
    $('[data-xray-replay]', xray)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    picker.tabs.forEach((b, k) => { b.setAttribute('aria-selected', String(k === 0)); b.tabIndex = k === 0 ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== 0; p.classList.toggle('is-scanned', k === 0); });
    onceInView(xray, () => {
      if (reduced) { xray.classList.add('is-played'); return; }
      setTimeout(() => { if (!xray.classList.contains('is-played')) autoplay(); }, 300);
    }, .4);
  }

  /* 06 · Step 1: the terminal types its way into Claude Code. */
  const shell = $('[data-shell]');
  if (shell) {
    const lines = $$('[data-shell-line]', shell);
    if (!reduced) lines.forEach(l => { l.textContent = ''; }); else shell.classList.add('is-booted');
    onceInView(shell, async () => {
      if (reduced) return;
      await wait(300);
      for (const l of lines) {
        const full = l.dataset.shellLine;
        l.classList.add('is-typing');
        for (let k = 1; k <= full.length; k++) {
          l.textContent = full.slice(0, k);
          await wait(45 + Math.random() * 40);
        }
        await wait(380);
        l.classList.remove('is-typing');
      }
      shell.classList.add('is-booted');
    }, .6);
  }

  /* 06 · Step 2: the example ask types itself into Claude Code's input. */
  const ask = $('[data-ask]');
  if (ask) {
    const full = $('#ask-line').textContent;
    const typed = $('[data-ask-typed]', ask);
    ask.classList.add('is-ready');
    onceInView(ask, async () => {
      if (reduced) { typed.textContent = full; ask.classList.add('is-typed'); return; }
      await wait(250);
      for (let k = 1; k <= full.length; k++) {
        typed.textContent = full.slice(0, k);
        await wait(28 + Math.random() * 30);
      }
      ask.classList.add('is-typed');
    }, .8);
  }

  /* 06 · Step 3: Claude Code runs the deploy. It asks before uploading; the
     cursor allows it once, then the reader does. 202 is flagged "not live yet". */
  const runEl = $('[data-run]');
  if (runEl) {
    const log = $('[data-run-log]', runEl);
    const askBox = $('[data-run-ask]', runEl);
    const allowBtn = $('[data-run-allow]', runEl);
    const denyBtn = $('[data-run-deny]', runEl);
    const st = $('[data-run-state]', runEl);
    const cap = $('[data-run-caption]', runEl);
    const kinds = $$('[data-run-kind]', runEl);
    let kind = 'server';
    let id = 0;
    let autoId = 0;
    let byReader = false;
    const pause = ms => wait(reduced ? 0 : ms);
    const line = (html, cls) => {
      const li = document.createElement('li');
      if (cls) li.className = cls;
      li.innerHTML = html;
      $$('[data-app-name]', li).forEach(s => { s.textContent = state.appName; });
      log.append(li);
      return li;
    };
    const setState = (text, s) => { st.textContent = text; runEl.dataset.state = s; };
    async function start(my) {
      log.textContent = '';
      askBox.hidden = true;
      setState('thinking', 'run');
      line('<b>&gt;</b> Deploy my portfolio to Embarko and share the live link', 'cl-run__me');
      await pause(700);
      if (my !== id) return false;
      line('<b>●</b> Packed my-portfolio <em>left out: node_modules, .git, .env</em>');
      await pause(600);
      if (my !== id) return false;
      askBox.hidden = false;
      setState('waiting for you', 'wait');
      cap.textContent = 'Claude Code asks before it runs the upload. Nothing is uploaded until you allow it.';
      return true;
    }
    async function finish(my) {
      askBox.hidden = true;
      line('<b>●</b> Allowed. Uploading the archive…');
      await pause(700);
      if (my !== id) return false;
      if (kind === 'static') {
        line('<b>✓</b> status: live · https://<span data-app-name></span>.embarko.app', 'cl-run__ok');
        setState('live', 'live');
        cap.textContent = 'A static site has no build and no server, so it’s usually live in the first reply.';
        return true;
      }
      line('<b>●</b> Uploaded · <strong class="cl-run__amber">202 Accepted</strong> <i class="cl-run__flag">build started, not live yet</i>');
      setState('202 · not live yet', 'wait');
      cap.textContent = '“202 Accepted” only means the build has started. Claude Code keeps checking.';
      await pause(1400);
      for (const t of ['0:10', '0:20']) {
        if (my !== id) return false;
        setState('checking every 10 s', 'run');
        line(`<b>●</b> status: building <em>${t}</em>`);
        await pause(1100);
      }
      if (my !== id) return false;
      line('<b>✓</b> status: live · https://<span data-app-name></span>.embarko.app', 'cl-run__ok');
      setState('live', 'live');
      cap.textContent = 'Live. Claude Code checked the status until it said live, then handed over the link.';
      return true;
    }
    const cursor = makeCursor(runEl);
    const stopAuto = () => { autoId++; cursor.hide(); runEl.classList.add('is-played'); };
    async function yourTurn() {
      const my = ++id;
      if (await start(my)) cap.textContent = 'Your turn: allow the command and watch it go live.';
    }
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      runEl.classList.remove('is-played');
      const rid = ++id;
      if (!(await start(rid)) || !alive()) return;
      await wait(900);
      if (!alive()) return;
      cursor.show(allowBtn, 70, 60);
      await cursor.moveTo(allowBtn, alive, 750);
      if (!alive()) return;
      await cursor.press(alive);
      cursor.hide();
      if (!(await finish(rid)) || !alive()) return;
      await wait(2600);
      if (!alive()) return;
      runEl.classList.add('is-played');
      autoId++;
      yourTurn();
    }
    allowBtn.addEventListener('click', async () => {
      stopAuto();
      const my = id;
      byReader = true;
      if (await finish(my) && byReader) setStep(2, true);
    });
    denyBtn.addEventListener('click', async () => {
      stopAuto();
      const my = id;
      askBox.hidden = true;
      line('<b>●</b> Not allowed. Nothing was uploaded.', 'cl-run__stop');
      setState('stopped', 'wait');
      cap.textContent = 'Nothing is uploaded until you allow it. Claude Code will ask again.';
      await pause(1600);
      if (my !== id) return;
      askBox.hidden = false;
      setState('waiting for you', 'wait');
    });
    kinds.forEach(b => b.addEventListener('click', () => {
      stopAuto();
      kind = b.dataset.runKind;
      kinds.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      yourTurn();
    }));
    $('[data-run-replay]', runEl)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    onceInView(runEl, () => {
      if (reduced) { runEl.classList.add('is-played'); yourTurn(); return; }
      setTimeout(() => { if (!runEl.classList.contains('is-played')) autoplay(); }, 300);
    }, .5);
  }

  /* 06 · Step 4: the live site. Click around its pages; the 24-hour banner
     counts down for real until the reader presses Keep (which ticks the step). */
  const site = $('[data-site]');
  if (site) {
    const navBtns = $$('[data-site-page]', site);
    const views = $$('.cl-site__view', site);
    const leftEl = $('[data-site-left]', site);
    const cap = $('[data-site-caption]', site);
    const keepBtn = $('[data-site-keep]', site);
    const keepLabel = $('span', keepBtn);
    const PAGES = ['Projects', 'About', 'Contact'];
    const defaultCap = cap.textContent;
    const visited = new Set([0]);
    const go = (i, say = true) => {
      navBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      views.forEach((v, k) => v.classList.toggle('is-on', k === i));
      visited.add(i);
      if (!say || state.steps[3]) return;
      cap.textContent = visited.size === PAGES.length ? 'All three pages open, so it works. Now keep it, and it stays at the same address.'
        : `${PAGES[i]} opens. ${PAGES.length - visited.size} more to try.`;
    };
    let end = 0;
    let timer = 0;
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      if (!site.isConnected) { clearInterval(timer); return; }
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      leftEl.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    };
    const sync = () => {
      const kept = !!state.steps[3];
      site.classList.toggle('is-kept', kept);
      keepLabel.textContent = kept ? 'Kept' : 'Keep';
      cap.textContent = kept ? 'Kept. Same address, and the countdown banner is gone.' : defaultCap;
    };
    keepBtn.addEventListener('click', () => { stopAuto(); setStep(3, !state.steps[3]); });
    stepHooks.push(i => { if (i === 3) sync(); });
    let autoId = 0;
    const cursor = makeCursor(site);
    function stopAuto() { autoId++; cursor.hide(); site.classList.add('is-played'); }
    navBtns.forEach((b, i) => b.addEventListener('click', () => { stopAuto(); go(i); }));
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      await wait(900);
      if (!alive()) return;
      cursor.show(navBtns[0], 60, 30);
      for (const i of [1, 2]) {
        await cursor.moveTo(navBtns[i], alive, 650);
        if (!alive()) return;
        await cursor.press(alive);
        go(i, false);
        await wait(1300);
        if (!alive()) return;
      }
      cursor.hide();
      go(0, false);
      if (!state.steps[3]) cap.textContent = 'Your turn: click around, then press Keep.';
      site.classList.add('is-played');
    }
    sync();
    onceInView(site, () => {
      end = Date.now() + 24 * 3600 * 1000;
      tick();
      timer = setInterval(tick, 1000);
      if (!reduced && !state.steps[3]) autoplay();
    }, .5);
  }

  /* 06 · Good to know: the site-name checker. It types a name that breaks the
     rules, fixes it, then the reader tries their own and can use it. */
  const nameBox = $('[data-namecheck]');
  if (nameBox) {
    const input = $('[data-name-input]', nameBox);
    const rules = Object.fromEntries($$('[data-rule]', nameBox).map(li => [li.dataset.rule, li]));
    const lenEl = $('[data-name-len]', nameBox);
    const out = $('[data-name-out]', nameBox);
    const useBtn = $('[data-name-use]', nameBox);
    const check = v => ({
      chars: v.length > 0 && /^[a-z0-9-]+$/.test(v),
      len: v.length >= 3 && v.length <= 63,
      dash: v.length > 0 && !v.startsWith('-') && !v.endsWith('-'),
    });
    const render = () => {
      const v = input.value;
      const r = check(v);
      Object.entries(r).forEach(([k, ok]) => {
        rules[k].classList.toggle('is-ok', ok);
        rules[k].classList.toggle('is-bad', !ok && v.length > 0);
      });
      lenEl.textContent = String(v.length);
      const ok = r.chars && r.len && r.dash;
      nameBox.classList.toggle('is-valid', ok);
      nameBox.classList.toggle('is-invalid', !ok && v.length > 0);
      useBtn.disabled = !ok;
      out.textContent = '';
      if (ok) {
        const b = document.createElement('b');
        b.className = 'mono';
        b.textContent = `${v}.embarko.app`;
        out.append('Fits the rules: ', b);
      } else if (!v) {
        out.textContent = 'Type a name to check it.';
      } else {
        out.textContent = `Not yet: ${!r.chars ? 'use lowercase letters, digits and dashes only' : !r.len ? (v.length < 3 ? 'use at least 3 characters' : 'use at most 63 characters') : 'don’t start or end with a dash'}.`;
      }
    };
    let autoId = 0;
    const stopAuto = () => { autoId++; nameBox.classList.add('is-played'); };
    const typeInto = async (text, alive) => {
      for (let k = 1; k <= text.length; k++) {
        if (!alive()) return;
        input.value = text.slice(0, k);
        render();
        await wait(70 + Math.random() * 50);
      }
    };
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      nameBox.classList.remove('is-played');
      input.value = '';
      render();
      await wait(600);
      await typeInto('My Portfolio!', alive);
      if (!alive()) return;
      await wait(1700);
      while (input.value && alive()) {
        input.value = input.value.slice(0, -1);
        render();
        await wait(35);
      }
      if (!alive()) return;
      await typeInto('my-portfolio', alive);
      if (!alive()) return;
      await wait(500);
      nameBox.classList.add('is-played');
      autoId++;
    }
    input.addEventListener('input', () => { stopAuto(); render(); });
    input.addEventListener('pointerdown', stopAuto);
    input.addEventListener('focus', stopAuto);
    useBtn.addEventListener('click', () => {
      if (useBtn.disabled) return;
      setAppName(input.value);
      const ticketInput = $('[data-app-input]');
      if (ticketInput) { ticketInput.value = state.appName; ticketInput.size = Math.max(3, ticketInput.value.length); }
      toast(`Every example on this page now uses ${state.appName}.embarko.app.`);
    });
    $('[data-name-replay]', nameBox)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    render();
    onceInView(nameBox, () => {
      if (reduced) { nameBox.classList.add('is-played'); return; }
      autoplay();
    }, .6);
  }

  /* 08 - The DNS desk. A subdomain gets a CNAME record, a root domain an A record. */
  const dns = $('[data-dns]');
  if (dns) {
    const kindBtns = $$('[data-dns-kind]', dns);
    const typeLabel = $('[data-dns-cloud-label]', dns);
    const nameEl = $('[data-dns-name]', dns);
    const statusText = $('[data-dns-status-text]', dns);
    let kind = 'sub';
    const render = () => {
      kindBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dnsKind === kind)));
      nameEl.textContent = kind === 'sub' ? 'www' : '@';
      typeLabel.textContent = kind === 'sub' ? 'CNAME' : 'A';
      dns.classList.add('is-good');
      statusText.textContent = kind === 'sub' ? 'A subdomain gets a CNAME record.' : 'A root domain gets an A record.';
    };
    let autoId = 0;
    const cursor = makeCursor(dns);
    const stopAuto = () => { autoId++; cursor.hide(); dns.classList.add('is-played'); };
    kindBtns.forEach(b => b.addEventListener('click', () => { stopAuto(); kind = b.dataset.dnsKind; render(); }));
    async function autoplay() {
      const my = ++autoId;
      const alive = () => my === autoId;
      dns.classList.remove('is-played');
      kind = 'root';
      render();
      await wait(1800);
      if (!alive()) return;
      await cursor.moveTo(kindBtns[0], alive, 800);
      if (!alive()) return;
      await cursor.press(alive);
      kind = 'sub';
      render();
      await wait(1200);
      if (!alive()) return;
      cursor.hide();
      dns.classList.add('is-played');
    }
    $('[data-dns-replay]', dns)?.addEventListener('click', () => { if (!reduced) autoplay(); });
    render();
    onceInView(dns, () => {
      if (reduced) { dns.classList.add('is-played'); return; }
      setTimeout(() => { if (!dns.classList.contains('is-played')) autoplay(); }, 300);
    }, .5);
  }

  /* FAQ: links to #faq-needs open that answer. */
  const needsItem = $('#faq-needs');
  if (needsItem) {
    docOn('click', e => { if (e.target.closest('a[href="#faq-needs"]')) needsItem.open = true; });
    if (location.hash === '#faq-needs') needsItem.open = true;
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
