async function renderDashboard(main) {
  const league = await getActiveLeague();
  if (!league) {
    main.innerHTML = `
      <div class="empty-state">
        <h3>Bienvenido a Podium</h3>
        <p>Aún no hay ninguna liga creada. ¡Crea tu primera liga de eSports!</p>
        <button class="btn btn-primary" onclick="router.navigate('leagues')">Crear primera liga</button>
      </div>
    `;
    return;
  }

  const sport = getSport(league.sport);
  const teams = await TeamDB.getByLeague(league.id);
  const allMatches = await MatchDB.getByLeague(league.id);
  const finished = allMatches.filter(m => m.status === 'finished');
  const scheduled = allMatches.filter(m => m.status === 'scheduled');
  const nextMatch = scheduled.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const lastMatch = finished.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const sortedTeams = [...teams].sort((a, b) => b.stats.pts - a.stats.pts);

  let nextHtml = '<p style="color:var(--text-muted)">No hay partidos programados</p>';
  if (nextMatch) {
    const home = await TeamDB.getById(nextMatch.homeTeamId);
    const away = await TeamDB.getById(nextMatch.awayTeamId);
    const date = new Date(nextMatch.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    nextHtml = `<p><strong>${home?.name || '???'}</strong> vs <strong>${away?.name || '???'}</strong> — ${date}</p>`;
  }

  let lastHtml = '<p style="color:var(--text-muted)">No hay partidos finalizados</p>';
  if (lastMatch) {
    const home = await TeamDB.getById(lastMatch.homeTeamId);
    const away = await TeamDB.getById(lastMatch.awayTeamId);
    lastHtml = `<p><strong>${home?.name || '???'}</strong> ${lastMatch.homeScore} - ${lastMatch.awayScore} <strong>${away?.name || '???'}</strong></p>`;
  }

  let topHtml = '';
  if (league.mode === 'liga') {
    const top5 = sortedTeams.slice(0, 5);
    topHtml = `
      <h4>Top 5 — Tabla de posiciones</h4>
      <table style="width:100%;font-size:0.85rem">
        <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PTS</th></tr></thead>
        <tbody>
          ${top5.map((t, i) => `<tr><td>${i + 1}</td><td>${t.name}</td><td>${t.stats.pj}</td><td><strong>${t.stats.pts}</strong></td></tr>`).join('')}
        </tbody>
      </table>
      <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem" onclick="router.navigate('stats')">Ver tabla completa</button>
    `;
  } else {
    topHtml = `<p style="color:var(--text-muted)">Modalidad eliminación directa. <a href="#" onclick="router.navigate('stats')">Ver bracket completo</a></p>`;
  }

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">${sport.icon} ${league.name} <span style="font-size:0.9rem;color:var(--text-secondary);font-weight:400">— ${sport.name} · ${league.season}</span></div>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <h4>📅 Próximo partido</h4>
        ${nextHtml}
      </div>
      <div class="card">
        <h4>🏁 Último resultado</h4>
        ${lastHtml}
      </div>
      <div class="card full-width">
        ${topHtml}
      </div>
      <div class="card full-width">
        <h4>Distribución de resultados</h4>
        <podium-chart id="chart-results"></podium-chart>
      </div>
      <div class="card full-width">
        <h4>Evolución de puntos</h4>
        <podium-chart id="chart-evolution"></podium-chart>
      </div>
      <div class="card full-width">
        <h4>Top anotadores</h4>
        <podium-chart id="chart-top"></podium-chart>
      </div>
    </div>
  `;

  if (finished.length > 0) {
    const teamPlayers = [];
    for (const team of teams) {
      const players = await PlayerDB.getByTeam(team.id);
      teamPlayers.push(...players.map(p => ({ ...p, teamName: team.name })));
    }

    setTimeout(() => {
      const chartResults = main.querySelector('#chart-results');
      if (chartResults) chartResults.renderChart(getResultDistributionChart(teams));

      const chartEvolution = main.querySelector('#chart-evolution');
      const evoConfig = getPointsByDateChart(allMatches, teams);
      if (chartEvolution) chartEvolution.renderChart(evoConfig);

      const chartTop = main.querySelector('#chart-top');
      if (chartTop && teamPlayers.length > 0) {
        chartTop.renderChart(getTopScorersChart(teamPlayers, 10, sport.terms.eventNamePlural));
      }
    }, 50);
  }

  await refreshActiveLeagueIndicator();
}
