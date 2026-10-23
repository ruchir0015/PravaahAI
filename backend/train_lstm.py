"""
train_lstm.py
-------------
Train an LSTM-based crowd count forecaster.

Pipeline:
  1. Load trained CSRNet from checkpoints/csrnet_best.pth
  2. For each image in ShanghaiTech (A+B, train+test), extract:
       - Flattened average-pooled CSRNet feature map (spatiotemporal context)
       - Scalar ground-truth count
  3. Build sliding-window sequences: [count_t-SEQ+1, ..., count_t] -> count_t+1
  4. Train a 2-layer LSTM that takes the sequence of (count) values and
     predicts the next count.

The LSTM accepts a window of T scalar counts and outputs a single scalar.
This is used in crowd_live.py to forecast near-future counts per zone.

Usage:
    python train_lstm.py

Output:
    checkpoints/lstm_best.pth
"""

import os
import glob
import random
import numpy as np
import scipy.io as sio
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms
from PIL import Image
from scipy.ndimage import gaussian_filter

from csrnet_model import CSRNet

# ─── Config ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_BASE = os.path.join(BASE_DIR, "shanghaitech", "ShanghaiTech")
if not os.path.isdir(DATASET_BASE):
    DATASET_BASE = r"C:\Users\savit\Downloads\shanghaitech\ShanghaiTech"

SHA_TRAIN = os.path.join(DATASET_BASE, "part_A", "train_data")
SHA_TEST  = os.path.join(DATASET_BASE, "part_A", "test_data")
SHB_TRAIN = os.path.join(DATASET_BASE, "part_B", "train_data")
SHB_TEST  = os.path.join(DATASET_BASE, "part_B", "test_data")

CSRNET_CKPT = "checkpoints/csrnet_best.pth"
SAVE_DIR    = "checkpoints"
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"

SEQ_LEN    = 8       # number of past counts the LSTM sees
HIDDEN_DIM = 64
NUM_LAYERS = 2
BATCH_SIZE = 32
EPOCHS     = 80
LR         = 1e-3
SEED       = 42
SIGMA      = 15

os.makedirs(SAVE_DIR, exist_ok=True)
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)


# ─── LSTM model ──────────────────────────────────────────────────────────────
class CrowdLSTM(nn.Module):
    """
    Lightweight LSTM for crowd count time-series forecasting.

    Input  : (B, T, 1) -- sequence of T scalar counts
    Output : (B, 1)    -- predicted next count
    """

    def __init__(self, input_dim=1, hidden_dim=HIDDEN_DIM, num_layers=NUM_LAYERS):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers,
                            batch_first=True, dropout=0.2)
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x):
        # x: (B, T, 1)
        out, _ = self.lstm(x)          # (B, T, hidden)
        last   = out[:, -1, :]         # (B, hidden)
        return self.head(last)         # (B, 1)


# ─── Helpers ─────────────────────────────────────────────────────────────────
IMG_TF = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def load_gt_count(gt_path: str) -> float:
    """Return the total head count from a ShanghaiTech .mat file."""
    mat = sio.loadmat(gt_path, squeeze_me=True)
    try:
        pts = mat["image_info"][()]["location"][()]
    except Exception:
        pts = mat.get("annPoints", mat.get("image_info", np.zeros((0, 2))))
    if isinstance(pts, np.ndarray) and pts.ndim == 1:
        pts = pts.reshape(-1, 2)
    return float(len(pts)) if hasattr(pts, "__len__") else 0.0


def collect_counts_from_dir(data_dir: str, csrnet: nn.Module = None) -> list:
    """
    Extract counts from data_dir and return list of (gt_count, pred_count) pairs,
    sorted by image index for temporal ordering.
    """
    img_dir = os.path.join(data_dir, "images")
    gt_dir  = os.path.join(data_dir, "ground-truth")

    paths = sorted(glob.glob(os.path.join(img_dir, "*.jpg")),
                   key=lambda p: int(os.path.splitext(
                       os.path.basename(p))[0].replace("IMG_", "")))

    pairs = []
    if csrnet is not None:
        csrnet.eval()
    with torch.no_grad():
        for img_path in paths:
            name    = os.path.splitext(os.path.basename(img_path))[0]
            gt_path = os.path.join(gt_dir, f"GT_{name}.mat")
            if not os.path.exists(gt_path):
                continue

            gt_count = load_gt_count(gt_path)
            if csrnet is not None:
                img = Image.open(img_path).convert("RGB")
                t   = IMG_TF(img).unsqueeze(0).to(DEVICE)
                pred_count = csrnet(t).sum().item()
            else:
                pred_count = gt_count
            pairs.append((gt_count, max(0.0, float(pred_count))))

    return pairs


# ─── Sequence Dataset ─────────────────────────────────────────────────────────
class CountSequenceDataset(Dataset):
    """
    Builds sliding windows of length SEQ_LEN from a list of count values.
    Each sample: (window of SEQ_LEN counts, next count).
    """

    def __init__(self, counts: list, seq_len: int = SEQ_LEN):
        self.seq_len = seq_len
        self.counts  = counts   # list of floats

    def __len__(self):
        return max(0, len(self.counts) - self.seq_len)

    def __getitem__(self, idx):
        window = self.counts[idx: idx + self.seq_len]
        target = self.counts[idx + self.seq_len]
        x = torch.tensor(window, dtype=torch.float32).unsqueeze(-1)  # (T, 1)
        y = torch.tensor([target], dtype=torch.float32)               # (1,)
        return x, y


# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    print(f"Device: {DEVICE}")

    # ── Load CSRNet (optional) ──
    csrnet = None
    CSRNET_CKPT_USE = None
    if os.path.exists(CSRNET_CKPT):
        CSRNET_CKPT_USE = CSRNET_CKPT
    elif os.path.exists(CSRNET_CKPT.replace("best", "last")):
        CSRNET_CKPT_USE = CSRNET_CKPT.replace("best", "last")

    if CSRNET_CKPT_USE is not None:
        try:
            csrnet = CSRNet(load_weights=False).to(DEVICE)
            csrnet.load_state_dict(torch.load(CSRNET_CKPT_USE, map_location=DEVICE))
            csrnet.eval()
            print(f"CSRNet loaded from {CSRNET_CKPT_USE}")
        except Exception as e:
            print(f"Could not load CSRNet ({e}), using ground truth counts.")
            csrnet = None
    else:
        print("[Notice] CSRNet checkpoint not found yet. Training LSTM directly on ShanghaiTech dataset annotations.")

    # ── Extract counts ──
    all_gt, all_pred = [], []
    for data_dir in [SHA_TRAIN, SHA_TEST, SHB_TRAIN, SHB_TEST]:
        if os.path.isdir(data_dir):
            print(f"  Extracting counts from {data_dir} ...")
            pairs = collect_counts_from_dir(data_dir, csrnet)
            gt_c, pr_c = zip(*pairs) if pairs else ([], [])
            all_gt.extend(gt_c)
            all_pred.extend(pr_c)
            print(f"    {len(pairs)} images processed.")

    if len(all_gt) < SEQ_LEN + 2:
        raise RuntimeError("Not enough samples to build sequences.")

    # Normalise counts
    max_count = max(max(all_gt), 1.0)
    norm_gt   = [c / max_count for c in all_gt]
    norm_pred = [c / max_count for c in all_pred]

    # Save normalisation constant for inference
    np.save(os.path.join(SAVE_DIR, "lstm_norm.npy"),
            np.array([max_count], dtype=np.float32))

    # Use GT counts for supervised sequence training; pred counts for robustness
    combined = norm_gt   # use GT counts as primary signal

    ds  = CountSequenceDataset(combined, seq_len=SEQ_LEN)
    n   = len(ds)
    n_val  = max(1, n // 10)
    n_train = n - n_val
    train_ds, val_ds = random_split(ds, [n_train, n_val],
                                    generator=torch.Generator().manual_seed(SEED))

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE,
                              shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE,
                              shuffle=False, num_workers=0)

    print(f"LSTM sequences: {n_train} train, {n_val} val")

    # ── Model + Optimizer ──
    model     = CrowdLSTM().to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=LR)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=8, factor=0.5)
    criterion = nn.MSELoss()
    best_val  = float("inf")

    # ── Train ──
    for epoch in range(1, EPOCHS + 1):
        model.train()
        tr_loss = 0.0
        for x, y in train_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            optimizer.zero_grad()
            pred = model(x)
            loss = criterion(pred, y)
            loss.backward()
            optimizer.step()
            tr_loss += loss.item()
        tr_loss /= len(train_loader)

        model.eval()
        vl_loss = 0.0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(DEVICE), y.to(DEVICE)
                pred   = model(x)
                vl_loss += criterion(pred, y).item()
        vl_loss /= len(val_loader)

        scheduler.step(vl_loss)
        print(f"Epoch {epoch:3d}/{EPOCHS}  train={tr_loss:.6f}  val={vl_loss:.6f}")

        if vl_loss < best_val:
            best_val = vl_loss
            torch.save({"model_state": model.state_dict(),
                        "hidden_dim":  HIDDEN_DIM,
                        "num_layers":  NUM_LAYERS,
                        "seq_len":     SEQ_LEN,
                        "max_count":   max_count},
                       os.path.join(SAVE_DIR, "lstm_best.pth"))
            print(f"  -> Saved (val={best_val:.6f})")

    print(f"\nLSTM training complete. Best val MSE = {best_val:.6f}")
    print(f"Checkpoint: {SAVE_DIR}/lstm_best.pth")


if __name__ == "__main__":
    main()
