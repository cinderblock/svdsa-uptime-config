/**
 * Builds SETUP.md into a one-page checklist site in `_site/`:
 *
 *   index.html  the guide, with boxes that tick and are remembered by the
 *               reader's browser (localStorage, nothing is sent anywhere)
 *   setup.pdf   the same page printed, with `--pdf` (needs Chrome or Chromium)
 *
 * Each step's checklist becomes a "Done when" box, so the checks are easy to
 * find on screen, in the PDF and on paper. GitHub Pages runs this on every push
 * (.github/workflows/guide.yml).
 */
import { marked } from 'marked';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dir, '..');
const out = join(root, '_site');

let markdown = readFileSync(join(root, 'SETUP.md'), 'utf8').replace(/\r\n/g, '\n');
// The pointer to this page belongs in the repo copy only.
markdown = markdown.replace(/^\*\*Follow along on the \[checklist page\].*\n\n/m, '');

const title = markdown.match(/^# (.+)$/m)?.[1] ?? 'Setup';
let html = await marked.parse(markdown, { gfm: true });

// Number each step heading's anchor, and turn every list made only of task
// items into a "Done when" box. Keys come from the step number, so rewording a
// step keeps a reader's ticks.
let step = '0';
let total = 0;
html = html.replace(
  /<h3>([\s\S]*?)<\/h3>|<ul>\n((?:<li><input [^>]*type="checkbox"[^>]*>[\s\S]*?<\/li>\n)+)<\/ul>/g,
  (match, heading: string | undefined, items: string | undefined) => {
    if (heading !== undefined) {
      step = heading.match(/^(\d+)\./)?.[1] ?? step;
      return `<h3 id="step-${step}">${heading}</h3>`;
    }
    let index = 0;
    const boxes = items!.replace(
      /<li><input [^>]*type="checkbox"[^>]*>\s*([\s\S]*?)<\/li>/g,
      (_, text: string) => {
        index++;
        total++;
        return `<li><label><input type="checkbox" data-check="step-${step}-${index}"><span>${text}</span></label></li>`;
      },
    );
    return `<div class="checks"><div class="checks-label">Done when</div><ul>${boxes}</ul></div>`;
  },
);

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/<[^>]+>/g, '')}</title>
<style>
:root {
  --bg: #ffffff; --fg: #1c2024; --muted: #60646c; --line: #d9d9e0;
  --code-bg: #f3f3f5; --accent: #c1272d; --check-bg: #fdf3f3; --done: #2b8a3e;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111113; --fg: #edeef0; --muted: #b0b4ba; --line: #363a3f;
    --code-bg: #1c1d20; --accent: #ff6b6b; --check-bg: #2a1a1b; --done: #5bd47a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 760px; margin: 0 auto; padding: 0 16px 64px; }
h1 { font-size: 1.9rem; margin: 1.2rem 0 0.3rem; }
h2 {
  font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--muted); border-bottom: 1px solid var(--line);
  padding-bottom: 0.3rem; margin: 2.4rem 0 0;
}
h3 { font-size: 1.2rem; margin: 1.6rem 0 0.4rem; scroll-margin-top: 64px; }
a { color: var(--accent); }
code { background: var(--code-bg); border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.9em; overflow-wrap: anywhere; }
pre { background: var(--code-bg); border-radius: 6px; padding: 12px 14px; overflow-x: auto; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 0.8rem 0; font-size: 0.95rem; }
th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: var(--code-bg); }
.table-wrap { overflow-x: auto; }
blockquote { margin: 1rem 0; padding: 0.2rem 1rem; border-left: 3px solid var(--line); color: var(--muted); }

.checks {
  margin: 0.9rem 0 0.4rem; padding: 8px 14px 6px;
  background: var(--check-bg); border-left: 4px solid var(--accent); border-radius: 0 6px 6px 0;
}
.checks-label {
  font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--accent);
}
.checks ul { list-style: none; margin: 4px 0; padding: 0; }
.checks li { margin: 4px 0; }
.checks label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
.checks input { width: 20px; height: 20px; margin: 2px 0 0; flex: none; accent-color: var(--done); }
.checks input:checked + span { color: var(--muted); text-decoration: line-through; }

.bar {
  position: sticky; top: 0; z-index: 1; background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.bar-inner {
  max-width: 760px; margin: 0 auto; padding: 8px 16px;
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 0.9rem;
}
.meter { flex: 1 1 120px; height: 8px; background: var(--line); border-radius: 4px; overflow: hidden; }
.meter div { height: 100%; width: 0; background: var(--done); transition: width 0.2s; }
.bar button {
  font: inherit; background: none; color: var(--muted);
  border: 1px solid var(--line); border-radius: 6px; padding: 3px 10px; cursor: pointer;
}

@media print {
  .bar { display: none; }
  body { font-size: 11pt; }
  main { max-width: none; padding: 0; }
  h3 { break-after: avoid; }
  .checks, pre, table { break-inside: avoid; }
  .checks { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .checks input { appearance: none; border: 1.5px solid #444; border-radius: 3px; }
  a { color: inherit; }
}
</style>
</head>
<body>
<div class="bar"><div class="bar-inner">
  <strong id="count">0 of ${total} done</strong>
  <div class="meter"><div id="meter"></div></div>
  <a href="setup.pdf">PDF</a>
  <button type="button" id="clear">Clear checks</button>
</div></div>
<main>
${html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>')}
</main>
<script>
(() => {
  const prefix = 'svdsa-uptime-setup:';
  const boxes = [...document.querySelectorAll('input[data-check]')];
  const store = {
    get(k) { try { return localStorage.getItem(prefix + k) === '1'; } catch { return false; } },
    set(k, v) { try { v ? localStorage.setItem(prefix + k, '1') : localStorage.removeItem(prefix + k); } catch {} },
  };
  const update = () => {
    const done = boxes.filter((b) => b.checked).length;
    document.getElementById('count').textContent = done + ' of ' + boxes.length + ' done';
    document.getElementById('meter').style.width = (100 * done / boxes.length) + '%';
  };
  for (const box of boxes) {
    box.checked = store.get(box.dataset.check);
    box.addEventListener('change', () => { store.set(box.dataset.check, box.checked); update(); });
  }
  document.getElementById('clear').addEventListener('click', () => {
    for (const box of boxes) { box.checked = false; store.set(box.dataset.check, false); }
    update();
  });
  update();
})();
</script>
</body>
</html>
`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), page);
console.log(`_site/index.html: ${total} checks`);

if (process.argv.includes('--pdf')) {
  const chrome =
    process.env.CHROME ??
    [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ].find(existsSync);
  if (!chrome) throw new Error('No Chrome found; set CHROME to its path');
  const pdf = join(out, 'setup.pdf');
  rmSync(pdf, { force: true });
  // A profile of its own, so an open Chrome window doesn't take the job over.
  const profile = mkdtempSync(join(tmpdir(), 'guide-chrome-'));
  const proc = Bun.spawnSync([
    chrome,
    '--headless=new',
    `--user-data-dir=${profile}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdf}`,
    pathToFileURL(join(out, 'index.html')).href,
  ]);
  // On Windows chrome.exe hands off to a child and returns before the PDF is
  // written, so wait for the file to appear and stop growing.
  let size = -1;
  for (let waited = 0; ; waited += 250) {
    const now = existsSync(pdf) ? statSync(pdf).size : -1;
    if (now > 0 && now === size) break;
    if (waited > 60_000) {
      throw new Error(`Chrome didn't write the PDF (exit ${proc.exitCode}): ${proc.stderr.toString()}`);
    }
    size = now;
    await Bun.sleep(250);
  }
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome's helpers can hold the profile open for a moment; it's only a temp dir.
  }
  console.log('_site/setup.pdf');
}
