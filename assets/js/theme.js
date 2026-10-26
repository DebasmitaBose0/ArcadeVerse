/**
 * ArcadeVerse Theme Engine
 * Provides dark/light theme switching, system preference detection,
 * and namespaced localStorage persistence.
 */

(() => {
  'use strict';

  const STORAGE_KEY_MODE = 'arcadeverse_theme_mode';
  const STORAGE_KEY_THEME = 'arcadeverse_theme';

  const ICONS = {
    sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-svg"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`,
    moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon-svg"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`
  };

  function getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function getSavedPreference() {
    try {
      const mode = localStorage.getItem(STORAGE_KEY_MODE);
      if (mode === 'light' || mode === 'dark') return mode;

      const legacyTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (legacyTheme === 'light' || legacyTheme === 'dark') return legacyTheme;
    } catch (e) {
      // localStorage may be disabled in restricted environments
    }
    return null;
  }

  function getInitialTheme() {
    const saved = getSavedPreference();
    if (saved) return saved;
    return getSystemPreference();
  }

  let currentTheme = getInitialTheme();

  function applyTheme(theme, persist = true) {
    currentTheme = theme === 'light' ? 'light' : 'dark';

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY_MODE, currentTheme);
        localStorage.setItem(STORAGE_KEY_THEME, currentTheme);
      } catch (e) {}
    }

    const root = document.documentElement;
    root.setAttribute('data-theme-mode', currentTheme);
    root.setAttribute('data-theme', currentTheme);

    if (currentTheme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    }

    updateToggleButtonsUI();

    window.dispatchEvent(new CustomEvent('arcadeverse:theme-change', {
      detail: { theme: currentTheme, isLight: currentTheme === 'light' }
    }));
  }

  function toggleTheme() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
    return next;
  }

  function updateToggleButtonsUI() {
    const isLight = currentTheme === 'light';

    // 1. Desktop / Navbar button
    const desktopBtn = document.getElementById('theme-toggle-btn');
    if (desktopBtn) {
      // Show sun if in dark mode (click to make light), moon if in light mode (click to make dark)
      desktopBtn.innerHTML = isLight ? ICONS.moon : ICONS.sun;
      desktopBtn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      desktopBtn.setAttribute('title', isLight ? 'Theme: Light (Switch to dark)' : 'Theme: Dark (Switch to light)');
      desktopBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      desktopBtn.classList.toggle('is-light', isLight);
    }

    // 2. Mobile drawer button
    const mobileBtn = document.getElementById('mobile-theme-btn');
    if (mobileBtn) {
      const iconSlot = mobileBtn.querySelector('.theme-icon-slot');
      const labelSlot = mobileBtn.querySelector('.theme-label-slot');
      if (iconSlot) iconSlot.innerHTML = isLight ? ICONS.moon : ICONS.sun;
      if (labelSlot) labelSlot.textContent = isLight ? 'Theme: Light' : 'Theme: Dark';
      mobileBtn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      mobileBtn.setAttribute('title', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      mobileBtn.classList.toggle('is-light', isLight);
    }
  }

  function bindControls() {
    const desktopBtn = document.getElementById('theme-toggle-btn');
    if (desktopBtn && !desktopBtn.dataset.bound) {
      desktopBtn.dataset.bound = 'true';
      desktopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    const mobileBtn = document.getElementById('mobile-theme-btn');
    if (mobileBtn && !mobileBtn.dataset.bound) {
      mobileBtn.dataset.bound = 'true';
      mobileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    updateToggleButtonsUI();
  }

  // System color scheme change listener (only updates if user has no saved preference)
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemChange = (e) => {
      const hasSaved = getSavedPreference();
      if (!hasSaved) {
        applyTheme(e.matches ? 'light' : 'dark', false);
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleSystemChange);
    }
  }

  // Early application to document root
  applyTheme(currentTheme, false);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls);
  } else {
    bindControls();
  }

  window.ArcadeTheme = {
    getTheme: () => currentTheme,
    isLight: () => currentTheme === 'light',
    applyTheme,
    toggleTheme
  };
})();
