/**
 * ArcadeVerse - Interactive Mini-Game Card Hover Quick-Peek Micro-Canvases
 * Issue #1373
 *
 * Lightweight hover micro-canvas animations for game cards. When hovering over
 * a game card for more than 400ms on desktop, replaces the static thumbnail
 * with a lightweight procedural micro-canvas animation depicting core game
 * mechanics.
 *
 * Features:
 * - 6 archetypal procedural micro-animations mapped to game categories
 *   (Action/Shooter, Brick Breaker, Snake/Runner, Puzzle, Maze/Dungeon,
 *   Sports/Racing)
 * - 400ms hover delay before animation starts
 * - cancelAnimationFrame on pointerleave to preserve battery life and CPU
 * - Completely disabled on mobile/touchscreen devices
 * - Respects prefers-reduced-motion (static preview only)
 * - Pure Vanilla JS Web Canvas API; zero external assets or libraries
 *
 * Author: Khushi Shah (@shahkhushi0307) - NSOC Winter Edition 2026
 */

(function () {
  'use strict';

  const HOVER_DELAY_MS = 400;
  const CANVAS_SELECTOR = '.card-micro-preview-canvas';
  const CARD_SELECTOR = '.game-card';

  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    (window.matchMedia && window.matchMedia('(hover: none)').matches);

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Category → animation archetype mapping
  const CATEGORY_ANIMATIONS = {
    action: 'shooter',
    shooter: 'shooter',
    fighting: 'shooter',
    arcade: 'shooter',
    brick: 'brickbreaker',
    breakout: 'brickbreaker',
    pong: 'brickbreaker',
    snake: 'snake',
    runner: 'snake',
    endless: 'snake',
    platform: 'snake',
    puzzle: 'puzzle',
    logic: 'puzzle',
    tetris: 'puzzle',
    fall: 'puzzle',
    match: 'puzzle',
    maze: 'maze',
    dungeon: 'maze',
    roguelike: 'maze',
    adventure: 'maze',
    escape: 'maze',
    sports: 'sports',
    racing: 'sports',
    football: 'sports',
    soccer: 'sports',
    pong2: 'sports'
  };

  const QuickPeek = {
    initialized: false,
    activeTimers: new Map(), // card element → timeout id
    activeAnims: new Map(),  // canvas element → animation frame id

    init() {
      if (this.initialized) return;
      this.initialized = true;

      if (isTouchDevice || prefersReducedMotion) {
        // Disabled on mobile/touch or reduced motion: static preview only
        return;
      }

      this.bindDelegated();
      this.observeCards();
    },

    bindDelegated() {
      // Use delegation so dynamically rendered cards are covered
      document.addEventListener('pointerenter', (e) => {
        const card = e.target.closest(CARD_SELECTOR);
        if (!card) return;
        this.schedulePeek(card);
      }, { passive: true });

      document.addEventListener('pointerleave', (e) => {
        const card = e.target.closest(CARD_SELECTOR);
        if (!card) return;
        this.cancelPeek(card);
      }, { passive: true });
    },

    observeCards() {
      // Re-attach per-card cleanup for cards that already exist
      const cards = document.querySelectorAll(CARD_SELECTOR);
      cards.forEach((card) => {
        card.addEventListener('pointerleave', () => this.cancelPeek(card), { passive: true });
      });
    },

    schedulePeek(card) {
      this.cancelPeek(card);
      const canvas = card.querySelector(CANVAS_SELECTOR);
      if (!canvas) return;

      const timeoutId = setTimeout(() => {
        this.startAnimation(card, canvas);
      }, HOVER_DELAY_MS);

      this.activeTimers.set(card, timeoutId);
    },

    cancelPeek(card) {
      const timerId = this.activeTimers.get(card);
      if (timerId) {
        clearTimeout(timerId);
        this.activeTimers.delete(card);
      }
      const canvas = card.querySelector(CANVAS_SELECTOR);
      if (canvas) this.stopAnimation(canvas);
    },

    startAnimation(card, canvas) {
      // Don't start if already animating
      if (this.activeAnims.has(canvas)) return;

      const category = card.getAttribute('data-category') ||
        card.querySelector('.game-category-tag')?.textContent?.trim()?.toLowerCase() ||
        '';
      const animType = this.resolveAnimType(category);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width || 280;
      const height = canvas.height || 140;
      const start = performance.now();

      card.classList.add('quickpeek-active');

      const loop = (now) => {
        const elapsed = now - start;
        if (elapsed > 4000) {
          // Auto-stop after 4 seconds
          this.stopAnimation(canvas);
          card.classList.remove('quickpeek-active');
          return;
        }

        ctx.clearRect(0, 0, width, height);
        this.drawFrame(ctx, animType, width, height, elapsed);
        const id = requestAnimationFrame(loop);
        this.activeAnims.set(canvas, id);
      };

      const id = requestAnimationFrame(loop);
      this.activeAnims.set(canvas, id);
    },

    stopAnimation(canvas) {
      const id = this.activeAnims.get(canvas);
      if (id) {
        cancelAnimationFrame(id);
        this.activeAnims.delete(canvas);
      }
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      const card = canvas.closest(CARD_SELECTOR);
      if (card) card.classList.remove('quickpeek-active');
    },

    resolveAnimType(category) {
      for (const key of Object.keys(CATEGORY_ANIMATIONS)) {
        if (category.includes(key)) return CATEGORY_ANIMATIONS[key];
      }
      return 'shooter'; // default
    },

    // ---- Procedural Micro-Animation Generators ----

    drawFrame(ctx, type, w, h, t) {
      const seconds = t / 1000;
      switch (type) {
        case 'shooter':
          this.drawShooter(ctx, w, h, seconds);
          break;
        case 'brickbreaker':
          this.drawBrickBreaker(ctx, w, h, seconds);
          break;
        case 'snake':
          this.drawSnake(ctx, w, h, seconds);
          break;
        case 'puzzle':
          this.drawPuzzle(ctx, w, h, seconds);
          break;
        case 'maze':
          this.drawMaze(ctx, w, h, seconds);
          break;
        case 'sports':
          this.drawSports(ctx, w, h, seconds);
          break;
        default:
          this.drawShooter(ctx, w, h, seconds);
      }
    },

    // Action/Shooter: bouncing ball + pulsing enemy block
    drawShooter(ctx, w, h, s) {
      const cx = w / 2 + Math.sin(s * 2) * 40;
      const cy = h / 2 + Math.cos(s * 1.5) * 25;

      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      // Player paddle/ship
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 12, cy - 8, 24, 16);

      // Enemy block pulsing
      const ex = w / 2 + Math.cos(s) * 60;
      const ey = h / 3 + Math.sin(s * 0.8) * 15;
      const pulse = 6 + Math.sin(s * 5) * 4;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(ex - pulse / 2, ey - pulse / 2, pulse, pulse);

      // Projectile dots
      ctx.fillStyle = '#fbbf24';
      for (let i = 0; i < 3; i++) {
        const px = cx + 14 + i * 10;
        const py = cy + Math.sin(s * 10 + i) * 6;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    // Brick Breaker: paddle + bouncing ball + bricks
    drawBrickBreaker(ctx, w, h, s) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      // Bricks row
      ctx.fillStyle = '#a855f7';
      for (let i = 0; i < 5; i++) {
        const bx = 40 + i * 44;
        const by = h / 4;
        const alive = Math.sin(s + i) > -0.5;
        if (alive) ctx.fillRect(bx, by, 36, 12);
      }

      // Paddle
      const px = w / 2 + Math.sin(s * 1.2) * 50;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px - 28, h - 20, 56, 8);

      // Ball
      const bx2 = w / 2 + Math.sin(s * 2.5) * 70;
      const by2 = h / 3 + Math.cos(s * 3) * 20;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(bx2, by2, 5, 0, Math.PI * 2);
      ctx.fill();
    },

    // Snake/Runner: neon worm moving
    drawSnake(ctx, w, h, s) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = w * 0.2 + (w * 0.6 / 20) * i;
        const y = h / 2 + Math.sin(s * 4 + i * 0.5) * 18;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Head dot
      const hx = w * 0.2 + (w * 0.6);
      const hy = h / 2 + Math.sin(s * 4) * 18;
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fill();
    },

    // Puzzle: falling blocks
    drawPuzzle(ctx, w, h, s) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      const colors = ['#f472b6', '#a855f7', '#38bdf8', '#34d399', '#fbbf24'];
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * 40;
        const baseY = h / 4;
        const y = baseY + ((s * 60 + i * 40) % (h + 60)) - 60;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(x, y, 30, 30);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 30, 30);
      }
    },

    // Maze/Dungeon: wandering pixel path
    drawMaze(ctx, w, h, s) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.3);
      ctx.lineTo(w * 0.35, h * 0.3 + Math.sin(s) * 15);
      ctx.lineTo(w * 0.5, h * 0.5 + Math.cos(s * 0.7) * 15);
      ctx.lineTo(w * 0.65, h * 0.45 + Math.sin(s * 1.3) * 15);
      ctx.lineTo(w * 0.85, h * 0.7);
      ctx.stroke();

      // Player eye
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.3 + Math.sin(s) * 15, 4, 0, Math.PI * 2);
      ctx.fill();
    },

    // Sports/Racing: bouncing ball on court
    drawSports(ctx, w, h, s) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      // Court line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Bouncing ball
      const bx = w * 0.2 + (w * 0.6 * ((s * 1.5) % 1));
      const by = h / 2 + Math.abs(Math.sin(s * 6)) * 25;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();

      // Paddles
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(10, h / 2 - 20, 6, 40);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(w - 16, h / 2 - 20, 6, 40);
    }
  };

  window.ArcadeCardQuickPeek = QuickPeek;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => QuickPeek.init());
  } else {
    QuickPeek.init();
  }
})();
