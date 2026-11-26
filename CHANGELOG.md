# Changelog

Every change to majedtuah.com is written down here, newest first.

- The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- Version numbers follow [Semantic Versioning](https://semver.org/):
  - **MAJOR**: the site goes live or changes in a big way
  - **MINOR**: a new feature
  - **PATCH**: a fix
- New entries go under **Unreleased** first. When a phase is finished, they move under a version number with the date.
- Each entry links to the doc that explains it. The *why* behind each choice is in [docs/decisions.md](docs/decisions.md).

## [Unreleased]

### Added
- The Tier 3 BERT teacher now loads during development (`pnpm dev`): a dev-only Vite plugin serves it from `tools/export/out/teacher/`. "Load teacher" works locally before the Hugging Face upload. Tested in Edge: "call mum this weekend" now goes through all three tiers, and the teacher answers PERSONAL at 95% in 34 ms. Production is unchanged; it still needs the upload and `VITE_TEACHER_REPO`. See [docs/10 → The teacher](docs/10-braindump-in-the-browser.md#the-teacher-tier-3-where-it-loads-from).
- Step-by-step Hugging Face upload instructions in docs/10.

### Fixed
- On a fresh dev server, opening the AI Lab made Vite reload the whole page once, because it found transformers.js late. The package is now pre-bundled (`optimizeDeps.include`).
- The demo showed "0.00 ms" for very fast tiers, but browsers round timers to 0.1 ms. It now shows "<0.1 ms".
- When the teacher isn't loaded and Tier 2 answers below its 85% threshold, the result now says "teacher not loaded".

## [0.2.0] - 2026-11-26

The BrainDump router in the AI Lab now runs Majed's real trained models in the visitor's browser. Nothing is simulated. See [docs/10-braindump-in-the-browser.md](docs/10-braindump-in-the-browser.md).

### Added
- **Real in-browser router**: Tier 1 (TF-IDF + calibrated SVM) runs in plain TypeScript; Tier 2 (distilled bert-tiny, 4.5 MB int8 ONNX) runs via transformers.js in a Web Worker. Confidences and millisecond timings are measured live on the visitor's device. ([D-003](docs/decisions.md#d-003-the-braindump-router-runs-in-the-visitors-browser), [D-004](docs/decisions.md#d-004-tier-1-tf-idf--svm-is-rewritten-in-plain-typescript), [D-007](docs/decisions.md#d-007-transformersjs-runs-the-neural-tiers-in-a-web-worker))
- Opt-in Tier 3 teacher (110 MB int8). Its **Load teacher** button appears once the model is uploaded to Hugging Face and `VITE_TEACHER_REPO` is set. ([D-005](docs/decisions.md#d-005-the-teacher-model-is-opt-in-and-hosted-on-hugging-face), [D-019](docs/decisions.md#d-019-the-teacher-ships-as-int8-110-mb-not-float16))
- `tools/export/`: Python scripts that convert the BrainDump models for the browser (`export_tier1.py`, `export_student.py`, `export_teacher.py`), plus `parity_check.py`, which proves the browser versions match the originals. ([D-006](docs/decisions.md#d-006-rebuild-the-student-from-its-quantized-file-then-export-to-onnx), [D-018](docs/decisions.md#d-018-parity-checks-compare-clear-cases-only))
- `public/models/braindump/`: `tier1.json`, the student model, and `manifest.json` (sizes, hashes, labels, thresholds, and three example sentences, each picked because it stops at a different tier).
- `src/lab/router/`: `tier1.ts`, `arbitrator.ts` (an exact copy of BrainDump's rules), `router.worker.ts`, `useRouter.ts`, `protocol.ts`.
- `scripts/copy-ort.mjs`: the ONNX Runtime engine is served from our own site, not a CDN. ([D-015](docs/decisions.md#d-015-serve-the-onnx-runtime-engine-from-our-own-site))
- Tests with Vitest (`pnpm test`): Tier 1 is checked against sklearn on 159 sentences, and every arbitrator rule has a test. 167 tests. ([D-013](docs/decisions.md#d-013-vitest-for-tests))
- Docs: [10-braindump-in-the-browser.md](docs/10-braindump-in-the-browser.md), AI Lab words in the [glossary](docs/08-glossary.md), and decisions D-015 to D-019.

### Changed
- `AiLab.tsx` is now just the tab shell. Each demo is its own file in `src/components/lab/`, loaded only when its tab opens, so the first page load is unchanged.
- The router uses BrainDump's real categories and thresholds (PERSONAL / FINANCIAL / PROJECTS / ADMIN / AUTOMATION, 90% / 85%). The old version used made-up Task / Idea / Reflection labels and an 80% threshold.
- `vite.config.ts`: source maps are explicitly off, and the 27 MB WASM file that onnxruntime would otherwise copy in is dropped, so every file stays under Cloudflare's 25 MB limit.
- The neural tiers run on WebAssembly with one thread. ([D-016](docs/decisions.md#d-016-run-the-neural-tiers-on-webassembly-only-single-threaded))

### Fixed (in BrainDump itself, `braindump.ai-main`, then retrained) ([D-017](docs/decisions.md#d-017-fix-and-retrain-braindump-before-putting-it-on-the-site))
- Tier 1 reported the wrong category: sklearn's alphabetical `classes_` order was read as `CATEGORIES` order.
- Tier 1 could never reach its 90% threshold. It's now calibrated with `CalibratedClassifierCV`.
- The student was undertrained (5 epochs at 5e-5: 50% accurate, at most 30% sure). It's now 40 epochs at 3e-4, and 98% accurate on its training data.
- The teacher went from 3 to 10 epochs (now 98% accurate on its training data, validation loss 0.36), and `eval_strategy` is renamed for newer transformers.
- Pruning crashed on newer PyTorch (non-contiguous weights).
- Result: on 159 test sentences the router now stops at Tier 1 / 2 / 3 for 134 / 18 / 7 of them. Before, all 159 went to Tier 3.

### Removed
- The simulated keyword-scoring router and its "Simulated in your browser" disclaimer.

## [0.1.1] - 2026-11-26

Documentation and tooling groundwork before the AI work.

### Added
- `CHANGELOG.md` (this file) and [docs/decisions.md](docs/decisions.md), a log of every technical decision with its reasons.
- [docs/09-ai-lab-overview.md](docs/09-ai-lab-overview.md): the plan for putting real AI into the AI Lab, and what will run where.
- Git version control for the project.

### Security
- `.gitignore` now also ignores `.dev.vars` (local secrets), `.wrangler/` and the Python export environment, so keys can never be committed. See [decisions.md → D-011](docs/decisions.md#d-011-secrets-live-only-on-the-server).

## [0.1.0] - 2026-11-26

The baseline: the site as it was before the AI Lab work started.

### Added
- A single-page portfolio built with React 19, Vite 8, Tailwind 4, GSAP, Lenis and three.js. See [docs/README.md](docs/README.md).
- Sections: Hero (with project books), What I do, Experience, AI Lab, Teaching, About (résumé and projects), Contact.
- AI Lab with two **simulated** demos:
  - a BrainDump router that uses keyword scoring instead of real models
  - a click-through RAG explainer
