"""
csrnet_model.py
---------------
CSRNet: Dilated Convolutional Neural Networks for Understanding the Highly
Congested Scenes (CVPR 2018).

Frontend: VGG-16 features (first 10 conv layers, no FC).
Backend:  Dilated convolutions producing 1/8 resolution density maps.
"""

import torch
import torch.nn as nn
import torchvision.models as models


class CSRNet(nn.Module):
    """
    CSRNet for crowd density estimation.

    Input  : (B, 3, H, W)   -- RGB image, any size
    Output : (B, 1, H/8, W/8) -- density map (sum = head count)
    """

    def __init__(self, load_weights: bool = False):
        super().__init__()

        # -- Frontend: VGG-16 conv1-conv4_3 (first 23 children -> pool3) --
        vgg = models.vgg16(weights="IMAGENET1K_V1" if load_weights else None)
        features = list(vgg.features.children())
        # Pool at conv1, conv2, conv3 only -> output stride = 8
        self.frontend = nn.Sequential(*features[:23])   # up to pool3

        if not load_weights:
            # Xavier init for frontend when not using pretrained weights
            for m in self.frontend.modules():
                if isinstance(m, nn.Conv2d):
                    nn.init.xavier_uniform_(m.weight)
                    if m.bias is not None:
                        nn.init.constant_(m.bias, 0)

        # -- Backend: dilated convolutions --
        self.backend = nn.Sequential(
            nn.Conv2d(512, 512, kernel_size=3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, kernel_size=3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, kernel_size=3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 256, kernel_size=3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 128, kernel_size=3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 64, kernel_size=3, padding=2, dilation=2),
            nn.ReLU(inplace=True),
        )

        # -- Output head --
        self.output_layer = nn.Conv2d(64, 1, kernel_size=1)

        self._initialize_weights()

    # ------------------------------------------------------------------
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.frontend(x)
        x = self.backend(x)
        x = self.output_layer(x)
        return x                   # (B, 1, H/8, W/8)

    # ------------------------------------------------------------------
    def _initialize_weights(self):
        for m in self.backend.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, std=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
        nn.init.normal_(self.output_layer.weight, std=0.01)
        nn.init.constant_(self.output_layer.bias, 0)

    # ------------------------------------------------------------------
    def count(self, x: torch.Tensor) -> torch.Tensor:
        """Return scalar head count per image in the batch."""
        density = self.forward(x)          # (B, 1, H/8, W/8)
        return density.sum(dim=(1, 2, 3))  # (B,)
