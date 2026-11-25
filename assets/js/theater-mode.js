/**
 * ArcadeVerse - Fullscreen Arcade Theater Immersion Mode
 * Issue #1375
 *
 * Adds an "Arcade Theater Mode" toggle button to the game modal header.
 * When activated, dims the entire browser viewport behind the game to 96%
 * deep black opacity with a soft CSS backdrop blur, and casts an authentic
 * radial spotlight gradient centered on the active game canvas simulating
 * the overhead marquee light of an arcade cabinet.
 *
 * Features:
 * - Theater toggle button in game modal header
 * - Dims viewport to 96% deep black with backdrop-filter blur(16px)
 * - Radial spotlight centered on active game canvas
 * - T key quick-toggle; Escape exits theater mode; modal close exits theater mode
 * - Persistent setting in localStorage (`av_theater_mode`)
 * - Pure Vanilla JS; zero external assets
 *
 * Author: Khushi Shah (@shahkhushi0307) - NSOC Winter Edition 2026
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'av_theater_mode';
  const THEATER_CLASS = 'theater-active';
  const SPOTLIGHT_CLASS = 'theater-spotlight';

  const TheaterMode = {
    enabled: false,
    initialized: false,
    overlay: null,
    spotlight: null,
    toggleBtn: null,
    rafId: null,

    // Lazily creates the theater overlay and spotlight elements
    ensureElements() {
      if (this.overlay) return;

      this.overlay = document.createElement('div');
      this.overlay.id = 'theater-overlay';
      this.overlay.setAttribute('aria-hidden', 'true');
      this.overlay.setAttribute('role', 'presentation');

      this.spotlight = document.createElement('div');
      this.spotlight.className = SPOTLIGHT_CLASS;
      this.spotlight.setAttribute('aria-hidden', 'true');

      this.overlay.appendChild(this.spotlight);
      document.body.appendChild(this.overlay);

      // Restore persisted preference
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        this.enabled = saved === 'true';
      } catch (_) {
        this.enabled = false;
      }
    },

    // Positions the spotlight at the center of the active game canvas (iframe)
    updateSpotlight() {
      if (!this.overlay || !this.enabled) return;

      const iframe = document.getElementById('game-iframe');
      const frameWrapper = document.querySelector('.modal-frame-wrapper');
      const target = iframe || frameWrapper;

      if (target) {
        const rect = target.getBoundingClientRect();
        const x = ((rect.left + rect.right) / 2 / window.innerWidth) * 100;
        const y = ((rect.top + rect.bottom) / 2 / window.innerHeight) * 100;
        this.overlay.style.setProperty('--spot-x', x + '%');
        this.overlay.style.setProperty('--spot-y', y + '%');
      }

      // Throttled re-center on resize/scroll
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.updateSpotlight();
      });
    },

    activate() {
      if (this.enabled) return;
      this.enabled = true;
      this.persist();
      this.applyUI();
      this.updateSpotlight();
      this.announce('Theater immersion mode activated');
      window.addEventListener('resize', () => this.updateSpotlight());
      window.addEventListener('scroll', () => this.updateSpotlight(), { passive: true });
    },

    deactivate() {
      if (!this.enabled) return;
      this.enabled = false;
      this.persist();
      this.applyUI();
      this.announce('Theater immersion mode deactivated');
      window.removeEventListener('resize', () => this.updateSpotlight());
      window.removeEventListener('scroll', () => this.updateSpotlight());
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },

    toggle() {
      if (this.enabled) this.deactivate(); else this.activate();
    },

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, this.enabled ? 'true' : 'false');
      } catch (_) {}
    },

    applyUI() {
      if (this.overlay) {
        this.overlay.classList.toggle(THEATER_CLASS, this.enabled);
        this.overlay.setAttribute('aria-hidden', this.enabled ? 'false' : 'true');
      }
      if (this.toggleBtn) {
        this.toggleBtn.classList.toggle('theater-active', this.enabled);
        this.toggleBtn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
        this.toggleBtn.setAttribute('title', this.enabled ? 'Exit Theater Mode (T)' : 'Enter Theater Mode (T)');
      }
    },

    announce(text) {
      const announcer = document.getElementById('a11y-announcer');
      if (announcer) {
        announcer.textContent = text;
      }
    },

    // Injects the theater toggle button into the modal header controls
    injectButton() {
      if (this.toggleBtn) return;
      const controls = document.querySelector('.modal-controls');
      if (!controls) return;

      // Reuse statically-authored button if present (avoids duplicates)
      const staticBtn = document.getElementById('modal-theater-btn');
      if (staticBtn) {
        this.toggleBtn = staticBtn;
        this.toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        });
        this.applyUI();
        return;
      }

      this.toggleBtn = document.createElement('button');
      this.toggleBtn.type = 'button';
      this.toggleBtn.className = 'btn btn-sm btn-icon theater-mode-btn';
      this.toggleBtn.setAttribute('aria-label', 'Enter Theater Mode (T)');
      this.toggleBtn.setAttribute('title', 'Enter Theater Mode (T)');
      this.toggleBtn.setAttribute('aria-pressed', 'false');
      this.toggleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M1 2h6l4 4v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4z"></path>
          <path d="M13 2h6l4 4v6a2 2 0 0 1-2 2h-6z"></path>
        </svg>
      `;

      // Insert before the fullscreen button if present, else append
      const fullscreenBtn = document.getElementById('fullscreen-btn');
      if (fullscreenBtn && controls.contains(fullscreenBtn)) {
        controls.insertBefore(this.toggleBtn, fullscreenBtn);
      } else {
        controls.appendChild(this.toggleBtn);
      }

      this.toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });

      // Apply current state to button
      this.applyUI();
    },

    bindGlobalEvents() {
      // T key quick-toggle when modal is active
      document.addEventListener('keydown', (e) => {
        const gameModal = document.getElementById('game-modal');
        const isModalActive = Boolean(gameModal) && (gameModal.classList.contains('active') || gameModal.classList.contains('open'));
        if (!isModalActive) return;

        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        }

        // Escape exits theater mode (modal close is handled separately)
        if (e.key === 'Escape' && this.enabled) {
          // Only exit theater if not also closing the modal; let modal close handler do full cleanup
          this.deactivate();
        }
      });

      // Auto-activate on game launch if persisted preference is on
      window.addEventListener('arcadeverse:game-launched', () => {
        this.ensureElements();
        if (this.enabled) {
          this.activate();
        }
        this.injectButton();
      });

      // Deactivate theater mode on modal close
      window.addEventListener('arcadeverse:game-closed', () => {
        if (this.enabled) {
          this.deactivate();
        }
      });
    },

    init() {
      if (this.initialized) return;
      this.initialized = true;

      this.ensureElements();
      this.bindGlobalEvents();

      // Inject button once modal DOM exists (delegated; retries on launch)
      if (document.querySelector('.modal-controls')) {
        this.injectButton();
      }
    }
  };

  window.ArcadeTheaterMode = TheaterMode;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TheaterMode.init());
  } else {
    TheaterMode.init();
  }
})();
