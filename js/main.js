/* ============================================================
   るくの会｜動物医療の透明性を考える署名サイト
   main.js（ES6）
   機能：
     1. スクロールフェードイン（IntersectionObserver＋控えめなスタガード）
     2. Heroの軽いパララックス（係数はCSS変数 --parallax-factor）
     3. 固定ヘッダーの背景切り替え
     4. スクロールプログレス（極細バー）
     5. ナビ現在地ハイライト
     6. タイムライン縦ラインのドローイン
   ※ すべて演出目的の補助機能。JSが無効でも全コンテンツは閲覧可能
   ============================================================ */

'use strict';

/**
 * ユーザーが「動きを減らす」を設定しているかどうか。
 * true の場合はパララックス等のモーション演出をスキップする（アクセシビリティ配慮）
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * CSS変数から数値を読む（モーションの速度・強度はCSS側で一元管理）
 * @param {string} name - 変数名（例: '--parallax-factor'）
 * @param {number} fallback - 取得できない場合の既定値
 */
const cssNumber = (name, fallback) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
};

/* ------------------------------------------------------------
   1. スクロールフェードイン
   .js-fade が画面に入ったら .is-visible を付与（1回のみ）
------------------------------------------------------------ */
const initFadeIn = () => {
  const targets = document.querySelectorAll('.js-fade');
  if (targets.length === 0) return;

  // 古いブラウザ or 動きを減らす設定：即時表示にフォールバック
  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // 並んで現れる要素のグループ。子の .js-fade に順番を割り振り、
  // 発火時に控えめな時間差（--reveal-stagger）を付ける
  const STAGGER_GROUPS = ['.purpose__list', '.goal__list', '.timeline__list'];
  const staggerMs = cssNumber('--reveal-stagger', 100);

  STAGGER_GROUPS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((group) => {
      group.querySelectorAll('.js-fade').forEach((el, index) => {
        el.dataset.revealIndex = String(index);
      });
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const index = Number(el.dataset.revealIndex || 0);

        if (index > 0) {
          el.style.transitionDelay = `${index * staggerMs}ms`;
          // ホバー等の後続トランジションに遅延が残らないよう、表示後に解除
          const clearDelay = () => { el.style.transitionDelay = ''; };
          el.addEventListener('transitionend', clearDelay, { once: true });
          setTimeout(clearDelay, index * staggerMs + 1600); // transitionend不発時の保険
        }

        el.classList.add('is-visible');
        observer.unobserve(el); // 一度表示したら監視を解除（パフォーマンス配慮）
      });
    },
    {
      rootMargin: '0px 0px -12% 0px', // 画面下部12%手前で発火し、自然なタイミングに
      threshold: 0,
    }
  );

  targets.forEach((el) => observer.observe(el));
};

/* ------------------------------------------------------------
   2. Heroの軽いパララックス
   [data-parallax] をスクロール量の一定割合だけ縦移動させる。
   requestAnimationFrame で間引き、スクロール性能を確保
------------------------------------------------------------ */
const initParallax = () => {
  const target = document.querySelector('[data-parallax]');
  if (!target || prefersReducedMotion) return;

  // 移動量の係数（小さいほど控えめ）。CSS変数 --parallax-factor で調整
  const FACTOR = cssNumber('--parallax-factor', 0.18);
  let ticking = false;

  const update = () => {
    const scrollY = window.scrollY;
    // Heroが画面外に出たら計算不要
    if (scrollY < window.innerHeight * 1.2) {
      target.style.transform = `translateY(${scrollY * FACTOR}px)`;
    }
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
};

/* ------------------------------------------------------------
   3. 固定ヘッダーの背景切り替え
   少しでもスクロールしたら .is-scrolled を付与し、
   透明 → すりガラス風の白背景へ切り替える
------------------------------------------------------------ */
const initHeader = () => {
  const header = document.getElementById('header');
  if (!header) return;

  const THRESHOLD = 40; // 切り替えを開始するスクロール量(px)
  let ticking = false;

  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  update(); // 途中リロード時にも正しい状態で表示
};

/* ------------------------------------------------------------
   4. スクロールプログレス
   極細のバーで読み進みを静かに示す。要素はJSで生成するため
   HTMLには手を入れない。transform のみで更新（再レイアウトなし）
------------------------------------------------------------ */
const initScrollProgress = () => {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };

  const request = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  update();
};

/* ------------------------------------------------------------
   5. ナビ現在地ハイライト
   画面中央付近にあるセクションのナビリンクへ .is-current を付与
------------------------------------------------------------ */
const initNavSpy = () => {
  const links = document.querySelectorAll('.header__link[href^="#"]');
  if (links.length === 0 || !('IntersectionObserver' in window)) return;

  const linkById = new Map();
  links.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (section) linkById.set(id, link);
  });

  const setCurrent = (id) => {
    links.forEach((link) => link.classList.remove('is-current'));
    const current = linkById.get(id);
    if (current) current.classList.add('is-current');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    },
    // 画面の中央帯（上40%〜下45%を除いた範囲）に入ったセクションを現在地とみなす
    { rootMargin: '-40% 0px -45% 0px', threshold: 0 }
  );

  linkById.forEach((_, id) => observer.observe(document.getElementById(id)));
};

/* ------------------------------------------------------------
   6. タイムライン縦ラインのドローイン
   リストが見え始めたら .is-drawn を付与し、CSS側で上から描画
------------------------------------------------------------ */
const initTimelineDraw = () => {
  const list = document.querySelector('.timeline__list');
  if (!list) return;

  // 動きを減らす設定・非対応ブラウザ：即時描画
  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    list.classList.add('is-drawn');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-drawn');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -20% 0px', threshold: 0 }
  );

  observer.observe(list);
};

/* ------------------------------------------------------------
   初期化
------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initFadeIn();
  initParallax();
  initHeader();
  initScrollProgress();
  initNavSpy();
  initTimelineDraw();
});
