from pathlib import Path
from typing import Dict, List

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
