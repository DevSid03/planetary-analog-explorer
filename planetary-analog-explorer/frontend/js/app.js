
/* ============================================
   PLANETARY ANALOG EXPLORER
   Version 0.1.1
   Map, NASA imagery, elevation and comparison
============================================ */

const API = "";

let sites = [];
let map = null;
let markerById = {};

let activeSiteId = "atacama";

let osmLayer = null;
let labelLayer = null;
let blueMarbleLayer = null;
let nasaLayer = null;
let temperatureLayer = null;

let nasaActive = false;
let temperatureActive = false;


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
// NASA AND BASEMAP LAYER CONFIGURATION
// ============================================

function createMapLayers() {

    // Dark Esri basemap
    osmLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 16,
            attribution: "Esri"
        }
    );

    // Esri geographical labels
    labelLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 16,
            attribution: "Esri"
        }
    );

   
// Continuous NASA Blue Marble global imagery
blueMarbleLayer = L.tileLayer.wms(
    "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
    {
        layers: "BlueMarble_NextGeneration",
        format: "image/jpeg",
        transparent: false,
        version: "1.1.1",
        attribution: "NASA GIBS - Blue Marble",
        maxZoom: 8
    }
);

// Keep VIIRS separate as an optional scientific imagery overlay
nasaLayer = L.tileLayer.wms(
    "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
    {
        layers: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        format: "image/png",
        transparent: true,
        version: "1.1.1",
        opacity: 0.85,
        attribution: "NASA GIBS - VIIRS"
    }
);

    // NASA MODIS daytime land surface temperature
    temperatureLayer = L.tileLayer.wms(
        "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi",
        {
            layers: "MODIS_Terra_Land_Surface_Temp_Day",
            format: "image/png",
            transparent: true,
            version: "1.1.1",
            opacity: 0.75,
            attribution: "NASA MODIS / NASA GIBS"
        }
    );
}


// ============================================
// MAP INITIALIZATION
// ============================================

function initMap() {

    map = L.map("map", {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([13, 5], 2);

    createMapLayers();

   // NASA Blue Marble is the default global basemap
   blueMarbleLayer.addTo(map);

   // NASA overlays start OFF
   nasaActive = false;
   temperatureActive = false;

    // Elevation click interaction
    initElevationAnalysis();

    // Map controls
    initLayerControls();

    console.log("Planetary Analog Explorer map initialized.");
}


// ============================================
// MAP LAYER BUTTONS
// ============================================

function updateLayerButtons() {

    const osmButton = document.getElementById("osm-button");
    const nasaButton = document.getElementById("nasa-button");
    const tempButton = document.getElementById("temperature-button");

    if (osmButton) {
        osmButton.classList.toggle("active", map.hasLayer(osmLayer));
    }

    if (nasaButton) {
        nasaButton.classList.toggle("active", map.hasLayer(nasaLayer));
    }

    if (tempButton) {
        tempButton.classList.toggle("active", map.hasLayer(temperatureLayer));
    }
}



function setImagery(enabled) {

    nasaActive = enabled;

    // Remove dark basemap
    if (map.hasLayer(osmLayer)) {
        map.removeLayer(osmLayer);
    }

    // Remove previous NASA background
    if (map.hasLayer(blueMarbleLayer)) {
        map.removeLayer(blueMarbleLayer);
    }

    if (enabled) {
        blueMarbleLayer.addTo(map);
    } else {
        osmLayer.addTo(map);
    }

    // Keep labels visible
    if (!map.hasLayer(labelLayer)) {
        labelLayer.addTo(map);
    }

    updateLayerButtons();
}




function setDarkBasemap() {

    if (map.hasLayer(blueMarbleLayer)) {
        map.removeLayer(blueMarbleLayer);
    }

    if (!map.hasLayer(osmLayer)) {
        osmLayer.addTo(map);
    }

    if (!map.hasLayer(labelLayer)) {
        labelLayer.addTo(map);
    }

    updateLayerButtons();
}




// Optional alternative continuous NASA basemap.
// This function is ready for a future Blue Marble button.
function setBlueMarbleBasemap() {

    if (map.hasLayer(osmLayer)) {
        map.removeLayer(osmLayer);
    }

    if (map.hasLayer(labelLayer)) {
        map.removeLayer(labelLayer);
    }

    if (!map.hasLayer(blueMarbleLayer)) {
        blueMarbleLayer.addTo(map);
    }

    updateLayerButtons();
}


function initLayerControls() {

    const osmButton = document.getElementById("osm-button");
    const nasaButton = document.getElementById("nasa-button");
    const tempButton = document.getElementById("temperature-button");

    if (osmButton) {
        osmButton.addEventListener("click", setDarkBasemap);
    }

    if (nasaButton) {
        nasaButton.addEventListener("click", () => {
            setImagery(!map.hasLayer(nasaLayer));
        });
    }

    if (tempButton) {
        tempButton.addEventListener("click", () => {
            setTemperature(!map.hasLayer(temperatureLayer));
        });
    }

    updateLayerButtons();
}


// ============================================
// SRTM ELEVATION ANALYSIS
// ============================================

function initElevationAnalysis() {

    map.on("click", async function (event) {

        const lat = event.latlng.lat;
        const lon = event.latlng.lng;

        const popup = L.popup()
            .setLatLng(event.latlng)
            .setContent("Loading SRTM elevation...")
            .openOn(map);

        try {

            const response = await fetch(
                `/api/elevation?lat=${lat}&lon=${lon}`
            );

            const data = await response.json();

            if (!response.ok || data.status !== "success") {
                throw new Error(
                    data.message || "Elevation lookup failed."
                );
            }

            popup.setContent(`
                <div style="min-width:190px;color:#111;">
                    <strong>Terrain Analysis</strong>
                    <hr>
                    <div>
                        Latitude: ${data.latitude.toFixed(4)}°
                    </div>
                    <div>
                        Longitude: ${data.longitude.toFixed(4)}°
                    </div>
                    <h3 style="margin:10px 0;">
                        ${Number(data.elevation_m).toFixed(1)} m
                    </h3>
                    <small>Dataset: ${data.dataset}</small><br>
                    <small>Source: NASA SRTM</small>
                </div>
            `);

        } catch (error) {

            popup.setContent(`
                <strong>Elevation unavailable</strong><br>
                ${escapeHTML(error.message)}
            `);

            console.error("Elevation error:", error);
        }
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

        tile.classList.toggle(
            "selected",
            tile.querySelector("strong")?.textContent === site.name
        );
    });

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

