/* 语意报社 —— 页面交互（菜单 / 轮播 / 滚动渐显 / 导航隐藏 / 开场动画） */
(function () {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function prefersReduce() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  onReady(function () {
    // ===== 移动端菜单开关 =====
    try {
      var toggle = document.getElementById('navToggle');
      var nav = document.getElementById('mainNav');
      if (toggle && nav) {
        toggle.addEventListener('click', function () {
          var open = nav.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }
    } catch (e) {}

    // ===== 首页轮播 =====
    try {
      var slider = document.getElementById('heroSlider');
      if (slider) {
        var slides = slider.querySelectorAll('.slide');
        var dots = slider.querySelectorAll('.dot');
        var idx = 0;
        var timer = null;

        function go(n) {
          var total = slides.length;
          if (!total) return;
          idx = ((n % total) + total) % total;
          for (var s = 0; s < slides.length; s++) {
            slides[s].classList.toggle('is-active', s === idx);
          }
          for (var d = 0; d < dots.length; d++) {
            dots[d].classList.toggle('is-active', d === idx);
          }
        }

        var prevBtn = slider.querySelector('.slide-btn.prev');
        var nextBtn = slider.querySelector('.slide-btn.next');
        if (prevBtn) { prevBtn.addEventListener('click', function () { go(idx - 1); }); }
        if (nextBtn) { nextBtn.addEventListener('click', function () { go(idx + 1); }); }
        for (var i = 0; i < dots.length; i++) {
          (function (i) { dots[i].addEventListener('click', function () { go(i); }); })(i);
        }

        function stop() { if (timer) { clearInterval(timer); timer = null; } }
        function start() {
          if (prefersReduce()) return;
          stop();
          timer = setInterval(function () { go(idx + 1); }, 6000);
        }
        start();
        slider.addEventListener('mouseenter', stop);
        slider.addEventListener('mouseleave', start);
        slider.addEventListener('focusin', stop);
        slider.addEventListener('focusout', start);
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) { stop(); } else { start(); }
        });
      }
    } catch (e) {}

    // ===== 滚动渐显（错落入场） =====
    try {
      if (!prefersReduce()) {
        var staggered = [
          ['.home-section', 0.05],
          ['.archive-year', 0.05],
          ['.card', 0.06],
          ['.headlines li', 0.07],
          ['.list-item', 0.05]
        ];
        staggered.forEach(function (pair) {
          var els = document.querySelectorAll(pair[0]);
          for (var k = 0; k < els.length; k++) {
            els[k].classList.add('reveal');
            els[k].style.setProperty('--reveal-delay', (Math.min(k, 6) * pair[1]).toFixed(2) + 's');
          }
        });
        ['.prose-card', '.page-head'].forEach(function (sel) {
          var els = document.querySelectorAll(sel);
          for (var j = 0; j < els.length; j++) { els[j].classList.add('reveal'); }
        });

        var targets = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) {
                e.target.classList.add('is-in');
                io.unobserve(e.target);
              }
            });
          }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
          for (var t = 0; t < targets.length; t++) { io.observe(targets[t]); }
        } else {
          for (var u = 0; u < targets.length; u++) { targets[u].classList.add('is-in'); }
        }
      }
    } catch (e) {}

    // ===== 开场动画：Logo 灵动缩放 → 消失 → 背景从中心散去 =====
    try {
      var splash = document.getElementById('splash');
      if (splash && !prefersReduce()) {
        splash.addEventListener('animationend', function (e) {
          if (e.target === splash) {
            splash.remove();
          }
        });
        // 动画完成后移除（兼容不支持 animationend 的情况）
        setTimeout(function () {
          if (splash.parentNode) splash.classList.add('is-done');
        }, 800);
        // 兜底：2s 后强制移除
        setTimeout(function () {
          if (splash.parentNode) splash.remove();
        }, 2000);
      } else if (splash) {
        splash.remove();
      }
    } catch (e) {}

    // ===== 报头实时日期时间（跟随访客本机时间） =====
    try {
      var clock = document.querySelector('[data-live-clock]');
      if (clock) {
        var weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        var renderClock = function () {
          var d = new Date();
          clock.textContent = d.getFullYear() + '年' + pad(d.getMonth() + 1) + '月' + pad(d.getDate()) + '日 '
            + weekdays[d.getDay()] + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
          clock.setAttribute('datetime', d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
            + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()));
        };
        renderClock();
        setInterval(renderClock, 30000);
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) { renderClock(); }
        });
      }
    } catch (e) {}
  });
})();
