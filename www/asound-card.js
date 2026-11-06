// ═══════════════════════════════════════════════════════════════
// ASound Media Card — custom Lovelace card for speaker control
// with group management and per-speaker volume
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
    position: relative;
  }

  /* ── Artwork ── */
  .art-wrap {
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
  .art-wrap.no-art .art-bg {
    background: linear-gradient(135deg,
      var(--card-background-color, #1c1c1c) 0%,
      color-mix(in srgb, var(--primary-color) 15%, var(--card-background-color, #1c1c1c)) 100%);
    filter: none;
  }
  .now-playing {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 16px 16px;
    z-index: 1;
  }
  .art-thumb {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: rgba(255,255,255,0.08);
  }
  .art-placeholder {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--secondary-text-color);
    font-size: 28px;
  }
  .track-info {
    flex: 1;
    min-width: 0;
  }
  .entity-name {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title {
    font-size: 1.05em;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .artist {
    font-size: 0.88em;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .state-idle .title { color: var(--secondary-text-color); }

  /* ── Transport ── */
  .transport {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 16px;
    position: relative;
    z-index: 1;
  }
  .t-btn {
    background: none;
    border: none;
    color: var(--primary-text-color);
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
    padding: 0;
  }
  .t-btn:hover { background: rgba(255,255,255,0.08); }
  .t-btn svg { width: 20px; height: 20px; fill: currentColor; }
  .t-btn.play-btn {
    width: 48px;
    height: 48px;
    background: rgba(255,255,255,0.08);
  }
  .t-btn.play-btn:hover { background: rgba(255,255,255,0.15); }
  .t-btn.play-btn svg { width: 24px; height: 24px; }
  .t-btn:disabled { opacity: 0.3; cursor: default; }
  .t-btn:disabled:hover { background: none; }

  /* ── Volume ── */
  .vol-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 2px 16px 14px;
    position: relative;
    z-index: 1;
  }
  .vol-icon {
    color: var(--secondary-text-color);
    cursor: pointer;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
  .vol-icon svg { width: 20px; height: 20px; fill: currentColor; }
  .vol-val {
    font-size: 0.78em;
    color: var(--secondary-text-color);
    width: 34px;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* ── Range input ── */
  input[type=range] {
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
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }
  input[type=range]::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }

  /* ── Source ── */
  .source-row {
    padding: 0 16px 12px;
    position: relative;
    z-index: 1;
  }
  .source-row select {
    width: 100%;
    padding: 6px 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    color: var(--primary-text-color);
    font-size: 0.82em;
    font-family: inherit;
    outline: none;
    cursor: pointer;
  }
  .source-row select:focus { border-color: var(--primary-color); }
  .source-row select option { background: var(--card-background-color); color: var(--primary-text-color); }

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
  .sp-vol input[type=range] { flex: 1; }
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

  /* ── Unavailable entity ── */
  .unavailable-msg {
    padding: 24px 16px;
    text-align: center;
    color: var(--secondary-text-color);
    font-size: 0.9em;
  }
`;

const SVG = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 6L8 18zM16 6v12h2V6h-2z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  volHi: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  volLo: '<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>',
  volMute: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  chevron: '▾',
};

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
    this._expanded = true;
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
    this._config = { entity: config.entity, speakers: config.speakers || [], artwork_entity: config.artwork_entity || '', ...config };
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!this.shadowRoot.querySelector('ha-card')) this._buildDom();
    this._update(prev);
  }

  getCardSize() { return 4; }

  // ── Build DOM (once) ──

  _buildDom() {
    this.shadowRoot.innerHTML = `<style>${STYLES}</style><ha-card></ha-card>`;
  }

  // ── Update ──

  _update(prevHass) {
    const card = this.shadowRoot.querySelector('ha-card');
    if (!card || !this._hass) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      card.innerHTML = `<div class="unavailable-msg">Entity ${esc(this._config.entity)} not found</div>`;
      return;
    }

    const a = entity.attributes;
    const artEntity = this._config.artwork_entity && this._hass.states[this._config.artwork_entity];
    const artUrl = a.entity_picture || (artEntity && artEntity.attributes.entity_picture) || '';
    const hasArt = !!artUrl;
    const title = a.media_title || '';
    const artist = a.media_artist || '';
    const isPlaying = entity.state === 'playing';
    const isPaused = entity.state === 'paused';
    const isOff = entity.state === 'off' || entity.state === 'unavailable';
    const vol = Math.round((a.volume_level || 0) * 100);
    const muted = a.is_volume_muted;
    const sources = a.source_list || [];
    const curSource = a.source || '';
    const name = a.friendly_name || this._config.entity;

    const groupMembers = a.group_members || [];
    const speakers = this._config.speakers || [];
    const groupSet = new Set(groupMembers);
    const master = groupMembers[0] || this._config.entity;
    const groupCount = groupMembers.length > 1 ? groupMembers.length : 0;

    const volIcon = muted ? SVG.volMute : (vol > 50 ? SVG.volHi : SVG.volLo);

    let html = '';

    // Artwork + now playing
    html += `<div class="art-wrap ${hasArt ? '' : 'no-art'}">`;
    html += `<div class="art-bg" style="${hasArt ? `background-image:url('${esc(artUrl)}')` : ''}"></div>`;
    html += `<div class="now-playing ${isOff ? 'state-idle' : ''}">`;
    if (hasArt) {
      html += `<img class="art-thumb" src="${esc(artUrl)}" alt="">`;
    } else {
      html += `<div class="art-placeholder">♪</div>`;
    }
    html += `<div class="track-info">`;
    html += `<div class="entity-name">${esc(name)}</div>`;
    html += `<div class="title">${title ? esc(title) : (isPlaying ? 'Unknown' : entity.state)}</div>`;
    if (artist) html += `<div class="artist">${esc(artist)}</div>`;
    html += `</div></div>`;

    // Transport
    html += `<div class="transport">`;
    html += `<button class="t-btn" data-action="prev">${SVG.prev}</button>`;
    html += `<button class="t-btn play-btn" data-action="pp">${isPlaying ? SVG.pause : SVG.play}</button>`;
    html += `<button class="t-btn" data-action="next">${SVG.next}</button>`;
    html += `</div>`;

    // Volume
    html += `<div class="vol-row">`;
    html += `<span class="vol-icon" data-action="mute">${volIcon}</span>`;
    html += `<input type="range" min="0" max="100" value="${vol}" data-vol="${this._config.entity}" ${muted ? 'style="opacity:0.4"' : ''}>`;
    html += `<span class="vol-val">${vol}%</span>`;
    html += `</div>`;
    html += `</div>`; // close art-wrap

    // Source
    if (sources.length > 0) {
      html += `<div class="source-row"><select data-source="${this._config.entity}">`;
      for (const s of sources) {
        html += `<option value="${esc(s)}" ${s === curSource ? 'selected' : ''}>${esc(s)}</option>`;
      }
      html += `</select></div>`;
    }

    // Speakers
    if (speakers.length > 0) {
      html += `<div class="speakers-header" data-action="toggle-speakers">`;
      html += `<span class="speakers-label">Speakers</span>`;
      if (groupCount > 0) html += `<span class="group-count">${groupCount} grouped</span>`;
      html += `<span class="chevron ${this._expanded ? 'open' : ''}">${SVG.chevron}</span>`;
      html += `</div>`;

      html += `<div class="speakers-list ${this._expanded ? '' : 'collapsed'}" style="max-height:${this._expanded ? speakers.length * 42 + 16 : 0}px">`;
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
    }

    card.innerHTML = html;
    this._attachEvents(card);
  }

  // ── Events ──

  _attachEvents(card) {
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'pp') this._svc('media_player', 'media_play_pause', this._config.entity);
      else if (action === 'next') this._svc('media_player', 'media_next_track', this._config.entity);
      else if (action === 'prev') this._svc('media_player', 'media_previous_track', this._config.entity);
      else if (action === 'mute') {
        const st = this._hass.states[this._config.entity];
        this._svc('media_player', 'volume_mute', this._config.entity, { is_volume_muted: !st?.attributes?.is_volume_muted });
      }
      else if (action === 'toggle-speakers') {
        this._expanded = !this._expanded;
        const list = card.querySelector('.speakers-list');
        const chev = card.querySelector('.chevron');
        if (list) {
          list.classList.toggle('collapsed', !this._expanded);
          list.style.maxHeight = this._expanded ? (this._config.speakers.length * 42 + 16) + 'px' : '0';
        }
        if (chev) chev.classList.toggle('open', this._expanded);
      }
    });

    card.addEventListener('input', (e) => {
      const slider = e.target.closest('input[data-vol]');
      if (!slider) return;
      const eid = slider.dataset.vol;
      const val = parseInt(slider.value);
      const label = slider.nextElementSibling;
      if (label) label.textContent = val + '%';
      slider.style.background = `linear-gradient(to right, var(--primary-color) ${val}%, rgba(255,255,255,0.12) ${val}%)`;
      this._dragging.add(eid);
      clearTimeout(this._volTimers[eid]);
      this._volTimers[eid] = setTimeout(() => {
        this._svc('media_player', 'volume_set', eid, { volume_level: val / 100 });
        setTimeout(() => this._dragging.delete(eid), 500);
      }, 150);
    });

    card.addEventListener('change', (e) => {
      const toggle = e.target.closest('input[data-group-toggle]');
      if (toggle) {
        const spId = toggle.dataset.groupToggle;
        if (toggle.checked) {
          const st = this._hass.states[this._config.entity];
          const current = st?.attributes?.group_members || [this._config.entity];
          const members = [...new Set([...current, spId])];
          this._svc('media_player', 'join', this._config.entity, { group_members: members });
        } else {
          this._svc('media_player', 'unjoin', spId);
        }
        return;
      }
      const source = e.target.closest('select[data-source]');
      if (source) {
        this._svc('media_player', 'select_source', source.dataset.source, { source: source.value });
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
    // Update pickers that need hass
    this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
  }

  _render() {
    const speakers = this._config.speakers || [];

    this.shadowRoot.innerHTML = `
      <style>${EDITOR_STYLES}</style>

      <div class="row">
        <label>Main Entity (master speaker)</label>
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

    // Wire up pickers
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
  description: 'Media player with speaker group management and per-speaker volume',
  preview: true,
  documentationURL: 'https://github.com/asound',
});
