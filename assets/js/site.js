/* ==========================================================================
   Kevin — 个人作品集  站点脚本
   主题切换 + 中英切换。无依赖，无构建。
   --------------------------------------------------------------------------
   注意：主题和语言的「初始应用」不在这里，而在每个页面 <head> 里的内联脚本。
   原因是这个文件用 defer 加载，等它执行时页面已经绘制完一帧 ——
   用户会先看到白底再闪成深色。内联脚本在解析阶段就改 <html> 属性，没有闪烁。
   这里只负责「切换」和「同步按钮状态」。
   ========================================================================== */

(function () {
  'use strict';

  var THEME_KEY = 'portfolio-theme';
  var LANG_KEY = 'portfolio-lang';
  var root = document.documentElement;

  /* ---------- 主题 ---------- */

  function currentTheme() {
    return root.getAttribute('data-theme') || 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 隐私模式 */ }
    syncThemeButton();
  }

  function syncThemeButton() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var dark = currentTheme() === 'dark';
    // 按钮显示「点击后会变成什么」，而不是「当前是什么」—— 后者容易让人误判
    btn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    btn.innerHTML = dark ? SUN_ICON : MOON_ICON;
  }

  var MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  /* ---------- 语言 ---------- */

  function currentLang() {
    return root.getAttribute('data-lang') || 'zh';
  }

  function applyLang(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* 隐私模式 */ }
    syncLangButton();
    // 让 <title> 也跟着切 —— 切了语言但标签页标题还是中文会很割裂
    var t = document.querySelector('title');
    if (t && t.dataset.zh && t.dataset.en) {
      t.textContent = lang === 'zh' ? t.dataset.zh : t.dataset.en;
    }
  }

  function syncLangButton() {
    var btn = document.getElementById('lang-toggle');
    if (!btn) return;
    btn.textContent = currentLang() === 'zh' ? 'EN' : '中';
    btn.setAttribute('aria-label', currentLang() === 'zh' ? 'Switch to English' : '切换到中文');
  }

  /* ---------- 绑定 ---------- */

  function init() {
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      });
    }

    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        applyLang(currentLang() === 'zh' ? 'en' : 'zh');
      });
    }

    syncThemeButton();
    syncLangButton();

    // 演示 iframe 延迟加载：滚动到附近才真正加载，避免首屏同时拉两个大包
    var frames = document.querySelectorAll('iframe[data-src]');
    if (frames.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.src = en.target.getAttribute('data-src');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '600px 0px' });
      frames.forEach(function (f) { io.observe(f); });
    } else {
      frames.forEach(function (f) { f.src = f.getAttribute('data-src'); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
