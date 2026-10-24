# PravaahAI
AI powered crowd and traffic management
# AI-Integrated Traffic and Crowd Management

**Smarter Decisions. Safer Crowds. Smoother Traffic.**

An AI platform that turns venue maps and CCTV or drone footage into live crowd-density heatmaps, short-term congestion forecasts and routing recommendations. Authorities get a shared dashboard; attendees get a QR-linked mobile map.

> **Status: hackathon prototype (TechTrix).** It runs on prerecorded video and one sample venue. Anything marked *simulated* in the UI is not a live detection. Nothing here is a certified safety system.

---

## Table of contents

1. [Problem](#problem)
2. [What it does](#what-it-does)
3. [How it works](#how-it-works)
4. [Tech stack](#tech-stack)
5. [Project structure](#project-structure)
6. [Getting started](#getting-started)
7. [Configuration](#configuration)
8. [API overview](#api-overview)
9. [Worked example](#worked-example)
10. [Evaluation](#evaluation)
11. [Privacy and safety](#privacy-and-safety)
12. [Limitations](#limitations)
13. [Roadmap](#roadmap)
14. [References](#references)
15. [Team](#team)

---

## Problem

Large events create unpredictable crowd movement, gate bottlenecks, parking conflicts and slow emergency response. Monitoring is usually manual observation of isolated camera feeds, so nobody sees how congestion develops across the whole venue.

## What it does

- **Venue setup:** upload any map and mark gates, exits, roads, parking, restricted zones and emergency corridors.
- **Crowd heatmaps:** CSRNet estimates density from video frames; results are overlaid on the venue map as green (low), yellow (moderate) and red (high).
- **Congestion forecasting:** an LSTM predicts zone density a few steps ahead.
- **Routing advice:** a graph-based engine ranks routes by predicted congestion, capacity, length and accessibility, and re-plans when a recommendation fails.
- **Alerts:** role-specific views for organizers, traffic police and emergency teams.
- **Attendee page:** a QR code opens a mobile web page with the live map, a suggested route and optional location sharing.

Red means *attention needed*, not a confirmed crowd crush. Traffic-signal changes are suggestions for authorized personnel only.

## How it works

```
Video feeds ──► Frame extractor ──► CSRNet ──► Zone aggregator ──► LSTM ──► Routing + alerts
Venue map ────► Zone mapper ──────────────────────┘                              │
Camera links ─► Calibration ──┘                                                  ▼
                                                    PostgreSQL / PostGIS ◄── FastAPI + WebSocket
                                                                                 │
                                                          Authority dashboard ◄──┴──► Attendee page
```

| Stage | Input | Output |
| --- | --- | --- |
| CSRNet | One frame per camera | Density map and estimated count |
| Zone aggregation | Density map and camera-to-zone mask | Density index per zone |
| LSTM | Last N zone-density vectors | Predicted index for the next K steps |
| Routing engine | Venue graph, forecast, gate status | Ranked routes and alerts |

Zone density index:

```
rho_z = sum of density D(x, y) inside zone mask M_z / capacity_z
```

Route cost over a path p, with tunable weights w1 to w3:

```
C(p) = sum over edges e in p of ( w1 * length_e + w2 * forecast_e + w3 * access_e )
```

CSRNet does not read venue maps or stitch cameras together. Calibration, perspective correction and camera-to-zone mapping are separate components in this project.

## Tech stack

| Layer | Technology |
| --- | --- |
| Density estimation | CSRNet, PyTorch |
| Movement prediction | LSTM, PyTorch |
| Video processing | OpenCV, FFmpeg |
| Backend | Python, FastAPI, WebSockets |
| Frontend | React, Leaflet |
| Database | PostgreSQL with PostGIS |
| Attendee page | Responsive React web app |
| Deployment | Docker; cloud server or edge GPU |

## Project structure

Planned layout; adjust to match the repository.

```
.
├── backend/
│   ├── app/
│   │   ├── api/            REST routes and WebSocket channel
│   │   ├── models/         SQLAlchemy models
│   │   ├── services/       zone aggregation, routing, alerts
│   │   └── main.py
│   └── requirements.txt
├── ml/
│   ├── csrnet/             model definition and inference
│   ├── lstm/               training and forecasting
│   └── weights/            pretrained checkpoints (not committed)
├── frontend/
│   ├── dashboard/          authority dashboard
│   └── attendee/           mobile page opened by QR code
├── data/
│   ├── sample_videos/
│   └── sample_venue/
├── docker-compose.yml
└── README.md
```

## Getting started

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer
- PostgreSQL 14 or newer with the PostGIS extension
- FFmpeg
- An NVIDIA GPU is recommended; CPU works at a much lower frame rate

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Database

```bash
createdb crowdmgmt
psql crowdmgmt -c "CREATE EXTENSION postgis;"
```

### Frontend

```bash
cd frontend/dashboard
npm install
npm run dev
```

### With Docker

```bash
docker compose up --build
```

### Run the demo

1. Open the dashboard and upload `data/sample_venue/map.png`.
2. Mark gates, roads, parking and zones, then link the sample camera to its zones.
3. Start the replay of `data/sample_videos/` and watch the heatmap update.
4. Open the attendee QR page on a phone and follow the suggested route.

## Configuration

Set these in `backend/.env`.

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/crowdmgmt` |
| `CSRNET_WEIGHTS` | Path to pretrained CSRNet checkpoint | `ml/weights/csrnet.pth` |
| `FRAME_RATE` | Frames per second sent to inference | `1` |
| `YELLOW_THRESHOLD` | Zone index that turns a zone yellow | `0.40` |
| `RED_THRESHOLD` | Zone index that turns a zone red | `0.70` |
| `FORECAST_STEPS` | Steps ahead the LSTM predicts | `3` |
| `STALE_AFTER_SECONDS` | Age after which a feed shows a stale warning | `15` |

Thresholds should be set from calibration on sample data, not by eye.

## API overview

| Method and path | Purpose |
| --- | --- |
| `POST /venues` | Create a venue and upload its map |
| `PUT /venues/{id}/zones` | Save zones and paths drawn on the map |
| `POST /venues/{id}/cameras` | Register a camera and its zone links |
| `GET /venues/{id}/state` | Current zone indexes, forecasts and open alerts |
| `POST /alerts/{id}/approve` | Approve or dismiss a recommendation |
| `GET /venues/{id}/route?from=&to=` | Best route now, for the attendee page |
| `WS /ws/venues/{id}` | Pushes `density_update`, `alert` and `route_update` messages |

## Worked example

Density is a 0 to 1 index per zone. Yellow at 0.40, red at 0.70, one observation every 5 s. The numbers are illustrative.

1. Gate A reads 0.52, 0.58, 0.64; Gate B reads 0.28, 0.29, 0.29.
2. The LSTM forecasts Gate A at 0.74 within three steps, crossing the red threshold.
3. The dashboard raises "Gate A forecast to turn red" with the action "inspect Gate A, consider Gate B".
4. The routing engine ranks Entry to Gate B above Entry to Gate A; the operator approves.
5. The attendee page shows "Gate A is busy, use Gate B".
6. Gate B then rises to 0.72 because many people followed the advice.
7. The engine drops Gate B, ranks Gate C next, and sends a revised recommendation.

## Evaluation

No improvement percentages are claimed until measured.

| Metric | What it measures |
| --- | --- |
| Density accuracy | MAE and MSE of predicted vs annotated counts on a public dataset such as ShanghaiTech |
| Forecast error | MAE of predicted vs observed zone density; must beat a "repeat last value" baseline |
| Alert latency | Seconds from threshold crossing to alert on the dashboard |
| Routing effectiveness | Share of simulated scenarios where the recommended route lowers predicted congestion |
| Camera coverage | Share of marked zones with a usable camera view |
| Recovery time | Seconds from a failed route to a revised recommendation |
| System availability | How consistently the dashboard and inference pipeline run |

## Privacy and safety

- No face recognition, identity matching or individual tracking.
- Only zone-level density and counts are stored; raw frames are discarded after inference unless recording is turned on.
- Attendee location sharing is opt-in, explained, and never required for route guidance.
- Operator login over HTTPS with role-based access; secrets stay out of the repository.
- Simulated data is labeled as simulated everywhere.
- Obtain the venue authority's permission and check data-protection law before using real camera feeds.

## Limitations

- The LSTM needs time-series training data; the prototype uses recorded or simulated sequences.
- CSRNet accuracy can drop on camera angles unlike its training scenes.
- Zone mapping across overlapping cameras is set up by hand, not automatic.
- A recommendation can shift the crowd and create a new jam, which is why the engine re-plans and a human approves.
- Not validated in a real event.

## Roadmap

- [x] PRD and architecture
- [ ] Phase 1: venue setup, drawing tools, database schema
- [ ] Phase 2: frame extractor, CSRNet inference, zone aggregation, LSTM and baseline
- [ ] Phase 3: heatmap dashboard, alerts, routing and re-plan
- [ ] Phase 4: QR attendee page, demo script
- [ ] Later: live RTSP feeds, fine-tuning on venue footage, SMS and push alerts, audit log, multilingual attendee page

## References

1. Li, Y., Zhang, X., Chen, D. (2018). *CSRNet: Dilated Convolutional Neural Networks for Understanding the Highly Congested Scenes.* CVPR. https://arxiv.org/abs/1802.10062
2. Hochreiter, S., Schmidhuber, J. (1997). *Long Short-Term Memory.* Neural Computation, 9(8), 1735-1780. https://doi.org/10.1162/neco.1997.9.8.1735
3. Zhou, B., Wang, X., Tang, X. (2012). *Understanding Collective Crowd Behaviors: Learning a Mixture Model of Dynamic Pedestrian-Agents.* CVPR. https://mmlab.ie.cuhk.edu.hk/projects/dynamicagent
4. Leaflet: https://leafletjs.com
5. OpenCV: https://docs.opencv.org

CSRNet and LSTM are established methods. The project's contribution is integrating density estimation, forecasting, venue-aware routing and multi-stakeholder alerts into one workflow.

