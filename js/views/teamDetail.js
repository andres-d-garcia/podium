async function renderTeamDetail(main, params) {
  showLoading(true);
  const team = await TeamDB.getById(Number(params.id));
  if (!team) {
    main.innerHTML = `<div class="empty-state"><h3>Equipo no encontrado</h3></div>`;
    showLoading(false);
    return;
  }

  const players = await PlayerDB.getByTeam(team.id);
  const activeLeague = await getActiveLeague();
  const allMatches = await MatchDB.getByTeam(team.id);
  const matches = allMatches.filter(m => m.leagueId === activeLeague?.id);
  const finished = matches.filter(m => m.status === 'finished').sort((a, b) => new Date(b.date) - new Date(a.date));
  const upcoming = matches.filter(m => m.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date));
  const initials = team.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const ptsData = [];
  let pts = 0;

  for (const m of finished) {
    const isHome = m.homeTeamId === team.id;
    const scored = isHome ? m.homeScore : m.awayScore;
    const against = isHome ? m.awayScore : m.homeScore;
    if (scored > against) pts += 3;
    else if (scored === against) pts += 1;
    ptsData.push(pts);
  }

  main.innerHTML = `
    <a href="#" class="btn-back" onclick="event.preventDefault(); router.navigate('teams')">← Volver a equipos</a>
    <div class="detail-header">
      <div class="detail-avatar" style="background:${team.primaryColor}">${initials}</div>
      <div class="detail-info">
        <h1>${team.name}</h1>
        <div class="detail-meta">${team.city || 'Sin sede'} · ${players.length} jugadores</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${team.stats.pj}</div><div class="stat-label">PJ</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.pg}</div><div class="stat-label">PG</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.pe}</div><div class="stat-label">PE</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.pp}</div><div class="stat-label">PP</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.pf}</div><div class="stat-label">PF</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.pc}</div><div class="stat-label">PC</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.dif}</div><div class="stat-label">DIF</div></div>
      <div class="stat-card"><div class="stat-value">${team.stats.pts}</div><div class="stat-label">PTS</div></div>
    </div>

    <div class="section-header">
      <h3 class="section-title" style="font-size:1.1rem">👥 Plantilla (${players.length})</h3>
      <button class="btn btn-primary btn-sm" onclick="router.navigate('players')">+ Agregar jugador</button>
    </div>
    <div class="grid-list" id="team-players">
      ${players.length === 0 ? '<p style="color:var(--text-muted)">Sin jugadores</p>' : ''}
    </div>

    ${upcoming.length > 0 ? `
      <h3 class="section-title" style="font-size:1.1rem;margin-top:2rem">📅 Próximos partidos</h3>
      <div id="team-upcoming"></div>
    ` : ''}

    ${finished.length > 0 ? `
      <h3 class="section-title" style="font-size:1.1rem;margin-top:2rem">🏁 Partidos jugados</h3>
      <div id="team-finished"></div>
      <div class="card" style="margin-top:1.5rem">
        <h4>Evolución de puntos</h4>
        <podium-chart id="chart-team-evo"></podium-chart>
      </div>
    ` : ''}
  `;

  const playerContainer = main.querySelector('#team-players');
  for (const p of players) {
    const pCard = document.createElement('div');
    pCard.className = 'card player-card';
    pCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem">
        <div class="player-avatar" style="width:40px;height:40px;margin:0;font-size:0.9rem">
          ${p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <strong>${p.name}</strong>
          <p style="color:var(--text-muted);font-size:0.8rem;margin:0">${p.position || ''} ${p.number ? `#${p.number}` : ''}</p>
        </div>
      </div>
    `;
    pCard.onclick = () => router.navigate(`player/${p.id}`);
    playerContainer.appendChild(pCard);
  }

  if (upcoming.length > 0) {
    const upDiv = main.querySelector('#team-upcoming');
    for (const m of upcoming) {
      const opp = await TeamDB.getById(m.homeTeamId === team.id ? m.awayTeamId : m.homeTeamId);
      const date = new Date(m.date).toLocaleDateString('es-ES');
      upDiv.innerHTML += `<p style="font-size:0.9rem;color:var(--text-secondary)">vs <strong>${opp?.name || '???'}</strong> — ${date}</p>`;
    }
  }

  if (finished.length > 0) {
    const finDiv = main.querySelector('#team-finished');
    for (const m of finished) {
      const isHome = m.homeTeamId === team.id;
      const opp = await TeamDB.getById(isHome ? m.awayTeamId : m.homeTeamId);
      const result = m.homeScore > m.awayScore ? (isHome ? 'V' : 'D') : m.homeScore < m.awayScore ? (isHome ? 'D' : 'V') : 'E';
      const color = result === 'V' ? 'var(--success)' : result === 'D' ? 'var(--error)' : 'var(--warning)';
      const date = new Date(m.date).toLocaleDateString('es-ES');
      finDiv.innerHTML += `
        <div class="match-card card" style="cursor:pointer;margin-bottom:0.5rem;padding:0.75rem" data-match="${m.id}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>vs <strong>${opp?.name || '???'}</strong></span>
            <span><strong>${m.homeScore} - ${m.awayScore}</strong></span>
            <span style="color:${color};font-weight:700">${result}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">${date}</div>
        </div>
      `;
      finDiv.lastChild.onclick = () => router.navigate(`match/${m.id}`);
    }

    setTimeout(() => {
      const chart = main.querySelector('#chart-team-evo');
      if (chart && finished.length > 0) {
        const labels = finished.map((_, i) => `#${i + 1}`);
        chart.renderChart({
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: team.name,
              data: ptsData,
              borderColor: team.primaryColor || '#ff4655',
              fill: false,
              tension: 0.3,
            }],
          },
          options: {
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#8b978f' }, grid: { color: '#2a3648' } }, y: { ticks: { color: '#8b978f' }, grid: { color: '#2a3648' } } },
          },
        });
      }
    }, 50);
  }

  showLoading(false);
}
