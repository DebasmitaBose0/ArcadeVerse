/**
 * ArcadeVerse Theme Customizer & Retro CRT Scanline Engine
 * Complies with strict isolation rules under theme-customizer-babin/
 */

(() => {
  'use strict';

  const THEMES = {
    "cyan": {
      name: "Cyber Cyan",
      primary: "#00f0ff",
      primaryHover: "#00c8d6",
      secondary: "#3b82f6",
      borderFocus: "#00f0ff",
      glow: "rgba(0, 240, 255, 0.45)",
      rgb: "0, 240, 255",
      light: "#67e8f9",
      orb1: "#00f0ff",
      orb2: "#3b82f6"
    },
    "synthwave": {
      name: "Synthwave Sunset",
      primary: "#f43f5e",
      primaryHover: "#e11d48",
      secondary: "#a855f7",
      borderFocus: "#f43f5e",
      glow: "rgba(244, 63, 94, 0.45)",
      rgb: "244, 63, 94",
      light: "#fda4af",
      orb1: "#f43f5e",
      orb2: "#a855f7"
    },
    "matrix": {
      name: "Matrix Emerald",
      primary: "#10b981",
      primaryHover: "#059669",
      secondary: "#06b6d4",
      borderFocus: "#10b981",
      glow: "rgba(16, 185, 129, 0.45)",
      rgb: "16, 185, 129",
      light: "#6ee7b7",
      orb1: "#10b981",
      orb2: "#059669"
    },
    "amber": {
      name: "Solar Amber",
      primary: "#f59e0b",
      primaryHover: "#d97706",
      secondary: "#ef4444",
      borderFocus: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.45)",
      rgb: "245, 158, 11",
      light: "#fcd34d",
      orb1: "#f59e0b",
      orb2: "#ef4444"
    }
  };

  const savedAccent = localStorage.getItem("arcadeverse_accent_theme");
  let currentTheme = (savedAccent && THEMES[savedAccent]) ? savedAccent : (THEMES[localStorage.getItem("arcadeverse_theme")] ? localStorage.getItem("arcadeverse_theme") : "cyan");
  let isCrtEnabled = localStorage.getItem("arcadeverse_crt_enabled") === "true";

  function applyTheme(themeKey) {
    if (!THEMES[themeKey]) themeKey = "cyan";
    const theme = THEMES[themeKey];
    currentTheme = themeKey;
    localStorage.setItem("arcadeverse_accent_theme", themeKey);

    const root = document.documentElement;
    root.style.setProperty("--accent-primary", theme.primary);
    root.style.setProperty("--accent-primary-hover", theme.primaryHover);
    root.style.setProperty("--accent-secondary", theme.secondary);
    root.style.setProperty("--border-focus", theme.borderFocus);
    root.style.setProperty("--accent-cyan", theme.primary);
    root.style.setProperty("--accent-glow", theme.glow);
    root.style.setProperty("--accent-rgb", theme.rgb);
    root.style.setProperty("--accent-light", theme.light);
    root.style.setProperty("--orb-1-color", theme.orb1);
    root.style.setProperty("--orb-2-color", theme.orb2);
    root.setAttribute("data-accent-theme", themeKey);

    // Only set data-theme to palette key if not in light mode
    if (root.getAttribute("data-theme-mode") !== "light" && root.getAttribute("data-theme") !== "light") {
      root.setAttribute("data-theme", themeKey);
    }

    // Update active swatch state in panel
    document.querySelectorAll(".theme-swatch").forEach(swatch => {
      swatch.classList.toggle("active", swatch.dataset.theme === themeKey);
    });

    // Dispatch global theme change event
    window.dispatchEvent(new CustomEvent("arcadeverse:theme-changed", { detail: { theme: themeKey, data: theme } }));
  }

  function setCrtEffect(enabled) {
    isCrtEnabled = enabled;
    localStorage.setItem("arcadeverse_crt_enabled", enabled);

    let crtOverlay = document.getElementById("crt-screen-overlay");
    if (enabled) {
      if (!crtOverlay) {
        crtOverlay = document.createElement("div");
        crtOverlay.id = "crt-screen-overlay";
        crtOverlay.className = "crt-screen-overlay";
        document.body.appendChild(crtOverlay);
      }
    } else {
      if (crtOverlay) crtOverlay.remove();
    }

    const crtCheckbox = document.getElementById("crt-toggle-input");
    if (crtCheckbox) crtCheckbox.checked = enabled;
  }

  function createThemePanel() {
    const navActions = document.querySelector(".nav-actions");
    if (!navActions || document.getElementById("theme-palette-btn")) return;

    // Navbar palette button
    const themeBtn = document.createElement("button");
    themeBtn.id = "theme-palette-btn";
    themeBtn.className = "btn btn-icon theme-palette-btn";
    themeBtn.setAttribute("title", "Customize Arcade Accent Palette & CRT");
    themeBtn.setAttribute("aria-label", "Customize Accent Palette");
    themeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.996 6.5 17.5 2 12 2z"></path>
      </svg>
    `;

    const mobileBtn = document.getElementById("mobile-menu-btn");
    if (mobileBtn) {
      navActions.insertBefore(themeBtn, mobileBtn);
    } else {
      navActions.appendChild(themeBtn);
    }

    // Flyout Panel
    let panel = document.getElementById("theme-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "theme-panel";
      panel.className = "theme-panel";
      panel.innerHTML = `
        <div class="theme-panel-header">
          <h4>Arcade Theme</h4>
          <button id="close-theme-panel" class="close-panel-btn" aria-label="Close theme panel">&times;</button>
        </div>
        <div class="theme-options">
          <div class="theme-label">NEON ACCENTS</div>
          <div class="theme-swatches">
            <button class="theme-swatch cyan" data-theme="cyan" title="Cyber Cyan"></button>
            <button class="theme-swatch synthwave" data-theme="synthwave" title="Synthwave Sunset"></button>
            <button class="theme-swatch matrix" data-theme="matrix" title="Matrix Emerald"></button>
            <button class="theme-swatch amber" data-theme="amber" title="Solar Amber"></button>
          </div>
        </div>
        <div class="theme-divider"></div>
        <div class="crt-option">
          <label for="crt-toggle-input" class="crt-label">
            <span>Retro CRT Scanlines</span>
            <input type="checkbox" id="crt-toggle-input" class="crt-checkbox">
          </label>
        </div>
      `;
      document.body.appendChild(panel);
    }

    // Toggle event on button
    themeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("open");
    });

    // Close button
    const closeBtn = panel.querySelector("#close-theme-panel");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.remove("open");
      });
    }

    // Swatches selection
    panel.querySelectorAll(".theme-swatch").forEach(swatch => {
      swatch.addEventListener("click", (e) => {
        e.stopPropagation();
        applyTheme(swatch.dataset.theme);
      });
    });

    // CRT Toggle
    const crtCheckbox = panel.querySelector("#crt-toggle-input");
    if (crtCheckbox) {
      crtCheckbox.checked = isCrtEnabled;
      crtCheckbox.addEventListener("change", (e) => {
        setCrtEffect(e.target.checked);
      });
    }

    // Prevent clicks inside panel from closing it
    panel.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Close when clicking outside
    document.addEventListener("click", () => {
      panel.classList.remove("open");
    });
  }

  // Early theme application to avoid flash
  applyTheme(currentTheme);

  // Initialize UI on ready
  function init() {
    createThemePanel();
    applyTheme(currentTheme);
    if (isCrtEnabled) setCrtEffect(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ArcadeThemeCustomizer = {
    applyTheme,
    setCrtEffect,
    getThemes: () => THEMES,
    getCurrentTheme: () => currentTheme
  };
})();
