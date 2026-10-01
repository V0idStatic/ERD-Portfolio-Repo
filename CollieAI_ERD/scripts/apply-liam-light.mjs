import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(projectDir, 'dist')
const indexPath = join(distDir, 'index.html')
const stylesheet = '<link rel="stylesheet" href="./liam-light.css">'

copyFileSync(join(projectDir, 'scripts', 'liam-light.css'), join(distDir, 'liam-light.css'))
const html = readFileSync(indexPath, 'utf8')
if (!html.includes(stylesheet)) {
  writeFileSync(indexPath, html.replace('</head>', `  ${stylesheet}\n  </head>`))
}
