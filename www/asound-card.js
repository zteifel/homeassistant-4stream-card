// ═══════════════════════════════════════════════════════════════
// ASound Media Card — wraps the native media-control card,
// adds artwork from a secondary entity, and replaces the
// more-info dialog with one that includes per-speaker volume.
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

  /* ── Artwork header (from artwork_entity) ── */
  .art-header {
    position: relative;
    overflow: hidden;
  }
  .art-bg {
    position: absolute;
    inset: -20px;
    background-size: cover;
    background-position: center;
    filter: blur(24px) brightness(0.35) saturate(1.2);
  }
  .art-content {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    z-index: 1;
  }
  .art-thumb {
    width: 56px;
    height: 56px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    background: rgba(255,255,255,0.08);
  }
  .art-info {
    flex: 1;
    min-width: 0;
  }
  .art-title {
    font-size: 0.95em;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .art-artist {
    font-size: 0.82em;
    color: rgba(255,255,255,0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Native card wrapper ── */
  .native-wrap hui-media-control-card,
  .native-wrap .type-media-control {
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

  /* ── Dialog overlay ── */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .dialog {
    background: var(--card-background-color, #1c1c1e);
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .dialog-header {
    display: flex;
    align-items: center;
    padding: 16px 16px 8px;
    gap: 12px;
  }
  .dialog-header-info {
    flex: 1;
    min-width: 0;
  }
  .dialog-entity-name {
    font-size: 1.1em;
    font-weight: 600;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dialog-entity-state {
    font-size: 0.82em;
    color: var(--secondary-text-color);
    text-transform: capitalize;
  }
  .dialog-close {
    background: none;
    border: none;
    color: var(--secondary-text-color);
    font-size: 1.4em;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
    flex-shrink: 0;
    line-height: 1;
  }
  .dialog-close:hover { background: rgba(255,255,255,0.06); }

  /* ── Dialog: now playing ── */
  .dialog-nowplaying {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px 12px;
  }
  .dialog-art {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: rgba(255,255,255,0.06);
  }
  .dialog-art-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text-color);
    font-size: 24px;
  }
  .dialog-track {
    flex: 1;
    min-width: 0;
  }
  .dialog-track-title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .dialog-track-artist {
    font-size: 0.88em;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Dialog: speakers ── */
  .dialog-section-label {
    font-size: 0.78em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--secondary-text-color);
    padding: 12px 16px 6px;
    border-top: 1px solid var(--divider-color);
  }

  .dialog-sp-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
  }
  .dialog-sp-row:last-child { padding-bottom: 16px; }

  .dialog-sp-toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }
  .dialog-sp-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }
  .dialog-sp-toggle .slider {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.12);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .dialog-sp-toggle .slider::before {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    left: 2px; bottom: 2px;
    background: var(--primary-text-color);
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .dialog-sp-toggle input:checked + .slider {
    background: var(--primary-color);
  }
  .dialog-sp-toggle input:checked + .slider::before {
    transform: translateX(16px);
    background: var(--text-primary-color, #fff);
  }

  .dialog-sp-info {
    flex: 1;
    min-width: 0;
  }
  .dialog-sp-name {
    font-size: 0.9em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .dialog-sp-name.master { font-weight: 600; }
  .dialog-sp-vol-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }
  .dialog-sp-vol-row input[type=range] {
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
  .dialog-sp-vol-row input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }
  .dialog-sp-vol-row input[type=range]::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }
  .dialog-sp-vol-val {
    font-size: 0.72em;
    color: var(--secondary-text-color);
    width: 30px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .dialog-sp-badge {
    font-size: 0.7em;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(var(--rgb-primary-color, 255,152,0), 0.15);
    color: var(--primary-color);
    font-weight: 600;
    flex-shrink: 0;
  }
  .dialog-sp-unavailable {
    font-size: 0.8em;
    color: var(--disabled-text-color);
    font-style: italic;
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
    this._forceExpanded = false;
    this._nativeCard = null;
    this._dialogOpen = false;
    this._volTimers = {};
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
    this._config = {
      entity: config.entity,
      speakers: config.speakers || [],
      artwork_entity: config.artwork_entity || '',
      ...config,
    };
    if (this._nativeCard) {
      this._nativeCard.setConfig({ type: 'media-control', entity: config.entity });
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.querySelector('ha-card')) this._buildDom();
    if (this._nativeCard) this._nativeCard.hass = hass;
    this._updateView();
    if (this._dialogOpen) this._updateDialog();
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
        <div class="art-header" hidden></div>
        <div class="native-wrap" hidden></div>
      </ha-card>
    `;

    this._miniBar = this.shadowRoot.querySelector('.mini-bar');
    this._artHeader = this.shadowRoot.querySelector('.art-header');
    this._nativeWrap = this.shadowRoot.querySelector('.native-wrap');

    // Intercept more-info events from the native card
    this.shadowRoot.addEventListener('hass-more-info', (e) => {
      if (this._config.speakers?.length > 0) {
        e.stopPropagation();
        this._openDialog();
      }
      // If no speakers configured, let the native more-info open normally
    });

    try {
      const helpers = await window.loadCardHelpers();
      this._nativeCard = await helpers.createCardElement({
        type: 'media-control',
        entity: this._config.entity,
      });
      if (this._hass) this._nativeCard.hass = this._hass;
      this._nativeWrap.appendChild(this._nativeCard);
      this._updateView();
    } catch (e) {
      this._nativeWrap.innerHTML = `<div class="unavailable-msg">Could not load media-control card</div>`;
      this._nativeWrap.hidden = false;
    }

    this._attachCardEvents();
  }

  _updateView() {
    if (!this._hass || !this._miniBar) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this._miniBar.hidden = true;
      this._nativeWrap.hidden = true;
      this._artHeader.hidden = true;
      return;
    }

    const a = entity.attributes;
    const name = a.friendly_name || this._config.entity;
    const isPlaying = entity.state === 'playing';
    const isPaused = entity.state === 'paused';
    const isActive = isPlaying || isPaused;
    const showFull = isActive || this._forceExpanded;

    if (isActive) this._forceExpanded = false;

    // Artwork: prefer artwork_entity (e.g. Spotify), fall back to main entity
    const artEnt = this._config.artwork_entity && this._hass.states[this._config.artwork_entity];
    const artEntPic = artEnt && artEnt.attributes.entity_picture;
    const artUrl = artEntPic || a.entity_picture || '';
    const artTitle = (artEntPic ? artEnt.attributes.media_title : a.media_title) || '';
    const artArtist = (artEntPic ? artEnt.attributes.media_artist : a.media_artist) || '';

    if (showFull) {
      this._miniBar.hidden = true;
      this._nativeWrap.hidden = false;

      if (artUrl && artEntPic) {
        this._artHeader.hidden = false;
        this._artHeader.innerHTML = `
          <div class="art-bg" style="background-image:url('${esc(artUrl)}')"></div>
          <div class="art-content">
            <img class="art-thumb" src="${esc(artUrl)}" alt="">
            <div class="art-info">
              ${artTitle ? `<div class="art-title">${esc(artTitle)}</div>` : ''}
              ${artArtist ? `<div class="art-artist">${esc(artArtist)}</div>` : ''}
            </div>
          </div>
        `;
      } else {
        this._artHeader.hidden = true;
      }
    } else {
      this._miniBar.hidden = false;
      this._nativeWrap.hidden = true;
      this._artHeader.hidden = true;
      this._miniBar.innerHTML = `
        ${artUrl ? `<img class="mini-icon" src="${esc(artUrl)}" style="border-radius:8px;object-fit:cover">` : '<div class="mini-icon">♪</div>'}
        <div class="mini-info">
          <div class="mini-name">${esc(name)}</div>
          <div class="mini-state">${esc(entity.state)}</div>
        </div>
        <button class="mini-play">${SVG_PLAY}</button>
      `;
    }
  }

  _attachCardEvents() {
    const card = this.shadowRoot.querySelector('ha-card');

    card.addEventListener('click', (e) => {
      if (e.target.closest('.mini-bar') && !e.target.closest('.mini-play')) {
        this._forceExpanded = true;
        this._updateView();
        return;
      }
      if (e.target.closest('.mini-play')) {
        this._svc('media_player', 'media_play', this._config.entity);
        return;
      }
    });
  }

  // ── Custom Dialog ──

  _openDialog() {
    if (this._dialogOpen) return;
    this._dialogOpen = true;

    this._dialogEl = document.createElement('div');
    this._dialogEl.className = 'dialog-overlay';
    this._dialogEl.addEventListener('click', (e) => {
      if (e.target === this._dialogEl) this._closeDialog();
    });

    this.shadowRoot.appendChild(this._dialogEl);
    this._updateDialog();
    this._attachDialogEvents();
  }

  _closeDialog() {
    this._dialogOpen = false;
    if (this._dialogEl) {
      this._dialogEl.remove();
      this._dialogEl = null;
    }
  }

  _updateDialog() {
    if (!this._dialogEl || !this._hass) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) { this._closeDialog(); return; }

    const a = entity.attributes;
    const name = a.friendly_name || this._config.entity;
    const artEnt = this._config.artwork_entity && this._hass.states[this._config.artwork_entity];
    const artEntPic = artEnt && artEnt.attributes.entity_picture;
    const artUrl = artEntPic || a.entity_picture || '';
    const title = (artEntPic ? artEnt.attributes.media_title : a.media_title) || '';
    const artist = (artEntPic ? artEnt.attributes.media_artist : a.media_artist) || '';

    const groupMembers = a.group_members || [];
    const groupSet = new Set(groupMembers);
    const master = groupMembers[0] || this._config.entity;
    const speakers = this._config.speakers || [];

    let html = '<div class="dialog">';

    // Header
    html += `<div class="dialog-header">`;
    html += `<div class="dialog-header-info">`;
    html += `<div class="dialog-entity-name">${esc(name)}</div>`;
    html += `<div class="dialog-entity-state">${esc(entity.state)}</div>`;
    html += `</div>`;
    html += `<button class="dialog-close" data-action="close">✕</button>`;
    html += `</div>`;

    // Now playing
    if (title || artUrl) {
      html += `<div class="dialog-nowplaying">`;
      if (artUrl) {
        html += `<img class="dialog-art" src="${esc(artUrl)}" alt="">`;
      } else {
        html += `<div class="dialog-art-placeholder">♪</div>`;
      }
      html += `<div class="dialog-track">`;
      html += `<div class="dialog-track-title">${title ? esc(title) : 'Unknown'}</div>`;
      if (artist) html += `<div class="dialog-track-artist">${esc(artist)}</div>`;
      html += `</div></div>`;
    }

    // Speakers
    if (speakers.length > 0) {
      html += `<div class="dialog-section-label">Speakers</div>`;

      for (const spId of speakers) {
        const sp = this._hass.states[spId];
        if (!sp) {
          html += `<div class="dialog-sp-row"><span class="dialog-sp-name">${esc(spId)}</span><span class="dialog-sp-unavailable">unavailable</span></div>`;
          continue;
        }
        const spName = sp.attributes.friendly_name || spId;
        const spVol = Math.round((sp.attributes.volume_level || 0) * 100);
        const inGroup = groupSet.has(spId);
        const isMaster = spId === master && groupMembers.length > 1;
        const isMainEntity = spId === this._config.entity;

        html += `<div class="dialog-sp-row">`;

        if (!isMainEntity) {
          html += `<label class="dialog-sp-toggle"><input type="checkbox" ${inGroup ? 'checked' : ''} data-group-toggle="${spId}"><span class="slider"></span></label>`;
        } else {
          html += `<label class="dialog-sp-toggle"><input type="checkbox" checked disabled><span class="slider"></span></label>`;
        }

        html += `<div class="dialog-sp-info">`;
        html += `<div class="dialog-sp-name ${isMaster ? 'master' : ''}">${esc(spName)}</div>`;
        html += `<div class="dialog-sp-vol-row">`;
        html += `<input type="range" min="0" max="100" value="${spVol}" data-vol="${spId}">`;
        html += `<span class="dialog-sp-vol-val">${spVol}%</span>`;
        html += `</div>`;
        html += `</div>`;

        if (isMaster) html += `<span class="dialog-sp-badge">master</span>`;
        html += `</div>`;
      }
    }

    html += '</div>';
    this._dialogEl.innerHTML = html;
  }

  _attachDialogEvents() {
    if (!this._dialogEl) return;

    this._dialogEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="close"]')) {
        this._closeDialog();
      }
    });

    this._dialogEl.addEventListener('input', (e) => {
      const slider = e.target.closest('input[data-vol]');
      if (!slider) return;
      const eid = slider.dataset.vol;
      const val = parseInt(slider.value);
      const label = slider.nextElementSibling;
      if (label) label.textContent = val + '%';
      clearTimeout(this._volTimers[eid]);
      this._volTimers[eid] = setTimeout(() => {
        this._svc('media_player', 'volume_set', eid, { volume_level: val / 100 });
      }, 150);
    });

    this._dialogEl.addEventListener('change', (e) => {
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
        <label>Artwork Entity (optional — e.g. your Spotify player)</label>
        <ha-entity-picker
          id="artwork-picker"
          allow-custom-entity
          .includeDomains=${['media_player']}
        ></ha-entity-picker>
      </div>

      <div class="row">
        <label>Speakers (group toggles + volume in detail view)</label>
        <div class="sp-list" id="sp-list">
          ${speakers.map((s, i) => `
            <div class="sp-item">
              <span>${s}</span>
              <button class="sp-remove" data-remove="${i}">✕</button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:8px">
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

    const ap = this.shadowRoot.getElementById('artwork-picker');
    ap.value = this._config.artwork_entity || '';
    if (this._hass) ap.hass = this._hass;
    ap.addEventListener('value-changed', (e) => {
      this._config = { ...this._config, artwork_entity: e.detail.value || '' };
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
  description: 'Media player with artwork fallback and speaker group volume controls',
  preview: true,
});
