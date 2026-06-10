import { _electron as electron } from 'playwright'

console.log('launching...')
const app = await electron.launch({ args: ['.'], timeout: 30000 })
console.log('launched, waiting for window...')
const win = await app.firstWindow({ timeout: 30000 })
console.log('window acquired:', await win.title())
const errors = []
win.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
win.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()))
try {
  await win.waitForSelector('nav', { timeout: 15000 })
  console.log('nav rendered')
  await win.getByPlaceholder(/Add a task|添加任务/).first().fill('Electron smoke test task')
  await win.keyboard.press('Enter')
  await win.waitForSelector('text=Electron smoke test task', { timeout: 10000 })
  console.log('task added')
  await win.click('nav >> text=/Kanban|看板/')
  await win.waitForSelector('text=Electron smoke test task', { timeout: 10000 })
  console.log('kanban ok')
  await win.screenshot({ path: '/tmp/torras-shots/e1-electron-kanban.png' })
} catch (e) {
  console.log('FAILED:', e.message.split('\n')[0])
  await win.screenshot({ path: '/tmp/torras-shots/e1-electron-fail.png' }).catch(() => {})
  console.log('page url:', win.url())
}
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none')
await app.close()
