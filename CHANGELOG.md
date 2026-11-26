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
