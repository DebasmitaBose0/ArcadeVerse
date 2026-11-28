/**
 * ArcadeVerse - Keyboard-Only Fast Arcade Navigation & Vim-Style Modal Quick-Jumps
 * Issue #1370
 *
 * Global keyboard listener providing intuitive single-key shortcuts for the
 * game catalog so power users and accessibility enthusiasts can browse and
 * launch games without touching the mouse.
 *
 * Shortcuts (catalog context only - suppressed when typing in form inputs or
 * when an active game iframe is focused):
 *   /               Focus the search input bar
 *   j / k           Navigate up/down through game cards (Vim-style)
 *   ArrowDown/Up    Navigate through game cards with neon focus rings
 *   Enter           Launch the currently highlighted game
 *   f               Toggle favorite on the active/highlighted game
 *   1 - 8           Jump directly between category filters
 *   ?               Open the shortcut cheat-sheet modal
 *
 * Input Context Awareness:
 *   Automatically suppresses all single-key shortcuts when typing inside
 *   form inputs or when an active game iframe/modal is focused, so in-game
 *   keys never conflict.
 *
 * Pure Vanilla JS - no frameworks, no bundlers.
 * Author: Khushi Shah (@shahkhushi0307) - NSOC Winter Edition 2026
 */

(function () {
  'use strict';

  const QUICKJUMP_FOCUS_CLASS = 'quickjump-focus';
  const CATEGORY_PILL_SELECTOR = '.category-pills .pill[data-category]';
  const GAME_CARD_SELECTOR = '.game-card[data-game-id]';
  const GAME_MODAL_SELECTOR = '#game-modal';
  const SHORTCUTS_MODAL_SELECTOR = '#shortcuts-modal';

  const KeyboardQuickjump = {
    focusedIndex: -1,
    initialized: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;

      this.injectStyles();
      this.bindEvents();
    },

    // ---- Context awareness: suppress shortcuts when editing or gaming ----
    isSuppressed(e) {
      const activeEl = document.activeElement;
      if (!activeEl) return true;

      const tag = (activeEl.tagName || '').toLowerCase();
      const isEditing =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(activeEl.isContentEditable) ||
        activeEl.closest('.shortcuts-modal-overlay[aria-hidden="false"], .shortcuts-modal-overlay:not([aria-hidden="true"])');

      if (isEditing) return true;

      // Suppress while a game modal is active so in-game keys never conflict
      const gameModal = document.querySelector(GAME_MODAL_SELECTOR);
      const isGameActive =
        Boolean(gameModal) &&
        (gameModal.classList.contains('active') ||
          gameModal.classList.contains('open') ||
          gameModal.style.display !== 'none');

      if (isGameActive) return true;

      // Suppress while the shortcuts cheatsheet modal is open
      const shortcutsModal = document.querySelector(SHORTCUTS_MODAL_SELECTOR);
      if (shortcutsModal && shortcutsModal.getAttribute('aria-hidden') !== 'true') return true;

      return false;
    },

    // ---- Card collection & highlighting ----
    getCards() {
      return Array.from(document.querySelectorAll(GAME_CARD_SELECTOR));
    },

    clearHighlight() {
      this.getCards().forEach((card) => {
        card.classList.remove(QUICKJUMP_FOCUS_CLASS);
        card.setAttribute('tabindex', '-1');
        card.removeAttribute('aria-current');
      });
      this.focusedIndex = -1;
    },

    highlight(index) {
      const cards = this.getCards();
      if (cards.length === 0) {
        this.focusedIndex = -1;
        return;
      }

      // Wrap around
      let idx = index;
      if (idx < 0) idx = cards.length - 1;
      if (idx >= cards.length) idx = 0;

      this.clearHighlight();
      const card = cards[idx];
      if (!card) return;

      card.classList.add(QUICKJUMP_FOCUS_CLASS);
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-current', 'true');
      card.focus({ preventScroll: true });
      this.focusedIndex = idx;

      this.announce(card);
    },

    navigate(delta) {
      const cards = this.getCards();
      if (cards.length === 0) return;
      const next = this.focusedIndex === -1 ? 0 : this.focusedIndex + delta;
      this.highlight(next);
    },

    announce(card) {
      const announcer = document.getElementById('a11y-announcer');
      if (!card || !announcer) return;
      const title = card.querySelector('.game-card-title');
      const text = title ? `Highlighted ${title.textContent.trim()}` : 'Game highlighted';
      announcer.textContent = text;
    },

    // ---- Actions ----
    launchFocused() {
      const cards = this.getCards();
      if (cards.length === 0 || this.focusedIndex === -1) return;

      const card = cards[this.focusedIndex];
      const gameId = card.getAttribute('data-game-id');
      if (!gameId) return;

      // Prefer the registered ArcadeApp API, fall back to clicking the play trigger
      if (window.ArcadeApp && typeof window.ArcadeApp.openGame === 'function') {
        window.ArcadeApp.openGame(gameId);
        return;
      }

      const playBtn = card.querySelector('.btn-play-trigger') || card.querySelector('button');
      if (playBtn) playBtn.click();
    },

    toggleFavoriteFocused() {
      const cards = this.getCards();
      if (cards.length === 0 || this.focusedIndex === -1) return;

      const card = cards[this.focusedIndex];
      const gameId = card.getAttribute('data-game-id');
      if (!gameId) return;

      if (window.ArcadeFavorites && typeof window.ArcadeFavorites.toggleFavorite === 'function') {
        window.ArcadeFavorites.toggleFavorite(gameId);
        return;
      }

      const favBtn = card.querySelector('.btn-card-favorite');
      if (favBtn) favBtn.click();
    },

    jumpCategory(digit) {
      const pills = Array.from(document.querySelectorAll(CATEGORY_PILL_SELECTOR));
      const idx = digit - 1;
      if (idx < 0 || idx >= pills.length) return;

      const pill = pills[idx];
      pill.click();
    },

    focusSearch() {
      const input = document.getElementById('game-search-input');
      if (input) {
        input.focus();
        input.select();
      }
    },

    // ---- Event binding ----
    bindEvents() {
      document.addEventListener('keydown', (e) => {
        if (this.isSuppressed(e)) return;

        const key = e.key;

        // j / k / ArrowDown / ArrowUp : navigate game cards
        if (key === 'j' || key === 'J' || key === 'ArrowDown') {
          e.preventDefault();
          this.navigate(1);
          return;
        }
        if (key === 'k' || key === 'K' || key === 'ArrowUp') {
          e.preventDefault();
          this.navigate(-1);
          return;
        }

        // Enter : launch highlighted game
        if (key === 'Enter') {
          // Only launch if we have a focused card (avoid firing on form submits)
          if (this.focusedIndex !== -1) {
            e.preventDefault();
            this.launchFocused();
          }
          return;
        }

        // f : toggle favorite on active/highlighted game (catalog context only)
        if (key === 'f' || key === 'F') {
          e.preventDefault();
          this.toggleFavoriteFocused();
          return;
        }

        // 1 - 8 : jump between category filters
        if (/^[1-8]$/.test(key)) {
          e.preventDefault();
          this.jumpCategory(Number(key));
          return;
        }

        // / : focus search input bar
        if (key === '/') {
          e.preventDefault();
          this.focusSearch();
          return;
        }
      });
    },

    injectStyles() {
      if (document.getElementById('keyboard-quickjump-styles')) return;

      const style = document.createElement('style');
      style.id = 'keyboard-quickjump-styles';
      style.textContent = [
        /* High-visibility neon focus ring on the highlighted game card */
        `.game-card.${QUICKJUMP_FOCUS_CLASS} {`,
        '  outline: 3px solid #38bdf8 !important;',
        '  outline-offset: 3px !important;',
        '  box-shadow: 0 0 20px rgba(56, 189, 248, 0.55), 0 0 40px rgba(56, 189, 248, 0.25) !important;',
        '  border-color: #38bdf8 !important;',
        '  z-index: 10 !important;',
        '  transform: translateY(-2px) scale(1.02);',
        '  transition: outline 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;',
        '}',
        `.game-card.${QUICKJUMP_FOCUS_CLASS} .game-card-title { color: #38bdf8 !important; }`,
        /* Light theme adaptation */
        '[data-theme="light"] .game-card.' + QUICKJUMP_FOCUS_CLASS + ' {',
        '  outline-color: #2563eb !important;',
        '  box-shadow: 0 0 20px rgba(37, 99, 235, 0.45), 0 0 40px rgba(37, 99, 235, 0.2) !important;',
        '  border-color: #2563eb !important;',
        '}',
        '[data-theme="light"] .game-card.' + QUICKJUMP_FOCUS_CLASS + ' .game-card-title { color: #2563eb !important; }',
        /* Reduce motion: keep the ring but drop the transform */
        'html.a11y-reduced-motion .game-card.' + QUICKJUMP_FOCUS_CLASS + ' {',
        '  transform: none !important;',
        '  transition: none !important;',
        '}'
      ].join('\n');

      document.head.appendChild(style);
    },

    // Expose focused card for external consumers
    getFocusedGameId() {
      if (this.focusedIndex === -1) return null;
      const card = this.getCards()[this.focusedIndex];
      return card ? card.getAttribute('data-game-id') : null;
    }
  };

  window.ArcadeKeyboardQuickjump = KeyboardQuickjump;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KeyboardQuickjump.init());
  } else {
    KeyboardQuickjump.init();
  }
})();
