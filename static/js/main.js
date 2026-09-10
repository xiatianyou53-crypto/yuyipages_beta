/* 校园语意报社 —— 页面交互（菜单 / 轮播 / 滚动渐显 / 导航隐藏） */
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
  });
})();
