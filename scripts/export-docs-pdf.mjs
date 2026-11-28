/**
 * Export Markdown → PDF — SmartCabb
 *
 * Utilise Chrome/Edge en mode headless (`--print-to-pdf`) : aucune dépendance
 * npm à installer. Le script convertit le Markdown en HTML stylé (tableaux,
 * listes, citations, cases à cocher) puis imprime chaque document en A4.
 *
 * Usage :
 *   node scripts/export-docs-pdf.mjs
 *   node scripts/export-docs-pdf.mjs docs/security/POLITIQUE_SECURITE.md
 *
 * Sortie : docs/exports/pdf/*.pdf (ignoré par Git)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT_PDF = path.join(ROOT, 'docs', 'exports', 'pdf');
const OUT_HTML = path.join(ROOT, 'docs', 'exports', 'html');

const args = process.argv.slice(2);

function listDefaultDocs() {
  const docs = [];
  for (const dir of ['docs/security', 'docs/quality']) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (file.endsWith('.md')) docs.push(path.join(dir, file));
    }
  }
  docs.push('docs/SECURITY.md');
  docs.push('docs/BACKUPS.md');
  return docs.filter((p) => fs.existsSync(path.join(ROOT, p)));
}

const files = (args.length ? args : listDefaultDocs()).map((p) =>
  path.isAbsolute(p) ? p : path.join(ROOT, p),
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text) {
  const codes = [];
  let s = String(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = escapeHtml(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label, href) => `<a href="${href}" rel="noopener">${label}</a>`,
  );
  s = s.replace(/\[ \]/g, '<span class="checkbox">☐</span>');
  s = s.replace(/\[[xX]\]/g, '<span class="checkbox">☑</span>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
  return s;
}

function isTableStart(lines, i) {
  if (!/^\s*\|/.test(lines[i] || '')) return false;
  const next = lines[i + 1] || '';
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(next) && /-/.test(next);
}

function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function renderTable(lines, start) {
  const header = splitRow(lines[start]);
  const separator = splitRow(lines[start + 1]);
  const aligns = separator.map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  let i = start + 2;
  const rows = [];
  while (i < lines.length && /^\s*\|/.test(lines[i])) {
    rows.push(splitRow(lines[i]));
    i++;
  }

  const th = header
    .map((cell, idx) => `<th style="text-align:${aligns[idx] || 'left'}">${inline(cell)}</th>`)
    .join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, idx) =>
              `<td style="text-align:${aligns[idx] || 'left'}">${inline(cell)}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');

  return {
    html: `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`,
    next: i,
  };
}

function collectList(lines, start, marker) {
  const items = [];
  let current = null;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (marker.test(line)) {
      if (current !== null) items.push(current);
      current = line.replace(marker, '');
      i++;
      continue;
    }

    // Ligne de continuation indentée (item sur plusieurs lignes).
    if (current !== null && /^\s+\S/.test(line) && !/^\s*(#{1,6}\s|>|\||```|---+\s*$)/.test(line)) {
      current += ' ' + line.trim();
      i++;
      continue;
    }

    break;
  }

  if (current !== null) items.push(current);
  return { items, next: i };
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Code fence
    if (/^\s*```/.test(line)) {
      i++;
      const code = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      out.push('<hr />');
      i++;
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Table
    if (isTableStart(lines, i)) {
      const table = renderTable(lines, i);
      out.push(table.html);
      i = table.next;
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${quote.map((q) => inline(q)).join('<br />')}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const list = collectList(lines, i, /^\s*[-*]\s+/);
      out.push(`<ul>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      i = list.next;
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const list = collectList(lines, i, /^\s*\d+[.)]\s+/);
      out.push(`<ol>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      i = list.next;
      continue;
    }

    // Paragraph
    const paragraph = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(#{1,6}\s|>|\||```|[-*]\s|\d+[.)]\s|---+\s*$)/.test(lines[i])
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  return out.join('\n');
}

function documentTitle(markdown) {
  const match = String(markdown).match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Document SmartCabb';
}

function buildHtml(markdown, sourcePath) {
  const title = documentTitle(markdown);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 15mm 13mm 17mm 13mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 10.1pt;
    line-height: 1.42;
    color: #1f2937;
    margin: 0;
  }
  .doc-meta {
    font-size: 8.5pt;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 5px;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 19pt;
    color: #0B1F33;
    border-bottom: 2px solid #007AFF;
    padding-bottom: 6px;
    margin: 0 0 10px;
    line-height: 1.15;
  }
  h2 {
    font-size: 13.5pt;
    color: #0B1F33;
    margin: 17px 0 7px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11.5pt;
    color: #007AFF;
    margin: 13px 0 5px;
    page-break-after: avoid;
  }
  p { margin: 5px 0; text-align: left; }
  ul, ol { margin: 4px 0 8px 18px; padding: 0; }
  li { margin: 3px 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px;
    font-size: 8.7pt;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: #eef4fb;
    color: #0B1F33;
    text-align: left;
    border: 1px solid #cbd5e1;
    padding: 4px 5px;
    vertical-align: top;
  }
  td {
    border: 1px solid #d7dee7;
    padding: 4px 5px;
    vertical-align: top;
  }
  blockquote {
    margin: 8px 0;
    padding: 7px 10px;
    background: #f8fafc;
    border-left: 4px solid #007AFF;
    color: #334155;
    font-size: 9.4pt;
  }
  code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 8.8pt;
    background: #f1f5f9;
    padding: 1px 3px;
    border-radius: 3px;
  }
  pre {
    background: #0B1F33;
    color: #e2e8f0;
    padding: 8px 10px;
    border-radius: 5px;
    overflow: auto;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }
  pre code { background: transparent; color: inherit; padding: 0; }
  a { color: #007AFF; text-decoration: none; }
  hr { border: 0; border-top: 1px solid #e5e7eb; margin: 13px 0; }
  .checkbox { font-family: "Segoe UI Symbol", "Segoe UI", sans-serif; }
  strong { color: #0f172a; }
  @media print {
    a { color: #0B4A8F; }
    h1, h2, h3 { break-after: avoid; }
  }
</style>
</head>
<body>
  <div class="doc-meta">SmartCabb · Document interne · ${escapeHtml(
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
  )} · Source : ${escapeHtml(path.basename(sourcePath))}</div>
  ${renderMarkdown(markdown)}
</body>
</html>`;
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function exportPdf(browser, htmlPath, pdfPath) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartcabb-pdf-'));
  const chromeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=5000',
    `--user-data-dir=${userDataDir}`,
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ];

  const result = spawnSync(browser, chromeArgs, {
    encoding: 'utf8',
    timeout: 90_000,
  });

  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    /* profil temporaire */
  }

  if (result.error) throw result.error;
  if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size < 1000) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').slice(0, 1200);
    throw new Error(`PDF non généré (${pdfPath}). ${details}`);
  }
}

function safeName(file) {
  return path.basename(file, '.md').replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error(
      '❌ Chrome ou Edge est requis. Installez Chrome/Edge ou définissez CHROME_PATH.',
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_PDF, { recursive: true });
  fs.mkdirSync(OUT_HTML, { recursive: true });

  let ok = 0;
  let failed = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  Introuvable : ${rel}`);
      failed++;
      continue;
    }

    const markdown = fs.readFileSync(file, 'utf8');
    const html = buildHtml(markdown, file);
    const htmlPath = path.join(OUT_HTML, `${safeName(file)}.html`);
    const pdfPath = path.join(OUT_PDF, `SmartCabb_${safeName(file)}.pdf`);

    fs.writeFileSync(htmlPath, html, 'utf8');

    try {
      exportPdf(browser, htmlPath, pdfPath);
      const size = Math.round(fs.statSync(pdfPath).size / 1024);
      console.log(`✅ ${rel} → docs/exports/pdf/${path.basename(pdfPath)} (${size} Ko)`);
      ok++;
    } catch (error) {
      console.error(`❌ ${rel} : ${error.message}`);
      failed++;
    }
  }

  console.log(`\nTerminé : ${ok} PDF généré(s), ${failed} échec(s).`);
  console.log(`Dossier : ${path.relative(ROOT, OUT_PDF)}`);
  if (failed > 0) process.exitCode = 1;
}

main();
