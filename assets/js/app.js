/**
 * ArcadeVerse Home Hub Engine
 * Handles live games catalog, in-app modal launcher, and category/search filtering
 */

document.addEventListener("DOMContentLoaded", () => {
  const gamesGrid = document.getElementById("games-grid");
  const totalGamesCount = document.getElementById("total-games-count");
  const totalContributorsCount = document.getElementById("total-contributors-count");
  const searchInput = document.getElementById("game-search-input");
  const categoryPills = document.querySelectorAll(".category-pills .pill");

  // Modal elements
  const gameModal = document.getElementById("game-modal");
  const modalOverlay = document.getElementById("modal-overlay");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalGameTitle = document.getElementById("modal-game-title");
  const modalGameBadge = document.getElementById("modal-game-badge");
  const modalGameAuthor = document.getElementById("modal-game-author");
  const gameIframe = document.getElementById("game-iframe");
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  const newTabBtn = document.getElementById("new-tab-btn");
  const reloadBtn = document.getElementById("reload-btn");
  const modalWindow = document.querySelector(".modal-window");
  const sortSelect = document.getElementById("catalog-sort-select");
  const favoritesCountBadge = document.getElementById("favorites-count-badge");
  const modalFavBtn = document.getElementById("modal-fav-btn");

  let currentCategory = "all";
  let searchQuery = "";
  let currentSort = "featured";
  let lastFocusedElement = null;
  let activeGame = null;

  // Favorites LocalStorage Engine
  const FAVORITES_STORAGE_KEY = "arcadeverse_favorite_games";

  function getFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function saveFavorites(favSet) {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favSet)));
    } catch (e) {
      console.warn("Could not save favorites to localStorage:", e);
    }
    updateFavoritesBadge();
  }

  function isFavorite(gameId) {
    return getFavorites().has(gameId);
  }

  function updateFavoritesBadge() {
    if (favoritesCountBadge) {
      favoritesCountBadge.textContent = getFavorites().size;
    }
  }

  function updateModalFavoriteButton(fav) {
    if (!modalFavBtn) return;
    modalFavBtn.classList.toggle("favorited", fav);
    modalFavBtn.setAttribute("aria-pressed", fav ? "true" : "false");
    modalFavBtn.title = fav ? "Remove from Favorites" : "Save to Favorites";
  }

  function toggleFavorite(gameId) {
    const favs = getFavorites();
    const willBeFav = !favs.has(gameId);
    if (willBeFav) {
      favs.add(gameId);
    } else {
      favs.delete(gameId);
    }
    saveFavorites(favs);

    if (currentCategory === "favorites") {
      renderGames();
    } else {
      const cardBtn = document.querySelector(`.btn-card-favorite[data-id="${gameId}"]`);
      if (cardBtn) {
        cardBtn.classList.toggle("favorited", willBeFav);
        cardBtn.setAttribute("aria-pressed", willBeFav ? "true" : "false");
        cardBtn.title = willBeFav ? "Remove from Favorites" : "Save to Favorites";
      }
    }

    if (activeGame && activeGame.id === gameId) {
      updateModalFavoriteButton(willBeFav);
    }
  }

  // Dynamic Background Plugin Loader for features in others/
  function initBackgroundPlugins() {
    if (typeof FEATURES_REGISTRY === "undefined" || !Array.isArray(FEATURES_REGISTRY)) return;
    FEATURES_REGISTRY.filter((f) => f.type === "background-plugin").forEach((plugin) => {
      if (plugin.css && !document.querySelector(`link[href*="${plugin.css}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = plugin.css;
        document.head.appendChild(link);
      }
      if (plugin.js && !document.querySelector(`script[src*="${plugin.js}"]`)) {
        const script = document.createElement("script");
        script.src = plugin.js;
        script.defer = true;
        document.body.appendChild(script);
      }
    });
  }
  initBackgroundPlugins();

  // Dynamic Tools Pill Injection
  const categoryPillsContainer = document.getElementById("category-pills");
  const standaloneTools = (typeof FEATURES_REGISTRY !== "undefined" && Array.isArray(FEATURES_REGISTRY))
    ? FEATURES_REGISTRY.filter((f) => f.type === "standalone-tool").map((t) => ({ ...t, isTool: true }))
    : [];

  if (categoryPillsContainer && standaloneTools.length > 0 && !document.querySelector('.pill[data-category="tools"]')) {
    const toolsPill = document.createElement("button");
    toolsPill.className = "pill pill-tools";
    toolsPill.setAttribute("data-category", "tools");
    toolsPill.innerHTML = `<span><i data-lucide="wrench" style="width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px;"></i>Arcade Tools</span> <span class="favorites-count-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">${standaloneTools.length}</span>`;
    categoryPillsContainer.appendChild(toolsPill);
    if (window.lucide) {
      lucide.createIcons();
    }
    toolsPill.addEventListener("click", () => {
      document.querySelectorAll(".category-pills .pill").forEach((p) => p.classList.remove("active"));
      toolsPill.classList.add("active");
      currentCategory = "tools";
      renderGames();
    });
  }

  // Update Stats
  if (totalGamesCount) totalGamesCount.textContent = GAMES_REGISTRY.length;
  if (totalContributorsCount) totalContributorsCount.textContent = CONTRIBUTORS_REGISTRY.length;
  updateFavoritesBadge();

  // Render Games
  function renderGames() {
    gamesGrid.innerHTML = "";
    const favs = getFavorites();

    const currentDataSet = (currentCategory === "tools") 
      ? standaloneTools 
      : GAMES_REGISTRY;

    let filtered = currentDataSet.filter((item) => {
      let matchesCategory = false;
      if (currentCategory === "all") {
        matchesCategory = true;
      } else if (currentCategory === "favorites") {
        matchesCategory = favs.has(item.id);
      } else if (currentCategory === "tools") {
        matchesCategory = true;
      } else {
        matchesCategory = item.category.toLowerCase() === currentCategory.toLowerCase();
      }

      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery) ||
        item.author.toLowerCase().includes(searchQuery) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery)));

      return matchesCategory && matchesSearch;
    });

    // Apply Sorting
    filtered.sort((a, b) => {
      if (currentSort === "az") {
        return a.title.localeCompare(b.title);
      } else if (currentSort === "stars") {
        return (b.stars || 0) - (a.stars || 0);
      } else {
        // "featured": featured items first, then by stars
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.stars || 0) - (a.stars || 0);
      }
    });

    // Handle Empty State
    if (filtered.length === 0) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "catalog-empty-state";

      if (currentCategory === "favorites") {
        emptyCard.innerHTML = `
          <div class="empty-state-icon" style="color: #f43f5e;"><i data-lucide="heart-crack"></i></div>
          <h3 class="empty-state-title">No Favorite Games Saved Yet</h3>
          <p class="empty-state-desc">
            You haven't bookmarked any games yet! Click the heart icon on any game card in the catalog to add it to your personal favorites collection.
          </p>
          <div class="empty-state-actions">
            <button class="btn btn-primary btn-sm" id="reset-filter-btn">
              <span><i data-lucide="gamepad-2"></i> Browse All Games</span>
            </button>
          </div>
        `;
      } else {
        emptyCard.innerHTML = `
          <div class="empty-state-icon"><i data-lucide="gamepad-2"></i></div>
          <h3 class="empty-state-title"></h3>
          <p class="empty-state-desc">
            Be the pioneer contributor! Build the first game for this category under <code>games/&lt;game-name&gt;_&lt;your-name&gt;/</code> and claim your spot on the leaderboard.
          </p>
          <div class="empty-state-actions">
            <a href="https://github.com/DebasmitaBose0/ArcadeVerse/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
              <span><i data-lucide="rocket"></i> Build a Game for This Category</span>
            </a>
            <button class="btn btn-secondary btn-sm" id="reset-filter-btn">
              <span><i data-lucide="rotate-ccw"></i> Clear Filters</span>
            </button>
          </div>
        `;
      }

      // Category and search text come from the user, so set them as text, not markup.
      const emptyTitle = emptyCard.querySelector(".empty-state-title");
      if (currentCategory !== "favorites") {
        emptyTitle.textContent = `No games found in "${currentCategory !== "all" ? currentCategory : searchQuery}"`;
      }

      emptyCard.querySelector("#reset-filter-btn").addEventListener("click", () => {
        searchQuery = "";
        currentCategory = "all";
        if (searchInput) searchInput.value = "";
        categoryPills.forEach((p) => p.classList.remove("active"));
        const allPill = document.querySelector('.category-pills .pill[data-category="all"]');
        if (allPill) allPill.classList.add("active");
        renderGames();
      });

      gamesGrid.appendChild(emptyCard);
      if (window.lucide) lucide.createIcons();
      return;
    }

    filtered.forEach((game) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.setAttribute("data-game-id", game.id);
      const isTool = Boolean(game.isTool);
      const iconName = game.lucideIcon || (isTool ? "tool" : "gamepad-2");
      const iconHtml = `<i data-lucide="${iconName}"></i>`;
      const favorited = favs.has(game.id);
      const actionText = isTool ? 'Launch Tool <i data-lucide="external-link" style="width: 13px; height: 13px; vertical-align: middle; margin-left: 2px;"></i>' : 'Play Now <i data-lucide="play" style="width: 13px; height: 13px; vertical-align: middle; margin-left: 2px;"></i>';

      card.innerHTML = `
        <div class="game-card-preview">
          <span class="game-category-tag ${isTool ? 'tool-tag' : ''}">${game.category}</span>
          <button class="btn-card-favorite ${favorited ? "favorited" : ""}" data-id="${game.id}" aria-label="${favorited ? "Remove from Favorites" : "Save to Favorites"}" aria-pressed="${favorited ? "true" : "false"}" title="${favorited ? "Remove from Favorites" : "Save to Favorites"}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fav-heart-icon">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
          <div class="game-icon">${iconHtml}</div>
        </div>
        <div class="game-card-body">
          <h3 class="game-card-title">${game.title}</h3>
          <p class="game-card-desc">${game.description}</p>
          <div class="game-card-footer">
            <div class="contributor-meta">
              <div class="contributor-avatar">${game.author.charAt(0).toUpperCase()}</div>
              <div class="contributor-name">
                Dev: <strong>${game.author}</strong>
              </div>
            </div>
            <button class="btn-play-trigger" data-id="${game.id}">${actionText}</button>
          </div>
        </div>
      `;

      const favBtn = card.querySelector(".btn-card-favorite");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(game.id);
      });

      const playBtn = card.querySelector(".btn-play-trigger");
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openGameModal(game, playBtn);
      });

      card.addEventListener("click", () => openGameModal(game, card));
      gamesGrid.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Modal Handlers
  function openGameModal(game, triggerElement = null) {
    activeGame = game;
    lastFocusedElement = triggerElement || document.activeElement;
    modalGameTitle.textContent = game.title;
    modalGameBadge.textContent = game.category;
    modalGameAuthor.textContent = `Built by @${game.author}`;
    gameIframe.src = game.path;
    newTabBtn.href = game.path;

    gameIframe.onload = () => {
      const isSoundEnabled = window.ArcadeSoundEngine ? window.ArcadeSoundEngine.isEnabled() : (localStorage.getItem("arcadeverse_sound_enabled") !== "false");
      try {
        gameIframe.contentWindow.postMessage({
          type: "arcadeverse:sound-toggle",
          enabled: isSoundEnabled,
          muted: !isSoundEnabled
        }, "*");
      } catch (e) {}
    };

    updateModalFavoriteButton(isFavorite(game.id));

    // Record game play in Recently Played drawer
    if (window.ArcadeRecent && typeof window.ArcadeRecent.recordPlayed === "function") {
      window.ArcadeRecent.recordPlayed(game.id, game.title, game.category);
    }
    window.dispatchEvent(new CustomEvent("arcadeverse:game-launched", { detail: game }));

    gameModal.classList.add("active");
    gameModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeModalBtn.focus();
  }

  // Expose global helper to open game modal from plugins, search, or recent drawer
  window.ArcadeApp = {
    openGame: (gameId) => {
      const game = GAMES_REGISTRY.find((g) => g.id === gameId);
      if (game) {
        openGameModal(game);
        return true;
      }
      return false;
    }
  };

  function closeGameModal() {
    activeGame = null;
    gameModal.classList.remove("active");
    gameModal.setAttribute("aria-hidden", "true");
    gameIframe.src = "";
    document.body.style.overflow = "auto";
    modalWindow.classList.remove("fullscreen");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  closeModalBtn.addEventListener("click", closeGameModal);
  modalOverlay.addEventListener("click", closeGameModal);

  const modalSoundBtn = document.getElementById("modal-sound-btn");
  if (modalSoundBtn) {
    modalSoundBtn.addEventListener("click", () => {
      if (window.ArcadeSoundEngine) {
        window.ArcadeSoundEngine.toggle();
      }
    });
  }

  if (modalFavBtn) {
    modalFavBtn.addEventListener("click", () => {
      if (activeGame) {
        toggleFavorite(activeGame.id);
      }
    });
  }

  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      if (gameIframe.src) {
        const currentSrc = gameIframe.src;
        gameIframe.src = "";
        setTimeout(() => {
          gameIframe.src = currentSrc;
        }, 50);
      }
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && gameModal.classList.contains("active")) {
      closeGameModal();
    }
  });

  fullscreenBtn.addEventListener("click", () => {
    modalWindow.classList.toggle("fullscreen");
  });

  // Sort Selector Change
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderGames();
    });
  }

  // Filter Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderGames();
  });

  categoryPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      categoryPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentCategory = pill.getAttribute("data-category");
      renderGames();
    });
  });

  // Initial render
  renderGames();
});
