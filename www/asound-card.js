// ═══════════════════════════════════════════════════════════════
// ASound Media Card — wraps the native media-control card.
// - Injects artwork from a secondary entity (e.g. Spotify)
// - Adds per-speaker volume sliders to the group controls
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

  /* Remove double card nesting from native card */
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
  .mini-thumb {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
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

  /* ── Injected volume sliders (into native group panel) ── */
  .asound-vol-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0 4px 0;
  }
  .asound-vol-row input[type=range] {
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
  .asound-vol-row input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }
  .asound-vol-row input[type=range]::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
  }
  .asound-vol-val {
    font-size: 0.72em;
    color: var(--secondary-text-color);
    width: 30px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
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
    this._volTimers = {};
    this._injectedSliders = new WeakSet();
    this._injectInterval = null;
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

    // Pass modified hass to native card (with injected artwork)
    if (this._nativeCard) {
      this._nativeCard.hass = this._proxyHass(hass);
    }

    this._updateView();
    this._tryInjectVolumeSliders();
  }

  getCardSize() {
    if (!this._hass) return 1;
    const entity = this._hass.states[this._config?.entity];
    const active = entity && (entity.state === 'playing' || entity.state === 'paused');
    return (active || this._forceExpanded) ? 4 : 1;
  }

  // ── Proxy hass: inject artwork from artwork_entity ──

  _proxyHass(hass) {
    const artEntId = this._config.artwork_entity;
    if (!artEntId) return hass;

    const artEnt = hass.states[artEntId];
    const mainEnt = hass.states[this._config.entity];
    if (!artEnt?.attributes?.entity_picture || !mainEnt) return hass;
    if (mainEnt.attributes.entity_picture) return hass;

    const proxy = Object.create(hass);
    proxy.states = { ...hass.states };
    proxy.states[this._config.entity] = {
      ...mainEnt,
      attributes: {
        ...mainEnt.attributes,
        entity_picture: artEnt.attributes.entity_picture,
        media_title: mainEnt.attributes.media_title || artEnt.attributes.media_title,
        media_artist: mainEnt.attributes.media_artist || artEnt.attributes.media_artist,
        media_album_name: mainEnt.attributes.media_album_name || artEnt.attributes.media_album_name,
      }
    };
    return proxy;
  }

  // ── Build DOM ──

  async _buildDom() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="mini-bar" hidden></div>
        <div class="native-wrap" hidden></div>
      </ha-card>
    `;

    this._miniBar = this.shadowRoot.querySelector('.mini-bar');
    this._nativeWrap = this.shadowRoot.querySelector('.native-wrap');

    try {
      const helpers = await window.loadCardHelpers();
      this._nativeCard = await helpers.createCardElement({
        type: 'media-control',
        entity: this._config.entity,
      });
      if (this._hass) this._nativeCard.hass = this._proxyHass(this._hass);
      this._nativeWrap.appendChild(this._nativeCard);
      this._updateView();

      // Start observing the native card for group panel elements
      this._startGroupObserver();
    } catch (e) {
      this._nativeWrap.innerHTML = `<div class="unavailable-msg">Could not load media-control card</div>`;
      this._nativeWrap.hidden = false;
    }

    this._attachCardEvents();
  }

  // ── View toggle (minimized vs full) ──

  _updateView() {
    if (!this._hass || !this._miniBar) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this._miniBar.hidden = true;
      this._nativeWrap.hidden = true;
      return;
    }

    const a = entity.attributes;
    const name = a.friendly_name || this._config.entity;
    const isPlaying = entity.state === 'playing';
    const isPaused = entity.state === 'paused';
    const isActive = isPlaying || isPaused;
    const showFull = isActive || this._forceExpanded;

    if (isActive) this._forceExpanded = false;

    // Artwork URL for mini bar thumbnail
    const artEnt = this._config.artwork_entity && this._hass.states[this._config.artwork_entity];
    const artUrl = (artEnt && artEnt.attributes.entity_picture) || a.entity_picture || '';

    if (showFull) {
      this._miniBar.hidden = true;
      this._nativeWrap.hidden = false;
    } else {
      this._miniBar.hidden = false;
      this._nativeWrap.hidden = true;
      this._miniBar.innerHTML = `
        ${artUrl
          ? `<img class="mini-thumb" src="${esc(artUrl)}" alt="">`
          : '<div class="mini-icon">♪</div>'
        }
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

  // ── Inject volume sliders into native group panel ──
  //
  // The native media-control card (HA 2024.8+) can show group
  // members with enable/disable toggles. We observe the native
  // card's shadow DOM tree, find those rows, and append a volume
  // slider under each speaker name.

  _startGroupObserver() {
    if (!this._nativeCard) return;

    // Observe the native card's subtree for changes
    const observer = new MutationObserver(() => {
      this._tryInjectVolumeSliders();
    });

    // Observe at our wrapper level (captures shadow DOM changes that affect layout)
    observer.observe(this._nativeWrap, { childList: true, subtree: true });

    // Also poll periodically since shadow DOM mutations may not bubble
    this._injectInterval = setInterval(() => this._tryInjectVolumeSliders(), 1000);
  }

  _tryInjectVolumeSliders() {
    if (!this._hass || !this._nativeCard || !this._config.speakers?.length) return;

    // Walk through shadow DOMs to find group member elements
    const roots = this._collectShadowRoots(this._nativeCard);

    for (const root of roots) {
      // Look for common patterns in HA's group member UI
      // Pattern 1: elements with entity-id attributes matching our speakers
      // Pattern 2: ha-switch or toggle elements inside group panels
      // Pattern 3: elements containing speaker friendly names

      const allElements = root.querySelectorAll('*');
      for (const el of allElements) {
        const entityId = el.getAttribute('entity-id') || el.getAttribute('data-entity-id') || el.entityId;
        if (entityId && this._config.speakers.includes(entityId)) {
          this._injectSliderForElement(el, entityId);
        }
      }

      // Also look for mwc-list-item, ha-list-item, or similar containing speaker names
      const listItems = root.querySelectorAll('mwc-list-item, ha-list-item, ha-md-list-item, [role="option"], [role="listitem"]');
      for (const item of listItems) {
        const matchedId = this._matchSpeakerByName(item.textContent);
        if (matchedId) {
          this._injectSliderForElement(item, matchedId);
        }
      }
    }
  }

  _collectShadowRoots(el) {
    const roots = [];
    if (el.shadowRoot) {
      roots.push(el.shadowRoot);
      el.shadowRoot.querySelectorAll('*').forEach(child => {
        roots.push(...this._collectShadowRoots(child));
      });
    }
    el.querySelectorAll('*').forEach(child => {
      roots.push(...this._collectShadowRoots(child));
    });
    return roots;
  }

  _matchSpeakerByName(text) {
    if (!text) return null;
    const cleaned = text.trim().toLowerCase();
    for (const spId of this._config.speakers) {
      const sp = this._hass.states[spId];
      if (!sp) continue;
      const name = (sp.attributes.friendly_name || '').toLowerCase();
      if (name && cleaned.includes(name)) return spId;
    }
    return null;
  }

  _injectSliderForElement(el, entityId) {
    // Don't inject twice
    if (el._asoundVolInjected) return;

    const sp = this._hass.states[entityId];
    if (!sp) return;

    const vol = Math.round((sp.attributes.volume_level || 0) * 100);

    const row = document.createElement('div');
    row.className = 'asound-vol-row';
    row.innerHTML = `
      <input type="range" min="0" max="100" value="${vol}" data-vol="${entityId}">
      <span class="asound-vol-val">${vol}%</span>
    `;

    // Inject a style tag if not already present in this root
    const parentRoot = el.getRootNode();
    if (parentRoot && !parentRoot.querySelector('.asound-injected-style')) {
      const style = document.createElement('style');
      style.className = 'asound-injected-style';
      style.textContent = `
        .asound-vol-row {
          display: flex; align-items: center; gap: 6px;
          padding: 2px 16px 6px;
        }
        .asound-vol-row input[type=range] {
          -webkit-appearance: none; appearance: none;
          flex: 1; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.12);
          outline: none; cursor: pointer; min-width: 0;
        }
        .asound-vol-row input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--primary-color); border: none;
        }
        .asound-vol-val {
          font-size: 0.72em; color: var(--secondary-text-color);
          width: 30px; text-align: right; font-variant-numeric: tabular-nums;
        }
      `;
      parentRoot.appendChild(style);
    }

    // Insert after the element
    el.parentNode.insertBefore(row, el.nextSibling);
    el._asoundVolInjected = true;

    // Volume slider events
    const slider = row.querySelector('input');
    const label = row.querySelector('.asound-vol-val');
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value);
      label.textContent = val + '%';
      clearTimeout(this._volTimers[entityId]);
      this._volTimers[entityId] = setTimeout(() => {
        this._svc('media_player', 'volume_set', entityId, { volume_level: val / 100 });
      }, 150);
    });
  }

  disconnectedCallback() {
    if (this._injectInterval) clearInterval(this._injectInterval);
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
        <label>Speakers (volume sliders added to group controls)</label>
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
  description: 'Media player with artwork injection and per-speaker volume in group controls',
  preview: true,
});
