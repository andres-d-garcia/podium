document.addEventListener('DOMContentLoaded', async () => {
  try {
    await openDB();
    document.querySelector('podium-footer').setAttribute('db-status', 'connected');
    initRouter();
    await loadSampleData();
    await restoreActiveLeague();
    router.start();
  } catch (e) {
    console.error('Error inicializando Podium:', e);
    document.querySelector('podium-footer').setAttribute('db-status', 'error');
    document.getElementById('app').innerHTML = `
      <div class="empty-state">
        <h3>Error de conexión</h3>
        <p>No se pudo conectar con IndexedDB: ${e.message}</p>
      </div>
    `;
  }
});

async function restoreActiveLeague() {
  const savedId = localStorage.getItem('podium-active-league');
  if (savedId) {
    const league = await LeagueDB.getById(Number(savedId));
    if (league) {
      await LeagueDB.setActive(league.id);
    }
  }
}

function initRouter() {
  router.addRoute('dashboard', renderDashboard);
  router.addRoute('leagues', renderLeagues);
  router.addRoute('teams', renderTeams);
  router.addRoute('team/:id', renderTeamDetail);
  router.addRoute('players', renderPlayers);
  router.addRoute('player/:id', renderPlayerDetail);
  router.addRoute('matches', renderMatches);
  router.addRoute('match/:id', renderMatchDetail);
  router.addRoute('stats', renderStats);
}

function getActiveLeague() {
  return LeagueDB.getActive();
}

async function refreshActiveLeagueIndicator() {
  const nav = document.querySelector('podium-navbar');
  const league = await getActiveLeague();
  if (nav) {
    if (league) {
      const sport = getSport(league.sport);
      nav.setAttribute('league-name', league.name);
      nav.setAttribute('league-sport', sport.name);
      nav.setAttribute('league-icon', sport.icon);
      document.body.setAttribute('data-sport', league.sport);
    } else {
      nav.removeAttribute('league-name');
      nav.removeAttribute('league-sport');
      nav.removeAttribute('league-icon');
      document.body.removeAttribute('data-sport');
    }
  }
}

function showToast(message, type = 'info') {
  const toast = document.querySelector('podium-toast');
  if (toast) toast.show(message, type);
}

function showLoading(show = true) {
  const loading = document.querySelector('podium-loading');
  if (loading) loading.visible = show;
}

function confirmAction(message) {
  return new Promise((resolve) => {
    const dialog = document.querySelector('podium-confirm');
    dialog.show(message, resolve);
  });
}
