/**
 * ArcadeVerse Dynamic Game Search & Tag Filter Engine
 * Folder: others/game-search-filter-pratik/
 * Author: Pratik Giri (NSOC Winter Edition 2026)
 *
 * Implements case-insensitive real-time title search, dynamic category discovery,
 * multi-tag filtering with configurable semantics, and accessible live feedback.
 */

(() => {
  'use strict';

  if (window.__ArcadeSearchFilterInitialized) {
    return;
  }
  window.__ArcadeSearchFilterInitialized = true;

  /* --------------------------------------------------------------------------
     1. State & Metadata Discovery
     -------------------------------------------------------------------------- */
  const state = {
    searchQuery: '',
    currentCategory: 'all',
    activeTag: 'all',
    activeTagsSet: new Set(),
    tagSemantics: 'OR', // 'OR' (match any) or 'AND' (match all)
    sortBy: 'featured'
  };

  const FAVORITES_STORAGE_KEY = 'arcadeverse_favorite_games';

  function getFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function getGamesDataset() {
    if (typeof GAMES_REGISTRY !== 'undefined' && Array.isArray(GAMES_REGISTRY)) {
      return GAMES_REGISTRY;
    }
    return [];
  }

  function discoverCategories(dataset = getGamesDataset()) {
    const categoriesMap = new Map();
    dataset.forEach((game) => {
      if (game.category && typeof game.category === 'string') {
        const cat = game.category.trim();
        if (cat) {
          categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
        }
      }
    });
    return categoriesMap;
  }

  function discoverTags(dataset = getGamesDataset()) {
    const tagsMap = new Map();
    dataset.forEach((game) => {
      if (Array.isArray(game.tags)) {
        game.tags.forEach((tag) => {
          if (typeof tag === 'string') {
            const clean = tag.trim();
            if (clean && clean.toUpperCase() !== 'NSOC26') {
              tagsMap.set(clean, (tagsMap.get(clean) || 0) + 1);
            }
          }
        });
      }
    });
    return tagsMap;
  }

  /* --------------------------------------------------------------------------
     2. Core Filtering Pipeline
     -------------------------------------------------------------------------- */
  function filterGames(query = state.searchQuery, category = state.currentCategory, activeTag = state.activeTag, activeTagsSet = state.activeTagsSet, semantics = state.tagSemantics) {
    const dataset = getGamesDataset();
    const trimmedQuery = (query || '').trim().toLowerCase();
    const normalizedCategory = (category || 'all').toLowerCase();
    const favs = getFavorites();

    return dataset.filter((game) => {
      // Step 1: Title & Metadata Search
      let matchesSearch = true;
      if (trimmedQuery) {
        const titleMatch = Boolean(game.title && game.title.toLowerCase().includes(trimmedQuery));
        const descMatch = Boolean(game.description && game.description.toLowerCase().includes(trimmedQuery));
        const authorMatch = Boolean(game.author && game.author.toLowerCase().includes(trimmedQuery));
        const catMatch = Boolean(game.category && game.category.toLowerCase().includes(trimmedQuery));
        const tagMatch = Array.isArray(game.tags) && game.tags.some(t => t.toLowerCase().includes(trimmedQuery));
        matchesSearch = titleMatch || descMatch || authorMatch || catMatch || tagMatch;
      }

      // Step 2: Category Filter
      let matchesCategory = false;
      if (normalizedCategory === 'all') {
        matchesCategory = true;
      } else if (normalizedCategory === 'favorites') {
        matchesCategory = favs.has(game.id);
      } else {
        matchesCategory = Boolean(game.category && game.category.toLowerCase() === normalizedCategory);
      }

      // Step 3: Tag Criteria
      let matchesTags = true;
      // Single select tag (dropdown mode)
      if (activeTag && activeTag !== 'all') {
        matchesTags = Array.isArray(game.tags) && game.tags.some(t => t.toLowerCase() === activeTag.toLowerCase());
      }
      // Multi-tag cloud selection (cloud mode)
      if (matchesTags && activeTagsSet && activeTagsSet.size > 0) {
        if (!Array.isArray(game.tags) || game.tags.length === 0) {
          matchesTags = false;
        } else {
          const gameTagsLower = game.tags.map(t => t.toLowerCase());
          if (semantics === 'AND') {
            matchesTags = Array.from(activeTagsSet).every(t => gameTagsLower.includes(t.toLowerCase()));
          } else {
            matchesTags = Array.from(activeTagsSet).some(t => gameTagsLower.includes(t.toLowerCase()));
          }
        }
      }

      return matchesSearch && matchesCategory && matchesTags;
    });
  }

  function sortGames(gamesList, sortMode = state.sortBy) {
    const list = [...gamesList];
    list.sort((a, b) => {
      if (sortMode === 'az') {
        return a.title.localeCompare(b.title);
      } else if (sortMode === 'rating') {
        const rA = (window.GameRatings && window.GameRatings.ratings[a.id]) || (a.stars ? (a.stars / 10) : 5.0);
        const rB = (window.GameRatings && window.GameRatings.ratings[b.id]) || (b.stars ? (b.stars / 10) : 5.0);
        if (rB !== rA) return rB - rA;
        return a.title.localeCompare(b.title);
      } else {
        // "featured": featured items first, then by rating / title
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        const rA = (window.GameRatings && window.GameRatings.ratings[a.id]) || (a.stars ? (a.stars / 10) : 5.0);
        const rB = (window.GameRatings && window.GameRatings.ratings[b.id]) || (b.stars ? (b.stars / 10) : 5.0);
        if (rB !== rA) return rB - rA;
        return a.title.localeCompare(b.title);
      }
    });
    return list;
  }

  /* --------------------------------------------------------------------------
     3. DOM Card Builder & Icons
     -------------------------------------------------------------------------- */
  function createGameCardElement(game, favs) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.setAttribute('data-game-id', game.id);

    const iconName = game.lucideIcon || 'gamepad-2';
    const iconHtml = `<i data-lucide="${iconName}"></i>`;
    const favorited = favs.has(game.id);

    const tagsHtml = Array.isArray(game.tags)
      ? `<div class="game-tags-list">
          ${game.tags.filter(t => t.toUpperCase() !== 'NSOC26').slice(0, 3).map(t => `
            <button type="button" class="game-tag-chip ${state.activeTag.toLowerCase() === t.toLowerCase() || state.activeTagsSet.has(t) ? 'active' : ''}" data-tag="${t}" title="Filter by #${t}" aria-label="Filter by tag ${t}">
              #${t}
            </button>
          `).join('')}
        </div>`
      : '';

    const userRating = (window.GameRatings && window.GameRatings.ratings[game.id]) || null;
    const displayScore = userRating ? Number(userRating).toFixed(1) : (game.stars ? (game.stars / 10).toFixed(1) : '5.0');
    const currentStar = userRating || Math.min(5, Math.max(1, Math.round((game.stars || 25) / 10)));

    card.innerHTML = `
      <div class="game-card-preview">
        <span class="game-category-tag">${game.category}</span>
        <button class="btn-card-favorite ${favorited ? 'favorited' : ''}" data-id="${game.id}" aria-label="${favorited ? 'Remove from Favorites' : 'Save to Favorites'}" aria-pressed="${favorited ? 'true' : 'false'}" title="${favorited ? 'Remove from Favorites' : 'Save to Favorites'}">
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
        <div class="game-card-rating-row">
          <div class="game-rating-stars" data-game-id="${game.id}" aria-label="Rating for ${game.title}">
            ${[1, 2, 3, 4, 5].map(starNum => `
              <button type="button" class="rate-star-btn ${currentStar >= starNum ? 'voted' : ''}" data-game="${game.id}" data-star="${starNum}" title="Rate ${starNum} star${starNum > 1 ? 's' : ''}" aria-label="Rate ${starNum} stars">
                <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            `).join('')}
            <span class="rating-badge">${displayScore}</span>
          </div>
        </div>
        <div class="game-card-footer">
          <div class="contributor-meta">
            <div class="contributor-avatar">${game.author.charAt(0).toUpperCase()}</div>
            <div class="contributor-name">
              Dev: <strong>${game.author}</strong>
            </div>
          </div>
          <button class="btn-play-trigger" data-id="${game.id}">Play Now <i data-lucide="play" style="width: 13px; height: 13px; vertical-align: middle; margin-left: 2px;"></i></button>
        </div>
      </div>
    `;

    // Bind Tag Chip clicks inside card
    card.querySelectorAll('.game-tag-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = chip.getAttribute('data-tag');
        if (tag) {
          applyTagSelection(tag);
        }
      });
    });

    // Card Favorite Click
    const favBtn = card.querySelector('.btn-card-favorite');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(game.id);
      });
    }

    // Play Button Click
    const playBtn = card.querySelector('.btn-play-trigger');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        launchGame(game);
      });
    }

    // Card Click opens game modal (excluding interactive children)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.rate-star-btn, .game-rating-stars, .game-card-rating-row, .btn-card-favorite, .game-tag-chip')) {
        return;
      }
      launchGame(game);
    });

    return card;
  }

  function toggleFavorite(gameId) {
    const favs = getFavorites();
    const willBeFav = !favs.has(gameId);
    if (willBeFav) {
      favs.add(gameId);
    } else {
      favs.delete(gameId);
    }
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favs)));
    } catch (e) {}

    const badge = document.getElementById('favorites-count-badge');
    if (badge) badge.textContent = favs.size;

    renderCatalogResults();
  }

  function launchGame(game) {
    if (typeof window.openGameModal === 'function') {
      window.openGameModal(game);
    } else if (window.ArcadeApp && typeof window.ArcadeApp.openGame === 'function') {
      window.ArcadeApp.openGame(game.id);
    } else {
      // Standalone modal fallback if on feature.html
      const modal = document.getElementById('standalone-game-modal');
      const iframe = document.getElementById('standalone-game-iframe');
      const title = document.getElementById('standalone-modal-title');
      if (modal && iframe) {
        iframe.src = `../../${game.path}`;
        if (title) title.textContent = game.title;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      }
    }
  }

  function applyTagSelection(tag) {
    state.activeTag = tag;
    const tagSelect = document.getElementById('catalog-tag-select');
    if (tagSelect) {
      tagSelect.value = tag;
    }
    renderCatalogResults();
  }

  /* --------------------------------------------------------------------------
     4. Render & Empty State Handler
     -------------------------------------------------------------------------- */
  function renderCatalogResults() {
    const grid = document.getElementById('games-grid') || document.getElementById('standalone-games-grid');
    if (!grid) return;

    const dataset = getGamesDataset();
    const filtered = filterGames();
    const sorted = sortGames(filtered);
    const favs = getFavorites();

    grid.innerHTML = '';

    // Update Live Count Feedbacks
    updateLiveFeedbackUI(sorted.length, dataset.length);

    if (sorted.length === 0) {
      grid.appendChild(createEmptyStateElement());
      if (window.lucide) lucide.createIcons();
      return;
    }

    sorted.forEach((game) => {
      grid.appendChild(createGameCardElement(game, favs));
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function updateLiveFeedbackUI(matchedCount, totalCount) {
    // 1. Text Counter
    const liveCounter = document.getElementById('catalog-live-count');
    if (liveCounter) {
      if (matchedCount === totalCount) {
        liveCounter.innerHTML = `Showing all <strong>${matchedCount}</strong> games`;
      } else {
        liveCounter.innerHTML = `Showing <strong>${matchedCount}</strong> of <strong>${totalCount}</strong> games`;
      }
    }

    // 2. Active filters indicators & clear button
    const hasActiveSearch = state.searchQuery.length > 0;
    const hasActiveCategory = state.currentCategory !== 'all';
    const hasActiveTag = state.activeTag !== 'all' || state.activeTagsSet.size > 0;
    const hasAnyActive = hasActiveSearch || hasActiveCategory || hasActiveTag;

    const clearBtn = document.getElementById('clear-all-filters-btn');
    if (clearBtn) {
      clearBtn.style.display = hasAnyActive ? 'inline-flex' : 'none';
    }

    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchClearBtn) {
      searchClearBtn.style.display = hasActiveSearch ? 'inline-flex' : 'none';
    }
  }

  function createEmptyStateElement() {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'catalog-empty-state';

    const hasSearch = state.searchQuery.length > 0;
    const hasTag = state.activeTag !== 'all' || state.activeTagsSet.size > 0;
    const hasCategory = state.currentCategory !== 'all';

    let titleText = 'No games found';
    let descText = 'No arcade games match your active search and filter criteria. Try clearing active filters or checking for spelling errors.';

    if (state.currentCategory === 'favorites') {
      emptyCard.innerHTML = `
        <div class="empty-state-icon" style="color: #f43f5e;"><i data-lucide="heart-crack"></i></div>
        <h3 class="empty-state-title">No Favorite Games Saved</h3>
        <p class="empty-state-desc">You haven't added any games to your favorites yet. Click the heart icon on any game card to bookmark it.</p>
        <div class="empty-state-actions">
          <button type="button" class="btn btn-primary btn-sm" id="empty-reset-filters-btn">
            <span><i data-lucide="gamepad-2"></i> Browse All Games</span>
          </button>
        </div>
      `;
    } else {
      if (hasSearch && hasCategory && hasTag) {
        titleText = `No results for "${state.searchQuery}" in ${state.currentCategory} #${state.activeTag}`;
      } else if (hasSearch) {
        titleText = `No games match "${state.searchQuery}"`;
      } else if (hasCategory) {
        titleText = `No games found in category "${state.currentCategory}"`;
      } else if (hasTag) {
        titleText = `No games tagged #${state.activeTag}`;
      }

      emptyCard.innerHTML = `
        <div class="empty-state-icon"><i data-lucide="search-x"></i></div>
        <h3 class="empty-state-title">${escapeHTML(titleText)}</h3>
        <p class="empty-state-desc">${descText}</p>
        <div class="empty-state-actions">
          <button type="button" class="btn btn-primary btn-sm" id="empty-reset-filters-btn">
            <span><i data-lucide="rotate-ccw"></i> Clear All Filters</span>
          </button>
          <a href="https://github.com/DebasmitaBose0/ArcadeVerse/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
            <span><i data-lucide="rocket"></i> Contribute a Game</span>
          </a>
        </div>
      `;
    }

    const resetBtn = emptyCard.querySelector('#empty-reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetAllFilters);
    }

    return emptyCard;
  }

  function resetAllFilters() {
    state.searchQuery = '';
    state.currentCategory = 'all';
    state.activeTag = 'all';
    state.activeTagsSet.clear();

    // Reset Search inputs
    document.querySelectorAll('#game-search-input, #standalone-search-input').forEach((input) => {
      input.value = '';
    });

    // Reset Tag select
    const tagSelect = document.getElementById('catalog-tag-select');
    if (tagSelect) {
      tagSelect.value = 'all';
    }

    // Reset Category Pills
    document.querySelectorAll('.category-pills .pill, .filter-chip-btn[data-category]').forEach((p) => {
      const isAll = p.getAttribute('data-category') === 'all';
      p.classList.toggle('active', isAll);
      p.setAttribute('aria-selected', isAll ? 'true' : 'false');
    });

    // Reset Standalone Tag Chips
    document.querySelectorAll('.filter-chip-btn[data-filter-tag]').forEach((chip) => {
      chip.classList.remove('active');
    });

    renderCatalogResults();
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  /* --------------------------------------------------------------------------
     5. Platform Enhancements Injection (index.html Background Plugin Mode)
     -------------------------------------------------------------------------- */
  function injectPlatformToolbarEnhancements() {
    const toolbar = document.querySelector('.games-toolbar-controls');
    if (!toolbar) return;

    // 1. Inject Clear Button into Search Box
    const searchBox = toolbar.querySelector('.search-box');
    const searchInput = document.getElementById('game-search-input');
    if (searchBox && searchInput && !document.getElementById('search-clear-btn')) {
      const clearBtn = document.createElement('button');
      clearBtn.id = 'search-clear-btn';
      clearBtn.className = 'search-clear-btn';
      clearBtn.type = 'button';
      clearBtn.setAttribute('title', 'Clear search query (Esc)');
      clearBtn.setAttribute('aria-label', 'Clear search input');
      clearBtn.style.display = 'none';
      clearBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchInput.focus();
        renderCatalogResults();
      });

      searchBox.appendChild(clearBtn);

      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        renderCatalogResults();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (searchInput.value) {
            searchInput.value = '';
            state.searchQuery = '';
            renderCatalogResults();
          }
        }
      });
    }

    // 2. Inject Dynamic Tag Filter Selector
    if (!document.getElementById('catalog-tag-select')) {
      const tagsMap = discoverTags();
      const tagBox = document.createElement('div');
      tagBox.className = 'tag-filter-box';
      tagBox.innerHTML = `
        <label for="catalog-tag-select" class="tag-filter-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          Tag:
        </label>
        <select id="catalog-tag-select" class="tag-filter-select" aria-label="Filter games by tag">
          <option value="all">All Tags</option>
          ${Array.from(tagsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([tag, count]) => `
            <option value="${escapeHTML(tag)}">#${escapeHTML(tag)} (${count})</option>
          `).join('')}
        </select>
      `;

      tagBox.querySelector('#catalog-tag-select').addEventListener('change', (e) => {
        state.activeTag = e.target.value;
        renderCatalogResults();
      });

      toolbar.appendChild(tagBox);
    }

    // 3. Inject Feedback & Clear Status Bar above Games Grid
    const pillsBar = document.querySelector('.category-pills-bar');
    const gamesGrid = document.getElementById('games-grid');
    if (pillsBar && gamesGrid && !document.getElementById('filter-feedback-bar')) {
      const feedbackBar = document.createElement('div');
      feedbackBar.id = 'filter-feedback-bar';
      feedbackBar.className = 'filter-feedback-bar';
      feedbackBar.innerHTML = `
        <div class="catalog-live-count" id="catalog-live-count" aria-live="polite">
          Showing all games
        </div>
        <div class="filter-actions-slot">
          <button type="button" class="clear-all-filters-btn" id="clear-all-filters-btn" style="display: none;" title="Reset all active filters">
            <svg viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            Clear Filters
          </button>
        </div>
      `;

      feedbackBar.querySelector('#clear-all-filters-btn').addEventListener('click', resetAllFilters);
      pillsBar.insertAdjacentElement('afterend', feedbackBar);
    }

    // 4. Ensure Category Pills hook cleanly into pipeline
    const categoryPillsContainer = document.getElementById('category-pills');
    if (categoryPillsContainer) {
      // Check for any unlisted categories from GAMES_REGISTRY
      const categoriesMap = discoverCategories();
      categoriesMap.forEach((count, cat) => {
        const existing = categoryPillsContainer.querySelector(`.pill[data-category="${cat}"]`);
        if (!existing) {
          const pill = document.createElement('button');
          pill.className = 'pill';
          pill.setAttribute('data-category', cat);
          pill.textContent = cat;
          categoryPillsContainer.appendChild(pill);
        }
      });

      // Bind category pill clicks
      categoryPillsContainer.querySelectorAll('.pill').forEach((pill) => {
        if (!pill.dataset.boundSearchFilter) {
          pill.dataset.boundSearchFilter = 'true';
          pill.addEventListener('click', () => {
            categoryPillsContainer.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.currentCategory = pill.getAttribute('data-category') || 'all';
            renderCatalogResults();
          });
        }
      });
    }

    // 5. Hook into Sort Selector
    const sortSelect = document.getElementById('catalog-sort-select');
    if (sortSelect && !sortSelect.dataset.boundSearchFilter) {
      sortSelect.dataset.boundSearchFilter = 'true';
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderCatalogResults();
      });
    }
  }

  /* --------------------------------------------------------------------------
     6. Standalone Tool Mode Initialization (feature.html)
     -------------------------------------------------------------------------- */
  function initStandalonePage() {
    const searchInput = document.getElementById('standalone-search-input');
    const searchClearBtn = document.getElementById('standalone-search-clear-btn');
    const categoryCloud = document.getElementById('standalone-category-cloud');
    const tagCloud = document.getElementById('standalone-tag-cloud');
    const resetBtn = document.getElementById('clear-all-filters-btn');
    const semanticsOrBtn = document.getElementById('semantics-or-btn');
    const semanticsAndBtn = document.getElementById('semantics-and-btn');

    if (!searchInput || !categoryCloud) return;

    const dataset = getGamesDataset();
    const categoriesMap = discoverCategories(dataset);
    const tagsMap = discoverTags(dataset);

    // Populate Category Cloud
    categoryCloud.innerHTML = `
      <button type="button" class="filter-chip-btn active" data-category="all" aria-pressed="true">
        All Games <span class="filter-chip-count">${dataset.length}</span>
      </button>
      <button type="button" class="filter-chip-btn" data-category="favorites" aria-pressed="false">
        Favorites <span class="filter-chip-count">${getFavorites().size}</span>
      </button>
      ${Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, count]) => `
        <button type="button" class="filter-chip-btn" data-category="${escapeHTML(cat)}" aria-pressed="false">
          ${escapeHTML(cat)} <span class="filter-chip-count">${count}</span>
        </button>
      `).join('')}
    `;

    categoryCloud.querySelectorAll('.filter-chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        categoryCloud.querySelectorAll('.filter-chip-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.currentCategory = btn.getAttribute('data-category') || 'all';
        renderCatalogResults();
      });
    });

    // Populate Tag Cloud
    if (tagCloud) {
      tagCloud.innerHTML = Array.from(tagsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([tag, count]) => `
        <button type="button" class="filter-chip-btn" data-filter-tag="${escapeHTML(tag)}" aria-pressed="false">
          #${escapeHTML(tag)} <span class="filter-chip-count">${count}</span>
        </button>
      `).join('');

      tagCloud.querySelectorAll('.filter-chip-btn').forEach((chip) => {
        chip.addEventListener('click', () => {
          const tag = chip.getAttribute('data-filter-tag');
          if (state.activeTagsSet.has(tag)) {
            state.activeTagsSet.delete(tag);
            chip.classList.remove('active');
            chip.setAttribute('aria-pressed', 'false');
          } else {
            state.activeTagsSet.add(tag);
            chip.classList.add('active');
            chip.setAttribute('aria-pressed', 'true');
          }
          renderCatalogResults();
        });
      });
    }

    // Tag Semantics (AND / OR)
    if (semanticsOrBtn && semanticsAndBtn) {
      semanticsOrBtn.addEventListener('click', () => {
        state.tagSemantics = 'OR';
        semanticsOrBtn.classList.add('active');
        semanticsAndBtn.classList.remove('active');
        renderCatalogResults();
      });
      semanticsAndBtn.addEventListener('click', () => {
        state.tagSemantics = 'AND';
        semanticsAndBtn.classList.add('active');
        semanticsOrBtn.classList.remove('active');
        renderCatalogResults();
      });
    }

    // Search input
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      if (searchClearBtn) {
        searchClearBtn.style.display = state.searchQuery ? 'inline-flex' : 'none';
      }
      renderCatalogResults();
    });

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        renderCatalogResults();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', resetAllFilters);
    }

    // Standalone Modal Close
    const modal = document.getElementById('standalone-game-modal');
    const closeBtn = document.getElementById('standalone-close-modal');
    if (modal && closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        const iframe = document.getElementById('standalone-game-iframe');
        if (iframe) iframe.src = '';
      });
    }

    renderCatalogResults();
  }

  /* --------------------------------------------------------------------------
     7. Bootstrap Engine
     -------------------------------------------------------------------------- */
  function init() {
    if (document.getElementById('standalone-search-input')) {
      initStandalonePage();
    } else {
      injectPlatformToolbarEnhancements();
      renderCatalogResults();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* --------------------------------------------------------------------------
     8. Public Platform API
     -------------------------------------------------------------------------- */
  window.ArcadeSearchFilter = {
    filterGames,
    discoverCategories,
    discoverTags,
    resetAllFilters,
    getState: () => ({ ...state })
  };
})();
