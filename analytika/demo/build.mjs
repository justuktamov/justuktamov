// Brauzer demosini bitta HTML faylga yig'adi: node demo/build.mjs [chiqish.html]
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = process.argv[2] || here('../dist/demo.html');
const result = await build({
  entryPoints: [here('./main.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2020',
  alias: { 'node:sqlite': here('./fake-sqlite.js'), 'node:fs': here('./stubs.js'), 'node:path': here('./stubs.js') },
  banner: { js: 'var process={env:{DB_PATH:":memory:"}};' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile(here('../public/app.css'), 'utf8');
const html = `<title>Loyihalar analitikasi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
<div id="app"><div class="boot">Yuklanmoqda…</div></div>
<div id="toast" role="status" aria-live="polite"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script>${js}</script>
`;
await import('node:fs').then((fs) => fs.mkdirSync(fileURLToPath(new URL('.', `file://${out}`)), { recursive: true }));
await writeFile(out, html);
console.log(`Demo: ${out} (${(html.length / 1024).toFixed(0)} KB)`);
