async function renderMatchDetail(main, params) {
  showLoading(true);
  const match = await MatchDB.getById(Number(params.id));
  if (!match) {
    main.innerHTML = `<div class="empty-state"><h3>Partido no encontrado</h3></div>`;
    showLoading(false);
    return;
  }

  const league = await getActiveLeague();
  const sport = league ? getSport(league.sport) : SPORTS.valorant;
  const home = await TeamDB.getById(match.homeTeamId);
  const away = await TeamDB.getById(match.awayTeamId);
  const events = await EventDB.getByMatch(match.id);
  const homePlayers = home ? await PlayerDB.getByTeam(home.id) : [];
  const awayPlayers = away ? await PlayerDB.getByTeam(away.id) : [];
  const date = new Date(match.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const homeEvents = events.filter(e => e.teamId === match.homeTeamId);
  const awayEvents = events.filter(e => e.teamId === match.awayTeamId);

  function renderEvents() {
    const homeCol = main.querySelector('#ev-home');
    const awayCol = main.querySelector('#ev-away');
    if (!homeCol || !awayCol) return;

    const he = events.filter(e => e.teamId === match.homeTeamId);
    const ae = events.filter(e => e.teamId === match.awayTeamId);

    const renderEventList = (evts, container) => {
      container.innerHTML = evts.map(ev => {
        const player = [...homePlayers, ...awayPlayers].find(p => p.id === ev.playerId);
        return `<div class="event-item">
          <span>${player?.name || '???'}</span>
          <span class="event-minute">${ev.minute ? `min ${ev.minute}` : ''}</span>
        </div>`;
      }).join('') || '<p style="color:var(--text-muted);font-size:0.85rem">Sin eventos</p>';
    };

    renderEventList(he, homeCol);
    renderEventList(ae, awayCol);

    const homeScoreEl = main.querySelector('#score-home');
    const awayScoreEl = main.querySelector('#score-away');
    if (homeScoreEl) homeScoreEl.textContent = he.length;
    if (awayScoreEl) awayScoreEl.textContent = ae.length;
  }

  main.innerHTML = `
    <a href="#" class="btn-back" onclick="event.preventDefault(); router.navigate('matches')">← Volver a partidos</a>

    <div style="text-align:center;margin-bottom:2rem">
      <div style="display:flex;align-items:center;justify-content:center;gap:2rem;margin-bottom:0.5rem">
        <div style="text-align:center">
          <div class="team-badge" style="width:60px;height:60px;font-size:1.2rem;margin:0 auto 0.25rem;background:${home?.primaryColor || '#333'}">${home?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}</div>
          <div style="font-weight:600">${home?.name || '???'}</div>
        </div>
        <div style="font-size:3rem;font-weight:800;font-family:var(--font-mono);min-width:100px">
          ${match.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : '<span style="font-size:1.5rem;color:var(--text-muted)">VS</span>'}
        </div>
        <div style="text-align:center">
          <div class="team-badge" style="width:60px;height:60px;font-size:1.2rem;margin:0 auto 0.25rem;background:${away?.primaryColor || '#333'}">${away?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}</div>
          <div style="font-weight:600">${away?.name || '???'}</div>
        </div>
      </div>
      <p style="color:var(--text-secondary);font-size:0.9rem">${date} · <span class="match-status ${match.status}">${match.status === 'finished' ? 'Finalizado' : match.status === 'scheduled' ? 'Programado' : 'Pendiente'}</span></p>
    </div>

    ${match.status !== 'finished' ? `
    <div id="event-section">
      <podium-event-form id="event-form"></podium-event-form>
      <div class="event-columns">
        <div class="event-column">
          <h4>${home?.name || 'Local'} <span id="score-home" style="color:var(--accent)">${homeEvents.length}</span></h4>
          <div id="ev-home"></div>
        </div>
        <div class="event-column">
          <h4>${away?.name || 'Visitante'} <span id="score-away" style="color:var(--accent)">${awayEvents.length}</span></h4>
          <div id="ev-away"></div>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:1rem">
        <button class="btn btn-primary" id="btn-finish">Finalizar partido</button>
      </div>
    </div>
    ` : `
    <div style="text-align:center">
      <button class="btn btn-danger" id="btn-undo">Deshacer partido</button>
    </div>
    `}
  `;

  if (match.status !== 'finished') {
    const eventForm = main.querySelector('#event-form');
    if (eventForm) {
      eventForm.data = { match, homeTeam: home, awayTeam: away, homePlayers, awayPlayers, sport };
      eventForm.onAdd = async (data) => {
        if (!data.playerId || !data.teamId) return;
        await EventDB.create({
          matchId: match.id,
          playerId: data.playerId,
          teamId: data.teamId,
          minute: data.minute || null,
        });
        const updatedEvents = await EventDB.getByMatch(match.id);
        events.length = 0;
        events.push(...updatedEvents);

        match.homeScore = events.filter(e => e.teamId === match.homeTeamId).length;
        match.awayScore = events.filter(e => e.teamId === match.awayTeamId).length;
        await MatchDB.update(match.id, { homeScore: match.homeScore, awayScore: match.awayScore });

        renderEvents();
        showToast(`${sport.terms.eventName} registrada`, 'success');
      };
      renderEvents();
    }

    main.querySelector('#btn-finish').onclick = async () => {
      if (league.mode === 'eliminacion' && match.homeScore === match.awayScore) {
        showToast('En eliminación directa debes declarar un ganador (marcador no puede quedar empatado)', 'error');
        return;
      }
      try {
        await finalizarPartido(match.id);
        showToast('Partido finalizado', 'success');
        renderMatchDetail(main, params);
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
  } else {
    main.querySelector('#btn-undo').onclick = async () => {
      const confirmed = await confirmAction('¿Deshacer este partido? Las estadísticas volverán al estado anterior.');
      if (!confirmed) return;
      try {
        await deshacerPartido(match.id);
        showToast('Partido deshecho', 'success');
        renderMatchDetail(main, params);
      } catch (e) {
        showToast(e.message, 'error');
      }
    };
  }

  showLoading(false);
}
