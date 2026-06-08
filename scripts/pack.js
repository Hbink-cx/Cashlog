// 企业级 Electron 便携版打包脚本
// 用法：npm run build && node scripts/pack.js

import { execSync } from 'child_process'
import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const release = resolve(root, 'release')
const unpacked = resolve(release, 'win-unpacked')
const appDir = resolve(unpacked, 'resources', 'app')

// 1. 确保 Electron 运行时存在
if (!existsSync(resolve(unpacked, 'electron.exe'))) {
  console.log('⏳ 下载 Electron 运行时（首次需要 ~180MB）...')
  execSync(
    'npx electron-builder --win --x64 --dir -c.win.signAndEditExecutable=false -c.publish=never',
    { cwd: root, stdio: 'inherit', timeout: 300_000 }
  )
}

// 2. 清空并重建 resources/app/
if (existsSync(appDir)) rmSync(appDir, { recursive: true })
mkdirSync(appDir, { recursive: true })

// 3. 复制 dist（前端构建产物）
const distSrc = resolve(root, 'dist')
const distDst = resolve(appDir, 'dist')
cpSync(distSrc, distDst, { recursive: true })

// 4. 复制 electron（主进程 + preload）
const electronSrc = resolve(root, 'electron')
const electronDst = resolve(appDir, 'electron')
cpSync(electronSrc, electronDst, { recursive: true })

// 5. 生成 app/package.json（Electron 运行此目录时读取）
writeFileSync(resolve(appDir, 'package.json'), JSON.stringify({
  name: 'finance-app',
  version: '1.0.0',
  main: 'electron/main.cjs',
  type: 'commonjs',
}, null, 2))

// 6. 验证关键文件
const checks = [
  resolve(appDir, 'electron', 'main.cjs'),
  resolve(appDir, 'electron', 'preload.cjs'),
  resolve(appDir, 'dist', 'index.html'),
]
for (const f of checks) {
  if (!existsSync(f)) {
    console.error(`❌ 缺失文件: ${f}`)
    process.exit(1)
  }
}

console.log('✅ 打包完成')
console.log(`   可执行文件: ${resolve(unpacked, 'electron.exe')}`)
console.log(`   应用目录:   ${appDir}`)
