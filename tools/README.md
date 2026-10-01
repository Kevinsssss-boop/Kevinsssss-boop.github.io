# tools/

生成 `assets/img/` 里那些截图用的工具。**不参与网站本身的构建**——GitHub Pages
是纯静态托管，这个目录只是跟着仓库走，方便以后重做截图时不用重新造轮子。

## shot.mjs —— 网页截图

```bash
node tools/shot.mjs <url> <输出.png> [宽] [高] [等待毫秒] [截图前执行的JS]

# 例：给本地起的前端拍照
node tools/shot.mjs http://localhost:5173/ out.png 1440 900 4000

# 例：先切深色主题再拍
node tools/shot.mjs http://localhost:5173/ dark.png 1440 900 3000 \
  "localStorage.setItem('portfolio-theme','dark');location.reload()"
```

需要本机装了 Chrome。脚本自己拉起一个 headless Chrome，通过 CDP
（Chrome DevTools Protocol）抓图。

### 为什么不用 `chrome --headless --screenshot`

那个方式有两问题，都会让截图看起来像「页面坏了」：

1. **在页面「加载完成」的瞬间就拍**，不等动画。
2. **不驱动 `requestAnimationFrame`**。Recharts 之类的入场动画全靠 rAF 推进，
   所以拍出来是空白的饼图/柱状图。实测把 `--virtual-time-budget` 开到 12 秒
   也一样——虚拟时间根本不推进 rAF。

这个脚本用**真实时间**等待再抓图，拍到的就是用户真正看到的样子。

> 还有个坑：Chrome 用固定的用户数据目录时会走磁盘缓存，改了文件却拍到旧版。
> 脚本里已经关掉了缓存（`Network.setCacheDisabled`）。

## contract-sample.html / .pdf

一份**完全合成**的英文劳动合同（Example Corp Ltd. / Example Employee，银行账号、
证件号、地址全是占位符），用来给「合同字段提取工具」做截图——真实合同是客户机密，
不能出现在截图里。

PDF 是 HTML 的打印版，重做一条命令：

```bash
chrome --headless --print-to-pdf=contract-sample.pdf contract-sample.html
```
