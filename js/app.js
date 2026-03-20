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
  if (data.error) {
    throw new Error('API Error: ' + data.error);
  }
  if (!data.content || !data.content[0]) {
    throw new Error('Bad response: ' + JSON.stringify(data));
  }
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
      <div class="skeleton" style="width:80%"></div>
    </div>`;
  try {
    const raw = await callClaude(
      `Return a JSON array of 6 geopolitical highlights. Each object:
      {"id":number,"headline":"string","region":"string",
      "category":"WAR|DIPLOMACY|SANCTIONS|CRISIS|ELECTION",
      "severity":"HIGH|MEDIUM|LOW","summary":"one sentence max 120 chars"}`
    );
    const items = JSON.parse(raw);
    document.getElementById('overviewBody').innerHTML = items.map((it, i) => `
      <div class="news-item">
        <div class="news-num">0${i + 1}</div>
        <div class="news-content">
          <div class="news-headline">${esc(it.headline)}</div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:5px;line-height:1.4">
            ${esc(it.summary)}
          </div>
          <div class="news-meta">
            <span class="news-region">${esc(it.region)}</span>
            <span>·</span>
            <span class="tag ${severityTag(it.severity)}">${esc(it.category)}</span>
          </div>
        </div>
      </div>`).join('');
    loadTicker(items);
  } catch (e) {
    document.getElementById('overviewBody').innerHTML =
      `<div style="color:var(--muted);font-size:12px;padding:12px 0">
        Failed to load. ${e.message}
      </div>`;
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
      `Return a JSON array of 4 ongoing armed conflicts or wars in the world. Each:
      {"name":"string","location":"string","status":"CRITICAL|HIGH|MEDIUM",
      "update":"one sentence recent development max 130 chars",
      "parties":"brief string like Russia vs Ukraine","duration":"e.g. Since 2022"}`
    );
    const wars = JSON.parse(raw);
    document.getElementById('warBody').innerHTML = wars.map(w => `
      <div class="war-item ${w.status.toLowerCase()}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div class="war-title">${esc(w.name)}</div>
          <span class="tag ${w.status === 'CRITICAL' ? 'tag-red' : 'tag-orange'}">
            ${esc(w.status)}
          </span>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-bottom:6px">
          ${esc(w.parties)} · ${esc(w.duration)}
        </div>
        <div class="war-desc">${esc(w.update)}</div>
        <div class="war-footer">
          <span class="update-time">📍 ${esc(w.location)}</span>
        </div>
      </div>`).join('');
  } catch (e) {
    document.getElementById('warBody').innerHTML =
      `<div style="color:var(--muted);font-size:12px;padding:12px 0">
        Failed to load. ${e.message}
      </div>`;
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
      `Return JSON object:
      {"commodities":[
        {"name":"Brent Crude","symbol":"BRENT","price":"$XX.XX","change":"+X.X%","direction":"up|down","unit":"per barrel"},
        {"name":"WTI Crude","symbol":"WTI","price":"$XX.XX","change":"","direction":"","unit":"per barrel"},
        {"name":"Natural Gas","symbol":"NATGAS","price":"$X.XX","change":"","direction":"","unit":"per MMBtu"},
        {"name":"Gold","symbol":"XAU","price":"$XXXX","change":"","direction":"","unit":"per oz"},
        {"name":"Wheat","symbol":"WHEAT","price":"$XXX","change":"","direction":"","unit":"per bushel"},
        {"name":"Uranium","symbol":"URA","price":"$XX","change":"","direction":"","unit":"per lb"}
      ],"analysis":"2 sentence war-market impact analysis"}
      Use realistic approximate current market prices. Fill in all fields.`
    );
    const data = JSON.parse(raw);
    document.getElementById('marketBody').innerHTML = `
      <div class="market-grid">
        ${data.commodities.map(c => `
          <div class="market-card">
            <div class="market-name">${esc(c.symbol)}</div>
            <div class="market-price ${c.direction === 'up' ? 'up' : 'down'}">${esc(c.price)}</div>
            <div class="market-change ${c.direction === 'up' ? 'up' : 'down'}">${esc(c.change)}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${esc(c.unit)}</div>
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
  { name: "Ukraine", x: 0.545, y: 0.28, type: "critical", desc: "Ongoing Russia-Ukraine war. Frontline activity in eastern regions." },
  { name: "Gaza / Israel", x: 0.57, y: 0.42, type: "critical", desc: "Active conflict. Humanitarian crisis ongoing." },
  { name: "Sudan", x: 0.555, y: 0.50, type: "critical", desc: "Civil war between SAF and RSF. Massive displacement." },
  { name: "Myanmar", x: 0.73, y: 0.47, type: "high", desc: "Civil war against military junta. Multi-front fighting." },
  { name: "Syria", x: 0.575, y: 0.40, type: "high", desc: "Fragmented conflict. Multiple armed groups active." },
  { name: "Yemen", x: 0.60, y: 0.48, type: "high", desc: "Ongoing conflict. Houthi strikes on Red Sea shipping." },
  { name: "Sahel Region", x: 0.46, y: 0.49, type: "high", desc: "Insurgency wave across Mali, Burkina Faso, Niger." },
  { name: "Ethiopia", x: 0.585, y: 0.535, type: "medium", desc: "Post-Tigray tensions. Oromia region instability." },
  { name: "Haiti", x: 0.26, y: 0.46, type: "medium", desc: "Gang-controlled territory. Humanitarian emergency." },
  { name: "Nagorno-Karabakh", x: 0.60, y: 0.335, type: "medium", desc: "Post-conflict. Armenia-Azerbaijan border tension remains." },
  { name: "Taiwan Strait", x: 0.77, y: 0.40, type: "medium", desc: "PRC military exercises. US-China strategic tension." },
  { name: "Korea DMZ", x: 0.80, y: 0.35, type: "medium", desc: "North Korea missile activity. Elevated alert." },
  { name: "DR Congo", x: 0.545, y: 0.565, type: "high", desc: "M23 rebel activity in eastern DRC. UN forces present." },
  { name: "Somalia", x: 0.62, y: 0.54, type: "medium", desc: "Al-Shabaab insurgency. Ongoing counter-terror operations." },
];

function renderMap() {
  const canvas = document.getElementById('worldMap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.offsetWidth;
  const H = 500;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += W / 12) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += H / 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H); ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '9px DM Mono,monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText('EQUATOR', 4, H * 0.5 - 3);

  conflictZones.forEach(z => {
    const px = z.x * W, py = z.y * H;
    const color = z.type === 'critical' ? '#ef4444' : z.type === 'high' ? '#f97316' : '#eab308';
    const r = z.type === 'critical' ? 6 : z.type === 'high' ? 5 : 4;

    ctx.beginPath();
    ctx.arc(px, py, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = z.type === 'critical'
      ? 'rgba(239,68,68,0.15)'
      : z.type === 'high'
      ? 'rgba(249,115,22,0.15)'
      : 'rgba(234,179,8,0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.font = '9px DM Mono,monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(z.name, px + r + 4, py + 3);
  });

  canvas.onmousemove = function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const tt = document.getElementById('mapTooltip');
    let found = false;
    conflictZones.forEach(z => {
      const px = z.x * W, py = z.y * H;
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < 14) {
        document.getElementById('ttTitle').textContent = z.name;
        document.getElementById('ttDesc').textContent = z.desc;
        tt.style.display = 'block';
        tt.style.left = Math.min(mx + 14, W - 210) + 'px';
        tt.style.top = Math.max(my - 40, 0) + 'px';
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
  document.querySelectorAll('.section-page').forEach(s => {
    s.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.remove('active');
  });
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('btn-' + name).classList.add('active');
  if (name === 'map') {
    setTimeout(renderMap, 100);
  }
}


// ── Utility ────────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Init ───────────────────────────────────────────────────────────────────
// ── Init ───────────────────────────────────────────────────────────────────
window.showSection = showSection;
window.loadOverview = loadOverview;
window.loadWars = loadWars;
window.loadMarkets = loadMarkets;
window.renderMap = renderMap;

document.addEventListener('DOMContentLoaded', function() {
  loadOverview();
  loadWars();
  loadMarkets();
  renderMap();
});

window.addEventListener('resize', () => {
  clearTimeout(window._rt);
  window._rt = setTimeout(renderMap, 200);
});

// Auto refresh every 30 minutes
setInterval(() => {
  loadOverview();
  loadWars();
  loadMarkets();
}, 30 * 60 * 1000);