# Planetary Analog Explorer

An interactive Earth–Moon–Mars research dashboard for exploring terrestrial environments that may serve as analogs for planetary science and exploration.

> Earth is our laboratory. Space is our destination.

## Version 0.1.0 — MVP

- Dark, responsive research dashboard
- Interactive Earth map with OpenStreetMap
- NASA GIBS satellite imagery overlay (WMS)
- Three initial Earth analog locations: Changthang Plateau, Atacama Desert and Hawaiian volcanic fields
- Prototype comparison workflow for Earth analogs and lunar/Martian targets
- FastAPI backend and API health endpoint

## Important scientific note

The comparison values in this initial prototype are illustrative demonstration values. The weighted similarity score is a software workflow example, not a validated scientific analog assessment, measured dataset, or mission-site recommendation. Future versions should replace these values with traceable observations and documented normalization methods.

## Technology

- Python 3.10+
- FastAPI
- Leaflet
- OpenStreetMap
- NASA Global Imagery Browse Services (GIBS)

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/planetary-analog-explorer.git
   cd planetary-analog-explorer
   ```

2. Create and activate a virtual environment:

   **Windows PowerShell**
   ```powershell
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

   **macOS / Linux**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Start the application from the repository root:

   ```bash
   uvicorn backend.main:app --reload
   ```

5. Open:

   - App: http://127.0.0.1:8000
   - API health: http://127.0.0.1:8000/api/health
   - Interactive API docs: http://127.0.0.1:8000/docs

## NASA data

The map includes a NASA GIBS WMS layer using the example layer identifier `MODIS_Terra_CorrectedReflectance_TrueColor`.

- GIBS API documentation: https://nasa-gibs.github.io/gibs-api-docs/
- NASA Earthdata: https://www.earthdata.nasa.gov/

The selected imagery product and available dates should be checked against the current GIBS catalog. GIBS is a visualization service; it is not a substitute for downloading calibrated scientific raster products.

Planetary data sources planned for later versions:

- NASA Planetary Data System: https://pds.nasa.gov/
- Lunar Reconnaissance Orbiter data products: https://science.nasa.gov/mission/lro/data-products/

## Project structure

```text
planetary-analog-explorer/
├── backend/
│   ├── __init__.py
│   └── main.py
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── datasets/README.md
├── docs/architecture.md
├── requirements.txt
├── .gitignore
└── README.md
```

## Roadmap

- [x] Dashboard and navigation foundation
- [x] Interactive Earth map
- [x] NASA GIBS imagery overlay
- [x] Initial analog location profiles
- [x] Prototype comparison API
- [ ] Traceable environmental datasets
- [ ] Lunar and Martian map layers
- [ ] Elevation, slope and surface roughness analysis
- [ ] Explainable, scientifically validated scoring
- [ ] Exportable research reports

## License

A license has not yet been selected. Until one is added, standard copyright applies; public visibility on GitHub does not automatically grant permission to reuse the code.
