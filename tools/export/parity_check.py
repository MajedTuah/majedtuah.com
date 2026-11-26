"""
Parity check: runs the same sentences through your ORIGINAL BrainDump models (sklearn / PyTorch)
and through the EXPORTED browser files (tier1.json / ONNX), and fails if they disagree.

It also writes:
  - src/lab/router/__fixtures__/golden.json   expected numbers the TypeScript tests compare against
  - public/models/braindump/manifest.json     sizes, hashes, labels, thresholds and example presets

Explained in docs/10-braindump-in-the-browser.md.
Run (after the export scripts):  tools\\export\\.venv\\Scripts\\python tools\\export\\parity_check.py
"""
import json
from pathlib import Path

import joblib
import numpy as np
import onnxruntime as ort
import torch
from transformers import AutoTokenizer, BertForSequenceClassification, PreTrainedTokenizerFast

from common import (
    CATEGORIES, FIXTURES, LOCAL_OUT, MAX_LENGTH, MODELS, PUBLIC_OUT, TEACHER_DIR, TIER1_PKL,
    TIER1_THRESHOLD, TIER2_THRESHOLD, load_seed, sha256, softmax,
)

# Sentences the models never saw in training, mixed easy and hard, for a fair check and for presets
NEW = [
    "pay the electricity bill before friday",
    "transfer rm500 to my savings account",
    "check if the salary came in this month",
    "cancel the netflix subscription",
    "renew my car insurance next week",
    "call mum this weekend",
    "feeling tired and a bit lonely lately",
    "book a dentist appointment for my sister",
    "finish the landing page for the portfolio",
    "push the new model to the github repo",
    "write unit tests for the api",
    "fix the bug in the login flow",
    "submit the leave form to hr",
    "update my address with the bank",
    "print and sign the tenancy agreement",
    "file the receipts for the tax return",
    "set up a cron job to back up the database every night",
    "automate the weekly report email",
    "write a script that renames all my photos",
    "make a zap that saves gmail attachments to drive",
    "maybe start learning guitar again",
    "the vendor invoice needs to be paid and logged in the project tracker",
    "remind me to automate paying the rent",
    "sort out the paperwork for the new laptop budget",
    "talk to the team about the deployment script",
    "i keep forgetting to drink water",
    "ask finance about the q3 project budget",
    "renew passport",
    "groceries",
    "deploy",
]


# ---------- original models ----------
pipe = joblib.load(TIER1_PKL)
svm_labels = [str(c) for c in pipe.named_steps["svm"].classes_]

s_tok = AutoTokenizer.from_pretrained(MODELS / "student_tokenizer")
student_pt = torch.load(MODELS / "student_quantized.pt", map_location="cpu", weights_only=False).eval()
t_tok = AutoTokenizer.from_pretrained(TEACHER_DIR)
teacher_pt = BertForSequenceClassification.from_pretrained(TEACHER_DIR).eval()


def tier1_sklearn(text):
    """What the fixed braindump.ai tier1_tfidf.py returns."""
    if hasattr(pipe, "predict_proba"):
        return pipe.predict_proba([text])[0]
    return softmax(pipe.decision_function([text])[0])


def torch_probs(model, tok, text):
    with torch.no_grad():
        enc = tok(text, return_tensors="pt", max_length=MAX_LENGTH, truncation=True)
        return torch.softmax(model(**enc).logits, -1)[0].numpy().astype(np.float64)


# ---------- exported files ----------
t1 = json.loads((PUBLIC_OUT / "tier1.json").read_text(encoding="utf-8"))
t1_index = {term: i for i, term in enumerate(t1["terms"])}
analyzer = pipe.named_steps["tfidf"].build_analyzer()  # only used to cross-check our numpy port


def tier1_json(text):
    """Same maths as src/lab/router/tier1.ts, in numpy, to prove the JSON alone is enough."""
    counts = {}
    for gram in analyzer(text):
        if gram in t1_index:
            counts[t1_index[gram]] = counts.get(t1_index[gram], 0) + 1
    vec = np.zeros(len(t1["terms"]))
    for i, c in counts.items():
        vec[i] = (1 + np.log(c)) * t1["idf"][i]
    n = np.linalg.norm(vec)
    if n > 0:
        vec /= n
    scores = np.asarray(t1["coef"]) @ vec + np.asarray(t1["intercept"])
    if not t1.get("calibration"):
        return softmax(scores)
    p = np.array([1 / (1 + np.exp(c["a"] * s + c["b"])) for c, s in zip(t1["calibration"], scores)])
    return p / p.sum() if p.sum() > 0 else np.full(len(p), 1 / len(p))


class OnnxTier:
    def __init__(self, folder: Path):
        self.folder = folder
        self.sess = ort.InferenceSession(str(folder / "onnx" / "model_quantized.onnx"), providers=["CPUExecutionProvider"])
        self.tok = PreTrainedTokenizerFast(tokenizer_file=str(folder / "tokenizer.json"))
        self.inputs = {i.name for i in self.sess.get_inputs()}

    def __call__(self, text):
        enc = self.tok(text, return_tensors="np", max_length=MAX_LENGTH, truncation=True)
        feed = {k: v.astype(np.int64) for k, v in enc.items() if k in self.inputs}
        logits = self.sess.run(None, feed)[0][0]
        return softmax(logits)


student_onnx = OnnxTier(PUBLIC_OUT / "student")
teacher_dir = LOCAL_OUT / "teacher"
teacher_onnx = OnnxTier(teacher_dir) if (teacher_dir / "onnx" / "model_quantized.onnx").exists() else None


def by_name(probs, labels):
    return {labels[i]: float(p) for i, p in enumerate(probs)}


def top(d):
    k = max(d, key=d.get)
    return k, d[k]


def arbitrate(p1, p2, p3):
    """Mirror of braindump.ai ml/ensemble/arbitrator.py (and src/lab/router/arbitrator.ts)."""
    c1, s1 = top(p1)
    if s1 >= TIER1_THRESHOLD:
        return 1
    c2, s2 = top(p2)
    if s2 >= TIER2_THRESHOLD:
        return 2
    return 3 if p3 is not None else 2


# ---------- run ----------
seed = load_seed()
sentences = [(r["text"], r["label"], "seed") for r in seed] + [(t, None, "new") for t in NEW]

stats = {"t1_json_maxdiff": 0.0, "t2_agree": 0, "t2_clear": 0, "t2_maxdiff": 0.0, "t2_diffs": [], "t3_agree": 0, "t3_clear": 0, "t3_maxdiff": 0.0, "t3_diffs": []}


def clear(d):
    """True when the top label beats the runner-up by >= 0.01. Near-ties flip on any tiny change,
    so label agreement is only meaningful on clear cases (see docs/10)."""
    a, b = sorted(d.values())[-2:]
    return b - a >= 0.01
t1_hits = {"tier1_conf>=0.90": 0}
golden = []
for text, label, source in sentences:
    p1 = by_name(tier1_sklearn(text), svm_labels)
    p1j = by_name(tier1_json(text), t1["labels"])
    stats["t1_json_maxdiff"] = max(stats["t1_json_maxdiff"], max(abs(p1[k] - p1j[k]) for k in p1))
    t1_hits["tier1_conf>=0.90"] += int(top(p1)[1] >= TIER1_THRESHOLD)

    p2t = by_name(torch_probs(student_pt, s_tok, text), CATEGORIES)
    p2o = by_name(student_onnx(text), CATEGORIES)
    if clear(p2t):
        stats["t2_clear"] += 1
        stats["t2_agree"] += int(top(p2t)[0] == top(p2o)[0])
    stats["t2_maxdiff"] = max(stats["t2_maxdiff"], max(abs(p2t[k] - p2o[k]) for k in p2t))
    stats["t2_diffs"].append(max(abs(p2t[k] - p2o[k]) for k in p2t))

    p3o = None
    if teacher_onnx:
        p3t = by_name(torch_probs(teacher_pt, t_tok, text), CATEGORIES)
        p3o = by_name(teacher_onnx(text), CATEGORIES)
        if clear(p3t):
            stats["t3_clear"] += 1
            stats["t3_agree"] += int(top(p3t)[0] == top(p3o)[0])
        stats["t3_maxdiff"] = max(stats["t3_maxdiff"], max(abs(p3t[k] - p3o[k]) for k in p3t))
        stats["t3_diffs"].append(max(abs(p3t[k] - p3o[k]) for k in p3t))

    golden.append({
        "text": text, "label": label, "source": source,
        "tier1": p1, "tier2": p2o, "tier3": p3o,
        "stops_at": arbitrate(p1, p2o, p3o),
    })

n = len(sentences)
print(f"Sentences: {n} ({len(seed)} seed + {len(NEW)} new)")
print(f"Tier 1  JSON port vs sklearn: max probability difference {stats['t1_json_maxdiff']:.2e}")
print(f"Tier 1  confidence >= {TIER1_THRESHOLD}: {t1_hits['tier1_conf>=0.90']}/{n} sentences")
print(f"Tier 2  ONNX vs PyTorch: {stats['t2_agree']}/{stats['t2_clear']} same label (clear cases), mean diff {np.mean(stats['t2_diffs']):.4f}, max {stats['t2_maxdiff']:.4f}")
if teacher_onnx:
    print(f"Tier 3  ONNX vs PyTorch: {stats['t3_agree']}/{stats['t3_clear']} same label (clear cases), mean diff {np.mean(stats['t3_diffs']):.4f}, max {stats['t3_maxdiff']:.4f}")
else:
    print("Tier 3  skipped (run export_teacher.py first)")

seed_rows = [g for g in golden if g["source"] == "seed"]
for tier in ("tier1", "tier2", "tier3"):
    rows = [g for g in seed_rows if g[tier]]
    if rows:
        acc = sum(top(g[tier])[0] == g["label"] for g in rows) / len(rows)
        print(f"{tier} accuracy on its own training data: {acc:.0%}")
stops = {k: sum(g["stops_at"] == k for g in golden) for k in (1, 2, 3)}
print(f"Arbitrator stops at tier 1/2/3: {stops[1]}/{stops[2]}/{stops[3]}")

assert stats["t1_json_maxdiff"] < 1e-4, "Tier 1 JSON export does not match sklearn"
# int8 rounding moves a few probabilities near a decision boundary a lot, so the gate is the
# MEAN difference plus label agreement on clear cases (docs/decisions.md D-018)
assert np.mean(stats["t2_diffs"]) < 0.03 and stats["t2_agree"] / max(stats["t2_clear"], 1) >= 0.98, "Tier 2 ONNX disagrees with the original too often"
if teacher_onnx:
    # BERT-base moves more under int8 than bert-tiny; 0.05 mean still keeps 98% accuracy (decision D-019)
    assert np.mean(stats["t3_diffs"]) < 0.05 and stats["t3_agree"] / max(stats["t3_clear"], 1) >= 0.98, "Tier 3 ONNX disagrees with the original too often"

# ---------- presets: short new sentences that stop at each tier ----------
presets = []
for tier in (1, 2, 3):
    pool = [g for g in golden if g["source"] == "new" and g["stops_at"] == tier]
    pool.sort(key=lambda g: (len(g["text"].split()) < 4, -top(g[f"tier{tier}"])[1] if g[f"tier{tier}"] else 0))
    if pool:
        presets.append({"text": pool[0]["text"], "expectedTier": tier})
print("Presets:", presets)

# ---------- write fixtures + manifest ----------
FIXTURES.mkdir(parents=True, exist_ok=True)
(FIXTURES / "golden.json").write_text(json.dumps(golden, indent=1), encoding="utf-8")


def file_entry(path: Path, base: Path):
    return {"path": path.relative_to(base).as_posix(), "bytes": path.stat().st_size, "sha256": sha256(path)}


manifest = {
    "labels": CATEGORIES,
    "thresholds": {"tier1": TIER1_THRESHOLD, "tier2": TIER2_THRESHOLD},
    "maxLength": MAX_LENGTH,
    "presets": presets,
    "tiers": {
        "tier1": {"model": "TF-IDF + LinearSVC", "files": [file_entry(PUBLIC_OUT / "tier1.json", PUBLIC_OUT)]},
        "tier2": {
            "model": "bert-tiny student (distilled, pruned, int8)",
            "files": [file_entry(p, PUBLIC_OUT) for p in sorted((PUBLIC_OUT / "student").rglob("*")) if p.is_file()],
        },
        "tier3": {
            "model": "BERT teacher (int8)",
            "files": [file_entry(p, teacher_dir) for p in sorted(teacher_dir.rglob("*")) if p.is_file()] if teacher_onnx else [],
        },
    },
}
(PUBLIC_OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print("Wrote golden.json and manifest.json")
