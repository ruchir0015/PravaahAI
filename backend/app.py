import cv2
import numpy as np
import pandas as pd
import streamlit as st
from collections import deque
from ultralytics import YOLO

st.set_page_config(page_title="Crowd Control Dashboard", layout="wide")
st.title("AI Traffic & Crowd Management - Live Dashboard")

GATES = ["Gate 1", "Gate 2"]
AREA = {"Gate 1": 8, "Gate 2": 8}          # m2
CAPACITY = {"Gate 1": 15, "Gate 2": 15}    # people


@st.cache_resource
def load_model():
    return YOLO("yolov8n.pt")


model = load_model()

# ---- Keep video + history across reruns ----
if "cap" not in st.session_state:
    st.session_state.cap = cv2.VideoCapture("crowd.mp4")
    st.session_state.history = {g: deque(maxlen=60) for g in GATES}
    st.session_state.frame_no = 0
cap = st.session_state.cap
history = st.session_state.history

# ---- Sidebar: what-if controls ----
st.sidebar.header("What-if controls")
closed = {g: st.sidebar.checkbox(f"Close {g}") for g in GATES}
if st.sidebar.button("Restart video"):
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)


def status(density):
    if density < 2: return "GREEN", "#2ecc40"
    if density < 4: return "YELLOW", "#ffdc00"
    if density < 5: return "ORANGE", "#ff851b"
    return "RED", "#ff4136"


def predict(values, steps=5):
    if len(values) < 5:
        return None
    x = np.arange(len(values))
    slope, intercept = np.polyfit(x, list(values), 1)
    return slope * (len(values) + steps) + intercept


left, right = st.columns([3, 2])
video_ph = left.empty()
with right:
    metrics_ph = st.empty()
    st.subheader("Alerts and suggested actions")
    alerts_ph = st.empty()
    st.subheader("People count over time")
    chart_ph = st.empty()

while True:
    ok, frame = cap.read()
    if not ok:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)   # loop the video
        continue
    frame = cv2.resize(frame, (960, 540))
    st.session_state.frame_no += 1
    fn = st.session_state.frame_no
    h, w = frame.shape[:2]
    counts = {g: 0 for g in GATES}

    # ---- Detect and count ----
    r = model(frame, classes=[0], verbose=False)[0]
    for b in r.boxes.xyxy:
        x1, y1, x2, y2 = map(int, b)
        cx = (x1 + x2) // 2
        counts["Gate 1" if cx < w // 2 else "Gate 2"] += 1
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
    cv2.line(frame, (w // 2, 0), (w // 2, h), (255, 255, 255), 2)

    # ---- Density, occupancy, status ----
    info = {}
    for g in GATES:
        density = counts[g] / AREA[g]
        occ = counts[g] / CAPACITY[g] * 100
        label, color = status(density)
        info[g] = (density, occ, label, color)

    # ---- Decision rules ----
    alerts = []
    open_gates = [g for g in GATES if not closed[g]]
    for g in GATES:
        if closed[g]:
            if open_gates:
                tgt = min(open_gates, key=lambda k: info[k][1])
                alerts.append(f"🔴 {g} is CLOSED. Redirect all visitors to {tgt} "
                              f"(currently {info[tgt][1]:.0f}% full).")
            else:
                alerts.append("🚨 All gates closed. Hold visitors outside.")
        elif info[g][1] > 80:
            others = [k for k in open_gates if k != g]
            if others:
                tgt = min(others, key=lambda k: info[k][1])
                alerts.append(f"🟠 Redirect to {tgt}: {g} at {info[g][1]:.0f}%, "
                              f"{tgt} at {info[tgt][1]:.0f}%.")
            else:
                alerts.append(f"🚨 {g} at {info[g][1]:.0f}% and no open gate to redirect to.")

    # ---- History and prediction ----
    for g in GATES:
        if fn % 15 == 0:
            history[g].append(counts[g])
        p = predict(history[g])
        if (p is not None and not closed[g]
                and p / CAPACITY[g] * 100 > 80 and info[g][1] <= 80):
            alerts.append(f"⚠️ WARNING: {g} predicted {p:.0f} people "
                          f"({p / CAPACITY[g] * 100:.0f}%) soon. Prepare to redirect.")

    # ---- Render ----
    video_ph.image(frame, channels="BGR", use_container_width=True)

    with metrics_ph.container():
        cols = st.columns(len(GATES))
        for col, g in zip(cols, GATES):
            d, occ, label, color = info[g]
            if closed[g]:
                label, color = "CLOSED", "#888888"
            col.markdown(
                f"<div style='background:{color};padding:14px;border-radius:10px;"
                f"color:black'><b style='font-size:20px'>{g}</b><br>"
                f"{counts[g]} people<br>{d:.1f}/m² | {occ:.0f}% full<br>"
                f"<b>{label}</b></div>",
                unsafe_allow_html=True)

    if alerts:
        alerts_ph.markdown("\n\n".join(alerts))
    else:
        alerts_ph.success("All clear. No action needed.")

    if fn % 10 == 0 and len(history["Gate 1"]) > 1:
        chart_ph.line_chart(pd.DataFrame({g: list(history[g]) for g in GATES}))