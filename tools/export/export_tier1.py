"""
Tier 1 export: turns BrainDump's newest tier1_svm_*.pkl (sklearn TF-IDF + calibrated LinearSVC)
into a small JSON file of plain numbers, so the browser can redo the same maths in TypeScript
(src/lab/router/tier1.ts) without any ML library. Explained in docs/10-braindump-in-the-browser.md
(decision D-004).

Run:  tools\\export\\.venv\\Scripts\\python tools\\export\\export_tier1.py
"""
import json

import joblib
import numpy as np

from common import CATEGORIES, PUBLIC_OUT, TIER1_PKL

pipe = joblib.load(TIER1_PKL)
print("Exporting", TIER1_PKL.name)
tfidf = pipe.named_steps["tfidf"]
clf = pipe.named_steps["svm"]

# Our TypeScript copy only implements these exact settings, so refuse to export anything else.
expected = {
    "analyzer": "word",
    "lowercase": True,
    "token_pattern": r"(?u)\b\w\w+\b",
    "tokenizer": None,
    "preprocessor": None,
    "stop_words": None,
    "strip_accents": "unicode",
    "ngram_range": (1, 2),
    "norm": "l2",
    "use_idf": True,
    "sublinear_tf": True,
    "binary": False,
}
for key, want in expected.items():
    got = getattr(tfidf, key)
    assert got == want, f"TfidfVectorizer.{key} is {got!r}, the TypeScript port expects {want!r}"

calibration = None
if type(clf).__name__ == "CalibratedClassifierCV":
    # ensemble=False: one SVM trained on all data, plus one sigmoid (a, b) per class
    assert len(clf.calibrated_classifiers_) == 1, "export expects CalibratedClassifierCV(ensemble=False)"
    cc = clf.calibrated_classifiers_[0]
    svm = cc.estimator
    assert cc.method == "sigmoid"
    calibration = [{"a": float(c.a_), "b": float(c.b_)} for c in cc.calibrators]
else:
    svm = clf
assert type(svm).__name__ == "LinearSVC", f"expected LinearSVC, found {type(svm).__name__}"

# sklearn orders classes_ alphabetically. Store the names so the browser never relies on position.
classes = [str(c) for c in clf.classes_]
assert sorted(classes) == sorted(CATEGORIES)

vocab = tfidf.vocabulary_
terms = [None] * len(vocab)
for term, idx in vocab.items():
    terms[idx] = term

out = {
    "format": "braindump-tier1/v2",
    "labels": classes,
    "terms": terms,  # terms[i] is the word or "word word" bigram for feature i
    "idf": [round(float(v), 8) for v in tfidf.idf_],
    "coef": [[round(float(v), 8) for v in row] for row in np.asarray(svm.coef_)],
    "intercept": [float(v) for v in np.atleast_1d(svm.intercept_)],
    # null = old uncalibrated model: softmax over margins. Otherwise p_k = 1 / (1 + exp(a_k * margin_k + b_k)),
    # then divided by the sum over classes (sklearn's _CalibratedClassifier.predict_proba)
    "calibration": calibration,
}

# Sanity check: the exported numbers reproduce sklearn's probabilities
x = tfidf.transform(["pay the electricity bill before friday"])
margins = np.asarray(x @ np.asarray(out["coef"]).T).ravel() + np.asarray(out["intercept"])
if calibration:
    p = np.array([1 / (1 + np.exp(c["a"] * m + c["b"])) for c, m in zip(calibration, margins)])
    p = p / p.sum()
    assert np.allclose(p, pipe.predict_proba(["pay the electricity bill before friday"])[0], atol=1e-6)

PUBLIC_OUT.mkdir(parents=True, exist_ok=True)
path = PUBLIC_OUT / "tier1.json"
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, separators=(",", ":"), ensure_ascii=False)

print(f"Wrote {path} — {len(terms)} features, calibrated={bool(calibration)}, {path.stat().st_size / 1024:.1f} KB")
