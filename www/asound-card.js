// ═══════════════════════════════════════════════════════════════
// ASound Media Card — wraps the native media-control card and
// adds speaker group management with per-speaker volume.
//
// Install:
//   1. Copy to <ha-config>/www/asound-card.js
//   2. Settings → Dashboards → ⋮ → Resources → Add
//      URL: /local/asound-card.js   Type: JavaScript Module
//   3. Add card → search "ASound"
// ═══════════════════════════════════════════════════════════════

const STYLES = `
  :host { display: block; }

  ha-card {
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .native-wrap {
    /* Let the native card render without its own ha-card shell */
  }
  .native-wrap hui-media-control-card,
  .native-wrap .type-media-control {
    /* Remove double card nesting */
    --ha-card-border-width: 0;
    --ha-card-box-shadow: none;
    --ha-card-border-radius: 0;
  }

  /* ── Minimized ── */
  .mini-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .mini-bar:hover { background: rgba(255,255,255,0.03); }
  .mini-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(var(--rgb-primary-color, 255,152,0), 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    font-size: 18px;
    flex-shrink: 0;
  }
  .mini-info {
    flex: 1;
    min-width: 0;
  }
  .mini-name {
    font-size: 0.92em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .mini-state {
    font-size: 0.78em;
    color: var(--secondary-text-color);
    text-transform: capitalize;
  }
  .mini-play {
    background: none;
    border: none;
    color: var(--primary-text-color);
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    padding: 0;
    flex-shrink: 0;
  }
  .mini-play:hover { background: rgba(255,255,255,0.08); }
  .mini-play svg { width: 20px; height: 20px; fill: currentColor; }

  /* ── Speakers Section ── */
  .speakers-header {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    border-top: 1px solid var(--divider-color);
    user-select: none;
    gap: 8px;
  }
  .speakers-header:hover { background: rgba(255,255,255,0.03); }
  .speakers-label {
    font-size: 0.82em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--secondary-text-color);
    flex: 1;
  }
  .group-count {
    font-size: 0.75em;
    color: var(--secondary-text-color);
    background: rgba(255,255,255,0.08);
    padding: 2px 8px;
    border-radius: 10px;
  }
  .chevron {
    color: var(--secondary-text-color);
    transition: transform 0.2s;
    font-size: 0.8em;
  }
  .chevron.open { transform: rotate(180deg); }

  .speakers-list {
    padding: 0 0 8px;
    overflow: hidden;
    transition: max-height 0.25s ease;
  }
  .speakers-list.collapsed {
    max-height: 0 !important;
    padding: 0;
  }

  .sp-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
    font-size: 0.88em;
    transition: background 0.15s;
  }
  .sp-row:hover { background: rgba(255,255,255,0.02); }

  .sp-toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }
  .sp-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }
  .sp-toggle .slider {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.12);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .sp-toggle .slider::before {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    left: 2px; bottom: 2px;
    background: var(--primary-text-color);
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .sp-toggle input:checked + .slider {
    background: var(--primary-color);
  }
  .sp-toggle input:checked + .slider::before {
    transform: translateX(16px);
    background: var(--text-primary-color, #fff);
  }

  .sp-name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sp-name.master { font-weight: 600; }
  .sp-master-badge {
    font-size: 0.72em;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(var(--rgb-primary-color, 255,152,0), 0.15);
    color: var(--primary-color);
    font-weight: 600;
    flex-shrink: 0;
  }

  .sp-vol {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 110px;
  }
  .sp-vol-val {
    font-size: 0.72em;
    color: var(--secondary-text-color);
    width: 28px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .sp-unavailable {
    font-size: 0.78em;
    color: var(--disabled-text-color);
    font-style: italic;
  }

  /* ── Range input (speaker volumes) ── */
  .sp-vol input[type=range] {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.12);
    outline: none;
    cursor: pointer;
    min-width: 0;
  }
  .sp-vol input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }
  .sp-vol input[type=range]::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }

  .unavailable-msg {
    padding: 24px 16px;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 0.9em;
  }
`;

const SVG_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════
// CARD
// ═══════════════════════════════════════

class AsoundMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._speakersExpanded = true;
    this._forceExpanded = false;
    this._nativeCard = null;
    this._nativeReady = false;
    this._volTimers = {};
    this._dragging = new Set();
  }

  static getConfigElement() {
    return document.createElement('asound-media-card-editor');
  }

  static getStubConfig(hass) {
    const entities = Object.keys(hass.states).filter(e => e.startsWith('media_player.'));
    return { entity: entities[0] || '', speakers: entities.slice(0, 6) };
  }

  setConfig(config) {
    if (!config.entity) throw new Error('Please configure an entity');
    this._config = { entity: config.entity, speakers: config.speakers || [], ...config };

    if (this._nativeCard) {
      this._nativeCard.setConfig({ type: 'media-control', entity: config.entity });
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.querySelector('ha-card')) this._buildDom();
    if (this._nativeCard) this._nativeCard.hass = hass;
    this._updateView();
  }

  getCardSize() {
    if (!this._hass) return 1;
    const entity = this._hass.states[this._config?.entity];
    const active = entity && (entity.state === 'playing' || entity.state === 'paused');
    return (active || this._forceExpanded) ? 4 : 1;
  }

  async _buildDom() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="mini-bar" hidden></div>
        <div class="native-wrap" hidden></div>
        <div class="speakers-section"></div>
      </ha-card>
    `;

    this._miniBar = this.shadowRoot.querySelector('.mini-bar');
    this._nativeWrap = this.shadowRoot.querySelector('.native-wrap');
    this._speakersSection = this.shadowRoot.querySelector('.speakers-section');

    try {
      const helpers = await window.loadCardHelpers();
      this._nativeCard = await helpers.createCardElement({
        type: 'media-control',
        entity: this._config.entity,
      });
      if (this._hass) this._nativeCard.hass = this._hass;
      this._nativeWrap.appendChild(this._nativeCard);
      this._nativeReady = true;
      this._updateView();
    } catch (e) {
      this._nativeWrap.innerHTML = `<div class="unavailable-msg">Could not load media-control card</div>`;
      this._nativeWrap.hidden = false;
    }

    this._attachStaticEvents();
  }

  _updateView() {
    if (!this._hass || !this._miniBar) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this._miniBar.hidden = true;
      this._nativeWrap.hidden = true;
      this._speakersSection.innerHTML = `<div class="unavailable-msg">Entity ${esc(this._config.entity)} not found</div>`;
      return;
    }

    const a = entity.attributes;
    const name = a.friendly_name || this._config.entity;
    const isPlaying = entity.state === 'playing';
    const isPaused = entity.state === 'paused';
    const isActive = isPlaying || isPaused;
    const showFull = isActive || this._forceExpanded;

    if (isActive) this._forceExpanded = false;

    // Toggle between minimized and full
    if (showFull) {
      this._miniBar.hidden = true;
      this._nativeWrap.hidden = false;
    } else {
      this._miniBar.hidden = false;
      this._nativeWrap.hidden = true;
      this._miniBar.innerHTML = `
        <div class="mini-icon">♪</div>
        <div class="mini-info">
          <div class="mini-name">${esc(name)}</div>
          <div class="mini-state">${esc(entity.state)}</div>
        </div>
        <button class="mini-play">${SVG_PLAY}</button>
      `;
    }

    // Speakers section
    this._renderSpeakers(entity);
  }

  _renderSpeakers(entity) {
    const speakers = this._config.speakers || [];
    if (speakers.length === 0) {
      this._speakersSection.innerHTML = '';
      return;
    }

    const a = entity.attributes;
    const groupMembers = a.group_members || [];
    const groupSet = new Set(groupMembers);
    const master = groupMembers[0] || this._config.entity;
    const groupCount = groupMembers.length > 1 ? groupMembers.length : 0;

    let html = '';

    html += `<div class="speakers-header" data-action="toggle-speakers">`;
    html += `<span class="speakers-label">Speakers</span>`;
    if (groupCount > 0) html += `<span class="group-count">${groupCount} grouped</span>`;
    html += `<span class="chevron ${this._speakersExpanded ? 'open' : ''}">▾</span>`;
    html += `</div>`;

    html += `<div class="speakers-list ${this._speakersExpanded ? '' : 'collapsed'}" style="max-height:${this._speakersExpanded ? speakers.length * 42 + 16 : 0}px">`;

    for (const spId of speakers) {
      const sp = this._hass.states[spId];
      if (!sp) {
        html += `<div class="sp-row"><span class="sp-name">${esc(spId)}</span><span class="sp-unavailable">unavailable</span></div>`;
        continue;
      }
      const spName = sp.attributes.friendly_name || spId;
      const spVol = Math.round((sp.attributes.volume_level || 0) * 100);
      const inGroup = groupSet.has(spId);
      const isMaster = spId === master && groupCount > 0;
      const isMainEntity = spId === this._config.entity;

      html += `<div class="sp-row">`;
      if (!isMainEntity) {
        html += `<label class="sp-toggle"><input type="checkbox" ${inGroup ? 'checked' : ''} data-group-toggle="${spId}"><span class="slider"></span></label>`;
      } else {
        html += `<label class="sp-toggle"><input type="checkbox" checked disabled><span class="slider"></span></label>`;
      }
      html += `<span class="sp-name ${isMaster ? 'master' : ''}">${esc(spName)}</span>`;
      if (isMaster) html += `<span class="sp-master-badge">master</span>`;
      html += `<div class="sp-vol">`;
      html += `<input type="range" min="0" max="100" value="${spVol}" data-vol="${spId}">`;
      html += `<span class="sp-vol-val">${spVol}%</span>`;
      html += `</div>`;
      html += `</div>`;
    }

    html += `</div>`;

    this._speakersSection.innerHTML = html;
  }

  _attachStaticEvents() {
    const card = this.shadowRoot.querySelector('ha-card');

    card.addEventListener('click', (e) => {
      // Mini bar expand
      if (e.target.closest('.mini-bar') && !e.target.closest('.mini-play')) {
        this._forceExpanded = true;
        this._updateView();
        return;
      }
      // Mini play button
      if (e.target.closest('.mini-play')) {
        this._svc('media_player', 'media_play', this._config.entity);
        return;
      }
      // Speakers header toggle
      if (e.target.closest('[data-action="toggle-speakers"]')) {
        this._speakersExpanded = !this._speakersExpanded;
        const list = card.querySelector('.speakers-list');
        const chev = card.querySelector('.chevron');
        if (list) {
          list.classList.toggle('collapsed', !this._speakersExpanded);
          list.style.maxHeight = this._speakersExpanded ? (this._config.speakers.length * 42 + 16) + 'px' : '0';
        }
        if (chev) chev.classList.toggle('open', this._speakersExpanded);
      }
    });

    card.addEventListener('input', (e) => {
      const slider = e.target.closest('input[data-vol]');
      if (!slider) return;
      const eid = slider.dataset.vol;
      const val = parseInt(slider.value);
      const label = slider.nextElementSibling;
      if (label) label.textContent = val + '%';
      this._dragging.add(eid);
      clearTimeout(this._volTimers[eid]);
      this._volTimers[eid] = setTimeout(() => {
        this._svc('media_player', 'volume_set', eid, { volume_level: val / 100 });
        setTimeout(() => this._dragging.delete(eid), 500);
      }, 150);
    });

    card.addEventListener('change', (e) => {
      const toggle = e.target.closest('input[data-group-toggle]');
      if (!toggle) return;
      const spId = toggle.dataset.groupToggle;
      if (toggle.checked) {
        const st = this._hass.states[this._config.entity];
        const current = st?.attributes?.group_members || [this._config.entity];
        const members = [...new Set([...current, spId])];
        this._svc('media_player', 'join', this._config.entity, { group_members: members });
      } else {
        this._svc('media_player', 'unjoin', spId);
      }
    });
  }

  _svc(domain, service, eid, data = {}) {
    this._hass.callService(domain, service, { entity_id: eid, ...data });
  }
}


// ═══════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════

const EDITOR_STYLES = `
  :host { display: block; }
  .row { margin-bottom: 16px; }
  .row label {
    display: block;
    font-size: 0.85em;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--secondary-text-color);
  }
  .sp-list { display: flex; flex-direction: column; gap: 6px; }
  .sp-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(var(--rgb-primary-text-color, 0,0,0), 0.04);
    border-radius: 6px;
    font-size: 0.9em;
  }
  .sp-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sp-remove {
    background: none; border: none; cursor: pointer;
    color: var(--secondary-text-color); font-size: 1.1em; padding: 0 4px;
  }
  .sp-remove:hover { color: var(--error-color); }
  .add-row { display: flex; gap: 8px; align-items: flex-end; }
  .add-row ha-entity-picker { flex: 1; }
`;

class AsoundMediaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
  }

  _render() {
    const speakers = this._config.speakers || [];

    this.shadowRoot.innerHTML = `
      <style>${EDITOR_STYLES}</style>

      <div class="row">
        <label>Entity (main speaker)</label>
        <ha-entity-picker
          id="entity-picker"
          allow-custom-entity
          .includeDomains=${['media_player']}
        ></ha-entity-picker>
      </div>

      <div class="row">
        <label>Speakers (toggleable in group)</label>
        <div class="sp-list" id="sp-list">
          ${speakers.map((s, i) => `
            <div class="sp-item">
              <span>${s}</span>
              <button class="sp-remove" data-remove="${i}">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="add-row" style="margin-top:8px">
          <ha-entity-picker
            id="add-picker"
            allow-custom-entity
            .includeDomains=${['media_player']}
          ></ha-entity-picker>
        </div>
      </div>
    `;

    const ep = this.shadowRoot.getElementById('entity-picker');
    ep.value = this._config.entity || '';
    if (this._hass) ep.hass = this._hass;
    ep.addEventListener('value-changed', (e) => {
      this._config = { ...this._config, entity: e.detail.value };
      this._fire();
    });

    const addP = this.shadowRoot.getElementById('add-picker');
    if (this._hass) addP.hass = this._hass;
    addP.addEventListener('value-changed', (e) => {
      const val = e.detail.value;
      if (val && !(this._config.speakers || []).includes(val)) {
        this._config = { ...this._config, speakers: [...(this._config.speakers || []), val] };
        this._fire();
        this._render();
      }
    });

    this.shadowRoot.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.remove);
        const sp = [...(this._config.speakers || [])];
        sp.splice(idx, 1);
        this._config = { ...this._config, speakers: sp };
        this._fire();
        this._render();
      });
    });
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}


// ═══════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════

customElements.define('asound-media-card', AsoundMediaCard);
customElements.define('asound-media-card-editor', AsoundMediaCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'asound-media-card',
  name: 'ASound Media',
  description: 'Native media-control card with speaker group management and per-speaker volume',
  preview: true,
});
