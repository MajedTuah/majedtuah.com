# Decision log

Every technical choice made for this site gets an entry here, so you can come back later and see why things are the way they are. This kind of log is often called "ADRs" (Architecture Decision Records).

Each entry answers five questions:

- **Decision**: what we chose.
- **Why**: the reason.
- **Alternatives**: what else we looked at.
- **Trade-off**: what we gave up.
- **Date**: when it was decided.

If a decision is ever reversed, the old entry stays and gets a "Superseded by D-0xx" line. Nothing is deleted.

---

## D-001 Host on Cloudflare (Pages + Pages Functions)
- **Decision:** Cloudflare hosts both the website and the small server code behind the RAG demo.
  - The website is the `dist/` folder, served by Cloudflare Pages.
  - The server code is the `/api/ask` endpoint, run by Pages Functions.
- **Why:**
  - **It's free, and the free plan allows commercial use.** A portfolio that helps you get hired counts as commercial use.
  - The website and the API live on **one domain**, so the browser never needs to know any other server's address.
  - The protections we need come built in and free: Turnstile (bot check), a rate-limit rule, KV (a tiny key-value database) and Workers AI (embeddings and reranking).
  - Bandwidth is unlimited, so a big model download can't run up a bill.
- **Alternatives:**
  - **Vercel:** its free "Hobby" plan is for non-commercial use only, and rate limiting needs an extra service (Upstash Redis).
  - **Netlify:** similar limits.
  - **GitHub Pages:** can't run server code at all.
- **Trade-off:** we learn Cloudflare's tools (`wrangler`). Each file Pages serves must be under 25 MB, which matters for the big teacher model (see D-005).
- **Date:** 2026-11-26

## D-002 Groq (Llama) writes the RAG answers
- **Decision:** the "Ask about my work" answers come from a Llama model on Groq. The server is the only thing that calls it.
- **Why:**
  - You already use Groq in WeddingHub, so the demo matches your real stack.
  - It's very fast, which matters for a live, streaming demo.
  - It has a **free tier with no card on file**, so the worst case is hitting a limit, never a bill.
- **Alternatives:** Claude Haiku (stronger at following the rules, but paid), Azure OpenAI (matches your day job, but more setup and paid).
- **Trade-off:** free-tier rate limits. Groq also renames or retires models now and then, so the model name lives in a setting (`GROQ_MODEL`) and not in the code.
- **Date:** 2026-11-26

## D-003 The BrainDump router runs in the visitor's browser
- **Decision:** the real BrainDump models are converted to web formats and run on the visitor's own device. No server is involved.
- **Why:**
  - It costs nothing, needs no API key, and has no endpoint that could leak or be abused.
  - It shows the actual point of BrainDump: small models running locally and fast. The latency numbers on screen are real, measured on the visitor's machine.
  - **Privacy:** what a visitor types never leaves their browser.
- **Alternatives:** host the models on a server, such as a Hugging Face Space or a FastAPI container. That means a server to pay for and protect, and cold starts.
- **Trade-off:**
  - The browser has to download the models: about 5 MB for the student, and about 110 MB for the teacher if the visitor opts in.
  - Slow phones run them slower, which is honest about edge AI anyway.
- **Date:** 2026-11-26

## D-004 Tier 1 (TF-IDF + SVM) is rewritten in plain TypeScript
- **Decision:**
  - We don't run sklearn in the browser. We export the Tier 1 model's numbers to a small JSON file: its vocabulary, IDF weights, SVM coefficients and intercepts.
  - We redo the maths in about 80 lines of TypeScript.
- **Why:** TF-IDF + linear SVM is just counting words and multiplying. That needs a JSON file of a few tens of KB and no ML library. Converting sklearn to ONNX would add a runtime download for no benefit.
- **Alternatives:** `skl2onnx` + onnxruntime-web, or Pyodide (Python in the browser, which is a large download).
- **Trade-off:** our TypeScript must copy sklearn's text processing exactly (accents, lowercasing, word splitting, bigrams). A **parity test** proves it matches, so any drift fails the tests.
- **Date:** 2026-11-26

## D-005 The teacher model is opt-in and hosted on Hugging Face
- **Decision:**
  - The 418 MB BERT teacher is shrunk to about 110 MB (int8 ONNX).
  - It goes in a public Hugging Face model repo.
  - It downloads only when the visitor clicks "Load teacher". The button is hidden on phones.
- **Why:**
  - Cloudflare Pages won't serve files over 25 MB.
  - Making every visitor download 110 MB would be unkind.
  - Hugging Face hosts models for free, and transformers.js can load from it directly.
- **Alternatives:** Cloudflare R2 storage (free, but more setup, and the custom domain needs to exist first), or skipping Tier 3 entirely.
- **Trade-off:**
  - The teacher's files are public. That's fine: they hold no secrets, and anything that runs in a browser can be downloaded anyway.
  - Without the teacher, the router falls back to Tier 2, which is what the real BrainDump arbitrator does when Tier 3 isn't available.
- **Date:** 2026-11-26

## D-006 Rebuild the student from its quantized file, then export to ONNX
- **Decision:** we turn `student_quantized.pt` back into a normal float model, export it to ONNX, and quantize it again with ONNX Runtime.
  - "Back into a float model" means reading each int8 weight and converting it back to a decimal.
- **Why:**
  - PyTorch's quantized layers can't be exported to ONNX directly.
  - `train_slm.py` saves only the quantized model, so no float copy exists.
  - Rebuilding the float model keeps your real trained weights, so we don't have to retrain.
- **Alternatives:** change `train_slm.py` to also save the float model, then retrain. That's slower, and the results would differ from what you trained.
- **Trade-off:** quantizing twice can shift some confidences by a tiny amount. The parity check measures how often the exported model picks the same label as the original, and it has to agree at least 98% of the time.
- **Date:** 2026-11-26

## D-007 transformers.js runs the neural tiers, in a Web Worker
- **Decision:** the student (Tier 2) and the teacher (Tier 3) run through `@huggingface/transformers` (transformers.js), inside a Web Worker. transformers.js uses onnxruntime-web, on WebGPU when the browser has it and WASM otherwise.
- **Why:**
  - transformers.js gives us the exact same WordPiece tokenizer as Python, plus model loading and caching.
  - A **Web Worker** is a background thread, so the heavy maths never freezes the scrolling or the animations.
- **Alternatives:** onnxruntime-web on its own, with a hand-written tokenizer (more code, and more ways to get it wrong).
- **Trade-off:** one more package. It's only downloaded when the AI Lab opens, so the first page load isn't affected.
- **Date:** 2026-11-26
- **Status:** the WebGPU part is superseded by [D-016](#d-016-run-the-neural-tiers-on-webassembly-only-single-threaded).

## D-008 The RAG corpus is pre-computed and stored as a file
- **Decision:**
  - The corpus is the knowledge the "Ask" demo searches: your résumé, projects, teaching and repo READMEs.
  - It's cut into chunks and embedded once, on your machine, with `pnpm corpus`.
  - The result goes in a JSON file, which the server code bundles.
- **Why:**
  - There are only about 80 chunks.
  - Searching 80 vectors in memory takes well under a millisecond.
  - A vector database would be one more service, account and bill, for no gain.
- **Alternatives:** Cloudflare Vectorize, Azure AI Search, Pinecone.
- **Trade-off:** when `src/data.ts` changes, you re-run `pnpm corpus` and redeploy, or the demo answers from old facts.
- **Date:** 2026-11-26

## D-009 Hybrid search + reranker, the same shape as the Azure pipeline
- **Decision:** a question is searched two ways at once, the two result lists are merged, and a reranker re-scores the top results.
  - **Keyword search (BM25)** catches exact names and figures.
  - **Vector search (embeddings)** catches meaning.
  - **Reciprocal Rank Fusion** merges the two lists.
  - **Workers AI's `bge-reranker-base`** re-scores the top results, and only the best 3 go to the LLM.
- **Why:** it's the same design as the financial RAG you build at work, using free tools, so the demo is honest about your real pattern. If even the best passage scores low, the demo replies "I don't have that in my notes" and never calls the LLM. That saves money and stops made-up answers.
- **Alternatives:** vector-only search (misses exact names), or no reranker (the LLM gets weaker passages).
- **Trade-off:** each question makes two extra Workers AI calls. They're well inside the free tier (10,000 "neurons" a day).
- **Date:** 2026-11-26

## D-010 Stream the pipeline as NDJSON events
- **Decision:** `/api/ask` sends back one JSON object per line, as each stage finishes (`check`, `guard`, `retrieve`, `rerank`, then answer tokens, then `done`). The page lights up each stage as its event arrives.
- **Why:** visitors *watch* the pipeline run, and that's the whole point of the demo. NDJSON (newline-delimited JSON) is the simplest streaming format: no extra library, and readable in DevTools.
- **Alternatives:** Server-Sent Events (needs a specific format, and is GET-oriented), WebSockets (overkill), or waiting for one big response (nothing to watch).
- **Trade-off:** we write a small line-by-line reader on the frontend.
- **Date:** 2026-11-26

## D-011 Secrets live only on the server
- **Decision:**
  - API keys exist in only two places: Cloudflare's **encrypted secrets** for the live site, and `.dev.vars` on your PC for local testing. `.dev.vars` is gitignored.
  - Never in the code, never in git, never in a `VITE_` variable.
  - A script checks every build and fails it if anything that looks like a key ends up in the public files.
- **Why:** everything in `dist/` is public. Vite copies every `VITE_*` variable into the JavaScript the browser downloads. The safest secret is one the frontend never has.
- **Alternatives:** none. This is the rule.
- **Trade-off:** testing the API locally needs a `.dev.vars` file. Copy `.dev.vars.example` and fill it in.
- **Date:** 2026-11-26

## D-012 The endpoint is visible, but useless to outsiders
- **Decision:** we accept that `/api/ask` can be seen in DevTools, and layer protections so nobody can use it from outside the site:
  - Turnstile
  - an Origin allowlist
  - no CORS headers
  - a per-IP rate limit
  - a daily cap
  - input and output length limits
- **Why:** any URL a browser calls can be read by the person using that browser. You can't hide an endpoint, only make abusing it pointless. Each layer is explained in [12-security.md](12-security.md).
- **Alternatives:** "security through obscurity", such as a random URL path. It doesn't work, because the path is right there in the Network tab.
- **Trade-off:** each layer is a little more setup in the Cloudflare dashboard.
- **Date:** 2026-11-26

## D-013 Vitest for tests
- **Decision:** unit tests use Vitest.
- **Why:** it runs on the same Vite setup the site already uses, so TypeScript works with zero config. It's fast and has a Jest-like syntax.
- **Alternatives:** Jest (needs extra TypeScript/ESM setup), or no tests (but the parity checks *need* tests).
- **Trade-off:** one dev dependency.
- **Date:** 2026-11-26

## D-014 Buy and attach the domain last
- **Decision:**
  - Everything is built and tested on Cloudflare's free `majedtuah.pages.dev` address first.
  - Buying `majedtuah.com` and attaching it is the final step. Cloudflare Registrar sells it at cost.
- **Why:** you asked for it. It also means no money is spent until the site works, and search engines don't see a half-finished site, because `noindex` stays on until launch.
- **Alternatives:** buy now (pays for a domain that points at nothing).
- **Trade-off:** at launch, three settings need the new domain added: Turnstile hostnames, `ALLOWED_ORIGINS`, and the rate-limit rule. They're listed in [13-deploy-and-domain.md](13-deploy-and-domain.md).
- **Date:** 2026-11-26

## D-015 Serve the ONNX Runtime engine from our own site
- **Decision:** `scripts/copy-ort.mjs` copies onnxruntime-web's WebAssembly engine into `public/ort/` before every `dev` and `build`. The worker loads the engine from there, not from the jsDelivr CDN that transformers.js uses by default.
- **Why:**
  - Code we load from a third party could change under us.
  - The security headers can say "scripts only from this site".
  - The site keeps working even if the CDN is down.
- **Alternatives:** the default CDN (zero setup, but it adds a third party to the page's trust).
- **Trade-off:**
  - We use the **plain** build (14 MB), not the default "asyncify" one (27 MB), because Cloudflare Pages rejects files over 25 MB. The plain build is the one transformers.js already uses for older Safari, so it's supported.
  - `public/ort/` is generated, so it's gitignored.
- **Date:** 2026-11-26

## D-016 Run the neural tiers on WebAssembly only, single-threaded
- **Decision:** the student and teacher run with `device: 'wasm'` and one thread. This supersedes the "WebGPU when available" part of D-007.
- **Why:**
  - The models are int8-quantized, and WebGPU in onnxruntime-web doesn't support the int8 operators well. It would fall back or fail unpredictably across browsers.
  - Threads need special cross-origin isolation headers, which would also block the Turnstile iframe.
  - bert-tiny answers in a few milliseconds on a single thread anyway.
- **Alternatives:** WebGPU with float16 models (bigger downloads, and support varies a lot between browsers).
- **Trade-off:** the 110 MB teacher is slower on WASM, roughly 50–200 ms on a laptop. That's acceptable for the "hard cases only" tier.
- **Date:** 2026-11-26

## D-017 Fix and retrain BrainDump before putting it on the site
- **Decision:** before exporting, BrainDump itself was fixed and retrained. The changes are in `braindump.ai-main`:
  - **Tier 1 label bug.** sklearn stores class names alphabetically (`ADMIN, AUTOMATION, FINANCIAL, PERSONAL, PROJECTS`), but `tier1_tfidf.py` looked them up in `CATEGORIES` order. Tier 1 was reporting the wrong label, so it now uses `pipeline.classes_`.
  - **Tier 1 confidence.** A softmax over SVM margins never went above about 0.6, so the 0.90 threshold was unreachable and Tier 1 never answered. The SVM is now wrapped in `CalibratedClassifierCV` (sigmoid), which gives real probabilities.
  - **Student.** It was trained for 5 epochs at lr 5e-5, which left it at 50% accuracy and never more than 30% confident, so Tier 2 never answered either. It's now trained for 40 epochs at lr 3e-4, a normal setting for bert-tiny. A one-line `.contiguous()` fix lets pruning run on newer torch.
  - **Teacher.** 3 epochs → 10. `evaluation_strategy` was renamed `eval_strategy`, which works on transformers 4.41 and newer.
- **Why:**
  - Before the fixes, every one of 159 test sentences ended at Tier 3, so the demo couldn't show the idea the project is about.
  - The fixes also improve BrainDump itself.
- **Alternatives:**
  - Ship the models as they were and show them honestly.
  - Retrain only a copy for the website.
- **Trade-off:**
  - The website's models are newer than what's in the public BrainDump repo until you push these changes there.
  - The old models are backed up in `tools/export/out/backup-2026-11-26/`.
- **Date:** 2026-11-26

## D-018 Parity checks compare clear cases only
- **Decision:** the export checks (the original model vs the browser version) require two things:
  - (a) the probability for every label stays within a small margin of the original's
  - (b) the same top label **on sentences where the original's top two labels are at least 0.01 apart**
- **Why:** when two labels are almost tied, a 0.001 change flips the winner, so counting those as "disagreements" would measure noise, not the export.
- **Alternatives:** require identical labels on every sentence (fails on noise), or check probabilities only.
- **Trade-off:** none in practice. The probability check still covers the near-tied sentences.
- **Date:** 2026-11-26

## D-019 The teacher ships as int8 (110 MB), not float16
- **Decision:** the opt-in Tier 3 teacher is exported as int8 ONNX, about 110 MB.
- **Why:**
  - The old teacher lost accuracy under int8, so we waited until after retraining to decide.
  - The retrained teacher holds up well. It's **98% accurate as int8, the same as the original PyTorch model**, and it gives the same top label on 156 of 159 clear test sentences.
  - Float16 would double the download for no accuracy gain.
- **Alternatives:**
  - float16 (about 220 MB, closer to the original's exact probabilities)
  - "careful" int8: only matrix multiplications, one scale per channel. In testing it was *less* accurate and bigger, so it was dropped.
- **Trade-off:**
  - On average, the teacher's probabilities move about 3 points from the original's. Its gate in `parity_check.py` is therefore a mean difference under 0.05; the student's is 0.03.
  - A few borderline sentences can come out with a different label than in Python.
- **Date:** 2026-11-26
