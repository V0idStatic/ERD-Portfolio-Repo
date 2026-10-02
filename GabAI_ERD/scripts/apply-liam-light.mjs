import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)))
const targetDirNames = ['liam-erd-dist', 'dist']
const targetDirs = targetDirNames.map(d => join(projectDir, d)).filter(existsSync)
const stylesheet = '<link rel="stylesheet" href="./liam-light.css">'

if (targetDirs.length === 0) {
  console.error('[ERROR] Neither liam-erd-dist nor dist directory exists.')
  process.exit(1)
}

for (const dir of targetDirs) {
  const indexPath = join(dir, 'index.html')
  if (existsSync(indexPath)) {
    copyFileSync(join(projectDir, 'scripts', 'liam-light.css'), join(dir, 'liam-light.css'))
    const html = readFileSync(indexPath, 'utf8')
    if (!html.includes(stylesheet)) {
      writeFileSync(indexPath, html.replace('</head>', `  ${stylesheet}\n  </head>`))
    }
    console.log(`[OK] Liam ERD light theme applied to ${dir}`)
  }
}
