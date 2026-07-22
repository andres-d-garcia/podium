class Footer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="css/main.css">
      <footer style="text-align:center;padding:1.5rem;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:0.8rem">
        <p style="margin:0">Podium — Gestor de Ligas eSports &copy; 2026</p>
        <p style="margin:0.25rem 0 0" id="db-status">IndexedDB: <span id="db-indicator">conectando...</span></p>
      </footer>
    `;
  }

  static get observedAttributes() {
    return ['db-status'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'db-status') {
      const indicator = this.shadowRoot.getElementById('db-indicator');
      if (indicator) {
        indicator.textContent = newVal === 'connected' ? 'conectado' : 'error';
        indicator.style.color = newVal === 'connected' ? 'var(--success)' : 'var(--error)';
      }
    }
  }
}
customElements.define('podium-footer', Footer);
