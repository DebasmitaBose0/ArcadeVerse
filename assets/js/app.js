/**
 * ArcadeVerse Home Hub Engine
 * Handles live games catalog, in-app modal launcher, and category/search filtering
 */

document.addEventListener("DOMContentLoaded", () => {
  const gamesGrid = document.getElementById("games-grid");
  const totalGamesCount = document.getElementById("total-games-count");
  const totalContributorsCount = document.getElementById("total-contributors-count");
  const searchInput = document.getElementById("game-search-input");
  const searchClearBtn = document.getElementById("search-clear-btn");
  const tagSelect = document.getElementById("catalog-tag-select");
  const clearAllBtn = document.getElementById("clear-all-filters-btn");
  const categoryPills = document.querySelectorAll(".category-pills .pill");
  const catalogCountNum = document.getElementById("catalog-count-num");
  const catalogLiveCount = document.getElementById("catalog-live-count");

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
  let currentTag = "all";
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
    const count = getFavorites().size;
    if (favoritesCountBadge) {
      favoritesCountBadge.textContent = count;
    }
    const mobileFavCount = document.getElementById("mobile-fav-count");
    if (mobileFavCount) {
      mobileFavCount.textContent = count;
    }
  }

  function updateModalFavoriteButton(fav) {
    if (!modalFavBtn) return;
    modalFavBtn.classList.toggle("favorited", fav);
    modalFavBtn.setAttribute("aria-pressed", fav ? "true" : "false");
    const label = fav ? "Remove from Favorites" : "Save to Favorites";
    modalFavBtn.title = label;
    modalFavBtn.setAttribute("aria-label", label);
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
        const label = willBeFav ? "Remove from Favorites" : "Save to Favorites";
        cardBtn.title = label;
        cardBtn.setAttribute("aria-label", label);
      }
    }

    if (activeGame && activeGame.id === gameId) {
      updateModalFavoriteButton(willBeFav);
    }

    window.dispatchEvent(new CustomEvent("arcadeverse:favorites-updated", {
      detail: { gameId, isFavorite: willBeFav, totalCount: favs.size }
    }));
  }

  // Cross-tab real-time favorites synchronization
  window.addEventListener("storage", (e) => {
    if (e.key === FAVORITES_STORAGE_KEY) {
      updateFavoritesBadge();
      if (currentCategory === "favorites") {
        renderGames();
      } else {
        const favs = getFavorites();
        document.querySelectorAll(".btn-card-favorite").forEach((btn) => {
          const id = btn.getAttribute("data-id");
          const isFav = favs.has(id);
          btn.classList.toggle("favorited", isFav);
          btn.setAttribute("aria-pressed", isFav ? "true" : "false");
          const label = isFav ? "Remove from Favorites" : "Save to Favorites";
          btn.title = label;
          btn.setAttribute("aria-label", label);
        });
      }
      if (activeGame) {
        updateModalFavoriteButton(isFavorite(activeGame.id));
      }
    }
  });

  // Populate dynamic Tag filter from existing game metadata
  function populateTagSelect() {
    if (!tagSelect) return;
    const tagCounts = new Map();
    GAMES_REGISTRY.forEach((game) => {
      if (Array.isArray(game.tags)) {
        game.tags.forEach((t) => {
          const clean = t.trim();
          if (clean && clean.toUpperCase() !== "NSOC26") {
            tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
          }
        });
      }
    });

    const sortedTags = Array.from(tagCounts.keys()).sort((a, b) => a.localeCompare(b));
    tagSelect.innerHTML = '<option value="all">All Tags</option>';
    sortedTags.forEach((tag) => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = `#${tag} (${tagCounts.get(tag)})`;
      tagSelect.appendChild(opt);
    });
  }
  populateTagSelect();

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
    toolsPill.setAttribute("role", "tab");
    toolsPill.setAttribute("aria-selected", "false");
    toolsPill.innerHTML = `<span><i data-lucide="wrench" style="width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px;"></i>Arcade Tools</span> <span class="favorites-count-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">${standaloneTools.length}</span>`;
    categoryPillsContainer.appendChild(toolsPill);
    if (window.lucide) {
      lucide.createIcons();
    }
    toolsPill.addEventListener("click", () => {
      document.querySelectorAll(".category-pills .pill").forEach((p) => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      toolsPill.classList.add("active");
      toolsPill.setAttribute("aria-selected", "true");
      currentCategory = "tools";
      updateFilterControlsState();
      renderGames();
    });
  }

  // Update Stats
  if (totalGamesCount) totalGamesCount.textContent = GAMES_REGISTRY.length;
  if (totalContributorsCount) totalContributorsCount.textContent = CONTRIBUTORS_REGISTRY.length;
  updateFavoritesBadge();

  // Synchronize Filter UI States
  function updateFilterControlsState() {
    const hasSearch = searchQuery.length > 0;
    const hasActiveFilter = hasSearch || currentCategory !== "all" || currentTag !== "all";

    if (searchClearBtn) {
      searchClearBtn.style.display = hasSearch ? "inline-flex" : "none";
    }
    if (clearAllBtn) {
      clearAllBtn.style.display = hasActiveFilter ? "inline-flex" : "none";
    }
    if (tagSelect && tagSelect.value !== currentTag) {
      tagSelect.value = currentTag;
    }
  }

  function resetAllFilters() {
    searchQuery = "";
    currentCategory = "all";
    currentTag = "all";
    if (searchInput) searchInput.value = "";
    if (tagSelect) tagSelect.value = "all";

    const allPills = document.querySelectorAll(".category-pills .pill");
    allPills.forEach((p) => {
      const isAll = p.getAttribute("data-category") === "all";
      p.classList.toggle("active", isAll);
      p.setAttribute("aria-selected", isAll ? "true" : "false");
    });

    updateFilterControlsState();
    renderGames();
    if (searchInput) searchInput.focus();
  }

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
        matchesCategory = Boolean(item.category && item.category.toLowerCase() === currentCategory.toLowerCase());
      }

      let matchesTag = false;
      if (currentTag === "all") {
        matchesTag = true;
      } else {
        matchesTag = Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase() === currentTag.toLowerCase());
      }

      let matchesSearch = true;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const titleMatch = Boolean(item.title && item.title.toLowerCase().includes(q));
        const descMatch = Boolean(item.description && item.description.toLowerCase().includes(q));
        const authorMatch = Boolean(item.author && item.author.toLowerCase().includes(q));
        const catMatch = Boolean(item.category && item.category.toLowerCase().includes(q));
        const tagMatch = Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes(q));
        matchesSearch = titleMatch || descMatch || authorMatch || catMatch || tagMatch;
      }

      return matchesCategory && matchesTag && matchesSearch;
    });

    // Update Live Count
    if (catalogCountNum) {
      catalogCountNum.textContent = filtered.length;
    }
    if (catalogLiveCount) {
      if (filtered.length === currentDataSet.length) {
        catalogLiveCount.innerHTML = `Showing all <strong>${filtered.length}</strong> games`;
      } else {
        catalogLiveCount.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${currentDataSet.length}</strong> games`;
      }
    }

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

      if (currentCategory === "favorites" && favs.size === 0) {
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
      } else if (searchQuery) {
        emptyCard.innerHTML = `
          <div class="empty-state-icon" style="color: #60a5fa;"><i data-lucide="search-x"></i></div>
          <h3 class="empty-state-title"></h3>
          <p class="empty-state-desc">
            No games match your search query. Try checking for typos, using broader terms, or clearing active filters.
          </p>
          <div class="empty-state-actions">
            <button class="btn btn-primary btn-sm" id="reset-filter-btn">
              <span><i data-lucide="rotate-ccw"></i> Clear Search & Filters</span>
            </button>
            <a href="https://github.com/DebasmitaBose0/ArcadeVerse/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <span><i data-lucide="rocket"></i> Contribute a Game</span>
            </a>
          </div>
        `;
        const titleEl = emptyCard.querySelector(".empty-state-title");
        titleEl.textContent = `No games found matching "${searchQuery}"${currentCategory !== "all" ? ` in ${currentCategory}` : ""}${currentTag !== "all" ? ` (#${currentTag})` : ""}`;
      } else {
        emptyCard.innerHTML = `
          <div class="empty-state-icon"><i data-lucide="filter-x"></i></div>
          <h3 class="empty-state-title"></h3>
          <p class="empty-state-desc">
            No games currently found for this category or tag filter. Be the pioneer contributor! Build the first game under <code>games/&lt;game-name&gt;_&lt;your-name&gt;/</code> and claim your spot on the leaderboard.
          </p>
          <div class="empty-state-actions">
            <button class="btn btn-primary btn-sm" id="reset-filter-btn">
              <span><i data-lucide="rotate-ccw"></i> Clear Filters</span>
            </button>
            <a href="https://github.com/DebasmitaBose0/ArcadeVerse/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              <span><i data-lucide="rocket"></i> Build a Game for This Category</span>
            </a>
          </div>
        `;
        const titleEl = emptyCard.querySelector(".empty-state-title");
        titleEl.textContent = currentTag !== "all" 
          ? `No games found with tag #${currentTag}`
          : `No games found in "${currentCategory}"`;
      }

      emptyCard.querySelector("#reset-filter-btn").addEventListener("click", resetAllFilters);

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

      const tagsHtml = Array.isArray(game.tags)
        ? `<div class="game-tags-list">
             ${game.tags.filter((t) => t.toUpperCase() !== "NSOC26").slice(0, 3).map((t) => `<button type="button" class="game-tag-chip" data-tag="${t}" title="Filter by #${t}">#${t}</button>`).join("")}
           </div>`
        : "";

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
          ${tagsHtml}
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

      card.querySelectorAll(".game-tag-chip").forEach((chip) => {
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          const tag = chip.getAttribute("data-tag");
          if (tag) {
            currentTag = tag;
            if (tagSelect) tagSelect.value = tag;
            updateFilterControlsState();
            renderGames();
          }
        });
      });

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

  // Tag Selector Change
  if (tagSelect) {
    tagSelect.addEventListener("change", (e) => {
      currentTag = e.target.value;
      updateFilterControlsState();
      renderGames();
    });
  }

  // Filter Search
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      updateFilterControlsState();
      renderGames();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (searchQuery) {
          searchQuery = "";
          searchInput.value = "";
          updateFilterControlsState();
          renderGames();
        }
      }
    });
  }

  // Search Clear Button
  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      searchQuery = "";
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      updateFilterControlsState();
      renderGames();
    });
  }

  // Clear All Filters Button
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", resetAllFilters);
  }

  // Category Pills
  categoryPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".category-pills .pill").forEach((p) => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      pill.classList.add("active");
      pill.setAttribute("aria-selected", "true");
      currentCategory = pill.getAttribute("data-category");
      updateFilterControlsState();
      renderGames();
    });
  });

  // Mobile Favorites Link Shortcut
  const mobileFavLink = document.getElementById("mobile-favorites-link");
  if (mobileFavLink) {
    mobileFavLink.addEventListener("click", () => {
      const mobileDrawer = document.getElementById("mobile-nav-drawer");
      const menuBtn = document.getElementById("mobile-menu-btn");
      if (mobileDrawer) {
        mobileDrawer.classList.remove("open");
        mobileDrawer.setAttribute("aria-hidden", "true");
      }
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
      }

      document.querySelectorAll(".category-pills .pill").forEach((p) => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      const favPill = document.querySelector('.category-pills .pill[data-category="favorites"]');
      if (favPill) {
        favPill.classList.add("active");
        favPill.setAttribute("aria-selected", "true");
      }
      currentCategory = "favorites";
      updateFilterControlsState();
      renderGames();
    });
  }

  // Initial render
  updateFilterControlsState();
  renderGames();
});
