/**
 * ArcadeVerse Persistent Game Favorites Engine
 * Folder: others/game-favorites-pratik/
 * Author: Pratik Giri (NSOC Winter Edition 2026)
 *
 * Implements accessible, persistent favorites with namespaced storage,
 * cross-tab synchronization, instant view updates, and empty-state management.
 */

(() => {
  'use strict';

  if (window.__ArcadeFavoritesEngineInitialized) {
    return;
  }
  window.__ArcadeFavoritesEngineInitialized = true;

  /* --------------------------------------------------------------------------
     1. Storage Keys & State Management
     -------------------------------------------------------------------------- */
  const STORAGE_KEY_FAVORITES = 'arcadeverse:preferences:favorites';
  const LEGACY_STORAGE_KEY = 'arcadeverse_favorite_games';

  function getRegistry() {
    if (typeof GAMES_REGISTRY !== 'undefined' && Array.isArray(GAMES_REGISTRY)) {
      return GAMES_REGISTRY;
    }
    return [];
  }

  function isValidGameId(id) {
    const registry = getRegistry();
    if (registry.length === 0) return true; // If registry not loaded yet, do not discard
    return registry.some(game => game.id === id);
  }

  function loadFavoritesFromStorage() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (!raw) {
        // Fall back to legacy key if present
        raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {
      // localStorage disabled or restricted in sandboxed environments
      return new Set();
    }

    if (!raw) return new Set();

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();

      // Normalize: deduplicate, validate string type, reconcile obsolete IDs
      const cleanIds = new Set();
      parsed.forEach((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed && isValidGameId(trimmed)) {
            cleanIds.add(trimmed);
          }
        }
      });
      return cleanIds;
    } catch (e) {
      console.warn('[Favorites Engine] Corrupted favorites data detected, resetting gracefully.');
      return new Set();
    }
  }

  let favoritesSet = loadFavoritesFromStorage();

  function persistFavorites(set = favoritesSet) {
    const arr = Array.from(set);
    const jsonStr = JSON.stringify(arr);
    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES, jsonStr);
      // Synchronize legacy key for backwards compatibility
      localStorage.setItem(LEGACY_STORAGE_KEY, jsonStr);
    } catch (e) {
      console.warn('[Favorites Engine] Could not persist favorites to localStorage:', e);
    }

    updateFavoritesCountUI();
    broadcastFavoritesChange();
  }

  function isFavorite(gameId) {
    if (!gameId) return false;
    return favoritesSet.has(gameId);
  }

  function addFavorite(gameId) {
    if (!gameId || favoritesSet.has(gameId)) return false;
    favoritesSet.add(gameId);
    persistFavorites();
    updateCardButtonUI(gameId, true);
    return true;
  }

  function removeFavorite(gameId) {
    if (!gameId || !favoritesSet.has(gameId)) return false;
    favoritesSet.delete(gameId);
    persistFavorites();
    updateCardButtonUI(gameId, false);
    handleActiveFavoritesViewRemoval(gameId);
    return true;
  }

  function toggleFavorite(gameId) {
    if (!gameId) return false;
    if (favoritesSet.has(gameId)) {
      removeFavorite(gameId);
      return false;
    } else {
      addFavorite(gameId);
      return true;
    }
  }

  function clearAllFavorites() {
    favoritesSet.clear();
    persistFavorites();
    document.querySelectorAll('.btn-card-favorite').forEach((btn) => {
      btn.classList.remove('favorited');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Add to favorites');
      btn.title = 'Add to favorites';
    });
    handleActiveFavoritesViewRemoval(null);
  }

  function broadcastFavoritesChange(gameId = null, isFav = null) {
    window.dispatchEvent(new CustomEvent('arcadeverse:favorites-updated', {
      detail: {
        gameId,
        isFavorite: isFav,
        totalCount: favoritesSet.size,
        favorites: Array.from(favoritesSet)
      }
    }));
  }

  /* --------------------------------------------------------------------------
     2. Cross-Tab Real-Time Sync
     -------------------------------------------------------------------------- */
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_FAVORITES || e.key === LEGACY_STORAGE_KEY) {
      favoritesSet = loadFavoritesFromStorage();
      updateFavoritesCountUI();
      document.querySelectorAll('.btn-card-favorite').forEach((btn) => {
        const id = btn.getAttribute('data-id');
        if (id) {
          updateCardButtonUI(id, favoritesSet.has(id));
        }
      });
      handleActiveFavoritesViewRemoval(null);
    }
  });

  /* --------------------------------------------------------------------------
     3. UI State Synchronization
     -------------------------------------------------------------------------- */
  function updateFavoritesCountUI() {
    const count = favoritesSet.size;

    // Badges across platform
    document.querySelectorAll('#favorites-count-badge, .favorites-count-badge, #mobile-fav-count').forEach((badge) => {
      badge.textContent = count;
    });

    // Standalone telemetry counter
    const standaloneCount = document.getElementById('standalone-favorites-count');
    if (standaloneCount) {
      standaloneCount.textContent = count;
    }
  }

  function updateCardButtonUI(gameId, isFav) {
    const cardBtns = document.querySelectorAll(`.btn-card-favorite[data-id="${gameId}"]`);
    cardBtns.forEach((btn) => {
      btn.classList.toggle('favorited', isFav);
      btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      const label = isFav ? 'Remove from favorites' : 'Add to favorites';
      btn.setAttribute('aria-label', label);
      btn.title = label;
    });

    // Modal favorite button
    const modalFavBtn = document.getElementById('modal-fav-btn');
    if (modalFavBtn && modalFavBtn.getAttribute('data-active-game-id') === gameId) {
      modalFavBtn.classList.toggle('favorited', isFav);
      modalFavBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      modalFavBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    }
  }

  function handleActiveFavoritesViewRemoval(removedGameId) {
    // If currently viewing favorites category, instantly update the DOM
    const activePill = document.querySelector('.category-pills .pill.active, .filter-chip-btn.active[data-category="favorites"]');
    const isFavoritesView = activePill && activePill.getAttribute('data-category') === 'favorites';

    if (isFavoritesView) {
      const grid = document.getElementById('games-grid') || document.getElementById('standalone-games-grid');
      if (!grid) return;

      if (removedGameId) {
        const cardToRemove = grid.querySelector(`.game-card[data-game-id="${removedGameId}"]`);
        if (cardToRemove) {
          cardToRemove.remove();
        }
      }

      // If no cards left in grid, display descriptive empty state
      const remainingCards = grid.querySelectorAll('.game-card');
      if (remainingCards.length === 0 && !grid.querySelector('.favorites-empty-card')) {
        grid.innerHTML = `
          <div class="favorites-empty-card">
            <div class="favorites-empty-icon">
              <svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <h3 class="favorites-empty-title">No Favorite Games Saved Yet</h3>
            <p class="favorites-empty-desc">
              Bookmark games you enjoy by clicking the heart button on any game card to easily find them here anytime.
            </p>
            <div class="empty-state-actions">
              <button type="button" class="btn btn-primary btn-sm" id="fav-browse-all-btn">
                <span>Browse All Games</span>
              </button>
            </div>
          </div>
        `;

        const browseBtn = grid.querySelector('#fav-browse-all-btn');
        if (browseBtn) {
          browseBtn.addEventListener('click', () => {
            const allPill = document.querySelector('.category-pills .pill[data-category="all"], .filter-chip-btn[data-category="all"]');
            if (allPill) allPill.click();
          });
        }
      }
    }

    // Update standalone page rendering if active
    if (document.getElementById('standalone-favorites-grid')) {
      renderStandaloneFavorites();
    }
  }

  /* --------------------------------------------------------------------------
     4. Dynamic Card Button Injection & Interception
     -------------------------------------------------------------------------- */
  function enrichGameCards() {
    document.querySelectorAll('.game-card').forEach((card) => {
      const gameId = card.getAttribute('data-game-id');
      if (!gameId) return;

      let favBtn = card.querySelector('.btn-card-favorite');
      const preview = card.querySelector('.game-card-preview');

      // Inject favorite button if not already rendered
      if (!favBtn && preview) {
        favBtn = document.createElement('button');
        favBtn.type = 'button';
        favBtn.className = 'btn-card-favorite';
        favBtn.setAttribute('data-id', gameId);
        favBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="fav-heart-icon">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        `;
        preview.appendChild(favBtn);
      }

      if (favBtn && !favBtn.dataset.boundFavoritesEngine) {
        favBtn.dataset.boundFavoritesEngine = 'true';

        // Set initial state
        const isFav = isFavorite(gameId);
        favBtn.classList.toggle('favorited', isFav);
        favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
        const label = isFav ? 'Remove from favorites' : 'Add to favorites';
        favBtn.setAttribute('aria-label', label);
        favBtn.title = label;

        // Click handler: prevents card click navigation / modal launch
        favBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(gameId);
        });

        // Accessible keyboard support
        favBtn.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(gameId);
          }
        });
      }
    });

    updateFavoritesCountUI();
  }

  // Observe dynamically rendered game cards using MutationObserver
  function observeGridMutations() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;

    const observer = new MutationObserver((mutations) => {
      let needsEnrich = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          needsEnrich = true;
          break;
        }
      }
      if (needsEnrich) {
        enrichGameCards();
      }
    });

    observer.observe(grid, { childList: true, subtree: false });
  }

  /* --------------------------------------------------------------------------
     5. Standalone Tool Page Mode (feature.html)
     -------------------------------------------------------------------------- */
  function renderStandaloneFavorites() {
    const grid = document.getElementById('standalone-favorites-grid');
    if (!grid) return;

    const registry = getRegistry();
    const favs = Array.from(favoritesSet);
    const favoritedGames = registry.filter(game => favoritesSet.has(game.id));

    grid.innerHTML = '';
    updateFavoritesCountUI();

    if (favoritedGames.length === 0) {
      grid.innerHTML = `
        <div class="favorites-empty-card">
          <div class="favorites-empty-icon">
            <svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </div>
          <h3 class="favorites-empty-title">Your Favorites Vault is Empty</h3>
          <p class="favorites-empty-desc">
            You haven't bookmarked any games yet. Explore the arcade collection, tap the heart button on any game, and it will be saved here automatically.
          </p>
          <div class="empty-state-actions">
            <a href="../../index.html" class="btn btn-primary btn-sm">
              <span>Explore All Games</span>
            </a>
          </div>
        </div>
      `;
      return;
    }

    favoritedGames.forEach((game) => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.setAttribute('data-game-id', game.id);

      card.innerHTML = `
        <div class="game-card-preview">
          <span class="game-category-tag">${game.category}</span>
          <button type="button" class="btn-card-favorite favorited" data-id="${game.id}" aria-label="Remove from favorites" aria-pressed="true" title="Remove from favorites">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" stroke-width="2" class="fav-heart-icon">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </button>
          <div class="game-icon"><i data-lucide="${game.lucideIcon || 'gamepad-2'}"></i></div>
        </div>
        <div class="game-card-body">
          <h3 class="game-card-title">${game.title}</h3>
          <p class="game-card-desc">${game.description}</p>
          <div class="game-card-footer">
            <div class="contributor-meta">
              <div class="contributor-avatar">${game.author.charAt(0).toUpperCase()}</div>
              <div class="contributor-name">Dev: <strong>${game.author}</strong></div>
            </div>
            <button class="btn-play-trigger" data-id="${game.id}">Play Now</button>
          </div>
        </div>
      `;

      card.querySelector('.btn-card-favorite').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFavorite(game.id);
      });

      card.querySelector('.btn-play-trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        launchStandaloneGame(game);
      });

      card.addEventListener('click', () => launchStandaloneGame(game));

      grid.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function launchStandaloneGame(game) {
    const modal = document.getElementById('standalone-play-modal');
    const iframe = document.getElementById('standalone-play-iframe');
    const title = document.getElementById('standalone-modal-game-title');
    if (modal && iframe) {
      iframe.src = `../../${game.path}`;
      if (title) title.textContent = game.title;
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function initStandalonePage() {
    renderStandaloneFavorites();

    const clearAllBtn = document.getElementById('clear-all-favs-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (favoritesSet.size === 0) return;
        if (window.confirm('Are you sure you want to clear all favorite games?')) {
          clearAllFavorites();
        }
      });
    }

    const exportBtn = document.getElementById('export-favs-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(Array.from(favoritesSet), null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'arcadeverse_favorites.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      });
    }

    const modal = document.getElementById('standalone-play-modal');
    const closeBtn = document.getElementById('close-standalone-modal');
    if (modal && closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        const iframe = document.getElementById('standalone-play-iframe');
        if (iframe) iframe.src = '';
      });
    }
  }

  /* --------------------------------------------------------------------------
     6. Bootstrap Engine
     -------------------------------------------------------------------------- */
  function init() {
    enrichGameCards();
    observeGridMutations();
    updateFavoritesCountUI();

    if (document.getElementById('standalone-favorites-grid')) {
      initStandalonePage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* --------------------------------------------------------------------------
     7. Public Platform API
     -------------------------------------------------------------------------- */
  window.ArcadeFavorites = {
    getFavorites: () => new Set(favoritesSet),
    getFavoritesArray: () => Array.from(favoritesSet),
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearAllFavorites,
    getCount: () => favoritesSet.size,
    STORAGE_KEY: STORAGE_KEY_FAVORITES
  };
})();
