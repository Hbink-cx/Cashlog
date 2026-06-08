const { app, BrowserWindow, Menu, shell, protocol, net } = require('electron')
const path = require('path')
const fs = require('fs')

// ── 开发模式检测：设置 ELECTRON_DEV=1 启用 ──
const isDev = process.env.ELECTRON_DEV === '1' || process.argv.includes('--dev')

// ── 注册自定义 app:// 协议（必须在 ready 之前声明） ──
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

// ── 浏览器可导航的 MIME 类型映射 ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.map': 'application/json',
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: '个人理财助手',
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    show: false, // 先隐藏，ready-to-show 后再显示
  })

  // ── 窗口加载完成后才显示 ──
  win.once('ready-to-show', () => {
    win.show()
  })

  // ── 页面加载失败时打开 DevTools 帮助排查 ──
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[main] 页面加载失败: ${errorDescription} (code: ${errorCode}) url: ${validatedURL}`)
  })

  // ── 菜单 ──
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox(win, {
              type: 'info',
              title: '关于 个人理财助手',
              message: '个人理财助手 v1.0.0',
              detail: '一款支持无限级分类的个人收支分析软件。\n数据始终存储在本地，不会上传到任何服务器。\n\n© 2025',
            })
          },
        },
      ],
    },
  ]))

  // ── 外部链接在默认浏览器打开 ──
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // ── 防止页面标题覆盖窗口标题 ──
  win.on('page-title-updated', (e) => e.preventDefault())

  // ── 加载页面 ──
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadURL('app://./index.html')
  }
}

// ── 自定义协议处理器：从 dist/ 目录读取文件 ──
function setupProtocol() {
  const distDir = path.join(__dirname, '..', 'dist')

  protocol.handle('app', (request) => {
    const url = new URL(request.url)
    // 去掉 host（如 `app://./index.html` → pathname = `/index.html`）
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname

    // 安全防护：禁止路径穿越
    const normalized = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')
    const filePath = path.join(distDir, normalized)

    // 确认文件在 distDir 内
    if (!filePath.startsWith(distDir)) {
      return new Response('Forbidden', { status: 403 })
    }

    try {
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const contentType = MIME[ext] || 'application/octet-stream'

      return new Response(data, {
        status: 200,
        headers: {
          'content-type': contentType,
          'cache-control': 'no-cache',
        },
      })
    } catch (err) {
      // SPA fallback：非文件路径返回 index.html
      if (err.code === 'ENOENT' && !path.extname(filePath)) {
        try {
          const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'))
          return new Response(indexHtml, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        } catch {}
      }
      return new Response('Not Found', { status: 404 })
    }
  })
}

// ── 应用生命周期 ──
app.whenReady().then(() => {
  setupProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
