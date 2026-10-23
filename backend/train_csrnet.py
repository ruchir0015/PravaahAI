"""
train_csrnet.py
---------------
Train CSRNet on ShanghaiTech Part A + Part B datasets.

Usage:
    python train_csrnet.py

Outputs saved to:
    checkpoints/csrnet_best.pth   -- best val MAE checkpoint
    checkpoints/csrnet_last.pth   -- last epoch checkpoint
"""

import os
import sys
import glob
import random
import argparse

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
import scipy.io as sio
from scipy.ndimage import gaussian_filter
from PIL import Image

from csrnet_model import CSRNet

# ─── Dataset paths ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_BASE = os.path.join(BASE_DIR, "shanghaitech", "ShanghaiTech")
if not os.path.isdir(DATASET_BASE):
    DATASET_BASE = r"C:\Users\savit\Downloads\shanghaitech\ShanghaiTech"

SHA_TRAIN = os.path.join(DATASET_BASE, "part_A", "train_data")
SHA_TEST  = os.path.join(DATASET_BASE, "part_A", "test_data")
SHB_TRAIN = os.path.join(DATASET_BASE, "part_B", "train_data")
SHB_TEST  = os.path.join(DATASET_BASE, "part_B", "test_data")

# ─── Hyper-parameters ────────────────────────────────────────────────────────
SIGMA        = 15        # Gaussian sigma for density map (fixed-size kernel)
BATCH_SIZE   = 1         # CSRNet paper uses 1 (variable image sizes)
EPOCHS       = 100       # More epochs needed without pretrained VGG weights
LR           = 1e-5      # Slightly higher LR for training from scratch
WD           = 5e-4
CROP_SIZE    = 256       # random crop for training augmentation
SEED         = 42
SAVE_DIR     = "checkpoints"
DEVICE       = "cuda" if torch.cuda.is_available() else "cpu"

os.makedirs(SAVE_DIR, exist_ok=True)
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)


# ─────────────────────────────── Dataset ────────────────────────────────────
class ShanghaiTechDataset(Dataset):
    """
    Loads pairs of (image, density_map) from ShanghaiTech A or B splits.

    Ground-truth .mat files contain a 'image_info' struct with point
    annotations; we convert them to a Gaussian density map on the fly.
    """

    def __init__(self, data_dir: str, train: bool = True, crop: int = CROP_SIZE):
        self.train = train
        self.crop  = crop
        img_dir = os.path.join(data_dir, "images")
        gt_dir  = os.path.join(data_dir, "ground-truth")

        self.samples = []
        for img_path in sorted(glob.glob(os.path.join(img_dir, "*.jpg"))):
            name = os.path.splitext(os.path.basename(img_path))[0]  # IMG_1
            gt_path = os.path.join(gt_dir, f"GT_{name}.mat")
            if os.path.exists(gt_path):
                self.samples.append((img_path, gt_path))

        self.img_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std =[0.229, 0.224, 0.225]),
        ])

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, gt_path = self.samples[idx]

        img = Image.open(img_path).convert("RGB")
        W, H = img.size

        # Load point annotations
        mat  = sio.loadmat(gt_path, squeeze_me=True)
        # Structure: mat['image_info']['location'][()]  -> (N, 2) array
        try:
            pts = mat["image_info"][()]["location"][()]
        except Exception:
            # Fallback for flat .mat format
            pts = mat.get("annPoints", mat.get("image_info", np.zeros((0, 2))))
        if pts.ndim == 1:
            pts = pts.reshape(-1, 2)

        # Build density map at original resolution
        density = self._make_density(pts, H, W)

        # ── Augmentation (training only) ──
        if self.train:
            # Random horizontal flip
            if random.random() > 0.5:
                img     = img.transpose(Image.FLIP_LEFT_RIGHT)
                density = density[:, ::-1].copy()

            # Random crop
            if H > self.crop and W > self.crop:
                y0 = random.randint(0, H - self.crop)
                x0 = random.randint(0, W - self.crop)
                img     = img.crop((x0, y0, x0 + self.crop, y0 + self.crop))
                density = density[y0:y0 + self.crop, x0:x0 + self.crop]

        # Down-sample density map to 1/8 resolution (CSRNet output stride)
        img_t   = self.img_transform(img)
        _, h, w = img_t.shape
        target  = self._resize_density(density, h // 8, w // 8)
        target  = torch.from_numpy(target).float().unsqueeze(0)  # (1, H/8, W/8)

        return img_t, target

    # ── helpers ──────────────────────────────────────────────────────────────
    @staticmethod
    def _make_density(pts: np.ndarray, H: int, W: int, sigma: int = SIGMA) -> np.ndarray:
        """Gaussian density map from head-point annotations."""
        dm = np.zeros((H, W), dtype=np.float32)
        for y, x in pts:
            x, y = int(min(x, W - 1)), int(min(y, H - 1))
            dm[y, x] += 1.0
        dm = gaussian_filter(dm, sigma=sigma)
        return dm

    @staticmethod
    def _resize_density(dm: np.ndarray, h: int, w: int) -> np.ndarray:
        """Bilinear resize preserving count (scale by area ratio)."""
        from PIL import Image as PILImage
        src_h, src_w = dm.shape
        scale = (src_h * src_w) / (h * w)
        pil   = PILImage.fromarray(dm).resize((w, h), PILImage.BILINEAR)
        return np.array(pil, dtype=np.float32) * scale


# ─────────────────────────────── Training ────────────────────────────────────
def train():
    print(f"Device: {DEVICE}")

    # ── Build combined train / val datasets ──
    train_sets, val_sets = [], []
    for tr_dir, te_dir in [(SHA_TRAIN, SHA_TEST), (SHB_TRAIN, SHB_TEST)]:
        if os.path.isdir(tr_dir):
            train_sets.append(ShanghaiTechDataset(tr_dir, train=True))
        if os.path.isdir(te_dir):
            val_sets.append(ShanghaiTechDataset(te_dir, train=False))

    if not train_sets:
        sys.exit("ERROR: No training data found. Check dataset paths.")

    from torch.utils.data import ConcatDataset
    train_ds = ConcatDataset(train_sets)
    val_ds   = ConcatDataset(val_sets) if val_sets else None

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE,
                              shuffle=True,  num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=1,
                              shuffle=False, num_workers=0, pin_memory=False) if val_ds else None

    print(f"Train samples: {len(train_ds)}  |  Val samples: {len(val_ds) if val_ds else 0}")

    # ── Model ──
    # Note: load_weights=False -> train from scratch (no internet needed).
    # For better accuracy, manually place vgg16-397923af.pth in
    # %USERPROFILE%\.cache\torch\hub\checkpoints\ and set load_weights=True.
    model = CSRNet(load_weights=False).to(DEVICE)

    # ── Optimizer: small LR for VGG frontend, larger for backend ──
    optimizer = optim.Adam([
        {"params": model.frontend.parameters(), "lr": LR},
        {"params": model.backend.parameters(),  "lr": LR * 10},
        {"params": model.output_layer.parameters(), "lr": LR * 10},
    ], weight_decay=WD)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=15, gamma=0.5)
    criterion = nn.MSELoss()

    best_mae = float("inf")

    for epoch in range(1, EPOCHS + 1):
        # ── Train ──
        model.train()
        train_loss = 0.0
        for i, (imgs, targets) in enumerate(train_loader):
            imgs, targets = imgs.to(DEVICE), targets.to(DEVICE)
            optimizer.zero_grad()
            preds = model(imgs)
            loss  = criterion(preds, targets)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            if (i + 1) % 50 == 0:
                print(f"  E{epoch} [{i+1}/{len(train_loader)}]  loss={train_loss/(i+1):.4f}")

        scheduler.step()
        avg_loss = train_loss / len(train_loader)

        # ── Validate ──
        mae, mse = 0.0, 0.0
        if val_loader:
            model.eval()
            with torch.no_grad():
                for imgs, targets in val_loader:
                    imgs = imgs.to(DEVICE)
                    pred_count = model(imgs).sum().item()
                    gt_count   = targets.sum().item()
                    err  = abs(pred_count - gt_count)
                    mae += err
                    mse += err ** 2
            n   = len(val_ds)
            mae /= n
            mse  = (mse / n) ** 0.5
            print(f"Epoch {epoch:3d}/{EPOCHS}  loss={avg_loss:.4f}  "
                  f"MAE={mae:.2f}  RMSE={mse:.2f}")
        else:
            print(f"Epoch {epoch:3d}/{EPOCHS}  loss={avg_loss:.4f}")

        # ── Save ──
        torch.save(model.state_dict(),
                   os.path.join(SAVE_DIR, "csrnet_last.pth"))
        if val_loader and mae < best_mae:
            best_mae = mae
            torch.save(model.state_dict(),
                       os.path.join(SAVE_DIR, "csrnet_best.pth"))
            print(f"  -> New best MAE: {best_mae:.2f}  (saved)")

    print(f"\nTraining complete. Best MAE = {best_mae:.2f}")
    print(f"Checkpoints in: {SAVE_DIR}/")


if __name__ == "__main__":
    train()
