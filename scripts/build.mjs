import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = path.resolve(HERE, '..');
const ROOT = path.resolve(PORT, '..');
const SRC = path.join(PORT, 'src');
const DIST = path.join(PORT, 'dist');

const config = JSON.parse(fs.readFileSync(path.join(SRC, 'config.json'), 'utf8'));
const projects = JSON.parse(fs.readFileSync(path.join(SRC, 'projects.json'), 'utf8'));
const roadmap = JSON.parse(fs.readFileSync(path.join(SRC, 'roadmap.json'), 'utf8'));
const pipelineValue = roadmap.reduce((a, r) => a + r.value, 0);
const skills = JSON.parse(fs.readFileSync(path.join(SRC, 'skills.json'), 'utf8'));

execFileSync(process.execPath, [path.join(HERE, 'scan.mjs'), ROOT, path.join(PORT, 'scan.json')], { stdio: 'inherit' });
const scan = JSON.parse(fs.readFileSync(path.join(PORT, 'scan.json'), 'utf8'));
const scanById = Object.fromEntries(scan.map(s => [s.folder, s]));

/* ---------------- helpers ---------------- */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'venv', '__pycache__', 'coverage', '.cache']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.html', '.htm', '.css', '.scss', '.less', '.md', '.json', '.yml', '.yaml', '.sh', '.bat', '.ps1', '.sql', '.txt', '.toml', '.cfg', '.ini', '.csv', '.vue', '.svelte', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.cs', '.php', '.xml', '.graphql', '.prisma', '.dart', '.rb', '.lua', '.r', '.env', '.log']);
const TEXT_BASE = new Set(['dockerfile', 'makefile', '.gitignore', '.npmrc', '.nvmrc', '.editorconfig', '.eslintrc', '.prettierrc', 'license', 'procfile', 'cmakelists.txt']);
const HLJS_LANG = { '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.py': 'python', '.html': 'xml', '.htm': 'xml', '.css': 'css', '.scss': 'css', '.less': 'css', '.md': 'markdown', '.json': 'json', '.yml': 'yaml', '.yaml': 'yaml', '.sh': 'bash', '.bat': 'bash', '.ps1': 'powershell', '.sql': 'sql', '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.go': 'go', '.rs': 'rust', '.java': 'java', '.php': 'php', '.xml': 'xml', '.vue': 'xml', '.svelte': 'xml', '.diff': 'diff', '.ini': 'ini', '.toml': 'ini' };

function walk(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function fmt(n) { return n.toLocaleString('en-US'); }
function money(n) { return '$' + fmt(n); }
function safeJson(obj) { return JSON.stringify(obj).replace(/</g, '\\u003c'); }

const repoUrl = p => config.site.sourceRepo
  ? `https://github.com/${config.site.sourceRepo}/tree/${config.site.sourceBranch || 'main'}/projects/${p.folder}`
  : `https://github.com/${config.owner.handle}/${p.repo}`;

/* ---------------- source extraction ---------------- */
function extractSource(folder) {
  const files = walk(folder);
  const candidates = [];
  for (const f of files) {
    const rel = path.relative(folder, f).replace(/\\/g, '/');
    const ext = path.extname(f).toLowerCase();
    const base = path.basename(f).toLowerCase();
    const isText = TEXT_EXT.has(ext) || TEXT_BASE.has(base) || base.startsWith('.env');
    if (!isText) continue;
    let st; try { st = fs.statSync(f); } catch { continue; }
    if (st.size > 1024 * 1024) continue;
    const depth = rel.split('/').length;
    candidates.push({ rel, f, ext, depth, size: st.size });
  }
  candidates.sort((a, b) => a.depth - b.depth || (b.ext === '.md' ? 1 : 0) - (a.ext === '.md' ? 1 : 0) || a.rel.localeCompare(b.rel));

  const out = [];
  let budget = 1200000;
  for (const c of candidates) {
    if (out.length >= 200 || budget <= 0) break;
    let content;
    try { content = fs.readFileSync(c.f, 'utf8'); } catch { continue; }
    if (content.indexOf(String.fromCharCode(0)) !== -1) continue;
    let truncated = false;
    if (content.length > 60000) { content = content.slice(0, 60000); truncated = true; }
    budget -= content.length;
    const base = path.basename(c.rel).toLowerCase();
    const lang = HLJS_LANG[c.ext] || (base === 'dockerfile' ? 'dockerfile' : 'plaintext');
    out.push({ path: c.rel, lang, size: c.size, truncated, content });
  }
  return { files: out };
}

/* ---------------- preview preparation ---------------- */
function pickEntry(dir) {
  if (fs.existsSync(path.join(dir, 'index.html'))) return 'index.html';
  const htmls = walk(dir).filter(f => f.endsWith('.html'));
  if (!htmls.length) return null;
  htmls.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
  return path.relative(dir, htmls[0]).replace(/\\/g, '/');
}

function preparePreview(p) {
  const dest = path.join(DIST, 'previews', p.id);
  rmrf(dest);
  if (p.preview === 'static') {
    const folder = path.join(ROOT, p.folder);
    fs.cpSync(folder, dest, {
      recursive: true,
      filter: (s) => !['node_modules', '.git'].includes(path.basename(s)) && !s.endsWith('.zip'),
    });
    const entry = pickEntry(dest);
    if (!entry) { rmrf(dest); return { ready: false, entry: null }; }
    return { ready: true, entry };
  }
  if (p.preview === 'build') {
    const built = path.join(PORT, 'builds', p.id);
    if (fs.existsSync(path.join(built, 'index.html'))) {
      fs.cpSync(built, dest, { recursive: true });
      return { ready: true, entry: 'index.html' };
    }
    return { ready: false, entry: null };
  }
  if (p.preview === 'none') {
    /* server-side project -> generate a live static showcase so all 59 have previews */
    const s = scanById[p.folder] || { loc: 0, fileCount: 0 };
    mkdirp(dest);
    fs.writeFileSync(path.join(dest, 'index.html'), showcaseHtml(p, s));
    return { ready: true, entry: 'index.html' };
  }
  return { ready: false, entry: null };
}

/* ---------------- gallery ---------------- */
function copyGallery(p) {
  const folder = path.join(ROOT, p.folder);
  const dest = path.join(DIST, 'projects', p.id, 'gallery');
  const files = walk(folder).filter(f => {
    const rel = path.relative(folder, f).replace(/\\/g, '/');
    const ext = path.extname(f).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return false;
    if (fs.statSync(f).size > 400 * 1024) return false;
    if (/^docs\//.test(rel) || /shot|screen|demo|preview|capture/i.test(path.basename(f))) return true;
    return false;
  });
  files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  const chosen = files.slice(0, 3);
  if (!chosen.length) return [];
  mkdirp(dest);
  return chosen.map(f => {
    const name = path.basename(f);
    fs.copyFileSync(f, path.join(dest, name));
    return 'gallery/' + name;
  });
}

/* ---------------- HTML templates ---------------- */
function navHtml(base, withSearch) {
  return `<header class="nav"><div class="container nav-inner">
    <a class="brand" href="${base}/"><span class="dot"></span>${esc(config.owner.name)}</a>
    <nav class="nav-links">
      <a href="${base}/#projects">Work</a>
      <a href="${base}/#capabilities">Capabilities</a>
      <a href="${base}/#skills">Skills</a>
      <a href="${base}/#surprise" id="surprise" title="Open a random project">ðŸŽ² Surprise</a>
      <a class="nav-cta" href="${base}/#contact">Contact</a>
    </nav>
    <button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div><div class="nav-progress" id="nav-progress"></div></header>
  <div class="mobile-menu" id="mobile-menu">
    <a href="${base}/#projects">Work</a>
    <a href="${base}/#capabilities">Capabilities</a>
    <a href="${base}/#universe">Data</a>
    <a href="${base}/#skills">Skills</a>
    <a href="${base}/#roadmap-section">Roadmap</a>
    <a href="${base}/#surprise">ðŸŽ² Surprise</a>
    <a href="${esc(config.owner.github)}" target="_blank" rel="noopener">GitHub</a>
    <a class="nav-cta" href="${base}/#contact">Contact</a>
  </div>`;
}

function hudHtml(base) {
  return `<canvas id="cosmos" aria-hidden="true"></canvas>
<div id="hud">
  <div class="hud-ring">
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle class="bg" cx="32" cy="32" r="26"></circle>
      <circle class="arc" id="hud-arc" cx="32" cy="32" r="26"></circle>
    </svg>
    <span id="hud-pct">0%</span>
  </div>
  <div class="hud-meta"><span id="hud-found">0/7</span>DISCOVERED</div>
  <button id="sound-toggle" type="button" aria-label="Toggle sound" title="Sound on/off">ðŸ”‡</button>
</div>
<div id="toasts" aria-live="polite"></div>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap"></noscript>`;

/* Above-the-fold critical CSS inlined in <head> so first paint never waits on style.css */
const CRITICAL_CSS = `<style id="critical">
:root{--bg:#06060e;--bg2:#0a0a16;--panel:#0c0c18;--panel2:#12122a;--border:#1c2033;--border2:#2a3050;--text:#f0ebdf;--muted:#9d9aa8;--faint:#8b8ea3;--accent:#ef4435;--gold:#fbbf24;--cyan:#22d3ee;--green:#34d399;--purple:#a78bfa;--r:6px;--r-sm:4px;--mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;--sans:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--disp:"Space Grotesk","Inter",system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.55;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}
.container{max-width:1240px;margin:0 auto;padding:0 24px}.mono{font-family:var(--mono)}h1,h2,h3{font-family:var(--disp)}
.nav{position:sticky;top:0;z-index:85;background:rgba(6,6,14,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;height:62px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-family:var(--mono);letter-spacing:2px;font-size:14px;text-transform:uppercase}
.brand .dot{width:9px;height:9px;border-radius:2px;background:var(--accent);box-shadow:0 0 10px rgba(239,68,53,.8);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{50%{opacity:.45}}
.nav-links{display:flex;gap:20px;align-items:center;font-size:13px;color:var(--muted);font-family:var(--mono)}
.nav-links a:hover{color:var(--text)}
.nav-cta{padding:7px 16px;border-radius:var(--r-sm);font-size:12.5px;font-weight:600;letter-spacing:.5px;background:linear-gradient(123deg,#7f1d1d,#ef4435 48%,#f59e0b);color:#fff!important}
.burger{display:none}
.hero{padding:72px 0 30px;position:relative;overflow:hidden}
.hero::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(700px 300px at 25% 20%,rgba(167,139,250,.10),transparent 70%)}
.hero-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(700px 300px at 25% 20%,rgba(167,139,250,.12),transparent 70%),radial-gradient(600px 260px at 78% 10%,rgba(34,211,238,.10),transparent 70%)}
.hero-grid{position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:linear-gradient(rgba(148,163,184,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.05) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(ellipse 80% 60% at 50% 30%,#000 30%,transparent 75%)}
.hero-inner{position:relative;z-index:1}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--faint);margin-bottom:18px;display:flex;gap:14px;align-items:center}
.eyebrow::before{content:"";width:36px;height:1px;background:var(--accent)}
.hero h1{font-size:clamp(38px,6.4vw,88px);line-height:1.05;margin:0 0 16px;letter-spacing:-2.2px;font-weight:700}
.hero h1 .w{display:inline-block;overflow:hidden;vertical-align:bottom}
.hero h1 .w>span{display:inline-block;animation:wordUp .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--wi,0)*60ms)}
@keyframes wordUp{from{transform:translateY(110%);opacity:0}to{transform:none;opacity:1}}
.hero h1 .grad{background:linear-gradient(100deg,var(--cyan) 0%,var(--purple) 55%,var(--pink,#f472b6) 95%);-webkit-background-clip:text;background-clip:text;color:transparent}
.blurb-intro{pointer-events:none;user-select:none;margin:0 0 18px;font-size:clamp(17px,3.4vw,24px);line-height:1.3;color:var(--text);filter:blur(7px);opacity:.85;transition:filter 1.1s ease,opacity 1.1s ease}
.blurb-intro.sharp{filter:blur(.4px);opacity:1}
.typewriter{font-size:clamp(18px,3.6vw,26px);line-height:1.35;color:var(--text);margin:0 0 22px;min-height:1.5em;max-width:660px}
.tw-cur{display:inline-block;width:2px;height:1.05em;background:var(--accent);vertical-align:-.15em;margin-left:3px;animation:blink 1s step-end infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
#hero-pills{display:flex;flex-wrap:wrap;align-items:center;margin-bottom:30px;opacity:0;transform:translateY(12px);transition:opacity .45s ease,transform .45s ease}
#hero-pills.in{opacity:1;transform:none}
.pill{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#0c0c0c;border:1px solid rgba(0,0,0,.14);border-radius:999px;font-size:14px;font-weight:600;padding:7px 18px;margin:0 8px 10px 0;cursor:pointer;transition:background .2s,color .2s;white-space:nowrap}
.pill:hover{background:#0c0c0c;color:#fff}
.pill.outline{background:transparent;color:#fff;border-color:rgba(255,255,255,.8)}
.spec{display:flex;flex-wrap:wrap;border:1px solid var(--border);border-radius:var(--r);background:rgba(12,12,24,.72);overflow:hidden;margin-top:8px}
.spec .cell{flex:1 1 150px;padding:15px 20px;border-right:1px dashed var(--border);font-family:var(--mono)}
.spec .v{font-size:23px;font-weight:700;letter-spacing:-.5px;display:block;font-variant-numeric:tabular-nums;min-width:9ch}
.spec .v.gold{color:var(--gold)}.spec .v.green{color:var(--green)}.spec .v.cyan{color:var(--cyan)}
.spec .k{font-size:10.5px;color:var(--faint);text-transform:uppercase;letter-spacing:1.5px}
#cosmos{position:fixed;inset:0;z-index:-1;width:100vw;height:100vh;pointer-events:none;background:var(--bg)}
#hud{position:fixed;right:16px;bottom:16px;z-index:60;display:flex;flex-direction:column;align-items:center;gap:8px}
</style>`;

const TICKER_WORDS = ['Python', 'React', 'Three.js', 'PyTorch', 'Next.js', 'FastAPI', 'PostgreSQL', 'Docker', 'TypeScript', 'Vite', 'WebGPU', 'Telegram Bots', 'RL Agents', 'Qdrant', 'Solana', 'MetaTrader 5', 'Redis', 'Tailwind', 'aiogram', 'LLM Routing'];
function tickerHtml() {
  const items = TICKER_WORDS.map(w => `<span><i>â—†</i> <b>${esc(w)}</b></span>`).join('');
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${items}${items}</div></div>`;
}

const CAT_COLORS = {
  'AI & Agents': '#a78bfa',
  'Trading & Fintech': '#fbbf24',
  'E-Commerce & Marketplaces': '#f472b6',
  'Games & 3D': '#22d3ee',
  'Business & Accounting': '#a9c4de',
  'Developer Tools': '#ef4435',
  'Web & Brand Experiences': '#fb923c',
  'Learning & Content': '#34d399',
  'Docs & Strategy': '#c5c1b6',
};

/* generated SVG cover for projects without gallery shots */
function ensureCover(p, s) {
  const dest = path.join(DIST, 'projects', p.id);
  mkdirp(dest);
  const color = CAT_COLORS[p.category] || '#a78bfa';
  const name = p.name;
  const fontSize = name.length > 26 ? 56 : name.length > 16 ? 68 : 84;
  const escXml = t => String(t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escXml(name)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".40"/>
      <stop offset="1" stop-color="#06060e" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="46" height="46" patternUnits="userSpaceOnUse">
      <path d="M46 0H0V46" fill="none" stroke="#94a3b8" stroke-opacity=".07"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#06060e"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="980" cy="90" r="300" fill="url(#g)"/>
  <circle cx="120" cy="600" r="240" fill="url(#g)" opacity=".55"/>
  <rect x="0" y="0" width="1200" height="6" fill="${color}"/>
  <text x="72" y="110" fill="${color}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" letter-spacing="6">${escXml(p.category.toUpperCase())}</text>
  <text x="72" y="310" fill="#f0ebdf" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="-2">${escXml(name)}</text>
  <text x="72" y="380" fill="#9d9aa8" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="24">${escXml(String(s.loc).replace(/\B(?=(\d{3})+(?!\d))/g, ','))} LOC Â· ${s.fileCount} FILES Â· ${escXml(p.language.toUpperCase())}</text>
  <rect x="72" y="440" width="240" height="58" rx="8" fill="#12122a" stroke="#fbbf24" stroke-opacity=".5"/>
  <text x="96" y="478" fill="#fbbf24" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="26" font-weight="700">$${escXml(String(p.value).replace(/\B(?=(\d{3})+(?!\d))/g, ','))} EST.</text>
  <text x="72" y="580" fill="#62647a" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="18" letter-spacing="4">KIA â€” SOFTWARE PORTFOLIO</text>
</svg>`;
  fs.writeFileSync(path.join(dest, 'cover.svg'), svg);
  return 'cover.svg';
}

/* self-contained static showcase for server-side projects (so all 59 have live previews) */
function showcaseHtml(p, s) {
  const color = CAT_COLORS[p.category] || '#a78bfa';
  const e = t => String(t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const facts = [
    ['Category', p.category],
    ['Primary language', p.language],
    ['Lines of code', s.loc.toLocaleString('en-US')],
    ['Files', String(s.fileCount)],
    ['Status', p.status],
    ['Est. market value', '$' + p.value.toLocaleString('en-US')],
  ].map(([k, v]) => `<div class="kv"><span class="k">${e(k)}</span><span class="v">${e(v)}</span></div>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(p.name)} â€” Showcase</title>
<style>
:root{--bg:#06060e;--panel:#0c0c18;--panel2:#12122a;--border:#1c2033;--text:#f0ebdf;--muted:#9d9aa8;--faint:#62647a;--accent:#ef4435;--gold:#fbbf24;--c:${color}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55}
.mono{font-family:ui-monospace,"JetBrains Mono",Menlo,Consolas,monospace}
.wrap{max-width:960px;margin:0 auto;padding:48px 24px}
.eyebrow{font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--c);margin-bottom:16px;display:flex;gap:12px;align-items:center}
.eyebrow::before{content:"";width:34px;height:1px;background:var(--c)}
h1{font-size:clamp(32px,5vw,52px);margin:0 0 10px;letter-spacing:-1.2px}
.tag{color:var(--muted);font-size:17px;margin:0 0 22px}
.badge{display:inline-block;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);border:1px solid rgba(251,191,36,.45);background:rgba(251,191,36,.07);padding:6px 12px;border-radius:4px;margin-bottom:26px}
.grid{display:grid;grid-template-columns:1.5fr 1fr;gap:22px;margin-bottom:26px}
.card{background:linear-gradient(180deg,var(--panel),#0a0a16);border:1px solid var(--border);border-radius:6px;padding:22px}
.card h2,.card h4{margin:0 0 14px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--faint);font-family:ui-monospace,Menlo,monospace}
.card p{margin:0 0 12px;font-size:15px}
.kv{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border);font-size:14px}
.kv:last-child{border-bottom:none}
.kv .k{color:var(--faint);font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.kv .v{font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{font-family:ui-monospace,Menlo,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.5px;background:var(--panel2);border:1px solid var(--border);color:var(--muted);padding:5px 10px;border-radius:4px}
.run{border:1px dashed var(--border);border-radius:6px;padding:18px 20px;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:var(--muted);background:var(--panel)}
.run b{color:var(--text)}
.cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}
.btn{font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;padding:11px 20px;border-radius:4px;border:1px solid var(--border);background:var(--panel2);color:var(--text);cursor:pointer}
.btn.primary{background:var(--accent);border-color:transparent;color:#fff}
a.btn{text-decoration:none}
@media(max-width:760px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">${e(p.category)}</div>
  <h1>${e(p.name)}</h1>
  <p class="tag">${e(p.tagline)}</p>
  <div class="badge mono">Server-side project Â· static showcase</div>
  <div class="grid">
    <div class="card">
      <h2>About this project</h2>
      <p>${e(p.description)}</p>
      <h2 style="margin-top:18px">Stack</h2>
      <div class="chips">${p.stack.map(x => `<span class="chip">${e(x)}</span>`).join('')}</div>
    </div>
    <div class="card">
      <h2>Project facts</h2>
      ${facts}
    </div>
  </div>
  <div class="run mono"><b>RUN LOCALLY</b><br>git clone &lt;repo&gt; &amp;&amp; cd ${e(p.repo)}<br>see README for install (Docker / package manager)<br>this showcase is a static front â€” the service itself runs on a server.</div>
  <div class="cta">
    <a class="btn primary" href="https://github.com/KiaAgentX/portfolio/tree/main/projects/${e(p.folder)}" target="_blank" rel="noopener">View source</a>
    <a class="btn" href="../../projects/${e(p.id)}/">Back to project page</a>
  </div>
</div>
</body>
</html>`;
}

function buildIndex(stats, cards, langs, caps, capMax) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.site.title)}</title>
<meta name="description" content="${esc(config.site.description)}">
<meta property="og:title" content="${esc(config.site.title)}">
<meta property="og:description" content="${esc(config.site.description)}">
<meta property="og:type" content="website">
${FONTS}
<noscript><style>.blurb-intro{filter:none!important;opacity:1!important}#tw-cur{display:none!important}#hero-pills{opacity:1!important;transform:none!important}</style></noscript>
${CRITICAL_CSS}
<script>window.__HAS_MOTION = true;</script>
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="manifest" href="assets/manifest.webmanifest">
<meta name="theme-color" content="#06060e">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preload" as="style" href="assets/style.css" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="assets/style.css"></noscript>
</head>
<body>
<script>window.matchMedia=window.matchMedia||function(q){return{matches:false,media:q,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false;}};};</script>
${hudHtml('.')}
${navHtml('.', true)}
<main>
  <section class="hero"><div class="hero-bg"></div><div class="hero-grid"></div><div class="container hero-inner">
    <div class="eyebrow">KIA Â· SOFTWARE PORTFOLIO Â· ${stats.projects} PROJECTS</div>
    <h1 aria-label="Engineering production software across AI, fintech and 3D.">
      <span class="w"><span style="--wi:0">Engineering</span></span>
      <span class="w"><span class="grad" style="--wi:1">production</span></span>
      <span class="w"><span class="grad" style="--wi:2">software</span></span><br>
      <span class="w"><span style="--wi:3">across</span></span>
      <span class="w"><span style="--wi:4">AI,</span></span>
      <span class="w"><span style="--wi:5">fintech</span></span>
      <span class="w"><span style="--wi:6">&amp;</span></span>
      <span class="w"><span style="--wi:7">3D.</span></span>
    </h1>
    <p class="blurb-intro" id="blurb-intro">Hey there, meet Kia,<br>Engineer of agents, markets &amp; impossible interfaces</p>
    <p class="typewriter"><span id="typewriter" data-text="Glad you stopped in. Sixty products deep. Now, what are we building?">Glad you stopped in. Sixty products deep. Now, what are we building?</span><i class="tw-cur" id="tw-cur"></i></p>
    <div class="hero-cta pills" id="hero-pills">
      <a class="pill" href="#projects">See the work</a>
      <a class="pill" href="#capabilities">Capabilities</a>
      <a class="pill" href="https://github.com/KiaAgentX/skills" target="_blank" rel="noopener">Open skills repo</a>
      <button class="pill" id="open-palette" type="button">Search <span class="kbd-hint">Ctrl K</span></button>
      <button class="pill outline" id="copy-telegram" type="button">Reach us: <u>t.me/ImXforevr</u>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.2"/><path d="M8.5 1.5h-6A1 1 0 0 0 1.5 2.5v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="spec">
      <div class="cell"><span class="v green">${stats.projects}</span><span class="k">Projects shipped</span></div>
      <div class="cell"><span class="v cyan">${fmt(stats.loc)}</span><span class="k">Lines of code</span></div>
      <div class="cell"><span class="v gold">${money(stats.value)}</span><span class="k">Est. portfolio value</span></div>
      <div class="cell"><span class="v">${stats.previews}</span><span class="k">Live previews</span></div>
      <div class="cell"><span class="v" style="color:var(--purple)">${money(pipelineValue)}</span><span class="k">Roadmap pipeline</span></div>
    </div>
  </div></section>
  ${tickerHtml()}
  <section class="showreel" aria-label="Project showreel" aria-hidden="false">
    <div class="mq-row" id="mq-row1"></div>
    <div class="mq-row" id="mq-row2"></div>
  </section>
  <section class="capabilities"><div class="container">
    <div class="sec-head" id="capabilities"><span class="sec-num">01</span><h2>Capabilities</h2><span class="sec-line"></span></div>
    <p class="manifesto char-reveal" id="manifesto">I turn ideas into shipped systems â€” agents that think, markets that move, worlds you can play, and Persian-first finance tools. Sixty products. Six hundred seventy thousand lines. One operator.</p>
    <div class="cap-grid" id="caps-grid"></div>
  </div></section>
  <section class="universe"><div class="container">
    <div class="sec-head" id="universe"><span class="sec-num">02</span><h2>Languages &amp; Data</h2><span class="sec-line"></span></div>
    <div class="universe-grid">
      <div class="panel-card">
        <h3>Languages by source files (all ${stats.projects} projects)</h3>
        <div id="langbars"></div>
      </div>
      <div class="panel-card">
        <h3>The data we hold</h3>
        <div class="facts" id="data-facts">
          <div class="fact"><div class="fv green">${stats.projects}</div><div class="fk">Projects shipped</div></div>
          <div class="fact"><div class="fv cyan">${fmt(stats.loc)}</div><div class="fk">Lines of code</div></div>
          <div class="fact"><div class="fv gold">${money(stats.value)}</div><div class="fk">Shipped value</div></div>
          <div class="fact"><div class="fv">${money(pipelineValue)}</div><div class="fk">Roadmap pipeline</div></div>
          <div class="fact"><div class="fv green">${stats.previews}</div><div class="fk">Live previews</div></div>
          <div class="fact"><div class="fv cyan">10</div><div class="fk">Skill modules</div></div>
          <div class="fact"><div class="fv gold">8</div><div class="fk">Operating laws</div></div>
          <div class="fact"><div class="fv">${skills.length}</div><div class="fk">Priced modules</div></div>
        </div>
      </div>
    </div>
  </div></section>
  <section class="skills-sec"><div class="container">
    <div class="sec-head" id="skills"><span class="sec-num">03</span><h2>Skills</h2><span class="sec-line"></span></div>
    <p class="skills-note">Ten skill modules distilled from every project â€” full workflows, quality bars and pricing live in the
      <a href="https://github.com/KiaAgentX/skills" target="_blank" rel="noopener">KiaAgentX/skills</a> repo
      (start with <a href="https://github.com/KiaAgentX/skills/blob/main/SOUL.md" target="_blank" rel="noopener">SOUL.md</a>).</p>
    <div class="skill-grid" id="skills-grid"></div>
    <div class="skills-cta">
      <a class="btn primary" href="https://github.com/KiaAgentX/skills" target="_blank" rel="noopener">Open skills repo â†’</a>
      <a class="btn" href="https://github.com/KiaAgentX/skills/blob/main/PRICING.md" target="_blank" rel="noopener">Pricing per module</a>
      <a class="btn" href="https://github.com/KiaAgentX/skills/blob/main/PROJECTS.md" target="_blank" rel="noopener">60 projects mapped</a>
    </div>
  </div></section>
  <section class="work"><div class="container">
    <div class="sec-head" id="projects"><span class="sec-num">04</span><h2>Selected Work</h2><span class="sec-line"></span></div>
    <div class="toolbar">
      <div class="search"><input id="search" type="search" aria-label="Search projects" placeholder="Search projects, stacks, categoriesâ€¦" autocomplete="off"></div>
      <div class="sort"><select id="sort" aria-label="Sort projects">
        <option value="value">sort: value</option>
        <option value="loc">sort: lines of code</option>
        <option value="name">sort: name</option>
      </select></div>
    </div>
    <div class="chips" id="chips"></div>
    <div class="grid" id="grid"></div>
    <section class="flagships" id="flagships" style="display:none">
      <div class="docs-head"><span class="sec-num">05</span><h2>Flagship Stories</h2><span>deeper dives into the biggest builds</span></div>
      <div class="stories" id="stories"></div>
    </section>
    <section class="docs-section" id="docs-section" style="display:none">
      <div class="docs-head"><span class="sec-num">06</span><h2>Docs &amp; Strategy</h2><span>architecture Â· roadmap Â· company</span></div>
      <div class="grid" id="docs-grid" style="padding-bottom:0"></div>
    </section>
    <section class="roadmap-section" id="roadmap-section">
      <div class="docs-head"><span class="sec-num">07</span><h2>Roadmap â€” Next 10</h2><span>observed patterns â†’ planned builds Â· est. ${money(pipelineValue)} pipeline</span></div>
      <div class="roadmap" id="roadmap"></div>
    </section>
  </div></section>
  <section class="contact"><div class="container">
    <div class="sec-head" id="contact"><span class="sec-num">08</span><h2>Contact</h2><span class="sec-line"></span></div>
    <div class="contact-grid">
      <a class="c-card" style="--cc:#229ed9" href="${esc(config.owner.telegram)}" target="_blank" rel="noopener">
        <span class="c-kicker">Telegram Â· fastest reply</span>
        <span class="c-handle">@ImXforevr</span>
        <span class="c-note">DMs open â€” best channel for projects, collabs and quick questions.</span>
        <span class="c-go">Open Telegram â†’</span>
      </a>
      <a class="c-card" style="--cc:#e7e9ea" href="${esc(config.owner.x)}" target="_blank" rel="noopener">
        <span class="c-kicker">X Â· building in public</span>
        <span class="c-handle">@imxforever</span>
        <span class="c-note">Build logs, experiments and product drops as they ship.</span>
        <span class="c-go">Follow on X â†’</span>
      </a>
      <a class="c-card" style="--cc:#a78bfa" href="${esc(config.owner.github)}" target="_blank" rel="noopener">
        <span class="c-kicker">GitHub Â· the receipts</span>
        <span class="c-handle">@KiaAgentX</span>
        <span class="c-note">${stats.projects} repos Â· ${fmt(stats.loc)} lines Â· skills &amp; portfolio sources.</span>
        <span class="c-go">Browse repositories â†’</span>
      </a>
    </div>
  </div></section>
</main>
<footer class="footer">
  <div class="container">
    <div class="foot-cta">
      <div>
        <h2>Have a project <span>in mind?</span></h2>
        <p class="sub">Available for remote work worldwide Â· ${stats.projects} projects Â· ${money(stats.value)} shipped value</p>
      </div>
      <a class="btn primary btn-lg" href="${esc(config.owner.github)}" target="_blank" rel="noopener">Start a conversation â†’</a>
    </div>
    <div class="row">
      <div>Â© ${new Date().getFullYear()} ${esc(config.owner.name)} Â· ${esc(config.owner.location)}</div>
      <div><a href="${esc(config.owner.github)}" target="_blank" rel="noopener">GitHub</a>${config.site.repoUrl ? ` Â· <a href="${esc(config.site.repoUrl)}" target="_blank" rel="noopener">Site source</a>` : ''}</div>
    </div>
  </div>
</footer>
<div class="palette" id="palette" hidden>
  <div class="palette-box">
    <input id="palette-input" aria-label="Search projects" placeholder="Type to search ${stats.projects} projectsâ€¦" autocomplete="off" spellcheck="false">
    <div class="palette-results" id="palette-results"></div>
    <div class="palette-hint mono">â†‘ â†“ navigate Â· Enter open Â· Esc close</div>
  </div>
</div>
<script>window.__PROJECTS__ = ${safeJson(cards)};</script>
<script>window.__ROADMAP__ = ${safeJson(roadmap)};</script>
<script>window.__SKILLS__ = ${safeJson(skills)};</script>
<script>window.__LANGS__ = ${safeJson(langs)};</script>
<script>window.__CAPS__ = ${safeJson(caps)};</script>
<script>window.__CAPMAX__ = ${capMax};</script>
<script src="assets/cosmos.js" defer></script>
<script src="assets/index.js"></script>
<script src="assets/nav.js" defer></script>
<script src="assets/gsap.min.js" defer></script>
<script src="assets/ScrollTrigger.min.js" defer></script>
<script src="assets/lenis.min.js" defer></script>
<script src="assets/motion.js" defer></script>
</body>
</html>`;
}

function buildProjectPage(p, ctx) {
  const base = '../..';
  const repo = repoUrl(p);
  const idx = projects.findIndex(x => x.id === p.id);
  const prevP = projects[idx - 1], nextP = projects[idx + 1];
  const statusBadge = p.status !== 'stable'
    ? `<span class="badge status-${p.status === 'in-dev' ? 'dev' : 'beta'}">${p.status === 'in-dev' ? 'in development' : 'beta'}</span>` : '';
  const stack = p.stack.map(s => `<span class="badge">${esc(s)}</span>`).join('');
  const gallery = ctx.gallery.length
    ? `<div class="gallery">${ctx.gallery.map(g => `<img src="${g}" alt="${esc(p.name)} screenshot" loading="lazy">`).join('')}</div>` : '';

  const previewPanel = ctx.preview.ready
    ? `<div class="preview-wrap">
        <div class="preview-bar">
          <span class="preview-url">previews/${esc(p.id)}/${esc(ctx.preview.entry)}</span>
          <a class="btn" href="${base}/previews/${esc(p.id)}/${esc(ctx.preview.entry)}" target="_blank" rel="noopener">Open fullscreen</a>
        </div>
        <iframe class="preview" data-defer="${base}/previews/${esc(p.id)}/${esc(ctx.preview.entry)}" title="${esc(p.name)} live preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
      </div>`
    : `<div class="no-preview">
        <strong>${p.preview === 'none' ? 'Server-side project â€” no browser preview' : 'Live preview is being prepared'}</strong>
        ${p.preview === 'none'
      ? 'This project runs as a backend service, bot or desktop workflow. Explore the full source code below, or run it locally with Docker.'
      : 'The static bundle for this project is generated by the portfolio build pipeline (npm run build:previews).'}
        <div class="cta-row" style="justify-content:center;margin-top:16px">
          <a class="btn" href="${esc(repo)}" target="_blank" rel="noopener">View on GitHub</a>
        </div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.name)} â€” ${esc(config.site.title)}</title>
<meta name="description" content="${esc(p.tagline)}">
${FONTS}
<link rel="icon" type="image/svg+xml" href="${base}/assets/favicon.svg">
<link rel="manifest" href="${base}/assets/manifest.webmanifest">
<meta name="theme-color" content="#06060e">
<link rel="apple-touch-icon" href="${base}/assets/apple-touch-icon.png">
<link rel="stylesheet" href="${base}/assets/style.css">
<link rel="stylesheet" href="${base}/assets/highlight.min.css">
</head>
<body>
<script>window.matchMedia=window.matchMedia||function(q){return{matches:false,media:q,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false;}};};</script>
${hudHtml(base)}
${navHtml(base)}
<main class="container">
  <div class="phead">
    <a class="back" href="${base}/#projects">â† All projects</a>
    ${(() => { const b = ctx.gallery.length ? ctx.gallery[0] : 'cover.svg'; return `<div class="p-banner"><img src="${b}" alt="${esc(p.name)} banner" loading="eager"><span class="b-label">${esc(p.category)} Â· ${esc(p.language)} Â· ${fmt(ctx.stats.loc)} LOC</span></div>`; })()}
    <h1>${esc(p.name)}</h1>
    <p class="tag">${esc(p.tagline)}</p>
    <div class="pmeta">
      <span class="badge lang">${esc(p.language)}</span>
      <span class="badge">${esc(p.category)}</span>
      <span class="badge" style="color:var(--gold);border-color:rgba(251,191,36,.35)">Est. ${money(p.value)}</span>
      ${statusBadge}
    </div>
  </div>

  <div class="tabs">
    <button class="tab" data-tab="overview">Overview</button>
    <button class="tab" data-tab="preview">Live Preview</button>
    <button class="tab" data-tab="source">Source Code</button>
  </div>

  <section class="panel" id="panel-overview">
    <div class="ov-grid">
      <div class="ov-card">
        <h2>About this project</h2>
        <p>${esc(p.description)}</p>
        ${gallery}
        <div class="cta-row">
          <a class="btn primary" href="${esc(repo)}" target="_blank" rel="noopener">View source on GitHub</a>
          ${config.site.sourceRepo ? '' : `<a class="btn" href="${esc(repo)}/archive/refs/heads/main.zip">Download ZIP</a>`}
          ${ctx.preview.ready ? `<a class="btn" href="#preview">Live preview</a>` : ''}
        </div>
      </div>
      <div class="ov-card">
        <h2>Project facts</h2>
        <div class="kv"><span class="k">Category</span><span class="v">${esc(p.category)}</span></div>
        <div class="kv"><span class="k">Primary language</span><span class="v">${esc(p.language)}</span></div>
        <div class="kv"><span class="k">Lines of code</span><span class="v">${fmt(ctx.stats.loc)}</span></div>
        <div class="kv"><span class="k">Files</span><span class="v">${fmt(ctx.stats.fileCount)}</span></div>
        <div class="kv"><span class="k">Status</span><span class="v">${esc(p.status)}</span></div>
        <div class="kv"><span class="k">Est. market value</span><span class="v gold">${money(p.value)}</span></div>
        <div class="kv"><span class="k">${config.site.sourceRepo ? 'Source path' : 'Repository'}</span><span class="v">${esc(config.site.sourceRepo ? 'projects/' + p.folder : p.repo)}</span></div>
        <h2 style="margin-top:18px">Stack</h2>
        <div class="stack-chips">${stack}</div>
      </div>
    </div>
  </section>

  <section class="panel" id="panel-preview">${previewPanel}</section>

  <section class="panel" id="panel-source">
    <div class="src">
      <aside class="src-tree" id="src-tree"></aside>
      <div class="src-main">
        <div class="src-head">
          <span id="src-path">Select a file</span>
          <span class="grp">
            <button class="btn ghost" id="src-prev">â€¹</button>
            <button class="btn ghost" id="src-next">â€º</button>
            <button class="btn ghost" id="src-copy" type="button">copy</button>
            <a class="btn ghost" href="${esc(repo)}" target="_blank" rel="noopener">GitHub</a>
          </span>
        </div>
        <div class="src-code" id="src-code-wrap"><pre><code id="src-code"></code></pre></div>
        <div class="src-status" id="src-status">Loading source filesâ€¦</div>
      </div>
    </div>
  </section>

  <nav class="pager">
    ${prevP ? `<a href="../${encodeURIComponent(prevP.id)}/"><div class="lbl">â† Previous</div><div class="nm">${esc(prevP.name)}</div></a>` : '<span></span>'}
    ${nextP ? `<a class="next" href="../${encodeURIComponent(nextP.id)}/"><div class="lbl">Next â†’</div><div class="nm">${esc(nextP.name)}</div></a>` : '<span></span>'}
  </nav>
</main>
<script>window.__PROJECT__ = ${safeJson({ id: p.id, sourceAvailable: ctx.source.files.length > 0, repo })};</script>
<script src="${base}/assets/cosmos.js"></script>
<script src="${base}/assets/highlight.min.js"></script>
<script src="${base}/assets/project.js"></script>
<script src="${base}/assets/nav.js"></script>
<script src="${base}/assets/gsap.min.js"></script>
<script src="${base}/assets/ScrollTrigger.min.js"></script>
<script src="${base}/assets/lenis.min.js"></script>
<script src="${base}/assets/motion.js"></script>
</body>
</html>`;
}

/* ---------------- main ---------------- */
rmrf(DIST);
mkdirp(path.join(DIST, 'assets'));
mkdirp(path.join(DIST, 'data', 'src'));
mkdirp(path.join(DIST, 'projects'));

for (const f of ['style.css', 'index.js', 'project.js', 'cosmos.js', 'motion.js', 'nav.js', 'gsap.min.js', 'ScrollTrigger.min.js', 'lenis.min.js', 'highlight.min.js', 'highlight.min.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
  fs.copyFileSync(path.join(SRC, 'assets', f), path.join(DIST, 'assets', f));
}
/* service worker MUST live at site root so its scope covers every page */
fs.copyFileSync(path.join(SRC, 'assets', 'sw.js'), path.join(DIST, 'sw.js'));
/* root /favicon.ico — stops the browser's default 404 console error (Best Practices) */
fs.copyFileSync(path.join(SRC, 'assets', 'apple-touch-icon.png'), path.join(DIST, 'favicon.ico'));
fs.writeFileSync(path.join(DIST, 'assets', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#06060e"/><rect x="4" y="4" width="56" height="56" rx="9" fill="none" stroke="#ef4435" stroke-width="2"/><text x="32" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="#f0ebdf">K</text></svg>`);
/* GitHub Pages runs Jekyll which DROPS underscore dirs (_next/) unless this file exists */
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

const cards = [];
let totalLoc = 0, totalValue = 0, previewCount = 0;

for (const p of projects) {
  const folder = path.join(ROOT, p.folder);
  const s = scanById[p.folder] || { loc: 0, fileCount: 0, languages: {}, sizeMB: 0 };

  const source = extractSource(folder);
  fs.writeFileSync(path.join(DIST, 'data', 'src', `${p.id}.json`), JSON.stringify(source));

  const preview = preparePreview(p);
  const gallery = copyGallery(p);
  let thumb;
  if (gallery.length) thumb = `projects/${p.id}/${gallery[0]}`;
  else { ensureCover(p, s); thumb = `projects/${p.id}/cover.svg`; }

  const ctx = { preview, gallery, stats: s, source, thumb };
  mkdirp(path.join(DIST, 'projects', p.id));
  fs.writeFileSync(path.join(DIST, 'projects', p.id, 'index.html'), buildProjectPage(p, ctx));

  totalLoc += s.loc;
  totalValue += p.value;
  if (preview.ready) previewCount++;

  cards.push({
    id: p.id, name: p.name, tagline: p.tagline, description: p.description,
    category: p.category, language: p.language, stack: p.stack,
    value: p.value, status: p.status, preview: p.preview,
    previewReady: preview.ready, loc: s.loc, fileCount: s.fileCount,
    thumb,
  });

  const srcSize = Math.round(JSON.stringify(source).length / 1024);
  console.log(`  ${p.id.padEnd(22)} source:${String(source.files.length).padStart(3)}f ${String(srcSize).padStart(5)}KB  preview:${preview.ready ? 'ready' : (p.preview === 'none' ? 'n/a' : 'pending')}`);
}

const stats = { projects: projects.length, loc: totalLoc, value: totalValue, previews: previewCount };

/* aggregate language file-counts across every scanned project */
const langAgg = {};
for (const p of projects) {
  const s = scanById[p.folder];
  if (!s || !s.languages) continue;
  for (const [k, v] of Object.entries(s.languages)) langAgg[k] = (langAgg[k] || 0) + v;
}
const langs = Object.entries(langAgg).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

/* capability cards derived from real category metrics */
const CAP_DESC = {
  'AI & Agents': 'Agent runtimes, memory, tools, multi-channel bots, gateways and marketplaces.',
  'Trading & Fintech': 'RL trading engines, backtesting, MT5 bridges and risk managers â€” paper-first.',
  'E-Commerce & Marketplaces': 'Telegram storefronts, wallet ledgers, referrals and launchpads.',
  'Games & 3D': 'Browser games, WebGL/WebGPU engines and desktop simulators.',
  'Business & Accounting': 'Persian RTL ledgers, audit suites and offline-first finance PWAs.',
  'Developer Tools': 'Internal studios, valuation engines and prompt tooling.',
  'Web & Brand Experiences': 'Cinematic scroll sites, interactive brand books and clones.',
  'Learning & Content': 'Interactive guides, academies and playable demo collections.',
  'Docs & Strategy': 'Architecture, roadmap and company documents.',
};
const capMap = {};
for (const c of cards) {
  if (!capMap[c.category]) capMap[c.category] = { category: c.category, desc: CAP_DESC[c.category] || '', count: 0, loc: 0, value: 0, color: CAT_COLORS[c.category] || '#62647a' };
  capMap[c.category].count++; capMap[c.category].loc += c.loc; capMap[c.category].value += c.value;
}
const caps = Object.values(capMap).sort((a, b) => b.value - a.value);
const capMax = Math.max(...caps.map(c => c.value), 1);

fs.writeFileSync(path.join(DIST, 'index.html'), buildIndex(stats, cards, langs, caps, capMax));
fs.writeFileSync(path.join(DIST, 'data', 'projects.json'), JSON.stringify({ stats, projects: cards, langs, caps }, null, 2));

const distSize = walk(DIST).reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`\nBuilt ${projects.length} pages -> dist/ (${(distSize / 1048576).toFixed(1)} MB)`);
console.log(`Projects: ${stats.projects} Â· LOC: ${fmt(stats.loc)} Â· Est. value: ${money(stats.value)} Â· Live previews: ${stats.previews}`);

execFileSync(process.execPath, [path.join(HERE, 'redact-secrets.mjs'), '--apply'], { stdio: 'inherit' });
