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
      `Return a JSON array of 6 major geopolitical highlights happening right now in the world.
      Each object must have:
      {
        "id": number,
        "headline": "clear specific headline max 10 words",
        "region": "specific region name",
        "category": "WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION",
        "severity": "HIGH|MEDIUM|LOW",
        "summary": "2-3 sentence detailed explanation of what is happening, why it matters, and what the latest development is. Be specific with country names, leaders, and facts.",
        "casualty": "estimated casualties or displaced if applicable, else empty string",
        "since": "when did this start e.g. Since 2022"
      }
      Focus on: Russia-Ukraine, Israel-Gaza, Iran-US tensions, Sudan, Myanmar, global diplomacy.`
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
  const txt = items.map(it =>
    `<span class="ticker-item">${esc(it.headline)}</span>`
  ).join('');
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
      2. Iran vs US and Israel tensions/conflict

      Each object:
      {
        "name": "war name",
        "location": "specific locations affected",
        "status": "CRITICAL|HIGH|MEDIUM",
        "parties": "e.g. Russia vs Ukraine",
        "duration": "e.g. Since Feb 2022",
        "overview": "3-4 sentence detailed overview of the entire conflict, its origins and current state",
        "latest": "2-3 sentence description of the most recent developments in last few weeks",
        "frontlines": "specific cities, regions or areas currently under attack or contested",
        "casualties": "estimated total casualties or deaths",
        "international": "which countries or organizations are involved or supporting which side",
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
      `Return a JSON object with commodity prices that are DIRECTLY affected by current wars especially Russia-Ukraine and Middle East conflicts.
      {
        "commodities": [
          {"name":"Brent Crude Oil","symbol":"BRENT","price":"$XX.XX","change":"+X.X%","direction":"up|down","unit":"per barrel","war_impact":"one sentence on how current wars affect this price"},
          {"name":"WTI Crude Oil","symbol":"WTI","price":"$XX.XX","change":"X.X%","direction":"up|down","unit":"per barrel","war_impact":"one sentence"},
          {"name":"Natural Gas","symbol":"NATGAS","price":"$X.XX","change":"X.X%","direction":"up|down","unit":"per MMBtu","war_impact":"one sentence"},
          {"name":"Gold","symbol":"XAU","price":"$XXXX","change":"X.X%","direction":"up|down","unit":"per oz","war_impact":"one sentence"},
          {"name":"Wheat","symbol":"WHEAT","price":"$XXX","change":"X.X%","direction":"up|down","unit":"per bushel","war_impact":"one sentence"},
          {"name":"Uranium","symbol":"URA","price":"$XX","change":"X.X%","direction":"up|down","unit":"per lb","war_impact":"one sentence"}
        ],
        "analysis": "3 sentence detailed analysis of how current wars are affecting global commodity markets and supply chains"
      }
      Use realistic approximate current market prices. Fill ALL fields.`
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

// ── World Map ──────────────────────────────────────────────────────────────
const conflictZones = [
  { name: "Kyiv", x: 0.548, y: 0.265, type: "critical", desc: "Ukraine capital. Russian missile strikes ongoing on infrastructure." },
  { name: "Bakhmut", x: 0.558, y: 0.272, type: "critical", desc: "Eastern Ukraine frontline. Heavy artillery exchanges." },
  { name: "Kherson", x: 0.553, y: 0.278, type: "critical", desc: "Southern Ukraine. Russian-occupied territory, active shelling." },
  { name: "Gaza", x: 0.572, y: 0.415, type: "critical", desc: "Gaza Strip. Ongoing Israeli military operations. Humanitarian crisis." },
  { name: "Tel Aviv", x: 0.571, y: 0.408, type: "high", desc: "Israel. Rocket attacks from Gaza and Hezbollah in Lebanon." },
  { name: "Tehran", x: 0.613, y: 0.378, type: "high", desc: "Iran. US sanctions tightened. Nuclear program tensions escalating." },
  { name: "Strait of Hormuz", x: 0.628, y: 0.418, type: "high", desc: "Critical oil shipping lane. Iran threat to block passage. 20% of world oil passes here." },
  { name: "Khartoum", x: 0.558, y: 0.488, type: "critical", desc: "Sudan capital. Civil war between SAF and RSF. Massive civilian displacement." },
  { name: "Darfur", x: 0.543, y: 0.495, type: "critical", desc: "Sudan. RSF controls most of Darfur. Ethnic violence and mass displacement." },
  { name: "Yangon", x: 0.728, y: 0.458, type: "high", desc: "Myanmar. Military junta vs resistance forces. Urban warfare ongoing." },
  { name: "Aleppo", x: 0.578, y: 0.375, type: "high", desc: "Syria. Post-Assad transition. Multiple armed factions active." },
  { name: "Sanaa", x: 0.601, y: 0.468, type: "high", desc: "Yemen capital held by Houthis. Airstrikes on Red Sea shipping lanes." },
  { name: "Red Sea", x: 0.588, y: 0.455, type: "high", desc: "Houthi attacks on commercial vessels. Global shipping disruption." },
  { name: "Bamako", x: 0.455, y: 0.478, type: "high", desc: "Mali. Sahel insurgency. Wagner Group presence. French forces expelled." },
  { name: "Mogadishu", x: 0.618, y: 0.528, type: "medium", desc: "Somalia. Al-Shabaab insurgency. US airstrikes ongoing." },
  { name: "Port-au-Prince", x: 0.262, y: 0.448, type: "medium", desc: "Haiti capital. Gang control over 80% of city. UN mission deployed." },
  { name: "Taiwan Strait", x: 0.772, y: 0.388, type: "medium", desc: "PRC military exercises near Taiwan. US carrier groups deployed nearby." },
  { name: "Pyongyang", x: 0.798, y: 0.328, type: "medium", desc: "North Korea. ICBM missile tests. Weapons supplied to Russia." },
  { name: "Goma", x: 0.548, y: 0.553, type: "high", desc: "DR Congo. M23 rebels backed by Rwanda control eastern DRC. UN peacekeepers present." },
  { name: "Nagorno-Karabakh", x: 0.603, y: 0.328, type: "medium", desc: "Azerbaijan-Armenia. Post-war tensions. Armenian population displaced." },
];

const seaRoutes = [
  { name: "Strait of Hormuz", x1: 0.618, y1: 0.418, x2: 0.635, y2: 0.428, label: "Strait of Hormuz" },
  { name: "Suez Canal", x1: 0.562, y1: 0.408, x2: 0.568, y2: 0.422, label: "Suez Canal" },
  { name: "Red Sea", x1: 0.578, y1: 0.438, x2: 0.592, y2: 0.468, label: "Red Sea" },
  { name: "Black Sea", x1: 0.548, y1: 0.298, x2: 0.568, y2: 0.308, label: "Black Sea" },
];

const countries = [
  { name: "RUSSIA", x: 0.62, y: 0.22 },
  { name: "UKRAINE", x: 0.548, y: 0.258 },
  { name: "IRAN", x: 0.618, y: 0.368 },
  { name: "ISRAEL", x: 0.571, y: 0.405 },
  { name: "SUDAN", x: 0.555, y: 0.478 },
  { name: "SYRIA", x: 0.578, y: 0.368 },
  { name: "IRAQ", x: 0.593, y: 0.378 },
  { name: "SAUDI ARABIA", x: 0.608, y: 0.435 },
  { name: "YEMEN", x: 0.601, y: 0.462 },
  { name: "CHINA", x: 0.748, y: 0.348 },
  { name: "USA", x: 0.19, y: 0.318 },
  { name: "INDIA", x: 0.668, y: 0.418 },
  { name: "MYANMAR", x: 0.728, y: 0.448 },
  { name: "SOMALIA", x: 0.618, y: 0.518 },
  { name: "MALI", x: 0.455, y: 0.468 },
  { name: "CONGO", x: 0.545, y: 0.545 },
  { name: "ETHIOPIA", x: 0.585, y: 0.508 },
  { name: "EGYPT", x: 0.558, y: 0.408 },
  { name: "TURKEY", x: 0.562, y: 0.345 },
  { name: "PAKISTAN", x: 0.648, y: 0.388 },
];

function renderMap() {
  const canvas = document.getElementById('worldMap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.offsetWidth;
  const H = 520;
  canvas.width = W;
  canvas.height = H;

  // Ocean background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, W, H);

  // Grid lines (latitude/longitude)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += W / 18) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += H / 9) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Equator
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke();
  ctx.setLineDash([]);

  // Prime meridian
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H); ctx.stroke();
  ctx.setLineDash([]);

  // Tropic of Cancer
  ctx.strokeStyle = 'rgba(232,76,48,0.08)';
  ctx.setLineDash([3, 6]);
  ctx.beginPath(); ctx.moveTo(0, H * 0.37); ctx.lineTo(W, H * 0.37); ctx.stroke();
  ctx.setLineDash([]);

  // Labels for lines
  ctx.font = '8px DM Mono,monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillText('EQUATOR', 4, H * 0.5 - 3);
  ctx.fillStyle = 'rgba(232,76,48,0.5)';
  ctx.fillText('TROPIC OF CANCER', 4, H * 0.37 - 3);

  // Sea route lines
  ctx.strokeStyle = 'rgba(59,130,246,0.3)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  seaRoutes.forEach(r => {
    ctx.beginPath();
    ctx.moveTo(r.x1 * W, r.y1 * H);
    ctx.lineTo(r.x2 * W, r.y2 * H);
    ctx.stroke();
    ctx.font = '7px DM Mono,monospace';
    ctx.fillStyle = 'rgba(59,130,246,0.7)';
    ctx.fillText(r.label, r.x1 * W - 10, r.y1 * H - 5);
  });
  ctx.setLineDash([]);

  // Country name labels
  ctx.font = '7px DM Mono,monospace';
  countries.forEach(c => {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText(c.name, c.x * W, c.y * H);
  });

  // Conflict zone dots
  conflictZones.forEach(z => {
    const px = z.x * W, py = z.y * H;
    const color = z.type === 'critical' ? '#ef4444' : z.type === 'high' ? '#f97316' : '#eab308';
    const r = z.type === 'critical' ? 7 : z.type === 'high' ? 5 : 4;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(px, py, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = z.type === 'critical'
      ? 'rgba(239,68,68,0.12)'
      : z.type === 'high'
      ? 'rgba(249,115,22,0.12)'
      : 'rgba(234,179,8,0.12)';
    ctx.fill();

    // Middle ring
    ctx.beginPath();
    ctx.arc(px, py, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = z.type === 'critical'
      ? 'rgba(239,68,68,0.25)'
      : z.type === 'high'
      ? 'rgba(249,115,22,0.25)'
      : 'rgba(234,179,8,0.25)';
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Location name label
    ctx.font = '8px DM Mono,monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(z.name, px + r + 4, py + 3);
  });

  // Tooltip on hover
  canvas.onmousemove = function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const tt = document.getElementById('mapTooltip');
    let found = false;
    conflictZones.forEach(z => {
      const px = z.x * W, py = z.y * H;
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < 16) {
        document.getElementById('ttTitle').textContent = z.name;
        document.getElementById('ttDesc').textContent = z.desc;
        tt.style.display = 'block';
        tt.style.left = Math.min(e.clientX - rect.left + 14, rect.width - 220) + 'px';
        tt.style.top = Math.max(e.clientY - rect.top - 40, 0) + 'px';
        found = true;
      }
    });
    if (!found) tt.style.display = 'none';
    canvas.style.cursor = found ? 'pointer' : 'default';
  };

  canvas.onmouseleave = () => {
    document.getElementById('mapTooltip').style.display = 'none';
  };
}

// ── Section Navigation ─────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('btn-' + name).classList.add('active');
  if (name === 'map') setTimeout(renderMap, 100);
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
  renderMap();
});

window.addEventListener('resize', () => {
  clearTimeout(window._rt);
  window._rt = setTimeout(renderMap, 200);
});

setInterval(() => {
  loadOverview();
  loadWars();
  loadMarkets();
}, 30 * 60 * 1000);