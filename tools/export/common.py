"""
Shared settings for the BrainDump export scripts: where the trained models are, where the
browser-ready files go, and the label order every model was trained with.
Explained in docs/10-braindump-in-the-browser.md.
"""
import hashlib
import json
import os
from pathlib import Path

# Your local BrainDump checkout (the trained models are not in the public repo).
# Override with:  set BRAINDUMP_DIR=C:\path\to\braindump.ai-main
BRAINDUMP_DIR = Path(
    os.environ.get("BRAINDUMP_DIR", r"C:\Users\majed\OneDrive\Documents\ML Projects\braindump.ai-main")
)
MODELS = BRAINDUMP_DIR / "models"
SEED_DATA = BRAINDUMP_DIR / "training" / "data" / "seed_data.json"

SITE = Path(__file__).resolve().parents[2]
# Small files that ship with the website (Cloudflare Pages serves them as-is)
PUBLIC_OUT = SITE / "public" / "models" / "braindump"
# Big or temporary files that must NOT go into git or Pages (the teacher is ~110 MB)
LOCAL_OUT = SITE / "tools" / "export" / "out"
# Test fixtures the TypeScript tests compare against
FIXTURES = SITE / "src" / "lab" / "router" / "__fixtures__"

# Same order as CATEGORIES in braindump.ai ml/ensemble/*.py and training/*.py.
# The index of each label is what the neural models output.
CATEGORIES = ["PERSONAL", "FINANCIAL", "PROJECTS", "ADMIN", "AUTOMATION"]

# From ml/ensemble/arbitrator.py
TIER1_THRESHOLD = 0.90
TIER2_THRESHOLD = 0.85
MAX_LENGTH = 128


def latest(pattern: str, legacy: str) -> Path:
    """Newest timestamped model (training scripts save e.g. tier1_svm_YYYYMMDD_HHMMSS.pkl),
    the same rule the BrainDump app uses, falling back to the old fixed name."""
    versions = sorted(MODELS.glob(pattern))
    return versions[-1] if versions else MODELS / legacy


TIER1_PKL = latest("tier1_svm_*.pkl", "tier1_svm.pkl")
TEACHER_DIR = latest("teacher_bert_*", "teacher_bert")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def load_seed():
    with open(SEED_DATA, encoding="utf-8") as f:
        return json.load(f)


def softmax(xs):
    import numpy as np

    x = np.asarray(xs, dtype=np.float64)
    e = np.exp(x - x.max())
    return e / e.sum()
