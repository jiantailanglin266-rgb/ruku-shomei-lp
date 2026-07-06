/* ============================================================
   るくの会｜動物医療の透明性を考える署名サイト
   main.js（ES6）
   機能：
     1. スクロールフェードイン（IntersectionObserver）
     2. Heroの軽いパララックス
     3. 固定ヘッダーの背景切り替え
   ※ すべて演出目的の補助機能。JSが無効でも全コンテンツは閲覧可能
   ============================================================ */

'use strict';

/**
 * ユーザーが「動きを減らす」を設定しているかどうか。
 * true の場合はパララックス等のモーション演出をスキップする（アクセシビリティ配慮）
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // 一度表示したら監視を解除（パフォーマンス配慮）
        }
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

  const FACTOR = 0.25; // 移動量の係数（小さいほど控えめ）
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
   初期化
------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initFadeIn();
  initParallax();
  initHeader();
});
