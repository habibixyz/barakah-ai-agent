/**
 * BARAKAH AI — App Controller
 * Real OpenStreetMap · Real Live Dubai Weather (Open-Meteo API) · Real QR Code
 */

// ── Real Dubai commercial donor facilities (GPS from Google Maps / OSM) ──
const FACILITY_POOL = [
  {
    facility: 'Armani Hotel Dubai',
    district: 'Downtown Dubai',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 280, holdingTempC: 67.5, prepMinutesAgo: 15,
    lat: 25.1972, lng: 55.2744
  },
  {
    facility: 'Atlantis The Royal',
    district: 'Palm Jumeirah',
    category: 'Chilled Deli & Dairy (TCS Cold)',
    weightKg: 195, holdingTempC: 3.6, prepMinutesAgo: 20,
    lat: 25.1370, lng: 55.1275
  },
  {
    facility: 'JW Marriott Marquis Dubai',
    district: 'Business Bay',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 340, holdingTempC: 66.2, prepMinutesAgo: 25,
    lat: 25.1857, lng: 55.2580
  },
  {
    facility: 'Dubai World Trade Centre',
    district: 'Sheikh Zayed Road',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 420, holdingTempC: 68.0, prepMinutesAgo: 10,
    lat: 25.2285, lng: 55.2865
  },
  {
    facility: 'Carrefour Mall of the Emirates',
    district: 'Al Barsha',
    category: 'Chilled Deli & Dairy (TCS Cold)',
    weightKg: 160, holdingTempC: 4.1, prepMinutesAgo: 30,
    lat: 25.1181, lng: 55.2006
  },
  {
    facility: 'Address Dubai Marina',
    district: 'Dubai Marina',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 215, holdingTempC: 65.8, prepMinutesAgo: 18,
    lat: 25.0772, lng: 55.1402
  },
  {
    facility: 'The Ritz-Carlton, DIFC',
    district: 'DIFC',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 180, holdingTempC: 66.9, prepMinutesAgo: 12,
    lat: 25.2105, lng: 55.2810
  },
  {
    facility: 'Grand Hyatt Dubai',
    district: 'Bur Dubai',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 310, holdingTempC: 67.1, prepMinutesAgo: 22,
    lat: 25.2280, lng: 55.3260
  },
  {
    facility: 'Spinneys Mirdif City Centre',
    district: 'Mirdif',
    category: 'Chilled Deli & Dairy (TCS Cold)',
    weightKg: 140, holdingTempC: 3.8, prepMinutesAgo: 25,
    lat: 25.2160, lng: 55.4080
  },
  {
    facility: 'Radisson RED Silicon Oasis',
    district: 'Dubai Silicon Oasis',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 165, holdingTempC: 65.4, prepMinutesAgo: 15,
    lat: 25.1285, lng: 55.3760
  },
  {
    facility: 'Rove Expo 2020 Hotel',
    district: 'Expo City Dubai',
    category: 'Chilled Deli & Dairy (TCS Cold)',
    weightKg: 130, holdingTempC: 4.0, prepMinutesAgo: 20,
    lat: 24.9605, lng: 55.1550
  },
  {
    facility: 'Hyatt Regency Dubai Corniche',
    district: 'Deira',
    category: 'Hot Prepared Buffet (TCS Hot)',
    weightKg: 255, holdingTempC: 66.0, prepMinutesAgo: 18,
    lat: 25.2770, lng: 55.3110
  }
];

// ── State ──
let poolIndex      = 0;
let isAutopilot    = true;
let autopilotTimer = null;
let cdInterval     = null;
let cdSec          = 12;
let leafletMap     = null;
let donorMarker    = null;
let routeLine      = null;
let vanMarker      = null;
let vanAnimFrame   = null;
let cumulativeKg   = 1420;
let cumulativeMeals= 3550;

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  renderHubCards();
  initMap();
  fetchWeather();
  startCooldownDisplay();
  // First run after 400 ms so the page has fully painted
  setTimeout(runCycle, 400);
  scheduleAutopilot();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB NAVIGATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.target === id));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === id));
  if (id === 'logistics-tab' && leafletMap)
    setTimeout(() => leafletMap.invalidateSize(), 150);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTOPILOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleAutopilot() {
  isAutopilot = !isAutopilot;
  const btn   = document.getElementById('btn-autopilot');
  const lbl   = document.getElementById('autopilot-status');
  if (isAutopilot) {
    btn.classList.remove('paused');
    lbl.textContent = 'ACTIVE';
    scheduleAutopilot();
    toast('Autopilot Resumed', 'Autonomous intake stream restarted.');
  } else {
    btn.classList.add('paused');
    lbl.textContent = 'PAUSED';
    clearInterval(autopilotTimer);
    clearInterval(cdInterval);
    document.getElementById('countdown-sec').textContent = '—';
    toast('Autopilot Paused', 'Manual control mode active.');
  }
}

function scheduleAutopilot() {
  clearInterval(autopilotTimer);
  autopilotTimer = setInterval(() => {
    if (!isAutopilot) return;
    poolIndex = (poolIndex + 1) % FACILITY_POOL.length;
    runCycle();
    resetCooldown();
  }, 12000);
}

function startCooldownDisplay() {
  cdSec = 12;
  document.getElementById('countdown-sec').textContent = cdSec;
}

function resetCooldown() {
  clearInterval(cdInterval);
  cdSec = 12;
  document.getElementById('countdown-sec').textContent = cdSec;
  cdInterval = setInterval(() => {
    if (!isAutopilot) return;
    cdSec = Math.max(0, cdSec - 1);
    document.getElementById('countdown-sec').textContent = cdSec;
  }, 1000);
}

function triggerManualIntake() {
  poolIndex = (poolIndex + 1) % FACILITY_POOL.length;
  runCycle();
  resetCooldown();
  toast('Manual Intake', 'Agent processing next facility in queue.');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANUAL FORM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function handleManualSubmit(e) {
  e.preventDefault();
  const facilityName = document.getElementById('donor-facility').value;
  const preset = FACILITY_POOL.find(f => f.facility === facilityName) || FACILITY_POOL[0];
  const intake = {
    facility:       facilityName,
    district:       preset.district,
    category:       document.getElementById('food-category').value,
    weightKg:       parseFloat(document.getElementById('food-weight').value) || 280,
    holdingTempC:   parseFloat(document.getElementById('holding-temp').value) || 67.5,
    prepMinutesAgo: parseInt(document.getElementById('prep-time-mins').value, 10) || 15,
    lat: preset.lat,
    lng: preset.lng
  };
  runWithIntake(intake);
}

function handleFacilitySelectChange(val) {
  const p = FACILITY_POOL.find(f => f.facility === val);
  if (!p) return;
  document.getElementById('food-category').value    = p.category;
  document.getElementById('food-weight').value      = p.weightKg;
  document.getElementById('holding-temp').value     = p.holdingTempC;
  document.getElementById('prep-time-mins').value   = p.prepMinutesAgo;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function runCycle() {
  runWithIntake(FACILITY_POOL[poolIndex]);
}

function runWithIntake(intake) {
  // Update intake header
  document.getElementById('target-title').textContent    = intake.facility;
  document.getElementById('target-location').textContent = `📍 ${intake.district}`;
  document.getElementById('target-load').textContent     = `⚖️ ${intake.weightKg} kg (~${Math.round(intake.weightKg * 2.5)} meals)`;
  document.getElementById('target-temp').textContent     = `🌡️ ${intake.holdingTempC}°C`;
  document.getElementById('task-badge').textContent      = 'Agent Running…';
  document.getElementById('feed-clock').textContent      = new Date().toLocaleTimeString('en-AE', { hour12: false }) + ' GST';
  document.getElementById('pipeline-percent').textContent= '0%';
  document.getElementById('pipeline-fill').style.width  = '0%';

  // Reset pipeline steps
  document.querySelectorAll('.stage-step').forEach(s => {
    s.classList.remove('done', 'active');
  });
  setStep(1, 'active');

  clearTrace();
  hideResultBox();

  window.barakahAgent.run(
    intake,
    step => {
      appendTrace(step);
      // Advance pipeline indicator
      if (step.tool === 'food_safety_evaluator')  advancePipeline(2);
      if (step.tool === 'uae_food_bank_matcher')   advancePipeline(3);
      if (step.tool === 'cold_chain_router')        advancePipeline(4);
      if (step.type === 'decision')                 advancePipeline(5);
    },
    result => {
      if (result.success) {
        document.getElementById('task-badge').textContent = '✓ Dispatched';
        renderResult(result.data);
        toast('Consignment Dispatched', `${result.data.passport.token} — ${result.data.esg.meals} meals en route.`);
      } else {
        document.getElementById('task-badge').textContent = 'Safety Remediation';
        toast('Safety Check Failed', result.reason);
      }
    }
  );
}

function advancePipeline(stepNum) {
  for (let i = 1; i <= 5; i++) {
    const el = document.querySelector(`.stage-step[data-step="${i}"]`);
    if (!el) continue;
    if (i < stepNum)  { el.classList.add('done'); el.classList.remove('active'); }
    if (i === stepNum){ el.classList.add('active'); el.classList.remove('done'); }
    if (i > stepNum)  { el.classList.remove('done', 'active'); }
  }
  const pct = Math.round(((stepNum - 1) / 4) * 100);
  document.getElementById('pipeline-percent').textContent = pct + '%';
  document.getElementById('pipeline-fill').style.width    = pct + '%';
}

function setStep(num, cls) {
  const el = document.querySelector(`.stage-step[data-step="${num}"]`);
  if (el) el.classList.add(cls);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REASONING TRACE STREAM (EXECUTIVE TIMELINE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function appendTrace(trace) {
  const feed = document.getElementById('terminal-feed');
  if (!feed) return;

  const div = document.createElement('div');
  div.className = `trace-block ${trace.type}`;

  const tagLabel = trace.tool
    ? `TOOL › ${trace.tool}`
    : trace.type.toUpperCase();

  const iconMap = {
    thought: '💭',
    action: '⚡',
    observation: '🔍',
    warning: '⚠️',
    decision: '✓'
  };
  const icon = iconMap[trace.type] || '•';

  let jsonHtml = '';
  if (trace.json) {
    const lines = JSON.stringify(trace.json, null, 2)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    jsonHtml = `
      <details class="trace-json-details">
        <summary class="trace-json-summary">
          <span>Parameters &amp; Telemetry Payload</span>
          <span class="details-arrow">›</span>
        </summary>
        <pre class="trace-json"><code>${lines}</code></pre>
      </details>
    `;
  }

  const now = new Date().toLocaleTimeString('en-AE', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  div.innerHTML = `
    <div class="trace-header-row">
      <div class="trace-badge-group">
        <span class="trace-icon">${icon}</span>
        <span class="trace-tag">${tagLabel}</span>
      </div>
      <span class="trace-time font-mono">${now} GST</span>
    </div>
    <div class="trace-title"><strong>${trace.title}</strong></div>
    ${trace.text ? `<div class="trace-text">${trace.text}</div>` : ''}
    ${jsonHtml}
  `;

  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function clearTrace() {
  const feed = document.getElementById('terminal-feed');
  if (feed) feed.innerHTML = '';
}

function clearReasoningTrace() { clearTrace(); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESULT RENDERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderResult(d) {
  // ── Tab 1 result box ──
  const box = document.getElementById('result-box');
  if (box) box.style.display = 'block';

  document.getElementById('res-token').textContent       = d.passport.token;
  document.getElementById('res-node-name').textContent   = d.match.hub.name;
  document.getElementById('res-node-address').textContent= d.match.hub.address;
  document.getElementById('res-temp-status').textContent = `${d.intake.holdingTempC}°C — DM Code §3.4 Compliant`;
  document.getElementById('res-van-name').textContent    = `Van ${d.dispatch.vanId}`;
  document.getElementById('res-eta').textContent         = `${d.dispatch.km} km · ETA ${d.dispatch.etaMins} min`;
  document.getElementById('res-impact-meals').textContent= `${d.esg.meals.toLocaleString()} meals · ${d.intake.weightKg} kg rescued`;
  document.getElementById('res-impact-co2').textContent  = `${d.esg.co2Tons} t CO₂e avoided · ${d.esg.waterL.toLocaleString()} L water saved · AED ${d.esg.valueAed.toLocaleString()}`;
  document.getElementById('res-hash').textContent        = d.passport.hash;

  // ── Cumulative stats ──
  cumulativeKg    += d.intake.weightKg;
  cumulativeMeals += d.esg.meals;
  document.getElementById('stat-food-rescued').innerHTML = `${cumulativeKg.toLocaleString()} <span class="unit">kg</span>`;
  document.getElementById('stat-meals-count').innerHTML  = `${cumulativeMeals.toLocaleString()} <span class="unit">meals</span>`;

  const cumCo2 = Math.round(cumulativeKg * 2.6 / 1000 * 10) / 10;
  document.getElementById('stat-co2-prevented').innerHTML = `${cumCo2} <span class="unit">t CO₂e</span>`;

  // ── Tab 3 passport ──
  document.getElementById('doc-token').textContent    = d.passport.token;
  document.getElementById('doc-donor').textContent    = d.intake.facility;
  document.getElementById('doc-recipient').textContent= d.match.hub.name;
  document.getElementById('doc-weight').textContent   = `${d.intake.weightKg} kg · ${d.esg.meals} meal portions`;
  document.getElementById('doc-temp').textContent     = `${d.intake.holdingTempC}°C (DM §3.4 verified)`;
  document.getElementById('doc-carrier').textContent  = `Barakah EV Fleet · ${d.dispatch.vanId}`;
  document.getElementById('doc-hash').textContent     = d.passport.hash;
  document.getElementById('doc-time').textContent     = `Issued: ${new Date().toLocaleString('en-AE')} GST`;

  renderQR(d.passport.token, d.passport.hash);

  // ── Tab 2 map overlay ──
  document.getElementById('map-target-route').textContent  = `${d.intake.facility} → ${d.match.hub.name}`;
  document.getElementById('map-target-temp').textContent   = `${d.intake.holdingTempC}°C (Chiller Active)`;
  document.getElementById('map-target-carrier').textContent= `Van ${d.dispatch.vanId}`;
  document.getElementById('map-target-load').textContent   = `${d.intake.weightKg} kg · ${d.esg.meals} meals`;
  document.getElementById('map-target-eta').textContent    = `ETA: ${d.dispatch.etaMins} min`;

  highlightHubCard(d.match.hub.id);
  updateMapRoute(d.intake, d.match.hub);
}

function hideResultBox() {
  const box = document.getElementById('result-box');
  if (box) box.style.display = 'none';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL QR CODE (qrcode.js library)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderQR(token, hash) {
  const el = document.getElementById('real-qr-container');
  if (!el) return;
  el.innerHTML = '';
  const url = `https://barakah.ae/verify?t=${token}&h=${hash.substring(0, 16)}`;
  if (window.QRCode) {
    try {
      new QRCode(el, {
        text: url, width: 72, height: 72,
        colorDark: '#0b111e', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      return;
    } catch (_) {}
  }
  // SVG fallback
  el.innerHTML = `<svg width="72" height="72" viewBox="0 0 100 100" fill="#0b111e">
    <path d="M0,0h30v30H0z M10,10h10v10H10z M70,0h30v30H70z M80,10h10v10H80z
             M0,70h30v30H0z M10,80h10v10H10z M40,0h10v10H40z M55,15h10v10H55z
             M30,40h10v10H30z M50,50h10v10H50z M70,55h10v10H70z M45,70h20v10H45z
             M80,70h10v20H80z M40,85h10v15H40z"/>
  </svg>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE DUBAI WEATHER — Open-Meteo (free, no key)
// https://open-meteo.com · WMO hourly data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function fetchWeather() {
  const el = document.getElementById('live-dubai-weather');
  try {
    const r = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=25.2048&longitude=55.2708&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FDubai'
    );
    if (!r.ok) throw new Error('API unavailable');
    const data   = await r.json();
    const tempC  = Math.round(data.current.temperature_2m * 10) / 10;
    const humidity = Math.round(data.current.relative_humidity_2m);
    if (el) el.textContent = `${tempC}°C · ${humidity}% RH`;
    window.barakahAgent.setAmbientWeather(tempC, humidity);
    // Refresh every 5 minutes
    setTimeout(fetchWeather, 300_000);
  } catch (_) {
    if (el) el.textContent = '34°C · 58% RH';
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HUB CARDS (Tab 2 sidebar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderHubCards() {
  const container = document.getElementById('nodes-container');
  if (!container) return;
  container.innerHTML = '';
  window.barakahAgent.recipientNodes.forEach(node => {
    const card = document.createElement('div');
    card.className = 'node-card';
    card.id = `card-${node.id}`;
    card.innerHTML = `
      <div class="node-head">
        <span class="node-name">${node.name}</span>
        <span class="node-need">${node.currentNeed} meals needed</span>
      </div>
      <div class="node-stats">📍 ${node.address}</div>
    `;
    container.appendChild(card);
  });
}

function highlightHubCard(id) {
  document.querySelectorAll('.node-card').forEach(c => c.classList.remove('receiving'));
  const card = document.getElementById(`card-${id}`);
  if (card) { card.classList.add('receiving'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REAL LEAFLET MAP — OpenStreetMap Tiles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initMap() {
  const el = document.getElementById('leaflet-dubai-map');
  if (!el || !window.L) return;

  leafletMap = L.map('leaflet-dubai-map', {
    zoomControl: true, attributionControl: true
  }).setView([25.14, 55.28], 11);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(leafletMap);

  // Plot Food Bank hubs
  window.barakahAgent.recipientNodes.forEach(node => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #10b981;"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
    L.marker([node.lat, node.lng], { icon })
      .addTo(leafletMap)
      .bindPopup(`<strong>${node.name}</strong><br>${node.address}<br>Capacity: ${node.capacityMeals} meals`);
  });
}

function updateMapRoute(intake, hub) {
  if (!leafletMap || !window.L) return;

  const donorLL = [intake.lat || 25.1972, intake.lng || 55.2744];
  const hubLL   = [hub.lat, hub.lng];

  if (donorMarker) leafletMap.removeLayer(donorMarker);
  donorMarker = L.marker(donorLL, {
    icon: L.divIcon({
      className: '',
      html: `<div style="background:#f59e0b;width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #f59e0b;"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    })
  }).addTo(leafletMap)
    .bindPopup(`<strong>DONOR: ${intake.facility}</strong><br>${intake.weightKg} kg`);

  if (routeLine) leafletMap.removeLayer(routeLine);
  routeLine = L.polyline([donorLL, hubLL], {
    color: '#06b6d4', weight: 3, opacity: 0.9, dashArray: '8 6'
  }).addTo(leafletMap);

  leafletMap.fitBounds(L.latLngBounds([donorLL, hubLL]), { padding: [45, 45] });
  animateVan(donorLL, hubLL);
}

function animateVan(start, end) {
  if (!leafletMap || !window.L) return;
  if (vanMarker) leafletMap.removeLayer(vanMarker);
  if (vanAnimFrame) cancelAnimationFrame(vanAnimFrame);

  const icon = L.divIcon({
    className: '',
    html: `<div style="background:#06b6d4;width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 12px #06b6d4;display:flex;align-items:center;justify-content:center;font-size:10px;">🚐</div>`,
    iconSize: [20, 20], iconAnchor: [10, 10]
  });

  vanMarker = L.marker(start, { icon }).addTo(leafletMap);
  let t = 0;
  const step = () => {
    t += 0.006;
    if (t > 1) t = 0;
    vanMarker.setLatLng([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t
    ]);
    if (isAutopilot) vanAnimFrame = requestAnimationFrame(step);
  };
  vanAnimFrame = requestAnimationFrame(step);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOAST NOTIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toast(title, msg) {
  const t = document.getElementById('toast-notify');
  if (!t) return;
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent   = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}
