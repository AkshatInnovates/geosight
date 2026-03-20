// ── Clock ──────────────────────────────────────────────────────────────────
function updateClock() {
  const n = new Date();
  document.getElementById('clockDisplay').textContent =
    n.toUTCString().slice(17, 22) + ' UTC · ' +
    n.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

// ── API Call ───────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch('/.netlify/functions/ask-claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (data.error) throw new Error('API Error: ' + data.error);
  if (!data.content || !data.content[0]) throw new Error('Bad response: ' + JSON.stringify(data));
  return data.content[0].text;
}

// ── Overview ───────────────────────────────────────────────────────────────
async function loadOverview() {
  const btn = document.getElementById('refreshOverview');
  const icon = document.getElementById('overviewIcon');
  btn.classList.add('loading');
  icon.classList.add('spinning');
  document.getElementById('overviewBody').innerHTML = `
    <div class="loading-state">
      <div class="skeleton" style="width:90%"></div>
      <div class="skeleton" style="width:70%"></div>
      <div class="skeleton" style="width:85%"></div>
      <div class="skeleton" style="width:60%"></div>
    </div>`;
  try {
    const raw = await callClaude(
      `Return a JSON array of 6 major geopolitical highlights happening right now.
      Each object:
      {
        "id": number,
        "headline": "clear specific headline max 10 words",
        "region": "specific region name",
        "category": "WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION",
        "severity": "HIGH|MEDIUM|LOW",
        "summary": "2-3 sentence detailed explanation. Be specific with country names, leaders, and facts.",
        "casualty": "estimated casualties if applicable else empty string",
        "since": "when did this start e.g. Since 2022"
      }`
    );
    const items = JSON.parse(raw);
    document.getElementById('overviewBody').innerHTML = items.map((it, i) => `
      <div class="news-item">
        <div class="news-num">0${i + 1}</div>
        <div class="news-content">
          <div class="news-headline">${esc(it.headline)}</div>
          <div class="news-summary">${esc(it.summary)}</div>
          <div class="news-extra">
            ${it.casualty ? `<span class="extra-pill pill-red">⚠ ${esc(it.casualty)}</span>` : ''}
            ${it.since ? `<span class="extra-pill pill-gray">🕐 ${esc(it.since)}</span>` : ''}
          </div>
          <div class="news-meta">
            <span class="news-region">${esc(it.region)}</span>
            <span>·</span>
            <span class="tag ${severityTag(it.severity)}">${esc(it.category)}</span>
            <span>·</span>
            <span class="severity-dot ${it.severity.toLowerCase()}">${esc(it.severity)}</span>
          </div>
        </div>
      </div>`).join('');
    loadTicker(items);
  } catch (e) {
    document.getElementById('overviewBody').innerHTML =
      `<div style="color:var(--muted);font-size:12px;padding:12px 0">Failed to load. ${e.message}</div>`;
  }
  btn.classList.remove('loading');
  icon.classList.remove('spinning');
}

function severityTag(s) {
  if (s === 'HIGH') return 'tag-red';
  if (s === 'MEDIUM') return 'tag-orange';
  return 'tag-green';
}

// ── Ticker ─────────────────────────────────────────────────────────────────
function loadTicker(items) {
  const txt = items.map(it => `<span class="ticker-item">${esc(it.headline)}</span>`).join('');
  document.getElementById('tickerTrack').innerHTML = txt + txt;
}

// ── Wars ───────────────────────────────────────────────────────────────────
async function loadWars() {
  const btn = document.getElementById('refreshWar');
  const icon = document.getElementById('warIcon');
  btn.classList.add('loading');
  icon.classList.add('spinning');
  document.getElementById('warBody').innerHTML = `
    <div class="loading-state">
      <div class="skeleton" style="width:80%"></div>
      <div class="skeleton" style="width:60%"></div>
      <div class="skeleton" style="width:90%"></div>
    </div>`;
  try {
    const raw = await callClaude(
      `Return a JSON array of exactly 2 wars with very detailed updates:
      1. Russia vs Ukraine war
      2. Iran vs US and Israel tensions
      Each object:
      {
        "name": "war name",
        "location": "specific locations affected",
        "status": "CRITICAL|HIGH|MEDIUM",
        "parties": "e.g. Russia vs Ukraine",
        "duration": "e.g. Since Feb 2022",
        "overview": "3-4 sentence detailed overview",
        "latest": "2-3 sentence most recent developments",
        "frontlines": "specific cities or regions contested",
        "casualties": "estimated total casualties",
        "international": "which countries are involved or supporting",
        "outlook": "SHORT|ESCALATING|DE-ESCALATING"
      }`
    );
    const wars = JSON.parse(raw);
    document.getElementById('warBody').innerHTML = wars.map(w => `
      <div class="war-item ${w.status.toLowerCase()}">
        <div class="war-header">
          <div>
            <div class="war-title">${esc(w.name)}</div>
            <div class="war-parties">${esc(w.parties)} · ${esc(w.duration)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
            <span class="tag ${w.status === 'CRITICAL' ? 'tag-red' : 'tag-orange'}">${esc(w.status)}</span>
            <span class="tag ${w.outlook === 'ESCALATING' ? 'tag-red' : w.outlook === 'DE-ESCALATING' ? 'tag-green' : 'tag-orange'}">${esc(w.outlook)}</span>
          </div>
        </div>
        <div class="war-section-label">Overview</div>
        <div class="war-desc">${esc(w.overview)}</div>
        <div class="war-section-label">Latest Update</div>
        <div class="war-desc">${esc(w.latest)}</div>
        <div class="war-grid">
          <div class="war-grid-item">
            <div class="war-grid-label">📍 Active Frontlines</div>
            <div class="war-grid-value">${esc(w.frontlines)}</div>
          </div>
          <div class="war-grid-item">
            <div class="war-grid-label">💀 Casualties</div>
            <div class="war-grid-value">${esc(w.casualties)}</div>
          </div>
          <div class="war-grid-item" style="grid-column:1/-1;">
            <div class="war-grid-label">🌍 International Involvement</div>
            <div class="war-grid-value">${esc(w.international)}</div>
          </div>
        </div>
        <div class="war-footer">
          <span class="update-time">📍 ${esc(w.location)}</span>
        </div>
      </div>`).join('');
  } catch (e) {
    document.getElementById('warBody').innerHTML =
      `<div style="color:var(--muted);font-size:12px;padding:12px 0">Failed to load. ${e.message}</div>`;
  }
  btn.classList.remove('loading');
  icon.classList.remove('spinning');
}

// ── Markets ────────────────────────────────────────────────────────────────
async function loadMarkets() {
  const btn = document.getElementById('refreshMarket');
  const icon = document.getElementById('marketIcon');
  btn.classList.add('loading');
  icon.classList.add('spinning');
  document.getElementById('marketBody').innerHTML = `
    <div class="loading-state">
      <div class="skeleton" style="width:100%;height:55px"></div>
      <div class="skeleton" style="width:100%;height:55px"></div>
    </div>`;
  document.getElementById('marketAnalysis').textContent = 'Loading analysis...';
  try {
    const raw = await callClaude(
      `Return JSON with commodity prices directly affected by current wars:
      {
        "commodities": [
          {"name":"Brent Crude Oil","symbol":"BRENT","price":"$XX.XX","change":"+X.X%","direction":"up|down","unit":"per barrel","war_impact":"one sentence on war effect"},
          {"name":"WTI Crude Oil","symbol":"WTI","price":"$XX.XX","change":"X.X%","direction":"up|down","unit":"per barrel","war_impact":"one sentence"},
          {"name":"Natural Gas","symbol":"NATGAS","price":"$X.XX","change":"X.X%","direction":"up|down","unit":"per MMBtu","war_impact":"one sentence"},
          {"name":"Gold","symbol":"XAU","price":"$XXXX","change":"X.X%","direction":"up|down","unit":"per oz","war_impact":"one sentence"},
          {"name":"Wheat","symbol":"WHEAT","price":"$XXX","change":"X.X%","direction":"up|down","unit":"per bushel","war_impact":"one sentence"},
          {"name":"Uranium","symbol":"URA","price":"$XX","change":"X.X%","direction":"up|down","unit":"per lb","war_impact":"one sentence"}
        ],
        "analysis": "3 sentence analysis of how current wars affect global commodity markets"
      }
      Use realistic current market prices. Fill ALL fields.`
    );
    const data = JSON.parse(raw);
    document.getElementById('marketBody').innerHTML = `
      <div class="market-grid">
        ${data.commodities.map(c => `
          <div class="market-card">
            <div class="market-name">${esc(c.symbol)}</div>
            <div class="market-full-name">${esc(c.name)}</div>
            <div class="market-price ${c.direction === 'up' ? 'up' : 'down'}">${esc(c.price)}</div>
            <div class="market-change ${c.direction === 'up' ? 'up' : 'down'}">${c.direction === 'up' ? '▲' : '▼'} ${esc(c.change)}</div>
            <div class="market-unit">${esc(c.unit)}</div>
            <div class="market-impact">${esc(c.war_impact)}</div>
          </div>`).join('')}
      </div>`;
    document.getElementById('marketAnalysis').textContent = data.analysis;
  } catch (e) {
    document.getElementById('marketBody').innerHTML =
      `<div style="color:var(--muted);font-size:12px">Failed to load. ${e.message}</div>`;
  }
  btn.classList.remove('loading');
  icon.classList.remove('spinning');
}

// ── Leaflet World Map ──────────────────────────────────────────────────────
const conflictZones = [
  { name: "Kyiv", lat: 50.45, lng: 30.52, type: "critical", desc: "Ukraine capital. Russian missile strikes on infrastructure ongoing." },
  { name: "Bakhmut", lat: 48.60, lng: 37.99, type: "critical", desc: "Eastern Ukraine frontline. Heavy artillery exchanges daily." },
  { name: "Kherson", lat: 46.63, lng: 32.61, type: "critical", desc: "Southern Ukraine. Active shelling across the river." },
  { name: "Gaza Strip", lat: 31.35, lng: 34.30, type: "critical", desc: "Ongoing Israeli military operations. Severe humanitarian crisis." },
  { name: "Tel Aviv", lat: 32.08, lng: 34.78, type: "high", desc: "Israel. Rocket attacks from Gaza and Hezbollah in Lebanon." },
  { name: "Tehran", lat: 35.69, lng: 51.39, type: "high", desc: "Iran. US sanctions tightened. Nuclear program tensions escalating." },
  { name: "Strait of Hormuz", lat: 26.57, lng: 56.25, type: "high", desc: "Critical oil lane. Iran threatens to block. 20% of world oil passes here." },
  { name: "Khartoum", lat: 15.55, lng: 32.53, type: "critical", desc: "Sudan capital. Civil war between SAF and RSF. Mass displacement." },
  { name: "Darfur", lat: 13.50, lng: 24.00, type: "critical", desc: "Sudan. RSF controls Darfur. Ethnic violence ongoing." },
  { name: "Yangon", lat: 16.87, lng: 96.19, type: "high", desc: "Myanmar. Military junta vs resistance. Urban warfare ongoing." },
  { name: "Aleppo", lat: 36.20, lng: 37.16, type: "high", desc: "Syria. Post-Assad transition. Multiple armed factions active." },
  { name: "Sanaa", lat: 15.35, lng: 44.20, type: "high", desc: "Yemen. Houthi capital. Attacks on Red Sea shipping." },
  { name: "Red Sea", lat: 18.00, lng: 38.50, type: "high", desc: "Houthi attacks on commercial vessels. Global shipping disrupted." },
  { name: "Bamako", lat: 12.65, lng: -8.00, type: "high", desc: "Mali. Sahel insurgency. Wagner Group presence." },
  { name: "Mogadishu", lat: 2.05, lng: 45.34, type: "medium", desc: "Somalia. Al-Shabaab insurgency. US airstrikes ongoing." },
  { name: "Port-au-Prince", lat: 18.54, lng: -72.33, type: "medium", desc: "Haiti. Gang control over 80% of city. UN mission deployed." },
  { name: "Taiwan Strait", lat: 24.50, lng: 119.50, type: "medium", desc: "PRC military exercises near Taiwan. US carrier groups nearby." },
  { name: "Pyongyang", lat: 39.02, lng: 125.75, type: "medium", desc: "North Korea. ICBM tests. Weapons supplied to Russia." },
  { name: "Goma", lat: -1.67, lng: 29.22, type: "high", desc: "DR Congo. M23 rebels control eastern DRC. UN peacekeepers present." },
  { name: "Nagorno-Karabakh", lat: 39.82, lng: 46.76, type: "medium", desc: "Azerbaijan-Armenia. Post-war tensions remain high." },
];

let leafletMap = null;

function renderMap() {
  const mapDiv = document.getElementById('leafletMap');
  if (!mapDiv) return;

  if (leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 100);
    return;
  }

  leafletMap = L.map('leafletMap', {
    center: [25, 20],
    zoom: 2,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // Dark style map tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(leafletMap);

  // Add all conflict markers
  conflictZones.forEach(z => {
    const color = z.type === 'critical' ? '#ef4444' : z.type === 'high' ? '#f97316' : '#eab308';
    const size = z.type === 'critical' ? 18 : z.type === 'high' ? 14 : 10;

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50%;
        border:2px solid rgba(255,255,255,0.5);
        box-shadow:0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}66;
        animation: mapPulse 2s infinite;
        cursor:pointer;
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size]
    });

    L.marker([z.lat, z.lng], { icon })
      .addTo(leafletMap)
      .bindPopup(`
        <div style="
          background:#111318;
          color:#e8eaf0;
          border:1px solid rgba(255,255,255,0.15);
          border-radius:10px;
          padding:14px 16px;
          min-width:220px;
          max-width:260px;
          font-family:'DM Sans',sans-serif;
        ">
          <div style="
            font-family:'Syne',sans-serif;
            font-weight:800;
            font-size:14px;
            color:${color};
            margin-bottom:8px;
            display:flex;
            align-items:center;
            gap:6px;
          ">
            <span style="
              width:8px;height:8px;
              background:${color};
              border-radius:50%;
              display:inline-block;
              box-shadow:0 0 6px ${color};
            "></span>
            ${z.name}
          </div>
          <div style="font-size:12px;color:#9ca3af;line-height:1.6;margin-bottom:10px;">${z.desc}</div>
          <div style="
            font-size:10px;
            font-family:'DM Mono',monospace;
            color:${color};
            background:${color}22;
            border:1px solid ${color}44;
            padding:3px 10px;
            border-radius:4px;
            display:inline-block;
            letter-spacing:0.05em;
          ">${z.type.toUpperCase()}</div>
        </div>
      `, { maxWidth: 280 });
  });
}

// ── Section Navigation ─────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('btn-' + name).classList.add('active');
  if (name === 'map') {
    setTimeout(renderMap, 150);
  }
}

// ── Utility ────────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Init ───────────────────────────────────────────────────────────────────
window.showSection = showSection;
window.loadOverview = loadOverview;
window.loadWars = loadWars;
window.loadMarkets = loadMarkets;
window.renderMap = renderMap;

document.addEventListener('DOMContentLoaded', function () {
  loadOverview();
  loadWars();
  loadMarkets();
});

window.addEventListener('resize', () => {
  if (leafletMap) leafletMap.invalidateSize();
});

setInterval(() => {
  loadOverview();
  loadWars();
  loadMarkets();
}, 30 * 60 * 1000);

