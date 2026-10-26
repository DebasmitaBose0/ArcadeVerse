/**
 * Synth-Wave Simon Says
 * Pure Vanilla JavaScript + Web Audio API procedural synthesizer memory game
 */

(() => {
  const currentScoreEl = document.getElementById("current-score");
  const gameStatusEl = document.getElementById("game-status");
  const bestScoreEl = document.getElementById("best-score");
  const startBtn = document.getElementById("start-btn");

  const pads = [
    document.getElementById("pad-0"),
    document.getElementById("pad-1"),
    document.getElementById("pad-2"),
    document.getElementById("pad-3")
  ];

  const gameoverModal = document.getElementById("gameover-modal");
  const closeGameoverBtn = document.getElementById("close-gameover-btn");
  const retryBtn = document.getElementById("retry-btn");
  const finalScoreEl = document.getElementById("final-score");
  const finalBestEl = document.getElementById("final-best");

  const rulesBtn = document.getElementById("rules-btn");
  const closeRulesBtn = document.getElementById("close-rules-btn");
  const rulesModal = document.getElementById("rules-modal");

  // Web Audio Synthesizer Engine
  let audioCtx = null;
  let soundEnabled = (() => {
    const val = localStorage.getItem("arcadeverse_sound_enabled");
    return val !== null ? val === "true" : true;
  })();

  window.addEventListener("message", (e) => {
    if (e.data && typeof e.data.enabled === "boolean") {
      soundEnabled = e.data.enabled;
    }
  });

  function isSoundActive() {
    if (!soundEnabled) return false;
    try {
      if (window.parent && window.parent !== window && window.parent.ArcadeSoundEngine) {
        return window.parent.ArcadeSoundEngine.isEnabled();
      }
    } catch (e) {}
    return true;
  }

  const PAD_FREQUENCIES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 harmonic triad
  const FAIL_FREQUENCY = 110.00; // Low buzz on desync

  function playTone(freq, duration = 0.3, type = "sine") {
    if (!isSoundActive()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }

  let sequence = [];
  let playerStep = 0;
  let isPlaying = false;
  let isDisplayingSequence = false;
  let bestScore = parseInt(localStorage.getItem("arcadeverse_synth_simon_best") || "0", 10);

  bestScoreEl.textContent = bestScore;

  function flashPad(index, duration = 300) {
    const pad = pads[index];
    if (!pad) return;

    pad.classList.add("active");
    playTone(PAD_FREQUENCIES[index], duration / 1000, "triangle");

    setTimeout(() => {
      pad.classList.remove("active");
    }, duration);
  }

  function startNextRound() {
    isDisplayingSequence = true;
    playerStep = 0;
    gameStatusEl.textContent = "LISTENING...";
    gameStatusEl.style.color = "#fbbf24";

    // Add random new note to sequence
    const nextIndex = Math.floor(Math.random() * 4);
    sequence.push(nextIndex);

    currentScoreEl.textContent = sequence.length - 1;

    if (sequence.length - 1 > bestScore) {
      bestScore = sequence.length - 1;
      bestScoreEl.textContent = bestScore;
      localStorage.setItem("arcadeverse_synth_simon_best", bestScore);
    }

    // Playback speed acceleration
    const baseSpeed = Math.max(220, 500 - sequence.length * 20);
    const pauseGap = Math.max(120, 200 - sequence.length * 10);

    let i = 0;
    const interval = setInterval(() => {
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => {
          isDisplayingSequence = false;
          gameStatusEl.textContent = "YOUR TURN!";
          gameStatusEl.style.color = "#00f0ff";
        }, pauseGap);
        return;
      }

      flashPad(sequence[i], baseSpeed);
      i++;
    }, baseSpeed + pauseGap);
  }

  function handlePadInput(index) {
    if (!isPlaying || isDisplayingSequence) return;

    flashPad(index, 200);

    if (sequence[playerStep] === index) {
      playerStep++;
      if (playerStep === sequence.length) {
        gameStatusEl.textContent = "CORRECT! ✨";
        gameStatusEl.style.color = "#10b981";
        setTimeout(startNextRound, 750);
      }
    } else {
      // Failed sequence
      gameOver();
    }
  }

  function gameOver() {
    isPlaying = false;
    isDisplayingSequence = false;
    playTone(FAIL_FREQUENCY, 0.6, "sawtooth");

    gameStatusEl.textContent = "FAILED";
    gameStatusEl.style.color = "#f43f5e";

    finalScoreEl.textContent = Math.max(0, sequence.length - 1);
    finalBestEl.textContent = bestScore;

    setTimeout(() => {
      gameoverModal.classList.add("active");
    }, 450);
  }

  function initGame() {
    sequence = [];
    playerStep = 0;
    isPlaying = true;
    currentScoreEl.textContent = "0";
    gameoverModal.classList.remove("active");
    startBtn.textContent = "RESET";
    startNextRound();
  }

  // Click listeners for pads
  pads.forEach((pad, index) => {
    pad.addEventListener("click", () => handlePadInput(index));
  });

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "q" || key === "1" || e.code === "ArrowUp") {
      handlePadInput(0);
    } else if (key === "w" || key === "2" || e.code === "ArrowRight") {
      handlePadInput(1);
    } else if (key === "a" || key === "3" || e.code === "ArrowLeft") {
      handlePadInput(2);
    } else if (key === "s" || key === "4" || e.code === "ArrowDown") {
      handlePadInput(3);
    } else if (e.code === "Space" && !isPlaying) {
      e.preventDefault();
      initGame();
    }
  });

  startBtn.addEventListener("click", initGame);
  retryBtn.addEventListener("click", initGame);
  closeGameoverBtn.addEventListener("click", () => gameoverModal.classList.remove("active"));

  // Modal Handlers
  rulesBtn.addEventListener("click", () => rulesModal.classList.add("active"));
  closeRulesBtn.addEventListener("click", () => rulesModal.classList.remove("active"));
  rulesModal.addEventListener("click", (e) => {
    if (e.target === rulesModal) rulesModal.classList.remove("active");
  });
})();
