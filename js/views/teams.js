async function renderTeams(main) {
  const league = await getActiveLeague();
  if (!league) {
    main.innerHTML = `<div class="empty-state"><h3>Sin liga activa</h3><p>Activa o crea una liga primero</p></div>`;
    return;
  }

  showLoading(true);
  const teams = await TeamDB.getByLeague(league.id);
  const teamPlayers = {};
  for (const team of teams) {
    teamPlayers[team.id] = await PlayerDB.getByTeam(team.id);
  }

  main.innerHTML = `
    <div class="section-header">
      <div class="section-title">🎮 Equipos — ${league.name}</div>
      <button class="btn btn-primary" id="btn-create-team">+ Nuevo equipo</button>
    </div>
    <div id="team-list" class="grid-list">
      ${teams.length === 0 ? '<div class="empty-state"><h3>No hay equipos</h3><p>Agrega equipos a la liga activa</p></div>' : ''}
    </div>
    <div id="team-modal" class="modal-overlay" style="display:none"></div>
  `;

  const list = main.querySelector('#team-list');
  for (const team of teams) {
    const card = document.createElement('div');
    card.className = 'card team-card';
    const initials = team.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const count = teamPlayers[team.id]?.length || 0;
    card.innerHTML = `
      <div style="text-align:center">
        <div class="team-avatar" style="background:${team.primaryColor};margin:0 auto">${initials}</div>
        <h4 style="margin:0.5rem 0 0.25rem">${team.name}</h4>
        <p style="color:var(--text-muted);font-size:0.8rem;margin:0">
          ${team.city || 'Sin sede'} · ${count} jugadores
        </p>
        ${team.stats.pj > 0 ? `
          <p style="color:var(--text-secondary);font-size:0.8rem;margin:0.25rem 0">
            ${team.stats.pj} PJ · ${team.stats.pts} PTS
          </p>
        ` : ''}
      </div>
      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;justify-content:center">
        <button class="btn btn-sm btn-secondary" data-edit="${team.id}">Editar</button>
        <button class="btn btn-sm btn-danger" data-delete="${team.id}">Eliminar</button>
      </div>
    `;
    card.querySelector('.card')?.addEventListener('click', (e) => {
      if (!e.target.closest('button')) router.navigate(`team/${team.id}`);
    });
    card.querySelector('[data-edit]').addEventListener('click', () => showTeamForm(main, league, team));
    card.querySelector('[data-delete]').addEventListener('click', () => deleteTeam(main, league, team));
    list.appendChild(card);
  }

  main.querySelector('#btn-create-team').onclick = () => showTeamForm(main, league);
  showLoading(false);
}

function showTeamForm(main, league, team) {
  const editMode = !!team;
  const modal = main.querySelector('#team-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${editMode ? 'Editar equipo' : 'Nuevo equipo'}</h2>
      <form id="team-form">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="tf-name" required value="${editMode ? team.name : ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Color principal</label>
            <input type="color" id="tf-color1" value="${editMode ? team.primaryColor : '#ff4655'}">
          </div>
          <div class="form-group">
            <label>Color secundario</label>
            <input type="color" id="tf-color2" value="${editMode ? team.secondaryColor : '#0f1923'}">
          </div>
        </div>
        <div class="form-group">
          <label>Ciudad / Sede</label>
          <input type="text" id="tf-city" value="${editMode ? team.city : ''}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="tf-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">${editMode ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
    </div>
  `;

  modal.querySelector('#tf-cancel').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#team-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: modal.querySelector('#tf-name').value.trim(),
      primaryColor: modal.querySelector('#tf-color1').value,
      secondaryColor: modal.querySelector('#tf-color2').value,
      city: modal.querySelector('#tf-city').value.trim(),
      leagueId: league.id,
    };

    if (editMode) {
      await TeamDB.update(team.id, data);
      showToast('Equipo actualizado', 'success');
    } else {
      await TeamDB.create(data);
      showToast('Equipo creado', 'success');
    }
    modal.style.display = 'none';
    renderTeams(main);
  };
}

async function deleteTeam(main, league, team) {
  const matches = await MatchDB.getByTeam(team.id);
  if (matches.some(m => m.status === 'finished' || m.status === 'scheduled')) {
    showToast('No se puede eliminar: el equipo tiene partidos jugados o programados', 'error');
    return;
  }

  const confirmed = await confirmAction(`¿Eliminar "${team.name}"? También se eliminarán sus jugadores.`);
  if (!confirmed) return;

  const players = await PlayerDB.getByTeam(team.id);
  for (const p of players) await PlayerDB.remove(p.id);
  await TeamDB.remove(team.id);
  showToast(`"${team.name}" eliminado`, 'success');
  renderTeams(main);
}
