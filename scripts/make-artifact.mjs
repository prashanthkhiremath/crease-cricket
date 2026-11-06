// Turns the single-file build (dist/index.html) into dist/artifact.html: the page body
// without the document skeleton, which the artifact host adds itself.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const keepHead = head
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
writeFileSync('dist/artifact.html', keepHead.trim() + '\n' + body.trim() + '\n');
console.log('wrote dist/artifact.html');
