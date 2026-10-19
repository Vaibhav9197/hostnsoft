/* ==========================================================================
   Embarko · Guide article: interaction layer
   "How to host your portfolio website for free". The engine is the one from
   the approved "How to deploy an AI app" page (as carried by the approved
   Cloudflare guide); this guide's scenes are at the end.
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

  /* The reader's portfolio. The whole article is about moving it from here to there. */
  const DEFAULT_NAME = 'jane-doe-portfolio';
  const state = { appName: DEFAULT_NAME, steps: [], finale: false, live: false };
  const LOCAL = 'localhost:5173';
  const liveAddr = () => `${state.appName}.embarko.app`;
  const STEPS_KEY = 'embarko-steps-portfolio';
  const nameHooks = [];

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
    flashCopied(btn, 'Copied');
    toast('Copied. For the latest full prompt, use Copy deployment prompt on embarko.ai.');
    if (btn.dataset.completes) setStep(Number(btn.dataset.completes), true);
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
    const data = { title: 'How to Host a Portfolio Website for Free', text: 'Ask the AI tool that built your portfolio to deploy it and get a live link for your resume.', url: shareUrl() };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const ok = await copyText(data.url);
    toast(ok ? 'Link copied. Send it to someone whose portfolio only opens on their laptop.' : data.url, ok);
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
    const slug = slugify(raw) || DEFAULT_NAME;
    state.appName = slug;
    $$('[data-app-name]').forEach(el => { if (el.textContent !== slug) el.textContent = slug; });
    if (finaleSection?.classList.contains('is-arrived') && omni) omni.textContent = `${slug}.embarko.app`;
    nameHooks.forEach(fn => fn());
    updateJourneyAddr(false);
    if (persist) store.set('embarko-app-name', slug === DEFAULT_NAME ? '' : slug);
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
    appInput.addEventListener('focus', () => { if (appInput.value === DEFAULT_NAME) appInput.select(); });
    appInput.addEventListener('blur', () => {
      appInput.value = slugify(appInput.value) || DEFAULT_NAME;
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
     05 · Five steps. Ticking them all makes the portfolio live.
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
    evaluateLive();
  }
  stepBtns.forEach((b, i) => b.addEventListener('click', () => setStep(i, !state.steps[i])));
  const savedSteps = store.get(STEPS_KEY);
  if (savedSteps && new RegExp(`^[01]{${stepBtns.length}}$`).test(savedSteps)) savedSteps.split('').forEach((c, i) => setStep(i, c === '1', true));

  /* ------------------------------------------------------------------------
     Live state: the payoff. Steps done, or the reader reached the finale.
     ------------------------------------------------------------------------ */
  function evaluateLive() {
    const deployed = state.steps.every(Boolean);
    const live = deployed || state.finale;
    if (ticketCta) {
      ticketCta.innerHTML = !live ? ticketCtaDefault
        : deployed ? 'Your portfolio has a live link. Put it on your resume and LinkedIn.'
        : 'That’s the whole trip. Now take your own portfolio there: <a href="#steps">do the 5 steps</a>.';
    }
    if (live === state.live) return;
    state.live = live;
    root.classList.toggle('is-live', live);
    if (ticketStatus) ticketStatus.textContent = live ? 'Live on embarko.app' : 'On your laptop';
    if (arrivalBadge) arrivalBadge.textContent = live ? 'Live' : 'Only on your laptop';
    if (arrivalNote) arrivalNote.textContent = live ? 'Anyone with the link can open it, on any device.' : 'Finish the five steps and your portfolio gets a link for your resume.';
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
      if (whisper) whisper.textContent = 'Live, and ready for your resume.';
      state.finale = true;
      evaluateLive();
    };
    const play = async () => {
      const target = liveAddr();
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
    local: 'Your portfolio only opens on your laptop, at localhost:5173.',
    stuck: 'Your portfolio still only opens on your laptop.',
    near: 'Your portfolio is one prompt away from a live link.',
    live: () => `Your portfolio is live at https://${liveAddr()}.`,
  };

  function updateJourneyAddr(animate) {
    if (!addrEl) return;
    const text = state.live ? liveAddr() : LOCAL;
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
      statusLink.setAttribute('aria-label', `${label} Jump to the five steps.`);
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
    localhost: ['Localhost', 'Just means “this computer”. A localhost link only works on the machine that made it.'],
    server: ['Server', 'A computer that stays on all the time. Your portfolio’s files live there, so the site opens even when your laptop is off.'],
    static: ['Static website', 'Pages made of HTML, CSS, JavaScript and images, with no code running on a server. The easiest and cheapest thing to host.'],
    favicon: ['Favicon', 'The small site icon that shows in a browser tab and next to your link when you share it.'],
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


  /* Fix list: pick a symptom; the console types the cause and what to do. */
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
  const fixit = $('#snags');
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
      const t = e.target.closest('[data-fixit-open], a[href="#snags"]');
      if (!t) return;
      e.preventDefault();
      closeRoute();
      openFix(t.dataset.fixit != null ? +t.dataset.fixit : null);
    });
    if (location.hash === '#snags') openFix(null);
  }


  /* ==========================================================================
     Scenes for "How to host your portfolio website for free" (19 Oct 2026).
     Same engine, same colour script; one module per scene, each guarded.
     Two scenes come from the approved gold page unchanged in behaviour (the
     localhost drag demo and the route race); the rest are new. Every demo
     plays itself once when it scrolls into view, then hands over to the
     reader the moment they touch it. Reduced motion: final frames, no autoplay.
     ========================================================================== */

  /* ------------------------------------------------------------------------
     01 · Send the link to a recruiter. localhost goes nowhere; the live link works.
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

    const urlOf = kind => (kind === 'live' ? `${state.appName}.embarko.app` : LOCAL);
    const defaultCaption = caption.textContent;
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    /* The link has reached the phone: it shows up in the chat, gets tapped, opens (or doesn't). */
    const deliver = kind => {
      phone.dataset.phone = 'chat';
      bubbleLink.textContent = urlOf(kind);
      caption.textContent = 'The recruiter taps the link…';
      later(() => { bubble.classList.add('is-tapped'); }, 600);
      later(() => {
        bubble.classList.remove('is-tapped');
        if (kind === 'live') {
          phone.dataset.phone = 'live';
          caption.textContent = 'It opens. The link points at a server that stays on, so it works on any device, any time.';
        } else {
          phone.dataset.phone = 'error';
          caption.textContent = 'Nothing. Their phone looks for your portfolio on itself, and it isn’t there.';
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
      caption.textContent = 'Drop it on the recruiter’s phone.';
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

  /* 02 · Three lines, one destination. Every line covers the same distance at
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

  /* Cover: the resume's Portfolio link. localhost can't be reached; the link
     retypes itself as the live address and the portfolio opens. */
  const coverEl = $('[data-pf-cover]');
  if (coverEl) {
    const fig = coverEl.closest('figure');
    const scene = $('.pf-cover__scene', coverEl);
    const link = $('[data-cover-link]', coverEl);
    const textEl = $('[data-cover-text]', coverEl);
    const cursor = makeCursor(scene);
    let runId = 0;
    const start = () => { coverEl.dataset.stage = '0'; textEl.textContent = LOCAL; };
    const final = () => { coverEl.dataset.stage = '3'; textEl.textContent = liveAddr(); };
    nameHooks.push(() => { if (coverEl.dataset.stage === '3') textEl.textContent = liveAddr(); });
    async function play() {
      const my = ++runId;
      const alive = () => my === runId;
      fig.classList.remove('is-played');
      start();
      await wait(700); if (!alive()) return;
      cursor.show(link, 70, 60);
      await cursor.moveTo(link, alive, 800); if (!alive()) return;
      await cursor.press(alive); if (!alive()) return;
      link.classList.add('is-pressed');
      setTimeout(() => link.classList.remove('is-pressed'), 160);
      coverEl.dataset.stage = '1';
      await wait(2000); if (!alive()) return;
      cursor.hide();
      coverEl.dataset.stage = '2';
      let s = LOCAL;
      while (s.length) {
        s = s.slice(0, -1);
        textEl.textContent = s;
        await wait(30); if (!alive()) return;
      }
      await wait(220); if (!alive()) return;
      const target = liveAddr();
      for (let k = 1; k <= target.length; k++) {
        textEl.textContent = target.slice(0, k);
        await wait(34 + Math.random() * 28); if (!alive()) return;
      }
      await wait(320); if (!alive()) return;
      final();
      fig.classList.add('is-played');
    }
    if (reduced) final();
    else {
      start();
      onceInView(coverEl, () => setTimeout(play, 400), .35);
    }
    $('[data-cover-replay]', fig)?.addEventListener('click', () => { if (!reduced) play(); });
  }

  /* 03 · The fiddly part. The mock shows the obstacle on the reading line. */
  const hard = $('[data-pf-hard]');
  if (hard) {
    const items = $$('.pf-hard__item', hard);
    const cap = $('[data-hard-cap]', hard);
    const CAPS = ['The usual route, before your portfolio goes anywhere', 'A new tool to learn first', 'A wrong guess gives a blank page', 'Fine on your computer, missing online', 'Commit, push and rebuild, every time'];
    let last = -1;
    onScrub(hard, () => {
      const line = innerHeight * .55;
      let idx = 0;
      items.forEach((it, k) => { if (it.getBoundingClientRect().top < line) idx = k + 1; });
      if (idx === last) return;
      last = idx;
      hard.dataset.pain = String(idx);
      items.forEach((it, k) => it.classList.toggle('is-active', k + 1 === idx));
      cap.textContent = CAPS[idx];
    });
  }

  /* 04 · Two lanes. Same pace per stop; scroll draws both, Replay replays. */
  const two = $('[data-pf-two]');
  if (two) {
    const lanes = $$('.pf-two__lane', two).map(lane => ({ lane, items: $$('.pf-two__stops > li', lane) }));
    const most = Math.max(...lanes.map(l => l.items.length));
    let playing = false;
    let playId = 0;
    const draw = q => {
      lanes.forEach(({ lane, items }) => {
        items.forEach((li, k) => li.classList.toggle('is-on', q >= (k + 1) / (most + 1)));
        lane.classList.toggle('is-done', items.every(li => li.classList.contains('is-on')));
      });
    };
    onScrub(two, p => { if (!playing) draw(clamp(p / .9)); });
    $('[data-two-replay]', two)?.addEventListener('click', () => {
      if (reduced) { draw(1); return; }
      const my = ++playId;
      const t0 = performance.now();
      playing = true;
      const run = now => {
        if (my !== playId) return;
        const k = clamp((now - t0) / 3000);
        draw(k);
        if (k < 1) requestAnimationFrame(run); else playing = false;
      };
      requestAnimationFrame(run);
    });
  }

  /* 05 · Step 1: where did you build it? Coding tools open it there;
     browser tools export first. */
  const where = $('[data-pf-where]');
  if (where) {
    const chips = $$('[data-where]', where);
    const out = $('[data-where-out]', where);
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      const tool = c.textContent.trim();
      out.dataset.tone = c.dataset.where;
      out.textContent = c.dataset.where === 'code'
        ? `Open the project in ${tool} and check it still runs on your computer.`
        : `${tool} is a browser tool: export or download the project first, then open it in Claude, Cursor, Codex or Replit.`;
    }));
  }

  /* 05 · Step 3: the chat. The agent deploys first, gives the link and the
     deletion time, and only then offers to keep it (embarko-deploy-flow §4). */
  const chat = $('[data-pf-chat]');
  if (chat) {
    const allow = $('[data-chat-allow]', chat);
    const ask = $('[data-chat-ask]', chat);
    const cap = $('[data-chat-caption]', chat);
    const cursor = makeCursor(chat);
    const LOG = ['Packaging your site.', 'Uploading it.', 'Waiting until it’s live.'];
    let runId = 0;
    const setAt = n => { chat.dataset.at = String(n); };
    const say = (t, ok = false) => { cap.textContent = t; cap.classList.toggle('is-ok', ok); };
    const reset = () => { setAt(0); ask.classList.remove('is-allowed'); say('Your tool asks before it runs a command or reaches the internet. Press Allow.'); };
    async function run(alive, fromReader) {
      ask.classList.add('is-allowed');
      for (let n = 1; n <= 3; n++) {
        setAt(n);
        say(LOG[n - 1]);
        await wait(reduced ? 0 : 800); if (!alive()) return;
      }
      setAt(4);
      say('The agent replies with your link and the time it will be deleted if you don’t keep it, then offers to keep it.', true);
      if (fromReader) setStep(2, true);
    }
    allow.addEventListener('click', () => {
      const my = ++runId;
      cursor.hide();
      chat.classList.add('is-played');
      run(() => my === runId, true);
    });
    async function autoplay() {
      const my = ++runId;
      const alive = () => my === runId;
      chat.classList.remove('is-played');
      reset();
      say('Watch: the tool asks first, then the agent deploys and replies with the link.');
      await wait(500); if (!alive()) return;
      cursor.show(allow, -70, 50);
      await cursor.moveTo(allow, alive, 800); if (!alive()) return;
      await cursor.press(alive); if (!alive()) return;
      cursor.hide();
      await run(alive, false); if (!alive()) return;
      await wait(3200); if (!alive()) return;
      reset();
      chat.classList.add('is-played');
      say('Your turn: press Allow.');
    }
    if (reduced) chat.classList.add('is-played');
    else { reset(); onceInView(chat, autoplay, .5); }
    $('[data-chat-replay]', chat)?.addEventListener('click', () => { if (!reduced) autoplay(); });
  }

  /* 05 · Step 4: open the same link on the laptop and the phone. The phone
     is the real test, so opening it there ticks the step. */
  const openEl = $('[data-pf-open]');
  if (openEl) {
    const btns = $$('[data-open]', openEl);
    const cap = $('[data-open-caption]', openEl);
    const cursor = makeCursor(openEl);
    let runId = 0;
    const say = (t, ok = false) => { cap.textContent = t; cap.classList.toggle('is-ok', ok); };
    const open = (dev, fromReader) => {
      openEl.dataset[dev] = 'closed';
      void openEl.offsetWidth;
      openEl.dataset[dev] = 'open';
      btns.forEach(b => { if (b.dataset.open === dev) b.setAttribute('aria-pressed', 'true'); });
      if (dev === 'phone') {
        say('It opens on your phone, a device that isn’t your computer. That’s the check. Now click every project.', true);
        if (fromReader) setStep(3, true);
      } else {
        say('It opens on your laptop. Now try a device that isn’t your computer.');
      }
    };
    const reset = () => {
      openEl.dataset.laptop = 'closed';
      openEl.dataset.phone = 'closed';
      btns.forEach(b => b.setAttribute('aria-pressed', 'false'));
    };
    btns.forEach(b => b.addEventListener('click', () => {
      runId++;
      cursor.hide();
      openEl.classList.add('is-played');
      open(b.dataset.open, true);
    }));
    async function autoplay() {
      const my = ++runId;
      const alive = () => my === runId;
      openEl.classList.remove('is-played');
      reset();
      say('Watch: the same link, opened on both.');
      cursor.show(btns[0], -50, 50);
      await wait(300); if (!alive()) return;
      for (const b of btns) {
        await cursor.moveTo(b, alive, 700); if (!alive()) return;
        await cursor.press(alive); if (!alive()) return;
        open(b.dataset.open, false);
        await wait(1700); if (!alive()) return;
      }
      cursor.hide();
      await wait(1600); if (!alive()) return;
      reset();
      openEl.classList.add('is-played');
      say('Your turn: open it on your laptop and on your phone.');
    }
    if (reduced) { openEl.dataset.laptop = 'open'; openEl.dataset.phone = 'open'; openEl.classList.add('is-played'); }
    else onceInView(openEl, autoplay, .5);
    $('[data-open-replay]', openEl)?.addEventListener('click', () => { if (!reduced) autoplay(); });
  }

  /* 05 · Step 5: keep it. The four real answers and the agent's real replies
     (embarko-deploy-flow §4). Keeping, a token or the connector tick the step. */
  const keep = $('[data-pf-keep]');
  if (keep) {
    const thread = $('[data-keep-thread]', keep);
    const first = thread.firstElementChild.cloneNode(true);
    const chips = $$('[data-keep]', keep);
    const EMAIL = 'you@example.com';
    const SCRIPTS = {
      yes: [
        ['ai', 'Tell me your email. Embarko mails you a token, you paste it here, and the app becomes permanent at the same address.'],
        ['me', EMAIL, 'mono'],
        ['ai', `I’ve sent a code to ${EMAIL} (check spam too). Paste it here and your app becomes permanent.`],
        ['me', 'You paste the token from your email.'],
        ['ai', 'Done: your app is permanent.', 'done'],
      ],
      token: [
        ['ai', 'Paste it here. I redeploy the same name with it, and the app becomes permanent at the same address.'],
        ['me', 'You paste your token.'],
        ['ai', 'Done: your app is permanent.', 'done'],
      ],
      connector: [
        ['ai', 'Apps the connector deploys go straight into your account, so there is nothing to keep.', 'done'],
      ],
      later: [
        ['ai', 'No problem. The app stays live for 24 hours, then it is deleted unless you keep it.', 'warn'],
      ],
    };
    let runId = 0;
    const bubble = (who, text, mod) => {
      const el = document.createElement('div');
      if (who === 'ai') {
        el.className = 'pf-keep__ai' + (mod === 'warn' ? ' pf-keep__warn' : '');
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.setAttribute('aria-hidden', 'true');
        const p = document.createElement('p');
        p.textContent = text;
        if (mod === 'done') p.className = 'pf-keep__done';
        el.append(dot, p);
      } else {
        el.className = 'pf-keep__me' + (mod === 'mono' ? ' mono' : '');
        el.textContent = text;
      }
      thread.append(el);
    };
    chips.forEach(c => c.addEventListener('click', async () => {
      const my = ++runId;
      const kind = c.dataset.keep;
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      thread.replaceChildren(first.cloneNode(true));
      $$('[data-app-name]', thread).forEach(el => { el.textContent = state.appName; });
      bubble('me', c.textContent.trim());
      for (const [who, text, mod] of SCRIPTS[kind]) {
        await wait(reduced ? 0 : 650); if (my !== runId) return;
        bubble(who, text, mod);
      }
      if (kind !== 'later') setStep(4, true);
    }));
  }

  /* 06 · Update: redeploy under the same name and the same link shows the new
     project. Under a new name you get a second site (the first snag). */
  const upd = $('[data-pf-upd]');
  if (upd) {
    const btns = $$('[data-upd]', upd);
    const cap = $('[data-upd-caption]', upd);
    const cursor = makeCursor(upd);
    let runId = 0;
    const say = (t, tone = '') => { cap.textContent = t; cap.classList.toggle('is-ok', tone === 'ok'); cap.classList.toggle('is-warn', tone === 'warn'); };
    const setMode = m => {
      upd.dataset.mode = m;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.upd === m)));
      if (m === 'same') say('Redeploying under the same name updates the same site at the same link.', 'ok');
      if (m === 'new') say('Under a new name you get two sites, and the old link still shows your old portfolio. Ask your agent to redeploy under the exact same app name as before.', 'warn');
    };
    btns.forEach(b => b.addEventListener('click', () => {
      runId++;
      cursor.hide();
      upd.classList.add('is-played');
      setMode(b.dataset.upd);
    }));
    async function autoplay() {
      const my = ++runId;
      const alive = () => my === runId;
      upd.classList.remove('is-played');
      upd.dataset.mode = 'before';
      btns.forEach(b => b.setAttribute('aria-pressed', 'false'));
      say('Watch: a new project, redeployed as the same app.');
      cursor.show(btns[0], 60, 50);
      await wait(400); if (!alive()) return;
      await cursor.moveTo(btns[0], alive, 800); if (!alive()) return;
      await cursor.press(alive); if (!alive()) return;
      setMode('same');
      await wait(900); if (!alive()) return;
      cursor.hide();
      upd.classList.add('is-played');
    }
    if (reduced) { setMode('same'); upd.classList.add('is-played'); }
    else { upd.dataset.mode = 'before'; onceInView(upd, autoplay, .45); }
    $('[data-upd-replay]', upd)?.addEventListener('click', () => { if (!reduced) autoplay(); });
  }

  /* 07 · Where your link shows up: the aside follows the place on the
     reading line; the share preview compares a bare link with a proper one. */
  const seen = $('[data-pf-seen]');
  if (seen) {
    const items = $$('.pf-seen__item', seen);
    const cap = $('[data-seen-cap]', seen);
    const CAPS = ['On your resume and LinkedIn', 'When you share the link', 'In the Showcase gallery', 'On your own domain'];
    let last = -1;
    onScrub(seen, () => {
      const line = innerHeight * .55;
      let idx = 1;
      items.forEach((it, k) => { if (it.getBoundingClientRect().top < line) idx = k + 1; });
      if (idx === last) return;
      last = idx;
      seen.dataset.at = String(idx);
      items.forEach((it, k) => it.classList.toggle('is-active', k + 1 === idx));
      if (cap) cap.textContent = CAPS[idx - 1];
    });
    const preview = $('[data-seen-panel="2"]', seen);
    const pbtns = $$('[data-preview-btn]', seen);
    pbtns.forEach(b => b.addEventListener('click', () => {
      preview.dataset.preview = b.dataset.previewBtn;
      pbtns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
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
