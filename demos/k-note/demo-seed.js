/* ==========================================================================
   K记 在线演示 — 样例数据预置
   --------------------------------------------------------------------------
   为什么需要它：K记 的数据存在 localStorage 里，第一次打开是空账本，
   访客看到一个全是 ¥0.00 的仪表盘，看不出这软件到底能干什么。
   这里在应用启动前写入几个月的模拟账目，让演示「一打开就是活的」。

   三点约束：
   1. 全部为程序生成的虚构数据，不含任何真实消费记录
   2. 只在 localStorage 为空时写入 —— 访客自己记的账不会被覆盖
   3. 用固定种子的伪随机数，保证每次生成的账目一致（演示可复现）
   ========================================================================== */

(function () {
  'use strict';

  var EXPENSES_KEY = 'heima-jizhang-expenses';
  var SETTINGS_KEY = 'heima-jizhang-settings';

  // 已经用过（有数据）就不动，避免覆盖访客自己记的账
  try {
    var existing = localStorage.getItem(EXPENSES_KEY);
    if (existing) {
      var parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) return;
    }
  } catch (e) { /* 解析失败就当作没有，继续生成 */ }

  /* ---------- 固定种子的伪随机数（mulberry32） ---------- */
  var seed = 20260929;
  function rnd() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function between(lo, hi) { return lo + rnd() * (hi - lo); }
  function money(lo, hi) { return Math.round(between(lo, hi) * 100) / 100; }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  // 生成日期字符串 YYYY-MM-DD
  function dayOf(year, month, day) {
    var m = String(month).padStart(2, '0');
    var d = String(day).padStart(2, '0');
    return year + '-' + m + '-' + d;
  }

  var expenses = [];
  var seq = 0;

  function add(date, c1, c2, amount, note) {
    seq += 1;
    expenses.push({
      id: 'demo-' + seq,
      amount: amount,
      category1: c1,
      category2: c2,
      date: date,
      note: note || '',
      createdAt: date + 'T' + String(8 + (seq % 12)).padStart(2, '0') + ':' +
                 String((seq * 7) % 60).padStart(2, '0') + ':00.000Z'
    });
  }

  /* ---------- 逐月生成 ----------
     覆盖 6/7/8/9 四个月。9 月只到 29 日（今天是 9 月 29 日），
     免得出现「未来日期」的账目。                                  */
  var months = [
    { y: 2026, m: 6, days: 30 },
    { y: 2026, m: 7, days: 31 },
    { y: 2026, m: 8, days: 31 },
    { y: 2026, m: 9, days: 29 }
  ];

  months.forEach(function (mo) {
    var d;

    // —— 每月固定支出 ——
    add(dayOf(mo.y, mo.m, 1), '住房', '房租', 850, '合租单间');
    add(dayOf(mo.y, mo.m, 3), '通讯', '手机话费', 39, '校园套餐');
    add(dayOf(mo.y, mo.m, 5), '娱乐', '音乐/视频会员', 15, '');
    add(dayOf(mo.y, mo.m, 8), '住房', '电费', money(45, 95), '');
    add(dayOf(mo.y, mo.m, 8), '住房', '水费', money(12, 28), '');
    add(dayOf(mo.y, mo.m, 10), '通讯', '宽带网费', 30, '');

    // —— 每日三餐 + 通勤 ——
    for (d = 1; d <= mo.days; d++) {
      var date = dayOf(mo.y, mo.m, d);

      // 早餐：约 8 成日子会在食堂吃
      if (rnd() < 0.8) add(date, '餐饮', '早餐', money(4, 12), '');

      // 午餐：几乎每天
      if (rnd() < 0.95) {
        add(date, '餐饮', '午餐', rnd() < 0.75 ? money(11, 22) : money(25, 45),
            rnd() < 0.3 ? '和同学一起吃' : '');
      }

      // 晚餐
      if (rnd() < 0.9) add(date, '餐饮', '晚餐', money(10, 28), '');

      // 饮品咖啡：一周两三次
      if (rnd() < 0.35) add(date, '餐饮', '饮品咖啡', money(9, 26), pick(['', '瑞幸', '奶茶']));

      // 零食小吃
      if (rnd() < 0.25) add(date, '餐饮', '零食小吃', money(5, 22), '');

      // 通勤：有课的日子坐地铁
      if (rnd() < 0.7) add(date, '交通', '公交/地铁', money(2, 9), '');

      // 偶尔打车
      if (rnd() < 0.08) add(date, '交通', '出租车/网约车', money(14, 42), '');
    }

    // —— 每月零散支出 ——
    var i;
    for (i = 0; i < Math.floor(between(2, 5)); i++) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '餐饮', '朋友聚餐', money(48, 160), pick(['宿舍聚餐', '生日请客', '']));
    }
    for (i = 0; i < Math.floor(between(2, 4)); i++) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '购物', '日用百货', money(18, 85), '');
    }
    for (i = 0; i < Math.floor(between(1, 3)); i++) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '教育', '书籍购买', money(28, 95), pick(['专业课教材', '备考资料', '']));
    }
    if (rnd() < 0.7) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '购物', '服装鞋帽', money(85, 320), '');
    }
    if (rnd() < 0.6) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '娱乐', '电影演出', money(35, 88), '');
    }
    if (rnd() < 0.5) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '医疗', '药品购买', money(18, 65), '');
    }
    if (rnd() < 0.45) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '人情往来', '红包/礼金', money(66, 288), '');
    }
    if (rnd() < 0.4) {
      add(dayOf(mo.y, mo.m, 1 + Math.floor(rnd() * mo.days)),
          '通讯', '快递邮寄', money(8, 26), '');
    }
  });

  // 按日期排序，读起来更像真实账本
  expenses.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ monthlyBudget: 2500 }));
  } catch (e) {
    return; // localStorage 不可用（隐私模式等），静默跳过
  }

  /* ---------- 顶部提示条 ----------
     如实说明这是演示数据 —— 不写这一条，访客会以为是我的真实账单。 */
  function showBadge() {
    if (document.getElementById('demo-data-badge')) return;

    var bar = document.createElement('div');
    bar.id = 'demo-data-badge';
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
      'z-index:2147483647', 'display:flex', 'align-items:center', 'gap:12px',
      'padding:9px 16px', 'border-radius:100px',
      'background:rgba(22,24,29,.92)', 'color:#fff',
      'font:500 13px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',
      'box-shadow:0 6px 24px rgba(0,0,0,.28)', 'white-space:nowrap'
    ].join(';');

    var text = document.createElement('span');
    text.textContent = '演示数据 · 可自由试用，记录只存在你的浏览器里';

    var reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = '清空重来';
    reset.style.cssText = [
      'border:1px solid rgba(255,255,255,.35)', 'background:transparent', 'color:#fff',
      'border-radius:100px', 'padding:3px 11px', 'cursor:pointer',
      'font:inherit', 'font-size:12px'
    ].join(';');
    reset.onclick = function () {
      try {
        localStorage.removeItem(EXPENSES_KEY);
        localStorage.removeItem(SETTINGS_KEY);
      } catch (e) { /* ignore */ }
      location.reload();
    };

    bar.appendChild(text);
    bar.appendChild(reset);
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBadge);
  } else {
    showBadge();
  }
})();
