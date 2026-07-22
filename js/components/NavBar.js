class NavBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['league-name', 'league-sport', 'league-icon'];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const name = this.getAttribute('league-name') || '';
    const sport = this.getAttribute('league-sport') || '';
    const icon = this.getAttribute('league-icon') || '';

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="css/components.css">
      <nav class="navbar">
        <a href="#dashboard" class="navbar-brand" onclick="event.preventDefault(); router.navigate('dashboard')" style="color:var(--text-primary)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 100 400 270" fill="currentColor" style="height:28px;width:auto">
            <g transform="skewX(-18)">
              <rect x="80" y="230" width="45" height="120" />
              <rect x="140" y="120" width="45" height="230" />
              <path fill-rule="evenodd" d="M 200 160 H 275 C 330 160 365 185 365 225 C 365 265 330 290 275 290 H 245 V 350 H 200 Z M 245 200 H 275 C 300 200 315 208 315 225 C 315 242 300 250 275 250 H 245 Z" />
            </g>
          </svg>
          PODIUM
        </a>
        <div class="navbar-links">
          <a href="#dashboard" onclick="event.preventDefault(); router.navigate('dashboard')">Dashboard</a>
          <a href="#leagues" onclick="event.preventDefault(); router.navigate('leagues')">Ligas</a>
          <a href="#teams" onclick="event.preventDefault(); router.navigate('teams')">Equipos</a>
          <a href="#players" onclick="event.preventDefault(); router.navigate('players')">Jugadores</a>
          <a href="#matches" onclick="event.preventDefault(); router.navigate('matches')">Partidos</a>
          <a href="#stats" onclick="event.preventDefault(); router.navigate('stats')">Estadísticas</a>
        </div>
        <div class="navbar-spacer"></div>
        ${name ? `<div class="navbar-league"><span class="league-dot"></span> ${icon} ${name} — ${sport}</div>` : ''}
      </nav>
    `;
  }
}
customElements.define('podium-navbar', NavBar);
