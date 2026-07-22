async function renderMatches(main) {
  const league = await getActiveLeague();
  if (!league) {
    main.innerHTML = `<div class="empty-state"><h3>Sin liga activa</h3></div>`;
    return;
  }

  showLoading(true);
  const teams = await TeamDB.getByLeague(league.id);
  const allMatches = await MatchDB.getByLeague(league.id);
  let filtered = [...allMatches];
  const rounds = [...new Set(allMatches.map(m => m.round))].sort();

  function applyFilters() {
    const status = main.querySelector('#mf-status').value;
    const team = main.querySelector('#mf-team').value;
    const round = main.querySelector('#mf-round')?.value;
    filtered = allMatches.filter(m => {
      if (status && m.status !== status) return false;
      if (team && m.homeTeamId !== Number(team) && m.awayTeamId !== Number(team)) return false;
      if (round && m.round !== Number(round)) return false;
      return true;
    });
    renderList();
  }

  async function renderList() {
    const container = main.querySelector('#match-list');
    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>Sin resultados</h3></div>';
      return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const m of sorted) {
      const home = await TeamDB.getById(m.homeTeamId);
      const away = await TeamDB.getById(m.awayTeamId);
      const date = new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

      const card = document.createElement('div');
      card.className = 'card match-card';
      card.style.cssText = 'padding:0.75rem;margin-bottom:0.5rem';
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
          <span style="flex:1;text-align:right;font-weight:600">${home?.name || '???'}</span>
          ${m.status === 'finished'
            ? `<span style="font-size:1.25rem;font-weight:800;font-family:var(--font-mono);min-width:60px;text-align:center">${m.homeScore} - ${m.awayScore}</span>`
            : `<span style="color:var(--text-muted);font-weight:600;min-width:60px;text-align:center">VS</span>`
          }
          <span style="flex:1;font-weight:600">${away?.name || '???'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.8rem;color:var(--text-secondary)">
          <span>${date} ${league.mode === 'eliminacion' ? `· Ronda ${m.round}` : ''}</span>
          <span class="match-status ${m.status}">
            ${m.status === 'finished' ? 'Finalizado' : m.status === 'scheduled' ? 'Programado' : 'Pendiente'}
          </span>
        </div>
      `;
      card.onclick = () => router.navigate(`match/${m.id}`);
      container.appendChild(card);
    }
  }

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">🎮 Partidos — ${league.name}</div>
      ${league.mode === 'liga' && teams.length >= 2 ? `<button class="btn btn-primary" id="btn-create-match">+ Programar partido</button>` : ''}
    </div>
    <div class="filters-bar">
      <div class="form-group">
        <label>Estado</label>
        <select id="mf-status">
          <option value="">Todos</option>
          <option value="scheduled">Programados</option>
          <option value="finished">Finalizados</option>
          <option value="pending">Pendientes</option>
        </select>
      </div>
      <div class="form-group">
        <label>Equipo</label>
        <select id="mf-team">
          <option value="">Todos</option>
          ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      ${league.mode === 'eliminacion' ? `
      <div class="form-group">
        <label>Ronda</label>
        <select id="mf-round">
          <option value="">Todas</option>
          ${rounds.map(r => `<option value="${r}">Ronda ${r}</option>`).join('')}
        </select>
      </div>
      ` : ''}
      <button class="btn btn-secondary" id="mf-clear">Limpiar</button>
    </div>
    <div id="match-list"></div>
    <div id="match-modal" class="modal-overlay" style="display:none"></div>
  `;

  main.querySelector('#mf-status').onchange = applyFilters;
  main.querySelector('#mf-team').onchange = applyFilters;
  main.querySelector('#mf-round')?.addEventListener('change', applyFilters);
  main.querySelector('#mf-clear').onclick = () => {
    main.querySelector('#mf-status').value = '';
    main.querySelector('#mf-team').value = '';
    if (main.querySelector('#mf-round')) main.querySelector('#mf-round').value = '';
    applyFilters();
  };

  const createBtn = main.querySelector('#btn-create-match');
  if (createBtn) createBtn.onclick = () => showMatchForm(main, league, teams);

  applyFilters();
  showLoading(false);
}

function showMatchForm(main, league, teams) {
  const modal = main.querySelector('#match-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Programar partido</h2>
      <form id="match-form">
        <div class="form-group">
          <label>Equipo local</label>
          <select id="mf-home" required>
            <option value="">Seleccionar...</option>
            ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Equipo visitante</label>
          <select id="mf-away" required>
            <option value="">Seleccionar...</option>
            ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Fecha y hora</label>
          <input type="datetime-local" id="mf-date" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="mf-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Programar</button>
        </div>
      </form>
    </div>
  `;

  modal.querySelector('#mf-cancel').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#match-form').onsubmit = async (e) => {
    e.preventDefault();
    const home = Number(modal.querySelector('#mf-home').value);
    const away = Number(modal.querySelector('#mf-away').value);

    if (home === away) {
      showToast('Los equipos deben ser distintos', 'error');
      return;
    }

    await MatchDB.create({
      leagueId: league.id,
      homeTeamId: home,
      awayTeamId: away,
      date: new Date(modal.querySelector('#mf-date').value).toISOString(),
    });

    modal.style.display = 'none';
    showToast('Partido programado', 'success');
    renderMatches(main);
  };
}
