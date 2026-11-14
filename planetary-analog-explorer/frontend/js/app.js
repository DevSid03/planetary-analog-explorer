const API = "";
let sites = [];
let map;
let markerById = {};
let activeSiteId = "atacama";
let osmLayer;
let nasaLayer;
let nasaActive = false;

const fallbackSites = [
  {id:"ladakh",name:"Changthang Plateau",region:"Ladakh, India",planet:"Mars",latitude:33.2,longitude:78.0,environment:"Cold, high-altitude desert",features:["High elevation","Cold arid climate","Rocky terrain"],research:"Useful for studying rover mobility, field operations and geological sampling in cold, high-altitude terrain."},
  {id:"atacama",name:"Atacama Desert",region:"Antofagasta, Chile",planet:"Mars",latitude:-23.5,longitude:-68.3,environment:"Hyper-arid desert",features:["Extreme dryness","Salt deposits","Volcanic landscapes"],research:"Useful for studying dry-environment geochemistry, instrument testing and the preservation of biosignature analogs."},
  {id:"hawaii",name:"Hawaiian Volcanic Fields",region:"Hawaii, United States",planet:"Moon",latitude:19.4,longitude:-155.3,environment:"Basaltic volcanic terrain",features:["Basaltic lava flows","Volcanic landforms","Rugged terrain"],research:"Useful for understanding basaltic geology, lava-flow morphology and field techniques relevant to lunar volcanic terrains."}
];

function initMap() {
  map = L.map("map", {zoomControl:true, scrollWheelZoom:true}).setView([13, 5], 2);
  osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // NASA GIBS WMS imagery overlay. Layer availability and dates depend on the GIBS catalog.
  nasaLayer = L.tileLayer.wms("https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi", {
    layers: "MODIS_Terra_CorrectedReflectance_TrueColor",
    format: "image/jpeg",
    transparent: false,
    version: "1.1.1",
    attribution: "NASA GIBS / NASA Earthdata",
    tileSize: 256
  });

  document.getElementById("osm-button").addEventListener("click", () => setImagery(false));
  document.getElementById("nasa-button").addEventListener("click", () => setImagery(true));
}

function setImagery(enabled) {
  nasaActive = enabled;
  if (enabled) {
    if (map.hasLayer(osmLayer)) map.removeLayer(osmLayer);
    if (!map.hasLayer(nasaLayer)) nasaLayer.addTo(map);
  } else {
    if (map.hasLayer(nasaLayer)) map.removeLayer(nasaLayer);
    if (!map.hasLayer(osmLayer)) osmLayer.addTo(map);
  }
  document.getElementById("osm-button").classList.toggle("active", !enabled);
  document.getElementById("nasa-button").classList.toggle("active", enabled);
}

async function loadSites() {
  try {
    const response = await fetch(`${API}/api/sites`);
    if (!response.ok) throw new Error("API request failed");
    sites = await response.json();
    document.getElementById("api-status").textContent = "ONLINE";
    document.getElementById("api-detail").textContent = "Backend responding normally";
  } catch (error) {
    sites = fallbackSites;
    document.getElementById("api-status").textContent = "DEMO MODE";
    document.getElementById("api-detail").textContent = "Using built-in sample locations";
    console.warn("Could not load API sites; using fallback data.", error);
  }
  document.getElementById("site-count").textContent = String(sites.length).padStart(2, "0");
  renderSiteMarkers();
  renderSiteTiles();
  populateEarthSelect();
  selectSite(activeSiteId, false);
}

function renderSiteMarkers() {
  const icons = {
    ladakh: "🛰️",
    atacama: "🔴",
    hawaii: "🌋"
  };
  sites.forEach(site => {
    const marker = L.marker([site.latitude, site.longitude]).addTo(map);
    marker.bindTooltip(site.name, {direction:"top"});
    marker.on("click", () => selectSite(site.id, true));
    markerById[site.id] = marker;
  });
}

function renderSiteTiles() {
  const holder = document.getElementById("site-list");
  holder.innerHTML = "";
  sites.forEach(site => {
    const button = document.createElement("button");
    button.className = `site-tile ${site.id === activeSiteId ? "selected" : ""}`;
    button.innerHTML = `<strong>${escapeHTML(site.name)}</strong><small>${escapeHTML(site.region)} · ${escapeHTML(site.planet)} analog</small>`;
    button.addEventListener("click", () => selectSite(site.id, true));
    holder.appendChild(button);
  });
}

function populateEarthSelect() {
  const select = document.getElementById("earth-select");
  select.innerHTML = "";
  sites.forEach(site => {
    const option = document.createElement("option");
    option.value = site.id;
    option.textContent = `${site.name} · ${site.region}`;
    select.appendChild(option);
  });
  select.value = activeSiteId;
}

function selectSite(id, flyTo) {
  const site = sites.find(item => item.id === id);
  if (!site) return;
  activeSiteId = id;
  if (flyTo) map.flyTo([site.latitude, site.longitude], 5, {duration:1.1});
  document.getElementById("site-panel").innerHTML = `
    <div class="eyebrow">FEATURED ANALOG</div>
    <div class="site-planet">${escapeHTML(site.planet.toUpperCase())} ANALOG</div>
    <h3>${escapeHTML(site.name)}</h3>
    <p class="site-region">${escapeHTML(site.region)}</p>
    <div class="site-divider"></div>
    <div class="detail-label">ENVIRONMENT</div><p>${escapeHTML(site.environment)}</p>
    <div class="detail-label">KEY CHARACTERISTICS</div>
    <div class="tag-list">${site.features.map(item=>`<span>${escapeHTML(item)}</span>`).join("")}</div>
    <div class="detail-label">RESEARCH RELEVANCE</div><p>${escapeHTML(site.research)}</p>
    <div class="coordinates">${Math.abs(site.latitude).toFixed(1)}° ${site.latitude>=0?"N":"S"} · ${Math.abs(site.longitude).toFixed(1)}° ${site.longitude>=0?"E":"W"}</div>`;
  document.querySelectorAll(".site-tile").forEach(tile => tile.classList.toggle("selected", tile.querySelector("strong")?.textContent === site.name));
  const select = document.getElementById("earth-select");
  if (select) select.value = site.id;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

async function runComparison() {
  const button = document.getElementById("compare-button");
  const results = document.getElementById("comparison-results");
  button.disabled = true;
  button.textContent = "Calculating…";
  results.innerHTML = '<div class="empty-state"><strong>Running parameter comparison</strong><p>Evaluating the selected prototype parameters.</p></div>';
  try {
    const response = await fetch(`${API}/api/compare`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        earth_site_id:document.getElementById("earth-select").value,
        target_id:document.getElementById("target-select").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Comparison failed");
    renderComparison(data);
  } catch (error) {
    results.innerHTML = `<div class="empty-state"><strong>Comparison unavailable</strong><p>${escapeHTML(error.message)}</p></div>`;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Run comparison <span>→</span>';
  }
}

function renderComparison(data) {
  const results = document.getElementById("comparison-results");
  const rows = Object.entries(data.comparisons).map(([key,value]) => `
    <div class="metric-row">
      <span>${key.toUpperCase()}</span>
      <div class="meter"><span style="width:${value.similarity}%"></span></div>
      <strong>${value.similarity}%</strong>
    </div>`).join("");
  results.innerHTML = `
    <div class="result-card">
      <div class="result-top">
        <div><h3>${escapeHTML(data.earth_site)} ↔ ${escapeHTML(data.planetary_target)}</h3><p>${escapeHTML(data.target_body)} · Weighted prototype similarity</p></div>
        <div class="result-score">${data.score}<small style="font-size:12px;color:#8293aa"> / 100</small></div>
      </div>
      ${rows}
    </div>`;
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Health check failed");
    const data = await response.json();
    document.getElementById("api-status").textContent = "ONLINE";
    document.getElementById("api-detail").textContent = `API v${data.version}`;
  } catch {
    document.getElementById("api-status").textContent = "DEMO MODE";
    document.getElementById("api-detail").textContent = "API health check unavailable";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  document.getElementById("compare-button").addEventListener("click", runComparison);
  document.getElementById("earth-select").addEventListener("change", event => selectSite(event.target.value, true));
  await loadSites();
  checkHealth();
});
