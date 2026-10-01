/**
 * shot.mjs —— 用 Chrome DevTools Protocol 截图
 *
 * 为什么不用 `chrome --headless --screenshot`：
 * 那个方式在页面「加载完成」的瞬间就拍，且不驱动 requestAnimationFrame。
 * 于是任何带入场动画的图表（比如 Recharts 的饼图）都会拍成空白 ——
 * 看起来像 bug，其实只是没等它动完。实测：--virtual-time-budget 开到 12 秒
 * 也照样拍不到，因为虚拟时间不推进 rAF。
 *
 * 这个脚本用真实时间等待，再通过 CDP 抓图，拍到的就是用户真正看到的样子。
 *
 * 用法：
 *   node shot.mjs <url> <输出.png> [宽] [高] [等待毫秒] [截图前执行的JS]
 *   例：node shot.mjs http://localhost:5173/ out.png 1440 900 4000
 *       node shot.mjs http://localhost:8899/ dark.png 1440 900 3000 "localStorage.setItem('portfolio-theme','dark');location.reload()"
 */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

const [, , url, out, wArg, hArg, waitArg, evalArg] = process.argv;
if (!url || !out) {
  console.error('用法: node shot.mjs <url> <输出.png> [宽] [高] [等待毫秒] [截图前执行的JS]');
  process.exit(1);
}

const WIDTH = parseInt(wArg || '1440', 10);
const HEIGHT = parseInt(hArg || '900', 10);
const WAIT = parseInt(waitArg || '3500', 10);
const PORT = 9333;

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const BROWSER = CANDIDATES.find((p) => existsSync(p));
if (!BROWSER) {
  console.error('找不到 Chrome 或 Edge');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const child = spawn(BROWSER, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + (process.env.TEMP || '/tmp') + '\\cdp-shot-profile',
  'about:blank',
], { stdio: 'ignore' });

/** 轮询 CDP 是否就绪，返回 webSocketDebuggerUrl */
async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error('CDP 端口未就绪');
}

let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(method + ' 超时')); }
    }, 30000);
  });
}

try {
  const wsUrl = await waitForTarget();
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  };

  await send('Page.enable');

  // 禁用缓存。这个脚本用的是固定 profile（为了跨次调用保留 localStorage），
  // 于是浏览器会把上一次的页面缓存下来 —— 改了文件重新截图，看到的还是旧版，
  // 而且现象很像「代码没生效」，极容易误诊。实测踩过一次。
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
  });

  await send('Page.navigate', { url });
  await sleep(WAIT);   // ← 真实等待，让 rAF 动画跑完

  // 可选：截图前先跑一段 JS（切主题、切语言、点按钮、走完整表单流程都靠它）
  // awaitPromise: true —— 允许传 async IIFE，脚本里可以 await fetch（比如构造
  // File 上传样例文件）。对非 Promise 的表达式没有副作用。
  if (evalArg) {
    const r = await send('Runtime.evaluate', {
      expression: evalArg, awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) {
      console.error('eval 抛错: ' + JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails));
    } else if (r.result && r.result.value !== undefined) {
      console.error('eval 返回: ' + JSON.stringify(r.result.value));
    }
    await sleep(WAIT);
  }

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('已保存 ' + out);

  // 顺手把控制台错误带出来，方便判断页面是不是真的有问题
  const errs = await send('Runtime.evaluate', {
    expression: `JSON.stringify(window.__shotErrors || [])`,
    returnByValue: true,
  }).catch(() => null);
  if (errs && errs.result && errs.result.value && errs.result.value !== '[]') {
    console.log('页面错误: ' + errs.result.value);
  }
} catch (e) {
  console.error('截图失败: ' + e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* ignore */ }
  child.kill();
}
