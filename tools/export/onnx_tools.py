"""
Shared steps for the two neural tiers: export a Hugging Face BERT classifier to ONNX, then shrink it
to int8 with ONNX Runtime, in the folder layout transformers.js expects:

    <out>/config.json, tokenizer.json, tokenizer_config.json, special_tokens_map.json
    <out>/onnx/model_quantized.onnx

Explained in docs/10-braindump-in-the-browser.md (decisions D-006, D-007).
"""
import shutil
from pathlib import Path

from common import CATEGORIES


def set_labels(config):
    """Store the real label names so the model reports PERSONAL… instead of LABEL_0…"""
    config.id2label = {i: c for i, c in enumerate(CATEGORIES)}
    config.label2id = {c: i for i, c in enumerate(CATEGORIES)}


def export_and_quantize(hf_dir: Path, out_dir: Path, careful: bool = False) -> Path:
    """careful=True quantizes only the big matrix multiplications, one scale per output channel,
    and leaves the embeddings in float. Needed for BERT-base: quantizing everything changed 13% of
    its answers. bert-tiny is fine with the default."""
    from onnxruntime.quantization import QuantType, quantize_dynamic
    from optimum.exporters.onnx import main_export

    tmp = out_dir.parent / f"{out_dir.name}-fp32"
    shutil.rmtree(tmp, ignore_errors=True)
    shutil.rmtree(out_dir, ignore_errors=True)

    # 1. PyTorch -> ONNX (float32). Optimum also writes tokenizer.json and the configs.
    main_export(model_name_or_path=str(hf_dir), output=tmp, task="text-classification", opset=14)

    # 2. float32 -> int8 weights (dynamic quantization, the same idea as torch quantize_dynamic)
    (out_dir / "onnx").mkdir(parents=True)
    quantized = out_dir / "onnx" / "model_quantized.onnx"
    if careful:
        quantize_dynamic(str(tmp / "model.onnx"), str(quantized), weight_type=QuantType.QInt8, per_channel=True, op_types_to_quantize=["MatMul"])
    else:
        quantize_dynamic(str(tmp / "model.onnx"), str(quantized), weight_type=QuantType.QInt8)

    # 3. Keep only what the browser needs
    for name in ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"]:
        src = tmp / name
        if src.exists():
            shutil.copy(src, out_dir / name)
    assert (out_dir / "tokenizer.json").exists(), "tokenizer.json missing: transformers.js needs it"

    shutil.rmtree(tmp, ignore_errors=True)
    return quantized
