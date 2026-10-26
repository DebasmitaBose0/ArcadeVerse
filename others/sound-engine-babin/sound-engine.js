/**
 * ArcadeVerse Procedural Sound Engine
 * Zero-dependency Web Audio API synthesizer for UI micro-interactions
 * Complies with strict isolation rules under sound-engine-babin/
 */

(() => {
  let audioCtx = null;
  const savedPref = localStorage.getItem("arcadeverse_sound_enabled");
  let isSoundEnabled = savedPref === null ? true : savedPref === "true";

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function notifyGameIframe(enabled) {
    const iframe = document.getElementById("game-iframe");
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: "arcadeverse:sound-toggle",
          enabled: enabled,
          muted: !enabled
        }, "*");
      } catch (e) {}
    }
  }

  const SoundEngine = {
    isEnabled: () => isSoundEnabled,

    toggle(forcedState) {
      isSoundEnabled = typeof forcedState === "boolean" ? forcedState : !isSoundEnabled;
      localStorage.setItem("arcadeverse_sound_enabled", isSoundEnabled ? "true" : "false");
      updateToggleButtonUI();
      notifyGameIframe(isSoundEnabled);

      window.dispatchEvent(new CustomEvent("arcadeverse:sound-change", {
        detail: { enabled: isSoundEnabled, muted: !isSoundEnabled }
      }));

      if (isSoundEnabled) {
        SoundEngine.play("coin");
      }
      return isSoundEnabled;
    },

    setMuted(muted) {
      return SoundEngine.toggle(!muted);
    },

    notifyGameIframe,

    play(effectName) {
      if (!isSoundEnabled) return;
      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        switch (effectName) {
          case "hover": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
            break;
          }

          case "click": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
            break;
          }

          case "modalOpen": {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
            break;
          }

          case "coin": {
            // Retro Mario-style 2-tone chime
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
            break;
          }
        }
      } catch (e) {
        // Safe fail
      }
    }
  };

  const SOUND_ICONS = {
    on: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sound-icon-svg"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`,
    muted: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sound-icon-svg"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
  };

  function updateToggleButtonUI() {
    // 1. Desktop Navbar toggle
    const btn = document.getElementById("sound-toggle-btn");
    if (btn) {
      if (isSoundEnabled) {
        btn.classList.add("sound-on");
        btn.setAttribute("title", "Sound Effects: ON (Click to mute)");
        btn.setAttribute("aria-label", "Mute sound effects");
        btn.setAttribute("aria-pressed", "true");
        btn.innerHTML = SOUND_ICONS.on;
      } else {
        btn.classList.remove("sound-on");
        btn.setAttribute("title", "Sound Effects: MUTED (Click to unmute)");
        btn.setAttribute("aria-label", "Unmute sound effects");
        btn.setAttribute("aria-pressed", "false");
        btn.innerHTML = SOUND_ICONS.muted;
      }
    }

    // 2. Modal Topbar toggle
    const modalBtn = document.getElementById("modal-sound-btn");
    if (modalBtn) {
      if (isSoundEnabled) {
        modalBtn.classList.add("sound-on");
        modalBtn.setAttribute("title", "Game Sound: ON (Click to mute)");
        modalBtn.setAttribute("aria-label", "Mute game sound");
        modalBtn.setAttribute("aria-pressed", "true");
        modalBtn.innerHTML = SOUND_ICONS.on;
      } else {
        modalBtn.classList.remove("sound-on");
        modalBtn.setAttribute("title", "Game Sound: MUTED (Click to unmute)");
        modalBtn.setAttribute("aria-label", "Unmute game sound");
        modalBtn.setAttribute("aria-pressed", "false");
        modalBtn.innerHTML = SOUND_ICONS.muted;
      }
    }

    // 3. Mobile Drawer toggle
    const mobileBtn = document.getElementById("mobile-sound-btn");
    if (mobileBtn) {
      const iconSlot = mobileBtn.querySelector(".sound-icon-slot");
      const labelSlot = mobileBtn.querySelector(".sound-label-slot");
      if (iconSlot) iconSlot.innerHTML = isSoundEnabled ? SOUND_ICONS.on : SOUND_ICONS.muted;
      if (labelSlot) labelSlot.textContent = isSoundEnabled ? "Sound: ON" : "Sound: MUTED";
      mobileBtn.setAttribute("aria-label", isSoundEnabled ? "Mute sound effects" : "Unmute sound effects");
      mobileBtn.setAttribute("title", isSoundEnabled ? "Mute sound effects" : "Unmute sound effects");
      mobileBtn.classList.toggle("sound-on", isSoundEnabled);
    }
  }

  function injectSoundToggle() {
    const navActions = document.querySelector(".nav-actions");
    let toggleBtn = document.getElementById("sound-toggle-btn");

    if (!toggleBtn && navActions) {
      toggleBtn = document.createElement("button");
      toggleBtn.id = "sound-toggle-btn";
      toggleBtn.className = "btn btn-icon sound-toggle-btn";
      const mobileBtn = document.getElementById("mobile-menu-btn");
      if (mobileBtn) {
        navActions.insertBefore(toggleBtn, mobileBtn);
      } else {
        navActions.appendChild(toggleBtn);
      }
    }

    if (toggleBtn && !toggleBtn.dataset.bound) {
      toggleBtn.dataset.bound = "true";
      toggleBtn.addEventListener("click", () => SoundEngine.toggle());
    }

    // Modal sound toggle
    const modalBtn = document.getElementById("modal-sound-btn");
    if (modalBtn && !modalBtn.dataset.bound) {
      modalBtn.dataset.bound = "true";
      modalBtn.addEventListener("click", () => SoundEngine.toggle());
    }

    // Mobile sound toggle
    const mobileSoundBtn = document.getElementById("mobile-sound-btn");
    if (mobileSoundBtn && !mobileSoundBtn.dataset.bound) {
      mobileSoundBtn.dataset.bound = "true";
      mobileSoundBtn.addEventListener("click", () => SoundEngine.toggle());
    }

    updateToggleButtonUI();
  }

  function bindMicroInteractions() {
    // Hover micro sounds on buttons, pills, cards
    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest("button, .btn, .pill, .game-card, .tool-portal-card");
      if (target && isSoundEnabled) {
        SoundEngine.play("hover");
      }
    }, { passive: true });

    // Click micro sounds
    document.addEventListener("click", (e) => {
      const target = e.target.closest("button, .btn, .pill, .btn-play-trigger");
      if (target && target.id !== "sound-toggle-btn" && target.id !== "modal-sound-btn" && isSoundEnabled) {
        SoundEngine.play("click");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectSoundToggle();
    bindMicroInteractions();
  });

  window.ArcadeSoundEngine = SoundEngine;
})();
