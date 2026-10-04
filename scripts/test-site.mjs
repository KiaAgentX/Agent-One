import { JSDOM, VirtualConsole } from 'jsdom';

const BASE = process.env.BASE || 'http://localhost:8877';
const errors = [];
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}

async function load(url, { polyfillFetch = false } = {}) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(`${url}: ${e.message}`));
  vc.on('error', (...a) => errors.push(`${url}: ${a.join(' ')}`));
  const dom = await JSDOM.fromURL(url, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      if (polyfillFetch) {
        window.fetch = (input, init) => {
          const u = new URL(input, window.location.href);
          return fetch(u, init);
        };
      }
    },
  });
  await new Promise(res => {
    if (dom.window.document.readyState === 'complete') res();
    else dom.window.addEventListener('load', res);
    setTimeout(res, 8000);
  });
  await new Promise(r => setTimeout(r, 400));
  return dom;
}

/* ---------- index ---------- */
console.log('INDEX PAGE');
{
  const dom = await load(BASE + '/');
  const d = dom.window.document;
  const cards = d.querySelectorAll('#grid .card');
  check('grid cards rendered (60 - 3 docs)', cards.length === 57, `got ${cards.length}`);
  check('category chips rendered', d.querySelectorAll('#chips .chip').length >= 8);
  check('stats show 60 projects', d.querySelector('.spec .v.green')?.textContent === '60');
  check('feature cards rendered', d.querySelectorAll('#grid .card.feature').length === 2, 'got ' + d.querySelectorAll('#grid .card.feature').length);
  check('docs section visible', d.querySelector('#docs-section').style.display !== 'none');
  check('docs grid has 3 cards', d.querySelectorAll('#docs-grid .card').length === 3, 'got ' + d.querySelectorAll('#docs-grid .card').length);
  check('roadmap has 10 cards', d.querySelectorAll('#roadmap .rm-card').length === 10, 'got ' + d.querySelectorAll('#roadmap .rm-card').length);
  check('pipeline cell shown', /\$191,000/.test(d.querySelector('.spec')?.textContent || ''), (d.querySelector('.spec')?.textContent || '').slice(0, 120));
  check('flagship stories = 3', d.querySelectorAll('#flagships .story').length === 3, 'got ' + d.querySelectorAll('#flagships .story').length);
  const allPrev = (dom.window.__PROJECTS__ || []).every(p => p.previewReady);
  check('all 60 previews ready', allPrev === true, 'previewReady all=' + allPrev);
  const covers = d.querySelectorAll('#grid .card .cover img').length;
  check('grid cards have images', covers >= 46, 'covers=' + covers);
  const noThumbs = (dom.window.__PROJECTS__ || []).filter(p => !p.thumb).length;
  check('every project has thumb', noThumbs === 0, 'missing=' + noThumbs);
  check('capabilities cards >= 8', d.querySelectorAll('#caps-grid .cap-card').length >= 8, 'got ' + d.querySelectorAll('#caps-grid .cap-card').length);
  check('language bars >= 6', d.querySelectorAll('#langbars .langbar').length >= 6, 'got ' + d.querySelectorAll('#langbars .langbar').length);
  check('skills cards = 10', d.querySelectorAll('#skills-grid .skill-card').length === 10, 'got ' + d.querySelectorAll('#skills-grid .skill-card').length);
  check('skills repo linked', /github\.com\/KiaAgentX\/skills/.test(d.body.innerHTML));
  check('contact telegram', /t\.me\/ImXforevr/.test(d.body.innerHTML));
  check('contact x.com', /x\.com\/imxforever/.test(d.body.innerHTML));
  check('hud + cosmos present', !!d.querySelector('#hud') && !!d.querySelector('#cosmos'));
  check('contact section numbered 08', /sec-num[^>]*>08</.test(d.body.innerHTML));
  check('motion layer active (gsap+st)', d.documentElement.classList.contains('motion-on'));
  check('gsap + lenis + motion loaded', !!dom.window.gsap && !!dom.window.ScrollTrigger && !!dom.window.Lenis && !!dom.window.KIA_MOTION);
  const mqTiles = d.querySelectorAll('#mq-row1 .mq-tile').length + d.querySelectorAll('#mq-row2 .mq-tile').length;
  check('showreel marquee tiles >= 20', mqTiles >= 20, 'tiles=' + mqTiles);
  check('typewriter present', !!d.querySelector('#typewriter[data-text]') && !!d.querySelector('#tw-cur'));
  check('blurred intro label', !!d.querySelector('#blurb-intro'));
  check('hero pills (incl copy telegram)', !!d.querySelector('#copy-telegram') && d.querySelectorAll('#hero-pills .pill').length >= 4);
  check('burger menu', !!d.querySelector('#burger') && !!d.querySelector('#mobile-menu'));
  check('manifesto char reveal', d.querySelectorAll('.char-reveal .ch').length > 60, 'ch=' + d.querySelectorAll('.char-reveal .ch').length);
  check('cap rows numbered', d.querySelectorAll('#caps-grid .cap-num').length >= 8, 'nums=' + d.querySelectorAll('#caps-grid .cap-num').length);
  check('surprise random-project link', !!d.querySelector('a#surprise') && /#surprise/.test(d.querySelector('a#surprise').getAttribute('href')));
  check('noscript fallback for JS-only visuals', !!d.querySelector('noscript'));
  const sfx = dom.window.KIA_SFX || {};
  check('5-sound engine (hover/click/whoosh/chime/fanfare)', ['hover', 'click', 'whoosh', 'chime', 'fanfare'].every(k => typeof sfx[k] === 'function'));
  check('fonts non-blocking (preload swap)', !!d.querySelector('link[rel="preload"][as="style"]'));
  check('hero video fully removed', !d.querySelector('#hero-video'));
  const learns = Array.from(d.querySelectorAll('.learn'));
  check('3 learn links have unique aria-labels', learns.length === 3 && learns.every(a => (a.getAttribute('aria-label') || '').includes('Learn more about')), 'n=' + learns.length);
  check('form controls labelled', !!d.querySelector('#sort[aria-label]') && !!d.querySelector('#search[aria-label]'));
  check('heading order h1 then h2', /<h1[\s\S]{0,20000}<h2/.test(d.body.innerHTML));
  check('est. value present', /\$4[0-9]{2},[0-9]{3}/.test(d.querySelector('.spec .v.gold')?.textContent || ''));

  const input = d.querySelector('#search');
  input.value = 'trading';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const n = d.querySelectorAll('#grid .card').length;
  check('search filters (trading -> <48)', n > 0 && n < 48, `got ${n}`);

  input.value = 'zzzznotfound';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  check('empty state shown', d.querySelector('#grid .empty') !== null);

  input.value = '';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const chip = Array.from(d.querySelectorAll('#chips .chip')).find(c => c.dataset.c === 'Trading & Fintech');
  chip.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const m = d.querySelectorAll('#grid .card').length;
  check('category filter works', m === 10, `got ${m}`);

  d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  const pal = d.querySelector('#palette');
  check('command palette opens', pal && !pal.hidden);
  const pin = d.querySelector('#palette-input');
  pin.value = 'tidewater';
  pin.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const items = d.querySelectorAll('#palette-results .p-item');
  check('palette searches', items.length === 1 && /Tidewater/.test(items[0].textContent), 'got ' + items.length);
  d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('palette closes on Escape', pal.hidden === true);
  dom.window.close();
}

/* ---------- project page ---------- */
console.log('PROJECT PAGE (Hesaban — static preview)');
{
  const dom = await load(BASE + '/projects/Hesaban/', { polyfillFetch: true });
  const w = dom.window, d = w.document;
  check('title h1', d.querySelector('.phead h1')?.textContent === 'Hesaban');
  check('overview panel active by default', d.querySelector('#panel-overview').classList.contains('active'));

  d.querySelector('[data-tab="source"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1500));
  const files = d.querySelectorAll('#src-tree .src-file');
  check('source tree loaded', files.length > 5, `got ${files.length}`);
  const code = d.querySelector('#src-code');
  check('code content loaded', (code?.textContent || '').length > 50);
  check('highlight.js applied', code?.className.includes('language-'), code?.className);

  d.querySelector('[data-tab="preview"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const iframe = d.querySelector('iframe.preview');
  check('preview iframe src set', !!iframe?.getAttribute('src'), iframe?.getAttribute('src') || '');
  dom.window.close();
}

/* ---------- project page with built preview ---------- */
console.log('PROJECT PAGE (win12 — built preview)');
{
  const dom = await load(BASE + '/projects/win12/', { polyfillFetch: true });
  const w = dom.window, d = w.document;
  d.querySelector('[data-tab="preview"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const iframe = d.querySelector('iframe.preview');
  check('built preview iframe set', (iframe?.src || '').includes('previews/win12'), iframe?.src || '');
  dom.window.close();
}

console.log(errors.length ? `\nConsole errors (${errors.length}):` : '\nNo console errors.');
errors.slice(0, 10).forEach(e => console.log('  ' + e));
process.exit(failed ? 1 : 0);
