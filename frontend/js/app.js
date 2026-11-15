
/* ============================================
   PLANETARY ANALOG EXPLORER
   Version 0.1.2
   Map, NASA imagery, elevation and comparison
============================================ */

const API = "";

let sites = [];
let map = null;
let markerById = {};
let activeSiteId = "atacama";

// Leaflet layers by name: dark, nasa, viirs, temperature, labels
const layers = {};

// What the buttons control. One base map, any combination of overlays.
const layerState = {
    base: "dark",          // "dark" | "nasa"
    viirs: false,
    temperature: false
};

// Per-layer tile loading status, shown in the map output panel
const layerStatus = {};

let probeMarker = null;
let probeRequestId = 0;
let lastProbe = { state: "idle" };

// ============================================
// FALLBACK ANALOG SITES
// ============================================

const fallbackSites = [
    {
        id: "ladakh",
        name: "Changthang Plateau",
        region: "Ladakh, India",
        planet: "Mars",
        latitude: 33.2,
        longitude: 78.0,
        environment: "Cold, high-altitude desert",
        features: [
            "High elevation",
            "Cold arid climate",
            "Rocky terrain"
        ],
        research: "Useful for studying rover mobility, field operations and geological sampling in cold, high-altitude terrain."
    },
    {
        id: "atacama",
        name: "Atacama Desert",
        region: "Antofagasta, Chile",
        planet: "Mars",
        latitude: -23.5,
        longitude: -68.3,
        environment: "Hyper-arid desert",
        features: [
            "Extreme dryness",
            "Salt deposits",
            "Volcanic landscapes"
        ],
        research: "Useful for studying dry-environment geochemistry, instrument testing and the preservation of biosignature analogs."
    },
    {
        id: "hawaii",
        name: "Hawaiian Volcanic Fields",
        region: "Hawaii, United States",
        planet: "Moon",
        latitude: 19.4,
        longitude: -155.3,
        environment: "Basaltic volcanic terrain",
        features: [
            "Basaltic lava flows",
            "Volcanic landforms",
            "Rugged terrain"
        ],
        research: "Useful for understanding basaltic geology, lava-flow morphology and field techniques relevant to lunar volcanic terrains."
    }
];



// ============================================
// LAYER CONFIGURATION
// ============================================

const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";

function isoDateDaysAgo(days) {
    const d = new Date(Date.now() - days * 86400000);
    return d.toISOString().slice(0, 10);
}

// Today's VIIRS true-colour mosaic is usually incomplete, so use yesterday.
const MAX_IMAGERY_DATE = isoDateDaysAgo(1);
let imageryDate = MAX_IMAGERY_DATE;

const LAYER_INFO = {
    dark: {
        label: "Dark basemap",
        detail: "Esri World Dark Gray"
    },
    nasa: {
        label: "NASA Blue Marble",
        detail: "GIBS · BlueMarble_NextGeneration"
    },
    viirs: {
        label: "Daily imagery",
        detail: () => `GIBS · VIIRS SNPP true colour · ${imageryDate}`
    },
    temperature: {
        label: "Surface temperature",
        detail: "GIBS · MODIS Terra land surface temp (day) · latest"
    }
};

function createMapLayers() {

    // Overlays get their own panes so they always draw above the basemap
    // and the place labels always draw above the overlays.
    map.createPane("imageryPane");
    map.getPane("imageryPane").style.zIndex = 250;

    map.createPane("labelPane");
    map.getPane("labelPane").style.zIndex = 350;
    map.getPane("labelPane").style.pointerEvents = "none";

    layers.dark = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
            maxNativeZoom: 16,
            noWrap: true,
            attribution: "Tiles &copy; Esri"
        }
    );

    layers.labels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
            pane: "labelPane",
            maxNativeZoom: 16,
            noWrap: true,
            attribution: "Labels &copy; Esri"
        }
    );

    layers.nasa = L.tileLayer.wms(GIBS_WMS, {
        layers: "BlueMarble_NextGeneration",
        format: "image/jpeg",
        transparent: false,
        version: "1.1.1",
        maxNativeZoom: 8,
        noWrap: true,
        attribution: "NASA GIBS &middot; Blue Marble"
    });

    layers.viirs = L.tileLayer.wms(GIBS_WMS, {
        layers: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        time: MAX_IMAGERY_DATE,
        pane: "imageryPane",
        zIndex: 1,
        opacity: 0.9,
        maxNativeZoom: 9,
        noWrap: true,
        attribution: "NASA GIBS &middot; VIIRS"
    });

    layers.temperature = L.tileLayer.wms(GIBS_WMS, {
        layers: "MODIS_Terra_Land_Surface_Temp_Day",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        pane: "imageryPane",
        zIndex: 2,
        opacity: 0.75,
        maxNativeZoom: 7,
        noWrap: true,
        attribution: "NASA MODIS &middot; GIBS"
    });

    // Track tile loading so the output panel can report problems
    ["dark", "nasa", "viirs", "temperature"].forEach(name => {

        layerStatus[name] = { errors: 0, loaded: false };

        layers[name].on("tileload", () => {
            if (!layerStatus[name].loaded) {
                layerStatus[name].loaded = true;
                renderLayerOutput();
            }
        });

        layers[name].on("tileerror", () => {
            layerStatus[name].errors++;
            // Re-render on the first error and then every 5th, not every tile
            if (layerStatus[name].errors % 5 === 1) {
                renderLayerOutput();
            }
        });
    });
}


// ============================================
// MAP INITIALIZATION
// ============================================

function initMap() {

    map = L.map("map", {
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 2,
        maxZoom: 12,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0
    }).setView([13, 5], 2);

    createMapLayers();
    applyLayers();

    initElevationAnalysis();
    initLayerControls();
    renderMapOutput();

    console.log("Planetary Analog Explorer map initialized.");
}


// ============================================
// MAP LAYER BUTTONS
// ============================================

// Single source of truth: make the map match layerState.
function applyLayers() {

    const wanted = new Set([
        layerState.base === "nasa" ? "nasa" : "dark",
        "labels"
    ]);

    if (layerState.viirs) {
        wanted.add("viirs");
        // Fill any gaps in the daily swath with Blue Marble, not black
        wanted.add("nasa");
        wanted.delete("dark");
    }
    if (layerState.temperature) wanted.add("temperature");

    Object.keys(layers).forEach(name => {

        const shouldShow = wanted.has(name);
        const isShown = map.hasLayer(layers[name]);

        if (shouldShow && !isShown) {

            if (layerStatus[name]) {
                layerStatus[name] = { errors: 0, loaded: false };
            }

            layers[name].addTo(map);

        } else if (!shouldShow && isShown) {

            map.removeLayer(layers[name]);
        }
    });

    updateLayerButtons();
    renderMapOutput();
}


function setImageryDate(value) {

    // Ignore empty or future dates
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > MAX_IMAGERY_DATE) {
        return;
    }

    imageryDate = value;
    layers.viirs.setParams({ time: value });
    layerStatus.viirs = { errors: 0, loaded: false };
    renderLayerOutput();
}


function setBase(name) {

    layerState.base = name;
    applyLayers();
}


function toggleOverlay(name) {

    layerState[name] = !layerState[name];
    applyLayers();
}


function updateLayerButtons() {

    const states = {
        "osm-button": layerState.base === "dark",
        "nasa-button": layerState.base === "nasa",
        "viirs-button": layerState.viirs,
        "temperature-button": layerState.temperature
    };

    Object.entries(states).forEach(([id, isOn]) => {

        const button = document.getElementById(id);

        if (!button) return;

        button.classList.toggle("active", isOn);
        button.setAttribute("aria-pressed", String(isOn));
    });
}


function initLayerControls() {

    const bind = (id, handler) => {
        const button = document.getElementById(id);
        if (button) button.addEventListener("click", handler);
    };

    bind("osm-button", () => setBase("dark"));
    bind("nasa-button", () => setBase("nasa"));
    bind("viirs-button", () => toggleOverlay("viirs"));
    bind("temperature-button", () => toggleOverlay("temperature"));

    updateLayerButtons();
}


// ============================================
// MAP OUTPUT PANEL
// ============================================

function renderMapOutput() {

    renderProbeOutput();
    renderLayerOutput();
    renderLegendOutput();
}


function formatLatLon(lat, lon) {

    return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"} · ` +
           `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}


function haversineKm(lat1, lon1, lat2, lon2) {

    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) ** 2;

    return 6371 * 2 * Math.asin(Math.sqrt(a));
}


function nearestSite(lat, lon) {

    let best = null;

    sites.forEach(site => {

        const km = haversineKm(lat, lon, site.latitude, site.longitude);

        if (!best || km < best.km) {
            best = { site, km };
        }
    });

    return best;
}


function renderProbeOutput() {

    const holder = document.getElementById("probe-output");

    if (!holder) return;

    const p = lastProbe;

    if (p.state === "idle") {

        holder.innerHTML = `
            <div class="output-title">SELECTED POINT</div>
            <p class="output-hint">
                Click anywhere on the map to read SRTM elevation
                and distance to the nearest analog site.
            </p>
        `;
        return;
    }

    let elevation;

    if (p.state === "loading") {

        elevation = `<div class="output-value muted">Loading…</div>`;

    } else if (p.state === "success") {

        elevation = `
            <div class="output-value">
                ${Math.round(p.elevation).toLocaleString()} <small>m</small>
            </div>
            <div class="output-sub">
                ${Math.round(p.elevation * 3.28084).toLocaleString()} ft
                · ${escapeHTML(p.dataset)}
            </div>
        `;

    } else {

        elevation = `
            <div class="output-value muted">—</div>
            <div class="output-sub warn">${escapeHTML(p.message)}</div>
        `;
    }

    const nearest = p.nearest
        ? `<div class="output-sub">
               Nearest analog: ${escapeHTML(p.nearest.site.name)}
               · ${Math.round(p.nearest.km).toLocaleString()} km
           </div>`
        : "";

    holder.innerHTML = `
        <div class="output-title">
            ${p.label ? escapeHTML(p.label).toUpperCase() : "SELECTED POINT"}
        </div>
        <div class="output-coords">${formatLatLon(p.lat, p.lon)}</div>
        ${elevation}
        ${nearest}
    `;
}


function layerStatusText(name) {

    const s = layerStatus[name];

    if (!s) return { cls: "ok", text: "Active" };

    if (s.errors > 0 && !s.loaded) {
        return { cls: "bad", text: "Unavailable" };
    }

    if (s.errors > 0) {
        return { cls: "warn", text: "Some tiles missing" };
    }

    if (s.loaded) {
        return { cls: "ok", text: "Loaded" };
    }

    return { cls: "wait", text: "Loading…" };
}


function renderLayerOutput() {

    const holder = document.getElementById("layer-output");

    if (!holder || !map) return;

    const active = [layerState.base === "nasa" ? "nasa" : "dark"];

    if (layerState.viirs) {
        active.length = 0;
        active.push("nasa", "viirs");
    }
    if (layerState.temperature) active.push("temperature");

    const rows = active.map(name => {

        const status = layerStatusText(name);

        return `
            <li>
                <i class="layer-dot ${status.cls}"></i>
                <span>
                    <strong>${escapeHTML(LAYER_INFO[name].label)}</strong>
                    <small>${escapeHTML(typeof LAYER_INFO[name].detail === "function" ? LAYER_INFO[name].detail() : LAYER_INFO[name].detail)}</small>
                </span>
                <em class="${status.cls}">${status.text}</em>
            </li>
        `;
    }).join("");

    holder.innerHTML = `
        <div class="output-title">ACTIVE LAYERS</div>
        <ul class="layer-list">${rows}</ul>
    `;
}


function renderLegendOutput() {

    const holder = document.getElementById("legend-output");

    if (!holder) return;

    let html = "";

    if (layerState.viirs) {

        html += `
            <div class="output-title">DAILY IMAGERY</div>
            <label class="date-label" for="imagery-date">Image date (UTC)</label>
            <input type="date" id="imagery-date" class="date-input"
                   value="${imageryDate}" max="${MAX_IMAGERY_DATE}" min="2012-01-20">
            <p class="output-hint">
                VIIRS true-colour mosaic. Areas without coverage that day
                show NASA Blue Marble instead.
            </p>
        `;
    }

    if (layerState.temperature) {

        html += `
            <div class="output-title" ${layerState.viirs ? 'style="margin-top:14px"' : ""}>
                TEMPERATURE SCALE
            </div>
            <div class="legend-bar"></div>
            <div class="legend-ends"><span>Cooler</span><span>Warmer</span></div>
            <p class="output-hint">
                Daytime land surface temperature. Colours are a relative
                guide; see the NASA GIBS legend for exact values.
            </p>
        `;
    }

    if (!html) {

        html = `
            <div class="output-title">LEGEND</div>
            <p class="output-hint">
                Turn on Surface temperature or Daily imagery to see
                what the overlay shows.
            </p>
        `;
    }

    holder.innerHTML = html;

    const dateInput = document.getElementById("imagery-date");

    if (dateInput) {
        dateInput.addEventListener(
            "change",
            event => setImageryDate(event.target.value)
        );
    }
}


// ============================================
// SRTM ELEVATION ANALYSIS
// ============================================

function placeProbeMarker(lat, lon) {

    if (probeMarker) {
        probeMarker.setLatLng([lat, lon]);
        return;
    }

    probeMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: "#67d9e8",
        weight: 2,
        fillColor: "#67d9e8",
        fillOpacity: 0.25,
        interactive: false
    }).addTo(map);
}


async function queryPoint(lat, lon, label = null) {

    const requestId = ++probeRequestId;

    placeProbeMarker(lat, lon);

    const base = {
        lat,
        lon,
        label,
        nearest: nearestSite(lat, lon)
    };

    // SRTM only covers roughly 60°S to 60°N
    if (Math.abs(lat) > 60) {

        lastProbe = {
            ...base,
            state: "error",
            message: "SRTM elevation covers about 60°S–60°N."
        };

        renderProbeOutput();
        return;
    }

    lastProbe = { ...base, state: "loading" };
    renderProbeOutput();

    try {

        const response = await fetch(
            `${API}/api/elevation?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`
        );

        const data = await response.json();

        // A newer click happened while this one was loading
        if (requestId !== probeRequestId) return;

        if (!response.ok || data.status !== "success") {
            throw new Error(data.message || "Elevation lookup failed.");
        }

        lastProbe = {
            ...base,
            state: "success",
            elevation: Number(data.elevation_m),
            dataset: data.dataset || "SRTM 30m"
        };

    } catch (error) {

        if (requestId !== probeRequestId) return;

        console.error("Elevation error:", error);

        lastProbe = {
            ...base,
            state: "error",
            message: error.message || "Elevation unavailable."
        };
    }

    renderProbeOutput();
}


function initElevationAnalysis() {

    map.on("click", event => {

        queryPoint(event.latlng.lat, event.latlng.lng);
    });
}


// ============================================
// LOAD ANALOG SITES
// ============================================

async function loadSites() {

    try {

        const response = await fetch(`${API}/api/sites`);

        if (!response.ok) {
            throw new Error("API request failed");
        }

        sites = await response.json();

        document.getElementById("api-status").textContent = "ONLINE";
        document.getElementById("api-detail").textContent =
            "Backend responding normally";

    } catch (error) {

        sites = fallbackSites;

        document.getElementById("api-status").textContent = "DEMO MODE";
        document.getElementById("api-detail").textContent =
            "Using built-in sample locations";

        console.warn("Using fallback analog sites:", error);
    }

    document.getElementById("site-count").textContent =
        String(sites.length).padStart(2, "0");

    renderSiteMarkers();
    renderSiteTiles();
    populateEarthSelect();

    selectSite(activeSiteId, false);
}


// ============================================
// SITE MARKERS
// ============================================

function renderSiteMarkers() {

    sites.forEach(site => {

        const marker = L.marker([
            site.latitude,
            site.longitude
        ]).addTo(map);

        marker.bindTooltip(site.name, {
            direction: "top"
        });

        marker.on("click", () => {
            selectSite(site.id, true);
        });

        markerById[site.id] = marker;
    });
}


// ============================================
// SITE CARDS
// ============================================

function renderSiteTiles() {

    const holder = document.getElementById("site-list");

    if (!holder) return;

    holder.innerHTML = "";

    sites.forEach(site => {

        const button = document.createElement("button");

        button.className =
            `site-tile ${site.id === activeSiteId ? "selected" : ""}`;

        button.dataset.siteId = site.id;

        button.innerHTML = `
            <strong>${escapeHTML(site.name)}</strong>
            <small>
                ${escapeHTML(site.region)}
                · ${escapeHTML(site.planet)} analog
            </small>
        `;

        button.addEventListener("click", () => {
            selectSite(site.id, true);
        });

        holder.appendChild(button);
    });
}


// ============================================
// EARTH SITE SELECTOR
// ============================================

function populateEarthSelect() {

    const select = document.getElementById("earth-select");

    if (!select) return;

    select.innerHTML = "";

    sites.forEach(site => {

        const option = document.createElement("option");

        option.value = site.id;

        option.textContent =
            `${site.name} · ${site.region}`;

        select.appendChild(option);
    });

    select.value = activeSiteId;
}


// ============================================
// SELECT ANALOG SITE
// ============================================

function selectSite(id, flyTo) {

    const site = sites.find(item => item.id === id);

    if (!site) return;

    activeSiteId = id;

    if (flyTo) {
        map.flyTo(
            [site.latitude, site.longitude],
            5,
            { duration: 1.1 }
        );
    }

    const panel = document.getElementById("site-panel");

    panel.innerHTML = `
        <div class="eyebrow">FEATURED ANALOG</div>

        <div class="site-planet">
            ${escapeHTML(site.planet.toUpperCase())} ANALOG
        </div>

        <h3>${escapeHTML(site.name)}</h3>

        <p class="site-region">
            ${escapeHTML(site.region)}
        </p>

        <div class="site-divider"></div>

        <div class="detail-label">ENVIRONMENT</div>

        <p>${escapeHTML(site.environment)}</p>

        <div class="detail-label">KEY CHARACTERISTICS</div>

        <div class="tag-list">
            ${site.features.map(item =>
                `<span>${escapeHTML(item)}</span>`
            ).join("")}
        </div>

        <div class="detail-label">RESEARCH RELEVANCE</div>

        <p>${escapeHTML(site.research)}</p>

        <div class="coordinates">
            ${Math.abs(site.latitude).toFixed(1)}°
            ${site.latitude >= 0 ? "N" : "S"}
            ·
            ${Math.abs(site.longitude).toFixed(1)}°
            ${site.longitude >= 0 ? "E" : "W"}
        </div>
    `;

    document.querySelectorAll(".site-tile").forEach(tile => {

        tile.classList.toggle("selected", tile.dataset.siteId === site.id);
    });

    // Report the site's elevation in the map output panel
    if (map) {
        queryPoint(site.latitude, site.longitude, site.name);
    }

    const select = document.getElementById("earth-select");

    if (select) {
        select.value = site.id;
    }
}


// ============================================
// HTML ESCAPING
// ============================================

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ============================================
// PLANETARY COMPARISON
// ============================================

async function runComparison() {

    const button = document.getElementById("compare-button");
    const results = document.getElementById("comparison-results");

    button.disabled = true;
    button.textContent = "Calculating…";

    results.innerHTML = `
        <div class="empty-state">
            <strong>Running parameter comparison</strong>
            <p>Evaluating the selected prototype parameters.</p>
        </div>
    `;

    try {

        const response = await fetch(`${API}/api/compare`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                earth_site_id:
                    document.getElementById("earth-select").value,

                target_id:
                    document.getElementById("target-select").value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Comparison failed");
        }

        renderComparison(data);

    } catch (error) {

        results.innerHTML = `
            <div class="empty-state">
                <strong>Comparison unavailable</strong>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

    } finally {

        button.disabled = false;
        button.innerHTML = 'Run comparison <span>→</span>';
    }
}


// ============================================
// COMPARISON RESULTS
// ============================================

function renderComparison(data) {

    const results = document.getElementById("comparison-results");

    const rows = Object.entries(data.comparisons)
        .map(([key, value]) => `

            <div class="metric-row">

                <span>${key.toUpperCase()}</span>

                <div class="meter">
                    <span style="width:${value.similarity}%"></span>
                </div>

                <strong>${value.similarity}%</strong>

            </div>

        `).join("");

    results.innerHTML = `

        <div class="result-card">

            <div class="result-top">

                <div>
                    <h3>
                        ${escapeHTML(data.earth_site)}
                        ↔
                        ${escapeHTML(data.planetary_target)}
                    </h3>

                    <p>
                        ${escapeHTML(data.target_body)}
                        · Weighted prototype similarity
                    </p>
                </div>

                <div class="result-score">
                    ${data.score}
                    <small style="font-size:12px;color:#8293aa">
                        / 100
                    </small>
                </div>

            </div>

            ${rows}

            <p class="science-note">
                ${escapeHTML(data.interpretation || "")}
            </p>

        </div>
    `;
}


// ============================================
// API HEALTH CHECK
// ============================================

async function checkHealth() {

    try {

        const response = await fetch("/api/health");

        if (!response.ok) {
            throw new Error("Health check failed");
        }

        const data = await response.json();

        document.getElementById("api-status").textContent = "ONLINE";

        document.getElementById("api-detail").textContent =
            `API v${data.version}`;

    } catch {

        document.getElementById("api-status").textContent = "DEMO MODE";

        document.getElementById("api-detail").textContent =
            "API health check unavailable";
    }
}


// ============================================
// APPLICATION STARTUP
// ============================================

document.addEventListener("DOMContentLoaded", async () => {

    // Initialize map and layers
    initMap();

    // Comparison button
    document.getElementById("compare-button")
        .addEventListener("click", runComparison);

    // Earth site selector
    document.getElementById("earth-select")
        .addEventListener("change", event => {
            selectSite(event.target.value, true);
        });

    // Load data
    await loadSites();

    // API health
    checkHealth();

    console.log("Planetary Analog Explorer ready.");
});

