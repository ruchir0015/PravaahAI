"""
crowd_live.py
-------------
Live crowd-density monitor using:
  - CSRNet  : real-time density-map estimation (no YOLO)
  - LSTM    : short-horizon crowd-count forecasting per zone

Controls:
  ESC  -> quit
  R    -> restart loop

Requires:
  checkpoints/csrnet_best.pth  (or csrnet_last.pth)
  checkpoints/lstm_best.pth
"""

import cv2
import time
import threading
import numpy as np
import torch
import torch.nn as nn
from collections import deque
from torchvision import transforms

from csrnet_model import CSRNet

# ──────────────────────────────── SETTINGS ───────────────────────────────────
SOURCE           = "crowd.mp4"   # 0 for webcam / DroidCam, or video path
ROWS, COLS       = 2, 2          # zone grid
AREA_PER_ZONE    = 25            # m2 per zone (calibrate on site)
CAPACITY_PER_ZONE = 40           # max people per zone
INTERVAL         = 1.0           # seconds between CSRNet inferences
CSRNET_CKPT      = "checkpoints/csrnet_best.pth"
LSTM_CKPT        = "checkpoints/lstm_best.pth"
INPUT_SIZE       = (512, 384)    # (W, H) fed into CSRNet
DEVICE           = "cuda" if torch.cuda.is_available() else "cpu"
# ─────────────────────────────────────────────────────────────────────────────

# ── Image normalisation for CSRNet ──
IMG_TF = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])


# ─────────────────────── LSTM definition (must match train_lstm.py) ──────────
class CrowdLSTM(nn.Module):
    def __init__(self, input_dim=1, hidden_dim=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers,
                            batch_first=True, dropout=0.2)
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])


# ──────────────────────────── Load models ────────────────────────────────────
def load_csrnet(ckpt_path: str) -> CSRNet:
    model = CSRNet(load_weights=False).to(DEVICE)
    ckpt  = ckpt_path if torch.cuda.is_available() else ckpt_path
    if not __import__("os").path.exists(ckpt):
        # Fall back to last checkpoint
        ckpt = ckpt.replace("best", "last")
    if not __import__("os").path.exists(ckpt):
        raise FileNotFoundError(
            f"CSRNet checkpoint not found: {ckpt_path}\n"
            "Run train_csrnet.py first."
        )
    model.load_state_dict(torch.load(ckpt, map_location=DEVICE))
    model.eval()
    print(f"[CSRNet] loaded from {ckpt}")
    return model


def load_lstm(ckpt_path: str):
    """Returns (lstm_model, seq_len, max_count) or (None, 8, 1.0) if missing."""
    import os
    if not os.path.exists(ckpt_path):
        print(f"[LSTM] checkpoint not found: {ckpt_path}. Forecasting disabled.")
        return None, 8, 1.0
    ck = torch.load(ckpt_path, map_location=DEVICE)
    model = CrowdLSTM(
        hidden_dim=ck.get("hidden_dim", 64),
        num_layers=ck.get("num_layers", 2),
    ).to(DEVICE)
    model.load_state_dict(ck["model_state"])
    model.eval()
    print(f"[LSTM]   loaded from {ckpt_path}  seq_len={ck['seq_len']}")
    return model, ck["seq_len"], ck["max_count"]


# ──────────────────────────── Status colour ──────────────────────────────────
def zone_status(density: float):
    if density < 2:   return "GREEN",  (20, 200, 20)
    if density < 4:   return "YELLOW", (0, 220, 220)
    if density < 5:   return "ORANGE", (0, 140, 255)
    return "RED", (0, 0, 235)


# ──────────────────────────── Shared state ───────────────────────────────────
latest_frame = None
result       = None          # updated by worker thread
lock         = threading.Lock()
history      = {}            # zone -> deque of (time, count)
ZONE_NAMES   = [f"Z{r * COLS + c + 1}" for r in range(ROWS) for c in range(COLS)]
for _z in ZONE_NAMES:
    history[_z] = deque(maxlen=60)


# ──────────────────────────── Camera reader ──────────────────────────────────
def reader():
    global latest_frame
    src = int(SOURCE) if SOURCE.isdigit() else SOURCE
    cap = cv2.VideoCapture(src, cv2.CAP_DSHOW if isinstance(src, int) else 0)

    if not cap.isOpened():
        # Try camera indices if webcam mode
        if isinstance(src, int):
            for idx in (1, 0, 2, 3):
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                if cap.isOpened():
                    ok, f = cap.read()
                    if ok and f is not None:
                        print(f"Camera opened at index {idx}")
                        break
                    cap.release()
        if not cap.isOpened():
            print("ERROR: Cannot open video source:", SOURCE)
            return

    cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)

    while True:
        ok, frame = cap.read()
        if not ok:
            # Loop video file
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            time.sleep(0.05)
            continue
        frame = cv2.resize(frame, (960, 540))
        with lock:
            latest_frame = frame


# ──────────────────────────── Inference worker ───────────────────────────────
def worker(csrnet: CSRNet):
    global result
    while True:
        start = time.time()

        with lock:
            frame = None if latest_frame is None else latest_frame.copy()

        if frame is None:
            time.sleep(0.2)
            continue

        # Prepare input
        rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, INPUT_SIZE)              # (W, H)
        tensor  = IMG_TF(resized).unsqueeze(0).to(DEVICE)  # (1,3,H,W)

        with torch.no_grad():
            density_t = csrnet(tensor)                     # (1,1,H/8,W/8)
        density = density_t.squeeze().cpu().numpy()
        density = np.maximum(density, 0)
        total   = float(density.sum())

        # Rescale density to original frame for display
        dh, dw  = density.shape
        zones   = {}
        for r in range(ROWS):
            for c in range(COLS):
                cell = density[r * dh // ROWS:(r + 1) * dh // ROWS,
                               c * dw // COLS:(c + 1) * dw // COLS]
                name = f"Z{r * COLS + c + 1}"
                zones[name] = float(cell.sum())
                history[name].append((time.time(), zones[name]))

        with lock:
            result = {"total": total, "density": density, "zones": zones}

        elapsed = time.time() - start
        time.sleep(max(0, INTERVAL - elapsed))


# ──────────────────────────── LSTM forecasting ───────────────────────────────
def lstm_predict(zone_name: str, lstm_model, seq_len: int, max_count: float,
                 horizon: int = 30) -> float | None:
    """
    Returns predicted count `horizon` seconds ahead (approximate),
    or None if there aren't enough history points yet.
    """
    if lstm_model is None or len(history[zone_name]) < seq_len:
        return None

    recent = [c for _, c in list(history[zone_name])[-seq_len:]]
    x      = torch.tensor([[v / max_count] for v in recent],
                          dtype=torch.float32).unsqueeze(0).to(DEVICE)  # (1,T,1)
    with torch.no_grad():
        pred = lstm_model(x).item() * max_count

    # Extrapolate: simple velocity from last point to predicted
    return max(0.0, pred)


# ──────────────────────────── Overlay drawing ────────────────────────────────
def draw_overlay(frame: np.ndarray, res: dict,
                 lstm_model, seq_len: int, max_count: float) -> np.ndarray:
    h, w = frame.shape[:2]

    # ---- Heat map ----
    d = cv2.resize(res["density"], (w, h))
    d = d / (d.max() + 1e-6)
    heat = cv2.applyColorMap((d * 255).astype(np.uint8), cv2.COLORMAP_JET)
    mask = (d > 0.08)[..., None]
    frame = np.where(mask, cv2.addWeighted(frame, 0.50, heat, 0.50, 0), frame)

    # ---- Zone panels ----
    info, alerts = {}, []
    for name, cnt in res["zones"].items():
        dens = cnt / AREA_PER_ZONE
        occ  = cnt / CAPACITY_PER_ZONE * 100
        label, color = zone_status(dens)
        info[name] = (cnt, dens, occ, label, color)

    for name, (cnt, dens, occ, label, color) in info.items():
        if occ > 80:
            other = min((k for k in info if k != name),
                        key=lambda k: info[k][2])
            alerts.append(f"Redirect {other}: {name} {occ:.0f}%")

        # LSTM forecast
        p = lstm_predict(name, lstm_model, seq_len, max_count)
        if p is not None:
            p_occ = p / CAPACITY_PER_ZONE * 100
            if occ <= 80 and p_occ > 80:
                alerts.append(f"WARN: {name} -> {p:.0f} ppl predicted")

    for r in range(ROWS):
        for c in range(COLS):
            name = f"Z{r * COLS + c + 1}"
            cnt, dens, occ, label, color = info[name]
            x0, y0 = c * w // COLS, r * h // ROWS

            # Zone border
            cv2.rectangle(frame, (x0, y0),
                          (x0 + w // COLS, y0 + h // ROWS), color, 2)
            # Info box
            bx1, by1 = x0 + 5, y0 + 5
            bx2, by2 = x0 + 270, y0 + 68
            overlay = frame.copy()
            cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (20, 20, 20), -1)
            cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
            cv2.rectangle(frame, (bx1, by1), (bx2, by2), color, 2)
            cv2.putText(frame, f"{name}: {cnt:.0f} ppl  {label}",
                        (bx1 + 6, by1 + 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
            cv2.putText(frame, f"{dens:.2f}/m2  {occ:.0f}% cap",
                        (bx1 + 6, by1 + 44),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1)

            # LSTM arrow
            p = lstm_predict(name, lstm_model, seq_len, max_count)
            if p is not None:
                arrow = "^" if p > cnt else ("v" if p < cnt else "=")
                cv2.putText(frame, f"LSTM: {p:.0f}{arrow}",
                            (bx1 + 6, by1 + 62),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 240, 240), 1)

    # ---- Total count ----
    cv2.rectangle(frame, (w - 220, 5), (w - 5, 45), (20, 20, 20), -1)
    cv2.putText(frame, f"TOTAL ~{res['total']:.0f}",
                (w - 215, 32), cv2.FONT_HERSHEY_SIMPLEX,
                0.85, (255, 255, 255), 2)

    # ---- Alerts ----
    for i, a in enumerate(alerts):
        bg_y = h - 15 - i * 28
        cv2.rectangle(frame, (0, bg_y - 18), (len(a) * 11 + 10, bg_y + 6),
                      (0, 0, 0), -1)
        cv2.putText(frame, a, (5, bg_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 80, 255), 2)

    # ---- Model label ----
    cv2.putText(frame, "CSRNet + LSTM", (8, h - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (120, 120, 120), 1)

    return frame


# ──────────────────────────── Main ───────────────────────────────────────────
def main():
    csrnet = load_csrnet(CSRNET_CKPT)
    lstm_model, seq_len, max_count = load_lstm(LSTM_CKPT)

    threading.Thread(target=reader,             daemon=True).start()
    threading.Thread(target=worker, args=(csrnet,), daemon=True).start()

    print("Press ESC to quit.")
    while True:
        with lock:
            frame = None if latest_frame is None else latest_frame.copy()
            res   = result

        if frame is None:
            time.sleep(0.05)
            continue

        if res is not None:
            frame = draw_overlay(frame, res, lstm_model, seq_len, max_count)
        else:
            cv2.putText(frame, "Warming up CSRNet...", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        cv2.imshow("Live Crowd Monitor  [CSRNet + LSTM]", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == 27:   # ESC
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()