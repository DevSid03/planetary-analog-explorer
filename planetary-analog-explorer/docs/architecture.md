# Architecture

## Request flow

Browser (Leaflet + JavaScript)
    -> FastAPI static frontend
    -> FastAPI JSON endpoints
    -> NASA GIBS WMS imagery requested by the browser

## API endpoints

- `GET /api/health` — application status
- `GET /api/sites` — initial Earth analog site records
- `GET /api/targets` — planetary comparison targets
- `POST /api/compare` — weighted prototype parameter comparison

## Scientific integrity

Version 0.1.0 uses clearly labeled illustrative parameter values. A production research workflow must store source provenance, observation dates, units, uncertainty, spatial resolution and normalization methodology for every measured parameter.
