"""Caps how much GPU memory training may take, so the rest of the card stays free."""

import os

import torch

# Training aims to stay near 3 GB; this is the hard ceiling for spikes.
CAP_GB = float(os.environ.get("TRAIN_VRAM_CAP_GB", "3.5"))


def cap_vram():
    """Past the cap PyTorch raises out-of-memory instead of taking more of the card."""
    if not torch.cuda.is_available():
        return
    total = torch.cuda.get_device_properties(0).total_memory
    fraction = min(1.0, CAP_GB * 1024 ** 3 / total)
    torch.cuda.set_per_process_memory_fraction(fraction, 0)
    print(f"GPU memory capped at {CAP_GB:.1f} GB of {total / 1024 ** 3:.1f} GB", flush=True)
