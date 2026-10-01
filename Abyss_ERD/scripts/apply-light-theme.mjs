// Reapply the local light theme after each Liam CLI build.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const htmlUrl = new URL('../dist/index.html', import.meta.url);
const cssUrl = new URL('../dist/light-theme.css', import.meta.url);
const sourceUrl = new URL('./light-theme.css', import.meta.url);
const tag = '    <link rel="stylesheet" href="./light-theme.css" />';

let html = readFileSync(htmlUrl, 'utf8');
if (!html.includes(tag)) {
  html = html.replace('  </head>', `${tag}\n  </head>`);
  writeFileSync(htmlUrl, html);
}
copyFileSync(sourceUrl, cssUrl);
console.log('ERD: light theme applied.');
