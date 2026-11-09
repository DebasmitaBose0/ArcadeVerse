/**
 * Hall of Fame Live GitHub Contributors & Ranking Engine
 * Fetches real contributor stats from GitHub API (or seamlessly merges with games-registry)
 */

document.addEventListener("DOMContentLoaded", () => {
  const podiumContainer = document.getElementById("podium-container");
  const tableBody = document.getElementById("leaderboard-table-body");
  const repoInput = document.getElementById("repo-input");
  const fetchBtn = document.getElementById("fetch-github-btn");
  const syncStatusText = document.getElementById("sync-status-text");
  const adminMetaInfo = document.getElementById("admin-meta-info");
  const searchInput = document.getElementById("leaderboard-search-input");
  const roleFilterSelect = document.getElementById("leaderboard-role-filter");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const exportJsonBtn = document.getElementById("export-json-btn");
  let tableSearchQuery = "";
  let currentRoleFilter = "all";
  let searchDebounceTimer = null;

  // Versus Compare State
  let selectedCompareLogins = [];

  const paginationBar = document.getElementById("leaderboard-pagination-bar");
  const paginationInfo = document.getElementById("leaderboard-pagination-info");
  const pageSizeSelect = document.getElementById("leaderboard-page-size");
  const prevBtn = document.getElementById("pagination-prev-btn");
  const nextBtn = document.getElementById("pagination-next-btn");
  const pagesContainer = document.getElementById("pagination-pages-container");

  let currentPage = 1;
  let pageSize = 10;
  let currentTotalPages = 1;

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightMatch(text, query) {
    if (!text) return "";
    const safeText = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    if (!query) return safeText;

    const escaped = escapeRegex(query.trim());
    const regex = new RegExp("(" + escaped + ")", "gi");
    return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function escapeAttr(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderBadgeHtml(b) {
    const name = escapeHTML(b.label || b.role);
    const cat = escapeHTML(b.category || "Badge");
    const req = escapeHTML(b.requirement || "");
    const icon = escapeHTML(b.lucideIcon || "award");
    const tagClass = escapeHTML(b.tagClass || "");
    return `<span class="role-pill-badge ${tagClass}" data-badge-name="${name}" data-badge-cat="${cat}" data-badge-req="${req}" tabindex="0" role="button" aria-label="${name}: ${req}" title="${name}\n${req}"><i data-lucide="${icon}"></i> ${name}</span>`;
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        tableSearchQuery = e.target.value.toLowerCase().trim();
        currentPage = 1;
        renderTable();
      }, 200);
    });
  }

  if (roleFilterSelect) {
    roleFilterSelect.addEventListener("change", (e) => {
      currentRoleFilter = e.target.value;
      currentPage = 1;
      renderTable();
    });
  }

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      pageSize = val === "all" ? "all" : parseInt(val, 10);
      currentPage = 1;
      renderTable();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
        scrollToTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentPage < currentTotalPages) {
        currentPage++;
        renderTable();
        scrollToTable();
      }
    });
  }

  function scrollToTable() {
    const tableCard = document.querySelector(".leaderboard-table-card");
    if (tableCard) {
      tableCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getPageNumbers(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push("...");
      pages.push(total);
    }
    return pages;
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      exportStandingsCsv();
    });
  }

  const switchContribBtn = document.getElementById("switch-contributors-btn");
  const switchAdminBtn = document.getElementById("switch-admin-btn");
  const viewContributors = document.getElementById("view-contributors");
  const viewAdmin = document.getElementById("view-admin");

  if (switchContribBtn && switchAdminBtn && viewContributors && viewAdmin) {
    switchContribBtn.addEventListener("click", () => {
      switchContribBtn.classList.add("active");
      switchAdminBtn.classList.remove("active");
      viewContributors.style.display = "block";
      viewAdmin.style.display = "none";
      if (window.lucide) lucide.createIcons();
    });

    switchAdminBtn.addEventListener("click", () => {
      switchAdminBtn.classList.add("active");
      switchContribBtn.classList.remove("active");
      viewAdmin.style.display = "block";
      viewContributors.style.display = "none";
      if (window.lucide) lucide.createIcons();
    });
  }

  const CACHE_KEY = "arcadeverse_contributors_cache_v2";
  const CACHE_TTL = 30 * 60 * 1000;
  let contributorsData = [];

  function loadRegistryContributors() {
    if (
      typeof CONTRIBUTORS_REGISTRY === "undefined" ||
      !Array.isArray(CONTRIBUTORS_REGISTRY)
    )
      return;

    contributorsData = CONTRIBUTORS_REGISTRY.map((regUser) => {
      let userGames = [];
      if (
        typeof GAMES_REGISTRY !== "undefined" &&
        Array.isArray(GAMES_REGISTRY)
      ) {
        userGames = GAMES_REGISTRY.filter(
          (g) =>
            g.github && g.github.toLowerCase() === regUser.github.toLowerCase(),
        );
      }
      const gamesCount =
        userGames.length > 0 ? userGames.length : regUser.gamesCount || 0;
      const gamesList =
        userGames.length > 0
          ? userGames.map((g) => ({
              title: g.title,
              category: g.category,
              role: g.role,
              tags: g.tags,
            }))
          : regUser.contributions || [];

      return {
        login: regUser.github,
        name: regUser.name,
        role: regUser.role || "Community Contributor",
        avatar_url: `https://github.com/${regUser.github}.png`,
        commits: regUser.commits || 1,
        gamesCount: gamesCount,
        mechanicsBonus: regUser.mechanicsBonus || 0,
        platformPRs: regUser.platformPRs || 0,
        qualityPRs: regUser.qualityPRs || 0,
        bonusPts: regUser.bonusPts || 0,
        games: gamesList,
      };
    });
  }

  function calculateScore(item) {
    const gamePts = (item.gamesCount || 0) * 100;
    const mechanicsPts = (item.mechanicsBonus || 0) * 25;
    const featurePts = (item.platformPRs || 0) * 50;
    const fixPts = (item.qualityPRs || 0) * 25;
    const commitPts = (item.commits || 0) * 5;
    const bonus = item.bonusPts || 0;
    return gamePts + mechanicsPts + featurePts + fixPts + commitPts + bonus;
  }

  function getContributorBadges(user) {
    const badges = [];
    const userHandle = (user.login || user.github || "").toLowerCase();
    const isAdmin = userHandle === "debasmitabose0";

    if (isAdmin) {
      badges.push({
        role: "Project Admin & Lead",
        tagClass: "role-admin",
        label: "Project Admin & Lead",
        lucideIcon: "crown",
        category: "Leadership",
        requirement: "Project Lead & Core Platform Architect",
      });
    }

    const gamesCount = user.gamesCount || 0;
    if (gamesCount >= 3) {
      badges.push({
        role: "Arcade Developer",
        tagClass: "role-arcade",
        label: "Arcade Developer",
        lucideIcon: "gamepad-2",
        category: "Games Dedicated",
        requirement: "Requires 3–4 Verified Games in 'games/' folder",
      });
    } else if (gamesCount >= 1) {
      badges.push({
        role: "Novice Game Creator",
        tagClass: "role-novice-creator",
        label: "Novice Game Creator",
        lucideIcon: "compass",
        category: "Games Dedicated",
        requirement: "Requires 1 Verified Game in 'games/' folder",
      });
    }

    const score = calculateScore(user);
    if (score >= 1000) {
      badges.push({
        role: "Elite Contributor",
        tagClass: "role-elite",
        label: "Elite Contributor",
        lucideIcon: "zap",
        category: "Platform & Core",
        requirement: "Requires 1,000–1,799 Arcade Points",
      });
    } else if (score >= 100) {
      badges.push({
        role: "Rising Contributor",
        tagClass: "role-rising",
        label: "Rising Contributor",
        lucideIcon: "trending-up",
        category: "Getting Started",
        requirement: "Requires 100–249 Arcade Points",
      });
    }

    return badges;
  }

  function isBotAccount(login) {
    if (!login) return false;
    const l = login.toLowerCase();
    return (
      l.endsWith("[bot]") ||
      l.includes("bot") ||
      l.includes("actions-user") ||
      l === "github-actions"
    );
  }

  function getCommunityContributors() {
    return contributorsData
      .filter(
        (item) =>
          item.login &&
          item.login.toLowerCase() !== "debasmitabose0" &&
          !isBotAccount(item.login),
      )
      .sort((a, b) => calculateScore(b) - calculateScore(a));
  }

  function getWorkBreakdown(item) {
    return `Games: ${item.gamesCount || 0} • Feat: ${item.platformPRs || 0} • Fix: ${item.qualityPRs || 0}`;
  }

  function getFallbackAvatarSvg(name, login) {
    const char = ((name || login || "?").trim().charAt(0) || "?").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366f1"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="64" height="64" rx="32" fill="url(%23g)"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="%23ffffff" font-family="system-ui,-apple-system,sans-serif" font-size="26" font-weight="700">${char}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Floating Compare Bar Setup
  const floatingCompareBar = document.createElement("div");
  floatingCompareBar.className = "compare-floating-bar";
  floatingCompareBar.innerHTML = `
    <span class="compare-floating-text" id="compare-count-text">0 selected for Versus comparison</span>
    <button type="button" class="compare-action-btn" id="launch-versus-btn">
      <i data-lucide="swords" style="width: 14px; height: 14px;"></i> Compare Versus
    </button>
    <button type="button" class="compare-clear-btn" id="clear-compare-btn">Clear</button>
  `;
  document.body.appendChild(floatingCompareBar);

  const launchVersusBtn = document.getElementById("launch-versus-btn");
  const clearCompareBtn = document.getElementById("clear-compare-btn");
  const compareCountText = document.getElementById("compare-count-text");

  function updateCompareFloatingBar() {
    const count = selectedCompareLogins.length;
    if (count > 0) {
      floatingCompareBar.classList.add("visible");
      compareCountText.textContent = `${count}/2 contributor${count > 1 ? "s" : ""} selected`;
      if (count === 2) {
        launchVersusBtn.style.opacity = "1";
        launchVersusBtn.removeAttribute("disabled");
      } else {
        launchVersusBtn.style.opacity = "0.7";
      }
    } else {
      floatingCompareBar.classList.remove("visible");
    }
    if (window.lucide) lucide.createIcons();
  }

  if (clearCompareBtn) {
    clearCompareBtn.addEventListener("click", () => {
      selectedCompareLogins = [];
      document
        .querySelectorAll(".compare-checkbox")
        .forEach((cb) => (cb.checked = false));
      updateCompareFloatingBar();
    });
  }

  if (launchVersusBtn) {
    launchVersusBtn.addEventListener("click", () => {
      if (selectedCompareLogins.length === 2) {
        openVersusModal(selectedCompareLogins[0], selectedCompareLogins[1]);
      }
    });
  }

  function handleCompareCheckboxChange(login, isChecked) {
    if (isChecked) {
      if (selectedCompareLogins.length >= 2) {
        const removedLogin = selectedCompareLogins.shift();
        const oldCheckbox = document.querySelector(
          `.compare-checkbox[data-login="${removedLogin}"]`,
        );
        if (oldCheckbox) oldCheckbox.checked = false;
      }
      selectedCompareLogins.push(login);
    } else {
      selectedCompareLogins = selectedCompareLogins.filter((l) => l !== login);
    }
    updateCompareFloatingBar();
  }

  function openVersusModal(login1, login2) {
    const p1 = contributorsData.find(
      (c) => c.login.toLowerCase() === login1.toLowerCase(),
    );
    const p2 = contributorsData.find(
      (c) => c.login.toLowerCase() === login2.toLowerCase(),
    );
    if (!p1 || !p2) return;

    const score1 = calculateScore(p1);
    const score2 = calculateScore(p2);
    const badges1 = getContributorBadges(p1);
    const badges2 = getContributorBadges(p2);
    const fallbackAvatar1 = getFallbackAvatarSvg(p1.name, p1.login);
    const fallbackAvatar2 = getFallbackAvatarSvg(p2.name, p2.login);

    const maxScore = Math.max(score1, score2, 100);
    const maxGames = Math.max(p1.gamesCount || 0, p2.gamesCount || 0, 5);
    const maxCommits = Math.max(p1.commits || 0, p2.commits || 0, 10);

    const overlay = document.createElement("div");
    overlay.className = "versus-modal-overlay";
    overlay.innerHTML = `
      <div class="badge-legend-backdrop" id="versus-backdrop"></div>
      <div class="versus-modal-window">
        <div class="versus-modal-header">
          <h2><i data-lucide="swords"></i> Head-to-Head Versus Comparison</h2>
          <button type="button" class="badge-legend-close-btn" id="close-versus-btn" aria-label="Close">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="versus-modal-body">
          <div class="versus-players-header">
            <div class="versus-player-card">
              <img src="${p1.avatar_url || fallbackAvatar1}" alt="${p1.name}" class="versus-avatar">
              <h3 class="versus-name">${p1.name}</h3>
              <a href="https://github.com/${p1.login}" target="_blank" class="versus-handle">@${p1.login}</a>
            </div>
            <div class="versus-vs-badge">VS</div>
            <div class="versus-player-card">
              <img src="${p2.avatar_url || fallbackAvatar2}" alt="${p2.name}" class="versus-avatar">
              <h3 class="versus-name">${p2.name}</h3>
              <a href="https://github.com/${p2.login}" target="_blank" class="versus-handle">@${p2.login}</a>
            </div>
          </div>

          <div class="versus-stats-grid">
            <div class="versus-stat-row">
              <div class="versus-stat-meta">
                <span>${score1} pts</span>
                <span class="versus-stat-label">Total Arcade Points</span>
                <span>${score2} pts</span>
              </div>
              <div class="versus-bars-container">
                <div class="versus-bar-wrap player-1">
                  <div class="versus-bar-track"><div class="versus-bar-fill p1" style="width: ${(score1 / maxScore) * 100}%;"></div></div>
                </div>
                <div class="versus-bar-wrap player-2">
                  <div class="versus-bar-track"><div class="versus-bar-fill p2" style="width: ${(score2 / maxScore) * 100}%;"></div></div>
                </div>
              </div>
            </div>

            <div class="versus-stat-row">
              <div class="versus-stat-meta">
                <span>${p1.gamesCount || 0} Games</span>
                <span class="versus-stat-label">Verified Standalone Games</span>
                <span>${p2.gamesCount || 0} Games</span>
              </div>
              <div class="versus-bars-container">
                <div class="versus-bar-wrap player-1">
                  <div class="versus-bar-track"><div class="versus-bar-fill p1" style="width: ${((p1.gamesCount || 0) / maxGames) * 100}%;"></div></div>
                </div>
                <div class="versus-bar-wrap player-2">
                  <div class="versus-bar-track"><div class="versus-bar-fill p2" style="width: ${((p2.gamesCount || 0) / maxGames) * 100}%;"></div></div>
                </div>
              </div>
            </div>

            <div class="versus-stat-row">
              <div class="versus-stat-meta">
                <span>${p1.commits || 0} Commits</span>
                <span class="versus-stat-label">Commits</span>
                <span>${p2.commits || 0} Commits</span>
              </div>
              <div class="versus-bars-container">
                <div class="versus-bar-wrap player-1">
                  <div class="versus-bar-track"><div class="versus-bar-fill p1" style="width: ${((p1.commits || 0) / maxCommits) * 100}%;"></div></div>
                </div>
                <div class="versus-bar-wrap player-2">
                  <div class="versus-bar-track"><div class="versus-bar-fill p2" style="width: ${((p2.commits || 0) / maxCommits) * 100}%;"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();

    const closeBtn = overlay.querySelector("#close-versus-btn");
    const backdrop = overlay.querySelector("#versus-backdrop");
    const close = () => overlay.remove();
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
  }

  function matchesRoleFilter(item) {
    if (currentRoleFilter === "all") return true;

    const normalize = (value) => (value || "").trim().toLowerCase();
    const contributorRole = normalize(item.role);
    const games = (item.games || []).filter(
      (game) => typeof game === "object" && game !== null,
    );

    if (currentRoleFilter === "arcade") {
      return (
        /^arcade developer(?:\b|$)/.test(contributorRole) ||
        games.some((game) => {
          const category = normalize(game.category);
          const gameRole = normalize(game.role);
          const tags = Array.isArray(game.tags)
            ? game.tags.map(normalize)
            : [];
          return (
            /^arcade developer(?:\b|$)/.test(gameRole) ||
            category.split(/\s*\/\s*/).includes("arcade") ||
            tags.includes("arcade")
          );
        })
      );
    }

    if (currentRoleFilter === "puzzle") {
      return (
        /^puzzle developer(?:\b|$)/.test(contributorRole) ||
        games.some((game) => {
          const category = normalize(game.category);
          const gameRole = normalize(game.role);
          const tags = Array.isArray(game.tags)
            ? game.tags.map(normalize)
            : [];
          return (
            /^puzzle developer(?:\b|$)/.test(gameRole) ||
            category.split(/\s*\/\s*/).includes("puzzle") ||
            tags.includes("puzzle")
          );
        })
      );
    }

    if (currentRoleFilter === "platform") {
      return (
        /^(?:project admin\b|.*\b(?:platform|architect)\b)/.test(
          contributorRole,
        ) ||
        (item.platformPRs || 0) > 0
      );
    }

    return true;
  }

  function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    const allCommunityContributors = getCommunityContributors().map(
      (item, idx) => ({ ...item, rank: idx + 1 }),
    );

    const communityContributors = allCommunityContributors.filter((item) => {
      if (!matchesRoleFilter(item)) return false;

      if (!tableSearchQuery) return true;
      const q = tableSearchQuery;
      return (
        (item.name || "").toLowerCase().includes(q) ||
        (item.login || "").toLowerCase().includes(q) ||
        (item.role || "").toLowerCase().includes(q)
      );
    });

    const totalItems = communityContributors.length;
    if (totalItems === 0) {
      if (paginationBar) paginationBar.style.display = "none";
      const emptyTr = document.createElement("tr");
      emptyTr.innerHTML = `<td colspan="10" style="text-align: center; padding: 2.2rem; color: var(--text-muted);">No contributors found matching current filters.</td>`;
      tableBody.appendChild(emptyTr);
      return;
    }

    let itemsToRender = communityContributors;
    let totalPages = 1;
    let startIdx = 0;
    let endIdx = totalItems;

    if (pageSize !== "all") {
      const limit = typeof pageSize === "number" ? pageSize : 10;
      totalPages = Math.max(1, Math.ceil(totalItems / limit));
      if (currentPage > totalPages) currentPage = totalPages;
      startIdx = (currentPage - 1) * limit;
      endIdx = Math.min(startIdx + limit, totalItems);
      itemsToRender = communityContributors.slice(startIdx, endIdx);
    }
    currentTotalPages = totalPages;

    const tableHeaderRow = document.querySelector(
      "#leaderboard-table thead tr",
    );
    if (tableHeaderRow && !tableHeaderRow.querySelector(".th-compare")) {
      const thCompare = document.createElement("th");
      thCompare.className = "th-compare";
      thCompare.style.width = "45px";
      thCompare.style.textAlign = "center";
      thCompare.textContent = "Compare";
      tableHeaderRow.insertBefore(thCompare, tableHeaderRow.firstChild);
    }

    itemsToRender.forEach((item) => {
      const rank = item.rank;
      const score = calculateScore(item);
      const badges = getContributorBadges(item);
      const fallbackAvatar = getFallbackAvatarSvg(item.name, item.login);
      const isChecked = selectedCompareLogins.includes(item.login);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align: center;">
          <div class="compare-checkbox-wrap">
            <input type="checkbox" class="compare-checkbox" data-login="${escapeAttr(item.login)}" ${isChecked ? "checked" : ""} aria-label="Compare ${escapeAttr(item.name)}">
          </div>
        </td>
        <td><span class="rank-tag">#${rank}</span></td>
        <td>
          <div class="table-user-cell">
            <img src="${item.avatar_url || fallbackAvatar}" alt="${item.name}" class="table-user-avatar" onerror="this.onerror=null; this.src='${fallbackAvatar}';">
            <div>
              <strong class="user-display-name">${highlightMatch(item.name, tableSearchQuery)}</strong>
              <span class="user-handle-sub">@${highlightMatch(item.login, tableSearchQuery)}</span>
            </div>
          </div>
        </td>
        <td><div class="contributor-badges-wrap">${badges.map(renderBadgeHtml).join("")}</div></td>
        <td><a href="https://github.com/${item.login}" target="_blank" class="github-handle-link">@${highlightMatch(item.login, tableSearchQuery)}</a></td>
        <td style="text-align: center;"><span class="games-count-pill"><i data-lucide="gamepad-2"></i> ${item.gamesCount}</span></td>
        <td style="text-align: center;"><span class="files-count-pill"><i data-lucide="git-pull-request"></i> ${getWorkBreakdown(item)}</span></td>
        <td style="text-align: center;"><span class="commits-count-pill"><i data-lucide="git-commit"></i> ${item.commits}</span></td>
        <td style="text-align: center;">
          <a href="https://github.com/DebasmitaBose0/ArcadeVerse/pulls?q=author%3A${item.login}" target="_blank" class="activity-link-btn"><i data-lucide="git-pull-request"></i> PRs</a>
        </td>
        <td style="text-align: right;"><strong class="score-highlight">${score} pts</strong></td>
      `;

      const checkbox = tr.querySelector(".compare-checkbox");
      if (checkbox) {
        checkbox.addEventListener("change", (e) =>
          handleCompareCheckboxChange(item.login, e.target.checked),
        );
      }

      tableBody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
  }

  loadRegistryContributors();
  renderTable();
});
