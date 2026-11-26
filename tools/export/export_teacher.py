"""
Tier 3 export: converts BrainDump's BERT teacher (418 MB, float) to int8 ONNX (~110 MB).

The result goes to tools/export/out/teacher, NOT public/: Cloudflare Pages refuses files over 25 MB.
Upload that folder to a public Hugging Face model repo (steps in docs/13-deploy-and-domain.md);
the site downloads it only when a visitor clicks "Load teacher". Explained in
docs/10-braindump-in-the-browser.md (decision D-005).

Run:  tools\\export\\.venv\\Scripts\\python tools\\export\\export_teacher.py
"""
import shutil

from transformers import BertForSequenceClassification, BertTokenizerFast

from common import LOCAL_OUT, TEACHER_DIR
from onnx_tools import export_and_quantize, set_labels

src = TEACHER_DIR
print("Exporting", src.name)
model = BertForSequenceClassification.from_pretrained(src)
tokenizer = BertTokenizerFast.from_pretrained(src)  # the fast version can write tokenizer.json
set_labels(model.config)

hf_dir = LOCAL_OUT / "teacher-hf"
shutil.rmtree(hf_dir, ignore_errors=True)
model.save_pretrained(hf_dir)
tokenizer.save_pretrained(hf_dir)

onnx_path = export_and_quantize(hf_dir, LOCAL_OUT / "teacher")
(LOCAL_OUT / "teacher" / "README.md").write_text(
    "---\nlicense: mit\npipeline_tag: text-classification\nlibrary_name: transformers.js\n---\n\n"
    "# BrainDump teacher (ONNX, int8)\n\n"
    "The Tier 3 BERT teacher from [braindump.ai](https://github.com/MajedTuah/braindump.ai), fine-tuned "
    "from bert-base-uncased to sort raw thoughts into PERSONAL, FINANCIAL, PROJECTS, ADMIN and AUTOMATION. "
    "Exported to ONNX and dynamically quantized to int8 so it runs in the browser with transformers.js "
    "on [majedtuah.com](https://majedtuah.com).\n",
    encoding="utf-8",
)
shutil.rmtree(hf_dir, ignore_errors=True)
print(f"Wrote {onnx_path} — {onnx_path.stat().st_size / 1e6:.1f} MB")
