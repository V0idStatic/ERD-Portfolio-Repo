import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(projectDir, 'dist')
const indexPath = join(distDir, 'index.html')
const stylesheet = '<link rel="stylesheet" href="./liam-light.css">'

if (!existsSync(distDir)) {
  console.error('[ERROR] CollieAI dist directory does not exist.')
  process.exit(1)
}

if (existsSync(indexPath)) {
  copyFileSync(join(projectDir, 'scripts', 'liam-light.css'), join(distDir, 'liam-light.css'))
  let html = readFileSync(indexPath, 'utf8')
  if (!html.includes(stylesheet)) {
    html = html.replace('</head>', `  ${stylesheet}\n  </head>`)
  }
  if (html.includes('<title>Liam ERD</title>')) {
    html = html.replace(
      '<title>Liam ERD</title>',
      '<title>CollieAI ERD - Database Architecture & Schema</title>\n    <meta name="description" content="Interactive Entity-Relationship Diagram (ERD) and PostgreSQL schema design for CollieAI." />\n    <meta name="robots" content="index, follow" />\n    <meta property="og:title" content="CollieAI ERD - Database Architecture & Schema" />\n    <meta property="og:description" content="Interactive Entity-Relationship Diagram (ERD) and PostgreSQL schema design for CollieAI." />'
    )
  }
  writeFileSync(indexPath, html)
  console.log(`[OK] Liam ERD cyan theme applied to ${distDir}`)
}
