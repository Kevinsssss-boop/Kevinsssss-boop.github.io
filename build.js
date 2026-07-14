// build.js — 将 src/ 下的模块拼接为 index.html（零依赖 Node.js 脚本）
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// 1. 读取 HTML 模板
const template = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');

// 2. 按文件名排序拼接 CSS
const cssDir = path.join(SRC, 'css');
const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).sort();
const css = cssFiles.map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');

// 3. 按文件名排序拼接 JS
const jsDir = path.join(SRC, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => {
  return '\n// === ' + f + ' ===\n' + fs.readFileSync(path.join(jsDir, f), 'utf8');
}).join('\n') + '\ntry { init(); } catch (e) { document.getElementById("error-overlay").style.display = "flex"; document.getElementById("error-msg").textContent = "Init Error: " + e.message + "\\n" + (e.stack || "").split("\\n").slice(0, 4).join("\\n"); console.error(e); }\n';

// 4. 注入模板并写入
const output = template.replace('{{CSS}}', css).replace('{{JS}}', js);
fs.writeFileSync(path.join(ROOT, 'index.html'), output);

const kb = (output.length / 1024).toFixed(0);
console.log('Built index.html (' + kb + ' KB)');
console.log('  CSS: ' + cssFiles.length + ' files');
console.log('  JS:  ' + jsFiles.length + ' files');
