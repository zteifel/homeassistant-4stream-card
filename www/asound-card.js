// ═══════════════════════════════════════════════════════════════
// ASound Media Card — looks like the native media-control card
// with artwork from a secondary entity and per-speaker volume
// in an inline group panel (tap the speaker icon).
//
// Install:
//   1. Copy to <ha-config>/www/asound-card.js
//   2. Settings → Dashboards → ⋮ → Resources → Add
//      URL: /local/asound-card.js   Type: JavaScript Module
//   3. Add card → search "ASound"
// ═══════════════════════════════════════════════════════════════

const STYLES = `
  :host { display: block; }
  ha-card { overflow: hidden; position: relative; }

  /* ── Playing state: artwork background ── */
  .player {
    position: relative;
    overflow: hidden;
  }
  .player-bg {
    position: absolute;
    inset: -24px;
    background-size: cover;
    background-position: center;
    filter: blur(20px) brightness(0.3) saturate(1.3);
  }
  .player.no-art .player-bg {
    background: var(--card-background-color, #1c1c1c);
    filter: none;
  }
  .player-content {
    position: relative;
    z-index: 1;
  }

  /* ── Now playing row ── */
  .now-playing {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px 8px;
  }
  .art-thumb {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
  .art-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 4px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.5);
    font-size: 20px;
  }
  .no-art .art-placeholder {
    color: var(--secondary-text-color);
    background: rgba(var(--rgb-primary-text-color, 0,0,0), 0.06);
  }
  .track-info {
    flex: 1;
    min-width: 0;
  }
  .track-title {
    font-size: 0.95em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
  }
  .track-artist {
    font-size: 0.82em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: rgba(255,255,255,0.7);
  }
  .no-art .track-title { color: var(--primary-text-color); }
  .no-art .track-artist { color: var(--secondary-text-color); }
  .speaker-name {
    font-size: 0.7em;
    color: rgba(255,255,255,0.45);
    white-space: nowrap;
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 4px;
  }
  .no-art .speaker-name { color: var(--secondary-text-color); }

  /* ── Transport controls ── */
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 4px 16px;
  }
  .ctrl-btn {
    background: none;
    border: none;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #fff;
    transition: background 0.15s;
  }
  .ctrl-btn:hover { background: rgba(255,255,255,0.1); }
  .ctrl-btn svg { width: 24px; height: 24px; fill: currentColor; pointer-events: none; }
  .ctrl-btn.play-btn { width: 48px; height: 48px; }
  .ctrl-btn.play-btn svg { width: 32px; height: 32px; }
  .ctrl-btn.sp-btn { margin-left: auto; }
  .ctrl-btn.sp-btn.active { color: var(--primary-color); }
  .ctrl-btn.sp-btn svg { width: 20px; height: 20px; }
  .no-art .ctrl-btn { color: var(--primary-text-color); }
  .no-art .ctrl-btn:hover { background: rgba(var(--rgb-primary-text-color,0,0,0),0.06); }

  /* ── Volume ── */
  .vol-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 12px;
  }
  .vol-icon {
    color: rgba(255,255,255,0.6);
    flex-shrink: 0;
    width: 20px; height: 20px;
    cursor: pointer;
  }
  .vol-icon svg { width: 20px; height: 20px; fill: currentColor; }
  .no-art .vol-icon { color: var(--secondary-text-color); }
  .vol-val {
    font-size: 0.75em;
    color: rgba(255,255,255,0.6);
    width: 32px;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .no-art .vol-val { color: var(--secondary-text-color); }
  input[type=range] {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.2);
    outline: none;
    cursor: pointer;
    min-width: 0;
  }
  .no-art input[type=range] { background: rgba(var(--rgb-primary-text-color,0,0,0),0.12); }
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

  /* ── Speaker group panel ── */
  .sp-panel {
    overflow: hidden;
    transition: max-height 0.25s ease, padding 0.25s ease;
    max-height: 0;
    padding: 0 16px;
    border-top: 0 solid transparent;
  }
  .sp-panel.open {
    border-top: 1px solid rgba(255,255,255,0.08);
    padding: 8px 16px 12px;
  }
  .no-art .sp-panel.open { border-top-color: var(--divider-color); }

  .sp-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 0;
  }

  .sp-toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .sp-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }
  .sp-toggle .sl {
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.15);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .no-art .sp-toggle .sl { background: rgba(var(--rgb-primary-text-color,0,0,0),0.12); }
  .sp-toggle .sl::before {
    content: '';
    position: absolute;
    width: 16px; height: 16px;
    left: 2px; bottom: 2px;
    background: rgba(255,255,255,0.8);
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .no-art .sp-toggle .sl::before { background: var(--primary-text-color); }
  .sp-toggle input:checked + .sl {
    background: var(--primary-color);
  }
  .sp-toggle input:checked + .sl::before {
    transform: translateX(16px);
    background: #fff;
  }

  .sp-info {
    flex: 1;
    min-width: 0;
  }
  .sp-name {
    font-size: 0.88em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
  }
  .sp-name.master { font-weight: 600; }
  .no-art .sp-name { color: var(--primary-text-color); }
  .sp-vol-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }
  .sp-vol-row input[type=range] { height: 3px; }
  .sp-vol-val {
    font-size: 0.7em;
    color: rgba(255,255,255,0.5);
    width: 28px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .no-art .sp-vol-val { color: var(--secondary-text-color); }

  .sp-badge {
    font-size: 0.68em;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(var(--rgb-primary-color, 255,152,0), 0.2);
    color: var(--primary-color);
    font-weight: 600;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .sp-toggle-placeholder { width: 36px; flex-shrink: 0; }

  /* ── Minimized ── */
  .mini-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .mini-bar:hover { background: rgba(var(--rgb-primary-text-color,0,0,0),0.03); }
  .mini-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(var(--rgb-primary-color, 255,152,0), 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    font-size: 14px;
    flex-shrink: 0;
  }
  .mini-thumb {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .mini-info { flex: 1; min-width: 0; }
  .mini-name {
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .mini-state {
    font-size: 0.72em;
    color: var(--secondary-text-color);
    text-transform: capitalize;
  }
  .mini-play {
    background: none;
    border: none;
    color: var(--primary-text-color);
    cursor: pointer;
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0; flex-shrink: 0;
  }
  .mini-play:hover { background: rgba(var(--rgb-primary-text-color,0,0,0),0.06); }
  .mini-play svg { width: 16px; height: 16px; fill: currentColor; pointer-events: none; }

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
  speakers: '<svg viewBox="0 0 24 24"><path d="M18.2 1H9.8C8.81 1 8 1.81 8 2.8v14.4c0 .99.81 1.8 1.8 1.8h8.4c.99 0 1.8-.81 1.8-1.8V2.8c0-.99-.81-1.8-1.8-1.8zM14 3c1.1 0 2 .89 2 2s-.9 2-2 2-2-.89-2-2 .9-2 2-2zm0 13.5c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zM6 5H4v16c0 1.1.89 2 2 2h10v-2H6V5z"/></svg>',
};

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

class AsoundMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._forceExpanded = false;
    this._spPanelOpen = false;
    this._volTimers = {};
    this._sliderActive = false;
    this._sliderEndTimer = null;
    this._pendingVol = {};
    this._pendingPlay = null;
    this._built = false;
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
      source_entity: config.source_entity || config.artwork_entity || '',
      ...config,
    };
    if (this._built) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) {
      this.shadowRoot.innerHTML = `<style>${STYLES}</style><ha-card></ha-card>`;
      this._card = this.shadowRoot.querySelector('ha-card');
      this._built = true;
      this._attachEvents();
    }
    if (!this._sliderActive) this._render();
  }

  getCardSize() {
    if (!this._hass) return 1;
    const entity = this._hass.states[this._config?.entity];
    if (!entity) return 1;
    const a = entity.attributes;
    const active = entity.state === 'playing' || entity.state === 'paused';
    const gm = a.group_members || [];
    const isFollower = gm.length > 1 && gm[0] !== this._config.entity;
    return ((active && !isFollower) || this._forceExpanded) ? 3 : 1;
  }

  _getState() {
    const entity = this._hass.states[this._config.entity];
    if (!entity) return null;
    const a = entity.attributes;
    const artEnt = this._config.source_entity && this._hass.states[this._config.source_entity];
    const artEntPic = artEnt?.attributes?.entity_picture;
    const groupMembers = a.group_members || [];
    const groupSet = new Set(groupMembers);
    const isFollower = groupMembers.length > 1 && groupMembers[0] !== this._config.entity;
    const speakers = this._config.speakers || [];

    let isPlaying = entity.state === 'playing';
    let isPaused = entity.state === 'paused';
    let isActive = isPlaying || isPaused;

    const pp = this._pendingPlay;
    if (pp && Date.now() - pp.time < 5000) {
      if (isActive) {
        this._pendingPlay = null;
      } else {
        isPlaying = true;
        isActive = true;
      }
    } else if (pp) {
      this._pendingPlay = null;
    }

    return {
      entity, a, isPlaying, isPaused, isActive, isFollower,
      name: a.friendly_name || this._config.entity,
      showFull: (isActive && !isFollower) || this._forceExpanded,
      artUrl: artEntPic || a.entity_picture || '',
      title: a.media_title || (artEntPic && artEnt?.attributes.media_title) || '',
      artist: a.media_artist || (artEntPic && artEnt?.attributes.media_artist) || '',
      vol: Math.round((a.volume_level || 0) * 100),
      muted: !!a.is_volume_muted,
      groupMembers, groupSet, speakers,
      hasSpeakers: speakers.length > 0,
    };
  }

  _renderKey(s) {
    if (!s) return 'unavail';
    const gk = [...s.groupSet].sort().join(',');
    return `${s.showFull}|${!!s.artUrl}|${this._spPanelOpen}|${s.speakers.join(',')}|${gk}`;
  }

  _render() {
    if (!this._card || !this._hass) return;
    const s = this._getState();
    if (!s) {
      this._card.innerHTML = `<div class="unavailable-msg">Entity ${esc(this._config.entity)} not found</div>`;
      this._lastRenderKey = 'unavail';
      return;
    }
    if (s.isActive) this._forceExpanded = false;
    const key = this._renderKey(s);
    if (key !== this._lastRenderKey) {
      this._lastRenderKey = key;
      this._rebuild(s);
    }
    this._updateValues(s);
  }

  _rebuild(s) {
    if (!s.showFull) {
      this._card.innerHTML = `
        <div class="mini-bar">
          <div class="mini-icon">♪</div>
          <div class="mini-info">
            <div class="mini-name"></div>
            <div class="mini-state"></div>
          </div>
          <button class="mini-play" data-action="play">${SVG.play}</button>
        </div>`;
      return;
    }

    const hasArt = !!s.artUrl;
    const speakers = s.speakers;
    let html = `<div class="player ${hasArt ? '' : 'no-art'}">`;
    html += `<div class="player-bg"></div>`;
    html += `<div class="player-content">`;

    html += `<div class="now-playing">`;
    if (hasArt) {
      html += `<img class="art-thumb" src="" alt="">`;
    } else {
      html += `<div class="art-placeholder">♪</div>`;
    }
    html += `<div class="track-info"><div class="track-title"></div><div class="track-artist"></div></div>`;
    html += `<div class="speaker-name">${esc(s.name)}</div>`;
    html += `</div>`;

    html += `<div class="controls">`;
    html += `<button class="ctrl-btn" data-action="prev">${SVG.prev}</button>`;
    html += `<button class="ctrl-btn play-btn" data-action="pp"></button>`;
    html += `<button class="ctrl-btn" data-action="next">${SVG.next}</button>`;
    if (s.hasSpeakers) {
      html += `<button class="ctrl-btn sp-btn ${this._spPanelOpen ? 'active' : ''}" data-action="toggle-sp">${SVG.speakers}</button>`;
    }
    html += `</div>`;

    html += `<div class="vol-row">`;
    html += `<span class="vol-icon" data-action="mute"></span>`;
    html += `<input type="range" min="0" max="100" value="0" data-vol="__group__">`;
    html += `<span class="vol-val"></span>`;
    html += `</div>`;

    if (s.hasSpeakers) {
      const panelH = this._spPanelOpen ? (speakers.length * 52 + 20) : 0;
      html += `<div class="sp-panel ${this._spPanelOpen ? 'open' : ''}" style="max-height:${panelH}px">`;
      for (const spId of speakers) {
        const sp = this._hass.states[spId];
        if (!sp) continue;
        const isMain = spId === this._config.entity;
        const inGroup = s.groupSet.has(spId);
        html += `<div class="sp-row" data-sp="${spId}">`;
        if (isMain) {
          html += `<div class="sp-toggle-placeholder"></div>`;
        } else {
          html += `<label class="sp-toggle"><input type="checkbox" ${inGroup ? 'checked' : ''} data-group-toggle="${spId}"><span class="sl"></span></label>`;
        }
        html += `<div class="sp-info">`;
        html += `<div class="sp-name ${isMain ? 'master' : ''}">${esc(sp.attributes.friendly_name || spId)}</div>`;
        if (inGroup || isMain) {
          html += `<div class="sp-vol-row"><input type="range" min="0" max="100" value="0" data-vol="${spId}"><span class="sp-vol-val"></span></div>`;
        }
        html += `</div></div>`;
      }
      html += `</div>`;
    }

    html += `</div></div>`;
    this._card.innerHTML = html;
  }

  _updateValues(s) {
    const q = sel => this._card.querySelector(sel);

    if (!s.showFull) {
      const n = q('.mini-name');
      if (n) n.textContent = s.name;
      const st = q('.mini-state');
      if (st) st.textContent = s.entity.state;
      return;
    }

    const titleEl = q('.track-title');
    if (titleEl) titleEl.textContent = s.title || (s.isPlaying ? s.name : s.entity.state);
    const artistEl = q('.track-artist');
    if (artistEl) artistEl.textContent = s.artist;

    const ppBtn = q('[data-action="pp"]');
    if (ppBtn) ppBtn.innerHTML = s.isPlaying ? SVG.pause : SVG.play;

    if (s.artUrl) {
      const bg = q('.player-bg');
      if (bg) bg.style.backgroundImage = `url('${s.artUrl}')`;
      const thumb = q('.art-thumb');
      if (thumb && thumb.src !== s.artUrl) thumb.src = s.artUrl;
    }

    const volIcon = q('.vol-icon');
    if (volIcon) volIcon.innerHTML = s.muted ? SVG.volMute : (s.vol > 50 ? SVG.volHi : SVG.volLo);

    if (!this._sliderActive) {
      const mainVol = this._resolveVol(this._config.entity, s.vol);
      const volSlider = q('input[data-vol="__group__"]');
      if (volSlider) volSlider.value = mainVol;
      const volVal = q('.vol-val');
      if (volVal) volVal.textContent = mainVol + '%';

      for (const spId of s.speakers) {
        const sp = this._hass.states[spId];
        if (!sp) continue;
        const hassVol = Math.round((sp.attributes.volume_level || 0) * 100);
        const spVol = this._resolveVol(spId, hassVol);
        const spSlider = q(`input[data-vol="${spId}"]`);
        if (spSlider) spSlider.value = spVol;
        const spVal = spSlider?.nextElementSibling;
        if (spVal) spVal.textContent = spVol + '%';
      }
    }
  }

  _attachEvents() {
    this._card.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset?.action;
      if (!action) return;

      if (action === 'play' || action === 'pp') {
        this._handlePlay(action === 'play');
      }
      else if (action === 'expand') { this._forceExpanded = true; this._render(); }
      else if (action === 'next') this._svc('media_player', 'media_next_track', this._config.entity);
      else if (action === 'prev') this._svc('media_player', 'media_previous_track', this._config.entity);
      else if (action === 'mute') {
        const st = this._hass.states[this._config.entity];
        this._svc('media_player', 'volume_mute', this._config.entity, { is_volume_muted: !st?.attributes?.is_volume_muted });
      }
      else if (action === 'toggle-sp') {
        this._spPanelOpen = !this._spPanelOpen;
        this._render();
      }
    });

    this._card.addEventListener('input', (e) => {
      const slider = e.target.closest('input[data-vol]');
      if (!slider) return;
      this._sliderActive = true;
      clearTimeout(this._sliderEndTimer);
      this._sliderEndTimer = setTimeout(() => {
        this._sliderActive = false;
        this._groupVolStart = null;
        this._render();
      }, 600);
      const eid = slider.dataset.vol;
      const val = parseInt(slider.value);
      const label = slider.nextElementSibling;
      if (label) label.textContent = val + '%';

      if (eid === '__group__' && !this._groupVolStart) {
        const st = this._hass.states[this._config.entity];
        let members = st?.attributes?.group_members;
        if (!members || members.length === 0) members = [this._config.entity];
        const mainVol = Math.round((st?.attributes?.volume_level || 0) * 100);
        this._groupVolStart = { slider: mainVol, members };
        for (const m of members) {
          const ms = this._hass.states[m];
          this._groupVolStart[m] = Math.round((ms?.attributes?.volume_level || 0) * 100);
        }
      }

      clearTimeout(this._volTimers[eid]);
      this._volTimers[eid] = setTimeout(() => {
        const now = Date.now();
        if (eid === '__group__') {
          if (this._groupVolStart) {
            const delta = val - this._groupVolStart.slider;
            for (const m of this._groupVolStart.members) {
              const base = this._groupVolStart[m] ?? val;
              const nv = Math.max(0, Math.min(100, base + delta));
              this._pendingVol[m] = { value: nv, time: now };
              this._svc('media_player', 'volume_set', m, { volume_level: nv / 100 });
            }
          } else {
            this._pendingVol[this._config.entity] = { value: val, time: now };
            this._svc('media_player', 'volume_set', this._config.entity, { volume_level: val / 100 });
          }
        } else {
          this._pendingVol[eid] = { value: val, time: now };
          this._svc('media_player', 'volume_set', eid, { volume_level: val / 100 });
        }
      }, 150);
    });

    this._card.addEventListener('change', (e) => {
      const toggle = e.target.closest('input[data-group-toggle]');
      if (!toggle) return;
      const spId = toggle.dataset.groupToggle;
      if (toggle.checked) {
        const st = this._hass.states[this._config.entity];
        const current = st?.attributes?.group_members || [this._config.entity];
        this._svc('media_player', 'join', this._config.entity, { group_members: [...new Set([...current, spId])] });
      } else {
        this._svc('media_player', 'unjoin', spId);
      }
    });
  }

  _resolveVol(entityId, hassVol) {
    const p = this._pendingVol[entityId];
    if (!p) return hassVol;
    if (Date.now() - p.time > 3000) {
      delete this._pendingVol[entityId];
      return hassVol;
    }
    if (Math.abs(hassVol - p.value) <= 2) {
      delete this._pendingVol[entityId];
      return hassVol;
    }
    return p.value;
  }

  _handlePlay(fromMini) {
    const artEntId = this._config.source_entity;
    const mainEnt = this._config.entity;
    const mainState = this._hass.states[mainEnt];
    const isActive = mainState?.state === 'playing' || mainState?.state === 'paused';
    const gm = mainState?.attributes?.group_members || [];
    const isFollower = gm.length > 1 && gm[0] !== mainEnt;
    const speakerName = mainState?.attributes?.friendly_name || mainEnt;

    const transferSpotify = () => {
      if (!artEntId) return;
      const artEnt = this._hass.states[artEntId];
      if (!artEnt) return;
      const sources = artEnt.attributes.source_list || [];
      const match = sources.find(s => s.toLowerCase() === speakerName.toLowerCase())
        || sources.find(s => speakerName.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(speakerName.toLowerCase()));
      const source = match || speakerName;
      console.log('[ASound] select_source:', { entity: artEntId, source, speakerName, available: sources });
      this._hass.callWS({
        type: 'call_service',
        domain: 'media_player',
        service: 'select_source',
        target: { entity_id: artEntId },
        service_data: { source },
      });
    };

    if (isFollower) {
      this._pendingPlay = { time: Date.now() };
      this._render();
      this._hass.callWS({
        type: 'call_service',
        domain: 'media_player',
        service: 'unjoin',
        target: { entity_id: mainEnt },
        service_data: {},
      }).then(() => {
        setTimeout(transferSpotify, 1500);
      });
      return;
    }

    if (artEntId && (!isActive || fromMini)) {
      this._pendingPlay = { time: Date.now() };
      this._render();
      transferSpotify();
      return;
    }

    this._svc('media_player', 'media_play_pause', mainEnt);
  }

  _svc(domain, service, eid, data = {}) {
    this._hass.callWS({
      type: 'call_service',
      domain,
      service,
      target: { entity_id: eid },
      service_data: data,
    });
  }
}


// ═══════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════

const EDITOR_STYLES = `
  :host { display: block; }
  .row { margin-bottom: 16px; }
  .row label {
    display: block; font-size: 0.85em; font-weight: 500;
    margin-bottom: 4px; color: var(--secondary-text-color);
  }
  .sp-list { display: flex; flex-direction: column; gap: 6px; }
  .sp-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px;
    background: rgba(var(--rgb-primary-text-color, 0,0,0), 0.04);
    border-radius: 6px; font-size: 0.9em;
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
        <ha-entity-picker id="entity-picker" allow-custom-entity .includeDomains=${['media_player']}></ha-entity-picker>
      </div>
      <div class="row">
        <label>Source Entity (e.g. Spotify — used for artwork and playback)</label>
        <ha-entity-picker id="source-picker" allow-custom-entity .includeDomains=${['media_player']}></ha-entity-picker>
      </div>
      <div class="row">
        <label>Speakers (tap speaker icon on card to manage)</label>
        <div class="sp-list">${speakers.map((s, i) => `
          <div class="sp-item"><span>${s}</span><button class="sp-remove" data-remove="${i}">✕</button></div>
        `).join('')}</div>
        <div style="margin-top:8px">
          <ha-entity-picker id="add-picker" allow-custom-entity .includeDomains=${['media_player']}></ha-entity-picker>
        </div>
      </div>
    `;

    const ep = this.shadowRoot.getElementById('entity-picker');
    ep.value = this._config.entity || '';
    if (this._hass) ep.hass = this._hass;
    ep.addEventListener('value-changed', (e) => { this._config = { ...this._config, entity: e.detail.value }; this._fire(); });

    const ap = this.shadowRoot.getElementById('source-picker');
    ap.value = this._config.source_entity || '';
    if (this._hass) ap.hass = this._hass;
    ap.addEventListener('value-changed', (e) => { this._config = { ...this._config, source_entity: e.detail.value || '' }; this._fire(); });

    const addP = this.shadowRoot.getElementById('add-picker');
    if (this._hass) addP.hass = this._hass;
    addP.addEventListener('value-changed', (e) => {
      const val = e.detail.value;
      if (val && !(this._config.speakers || []).includes(val)) {
        this._config = { ...this._config, speakers: [...(this._config.speakers || []), val] };
        this._fire(); this._render();
      }
    });

    this.shadowRoot.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sp = [...(this._config.speakers || [])];
        sp.splice(parseInt(btn.dataset.remove), 1);
        this._config = { ...this._config, speakers: sp };
        this._fire(); this._render();
      });
    });
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

customElements.define('asound-media-card', AsoundMediaCard);
customElements.define('asound-media-card-editor', AsoundMediaCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'asound-media-card',
  name: 'ASound Media',
  description: 'Media player with artwork fallback and inline speaker group with volume',
  preview: true,
});
