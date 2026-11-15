from functools import lru_cache
from pathlib import Path
from typing import Dict, List

import json
import urllib.request
import urllib.parse
import urllib.error

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Planetary Analog Explorer API",
    description="Explore terrestrial environments as analogs for lunar and Martian exploration.",
    version="0.1.0",
)


class ElevationError(Exception):
    """Raised when an elevation value cannot be retrieved."""


@lru_cache(maxsize=512)
def _fetch_srtm(lat: float, lon: float) -> float:
    """Look up SRTM 30m elevation. Only successful lookups are cached."""

    params = urllib.parse.urlencode({
        "locations": f"{lat},{lon}",
        "interpolation": "bilinear"
    })

    url = "https://api.opentopodata.org/v1/srtm30m?" + params

    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "PlanetaryAnalogExplorer/0.1"}
        )

        with urllib.request.urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))

    except urllib.error.HTTPError as error:
        if error.code == 429:
            raise ElevationError(
                "Elevation service is rate-limited. Wait a moment and try again."
            )
        raise ElevationError(f"Elevation service error (HTTP {error.code}).")
    except (urllib.error.URLError, TimeoutError) as error:
        raise ElevationError(f"Elevation service unavailable: {error}")
    except ValueError as error:
        raise ElevationError(f"Invalid elevation response: {error}")

    results = data.get("results") if isinstance(data, dict) else None

    if data.get("status") != "OK" or not results:
        raise ElevationError("No elevation data available.")

    elevation = results[0].get("elevation")

    if elevation is None:
        raise ElevationError(
            "No elevation value here (open water or a no-data cell)."
        )

    return float(elevation)


@app.get("/api/elevation")
def get_elevation(lat: float, lon: float):
    """
    Retrieve NASA SRTM 30m elevation through Open Topo Data.
    """

    if not (-60 <= lat <= 60):
        return {
            "status": "error",
            "message": "SRTM coverage is approximately 60°S to 60°N."
        }

    if not (-180 <= lon <= 180):
        return {
            "status": "error",
            "message": "Invalid longitude."
        }

    try:
        # Round to ~10 m so repeat clicks nearby hit the cache and the
        # public API's rate limit is respected.
        elevation = _fetch_srtm(round(lat, 4), round(lon, 4))
    except ElevationError as error:
        return {"status": "error", "message": str(error)}

    return {
        "status": "success",
        "latitude": lat,
        "longitude": lon,
        "elevation_m": elevation,
        "dataset": "SRTM 30m",
        "source": "NASA SRTM via Open Topo Data"
    }


SITES = [
    {
        "id": "ladakh",
        "name": "Changthang Plateau",
        "region": "Ladakh, India",
        "planet": "Mars",
        "latitude": 33.2,
        "longitude": 78.0,
        "environment": "Cold, high-altitude desert",
        "features": ["High elevation", "Cold arid climate", "Rocky terrain"],
        "research": "Useful for studying rover mobility, field operations and geological sampling in cold, high-altitude terrain.",
        "tags": ["Mars operations", "Cold desert"],
        "scores": {"terrain": 88, "aridity": 72, "temperature": 84, "geology": 78},
    },
    {
        "id": "atacama",
        "name": "Atacama Desert",
        "region": "Antofagasta, Chile",
        "planet": "Mars",
        "latitude": -23.5,
        "longitude": -68.3,
        "environment": "Hyper-arid desert",
        "features": ["Extreme dryness", "Salt deposits", "Volcanic landscapes"],
        "research": "Useful for studying dry-environment geochemistry, instrument testing and the preservation of biosignature analogs.",
        "tags": ["Mars astrobiology", "Extreme aridity"],
        "scores": {"terrain": 86, "aridity": 98, "temperature": 76, "geology": 90},
    },
    {
        "id": "hawaii",
        "name": "Hawaiian Volcanic Fields",
        "region": "Hawaii, United States",
        "planet": "Moon",
        "latitude": 19.4,
        "longitude": -155.3,
        "environment": "Basaltic volcanic terrain",
        "features": ["Basaltic lava flows", "Volcanic landforms", "Rugged terrain"],
        "research": "Useful for understanding basaltic geology, lava-flow morphology and field techniques relevant to lunar volcanic terrains.",
        "tags": ["Lunar geology", "Volcanism"],
        "scores": {"terrain": 90, "aridity": 62, "temperature": 70, "geology": 94},
    },
]

TARGETS = {
    "jezero": {
        "name": "Jezero Crater",
        "body": "Mars",
        "environment": "Ancient lake basin and delta deposits",
        "parameters": {"terrain": 82, "aridity": 95, "temperature": 78, "geology": 92},
        "note": "A Martian site selected for investigating an ancient lake and delta system."
    },
    "gale": {
        "name": "Gale Crater",
        "body": "Mars",
        "environment": "Sedimentary basin and layered rocks",
        "parameters": {"terrain": 78, "aridity": 94, "temperature": 80, "geology": 90},
        "note": "A site with a long record of sedimentary and environmental investigations."
    },
    "shackleton": {
        "name": "Shackleton Crater",
        "body": "Moon",
        "environment": "South-polar crater",
        "parameters": {"terrain": 88, "aridity": 100, "temperature": 92, "geology": 80},
        "note": "A lunar south-polar region of interest for illumination, terrain and volatile studies."
    },
}

class CompareRequest(BaseModel):
    earth_site_id: str
    target_id: str
    weights: Dict[str, float] = {"terrain": 0.30, "aridity": 0.25, "temperature": 0.20, "geology": 0.25}


@app.get("/api/health")
def health():
    return {"status": "online", "app": "Planetary Analog Explorer", "version": "0.1.0"}


@app.get("/api/sites")
def get_sites():
    return SITES


@app.get("/api/targets")
def get_targets():
    return TARGETS


@app.post("/api/compare")
def compare_sites(payload: CompareRequest):
    earth = next((site for site in SITES if site["id"] == payload.earth_site_id), None)
    target = TARGETS.get(payload.target_id)
    if earth is None:
        raise HTTPException(status_code=404, detail="Earth analog site not found.")
    if target is None:
        raise HTTPException(status_code=404, detail="Planetary target not found.")

    valid_keys = ("terrain", "aridity", "temperature", "geology")
    weights = {key: max(0.0, float(payload.weights.get(key, 0))) for key in valid_keys}
    total_weight = sum(weights.values())
    if total_weight <= 0:
        raise HTTPException(status_code=400, detail="At least one comparison weight must be greater than zero.")

    comparisons = {}
    weighted_similarity = 0.0
    for key in valid_keys:
        earth_value = earth["scores"][key]
        target_value = target["parameters"][key]
        similarity = max(0, 100 - abs(earth_value - target_value))
        comparisons[key] = {
            "earth": earth_value,
            "target": target_value,
            "similarity": round(similarity, 1),
            "weight": weights[key],
        }
        weighted_similarity += similarity * weights[key]

    score = round(weighted_similarity / total_weight)
    return {
        "earth_site": earth["name"],
        "planetary_target": target["name"],
        "target_body": target["body"],
        "score": score,
        "interpretation": (
            "This is an illustrative screening score based on prototype parameter values, "
            "not a validated scientific equivalence or mission-site recommendation."
        ),
        "comparisons": comparisons,
    }


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")










