"""
Tier 2 export: rebuilds BrainDump's distilled + pruned + quantized bert-tiny student as a normal
float model, then exports it to int8 ONNX for the browser.

Why the rebuild: PyTorch's dynamically quantized Linear layers can't be exported to ONNX, and
train_slm.py only saved the quantized model. So we read every int8 weight back as a float
(dequantize), put it into a fresh bert-tiny with the same shape, check it gives the same answers,
then let ONNX Runtime quantize it again. Explained in docs/10-braindump-in-the-browser.md (D-006).

Run:  tools\\export\\.venv\\Scripts\\python tools\\export\\export_student.py
"""
import shutil

import torch
from transformers import AutoTokenizer, BertForSequenceClassification

from common import CATEGORIES, LOCAL_OUT, MAX_LENGTH, MODELS, PUBLIC_OUT, load_seed
from onnx_tools import export_and_quantize, set_labels

torch.manual_seed(0)

quantized = torch.load(MODELS / "student_quantized.pt", map_location="cpu", weights_only=False)
quantized.eval()
tokenizer = AutoTokenizer.from_pretrained(MODELS / "student_tokenizer")

config = quantized.config
set_labels(config)
fresh = BertForSequenceClassification(config).eval()

copied_linear = 0
for name, module in fresh.named_modules():
    if isinstance(module, torch.nn.Linear):
        q = quantized.get_submodule(name)
        # quantized dynamic Linear: weight() is an int8 tensor with a scale; dequantize() -> float
        w = q.weight().dequantize() if callable(getattr(q, "weight", None)) else q.weight.data
        b = q.bias() if callable(getattr(q, "bias", None)) else q.bias
        module.weight.data.copy_(w)
        if b is not None:
            module.bias.data.copy_(b.detach() if hasattr(b, "detach") else b)
        copied_linear += 1

# Everything that is not a Linear (embeddings, LayerNorm) was never quantized: copy as-is
q_params = dict(quantized.named_parameters())
q_buffers = dict(quantized.named_buffers())
linear_names = {n for n, m in fresh.named_modules() if isinstance(m, torch.nn.Linear)}
copied_other = 0
for name, p in fresh.named_parameters():
    if name.rsplit(".", 1)[0] in linear_names:
        continue
    p.data.copy_(q_params[name].data)
    copied_other += 1
for name, buf in fresh.named_buffers():
    if name in q_buffers:
        buf.data.copy_(q_buffers[name].data)
print(f"Rebuilt student: {copied_linear} Linear layers dequantized, {copied_other} other tensors copied")

# The rebuilt float model must give the same probabilities as the original quantized one.
# Label agreement is only counted where the original has a clear winner (top two >= 0.01 apart):
# on a near-tie, a 0.001 nudge flips the label either way, so those prove nothing.
agree = clear = 0
max_diff = 0.0
seed = load_seed()
with torch.no_grad():
    for row in seed:
        enc = tokenizer(row["text"], return_tensors="pt", max_length=MAX_LENGTH, truncation=True)
        a = torch.softmax(quantized(**enc).logits, -1)[0]
        b = torch.softmax(fresh(**enc).logits, -1)[0]
        top2 = torch.topk(a, 2).values
        if float(top2[0] - top2[1]) >= 0.01:
            clear += 1
            agree += int(a.argmax() == b.argmax())
        max_diff = max(max_diff, float((a - b).abs().max()))
print(f"Rebuilt vs original: {agree}/{clear} same label where the original is clear, max probability difference {max_diff:.4f}")
assert max_diff < 0.02, "rebuild changed the model's probabilities too much"
assert agree / max(clear, 1) >= 0.98, "rebuild changed the model's answers too much"

hf_dir = LOCAL_OUT / "student-hf"
shutil.rmtree(hf_dir, ignore_errors=True)
fresh.save_pretrained(hf_dir)
tokenizer.save_pretrained(hf_dir)

out_dir = PUBLIC_OUT / "student"
onnx_path = export_and_quantize(hf_dir, out_dir)
print(f"Wrote {onnx_path} — {onnx_path.stat().st_size / 1e6:.1f} MB (labels: {', '.join(CATEGORIES)})")
