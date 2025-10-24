# ImageGen Starter Repo v2 (Logging + Fallbacks)

Provider‑agnostic image generation for web assets (hero banners, emotion sliders, product shots, icons/logos), with presets, multi‑format output (JPG/WebP/AVIF + LQIP), manifesting and **end‑to‑end orchestration** (Prompt → Generate/Edit → Link → PR). Designed for **OpenAI gpt-image-1** (Node SDK `openai` ^6.6.0) and extensible to Stability/FLUX.

---

## Architecture & Flow

```
[Prompt Builder] -> prompt.json
         |                 |
         v                 v
   [Generator (OpenAI)] -> public/img/** (JPG/WebP/AVIF, LQIP)
         |                 |
         +----> manifest.json (metadata: page, container, alt, keywords)
                             |
                             v
                  [Content Linker] -> content/images.json
                             |
                             v
                 [create-pull-request] -> GitHub PR
```

### Components
- **Presets** (`config/presets.json`): sizes, formats, quality & style (base/negatives), output subdir, provider options.
- **Prompt rules** (`config/prompt-rules.json`): style/avoid per container + topic dictionary (e.g., `glasbongs`).
- **Prompt builder** (`src/prompt-builder.js`): builds rich prompt & SEO meta from page/container/brand/keywords/desc.
- **Generator** (`src/index.js` + `src/providers/openai.js`): generates images via OpenAI Images API; writes multi‑formats & LQIP; updates manifest.
- **Product edit** (`src/edit.js`): tries **OpenAI Edits** first; fallback: **BG removal**; last resort: neutral studio‑gen.
- **Logo fix** (`src/logo-fix.js`): fetch or file → cleanup → optional **SVG vectorize** (Potrace).
- **Content linker** (`src/content-linker.js`): picks newest suitable asset for page/container; updates `content/images.json`.
- **Workflows** (`.github/workflows/*.yml`): generate, logos, publish content, and **orchestrate** (all-in-one).
- **Validation** (`src/validate-config.js` + `config/schema/*`): Ajv‑schemas for safe config.
- **Logging** (`src/logger.js`): structured logs with pino; retries with exponential backoff.

### Data files
- `public/img/manifest.json`: array of entries `{ preset, prompt, files[], page, container, alt, description, keywords[], createdAt }`.
- `content/images.json`: mapping `{ [page]: { [container]: { file, alt, description, keywords[], generatedAt } } }`.

### Rationale (tech choices)
- **OpenAI Images API** (`images.generate`, `images.edits`) – stable interfaces in Node SDK 6.x; for real transparency prefer **Edits** with `background:'transparent'`.  
- **Node 22.x LTS**, Actions **checkout@v5**, **setup-node@v6**, PR via **peter-evans/create-pull-request@v7**.

---

## Directory Layout

```
imagegen/
├─ .github/workflows/
│  ├─ generate-images.yml
│  ├─ logos.yml
│  ├─ publish-content.yml
│  └─ orchestrate.yml
├─ config/
│  ├─ presets.json
│  ├─ prompts.yml
│  ├─ prompt-rules.json
│  └─ schema/
│     ├─ presets.schema.json
│     └─ prompt-rules.schema.json
├─ public/img/                 # outputs + manifest.json
├─ content/images.json         # content linkage
├─ input/product/              # your product photos for Edit mode
├─ input/logos/                # optional logo sources
├─ src/
│  ├─ index.js                 # generator CLI (uses presets)
│  ├─ providers/openai.js      # OpenAI Images generate & edits
│  ├─ postprocess.js           # sharp resize/convert + LQIP
│  ├─ edit.js                  # product edit with fallbacks
│  ├─ logo-fix.js              # logo cleanup + vectorize
│  ├─ svg-gen.js               # text→SVG icons/logos
│  ├─ prompt-builder.js        # builds prompt & meta
│  ├─ content-linker.js        # links latest asset to content db
│  ├─ manifest.js              # manifest update
│  ├─ validate-config.js       # Ajv validation
│  ├─ logger.js                # pino logger
│  └─ utils.js                 # helpers & retry
├─ scripts/
│  ├─ install.sh               # local setup
│  └─ setup-gh-secrets.sh      # set OPENAI_API_KEY via gh
├─ ops/agent-init.md           # system prompt for ChatGPT/Codex
├─ .env.example
├─ package.json
└─ README.md
```

---

## Install & Setup

```bash
cp .env.example .env
# put OPENAI_API_KEY=... in .env or set repo secret
bash scripts/install.sh
```

Optional (GitHub CLI):
```bash
export OPENAI_API_KEY=sk-...
bash scripts/setup-gh-secrets.sh
```

---

## Local Usage

**Generate (from prompt):**
```bash
node src/index.js --preset hero_photoreal --prompt "Growshop interior, cinematic lighting"
```

**Generate (from meta file):**
```bash
node src/prompt-builder.js   --page '/produkte/glasbongs'   --container hero   --brand 'GrowCologne'   --keywords 'Glasbong,Growshop Dortmund'   --desc 'Hero-Visual für Kategorie Glasbongs'   --out .tmp/prompt.json

node src/index.js --preset hero_photoreal --meta .tmp/prompt.json
node src/content-linker.js --page '/produkte/glasbongs' --container hero --target content/images.json
```

**Product edit from your photos:**
```bash
# drop files into input/product/
npm run gen:product
```

**Logos cleanup/vectorize:**
```bash
node src/logo-fix.js --url https://example.com/logo.png --out public/img/logos --vectorize --variants svg,png
```

---

## GitHub Actions

- **Generate Images** – Batch (`config/prompts.yml`) oder Single (`preset`+`prompt`), PR automatisch.
- **Logos** – URL/Datei → Cleanup/Vectorize, PR automatisch.
- **Publish Content** – Linke neueste Assets in `content/images.json`, PR automatisch.
- **Orchestrate** – **Prompt→Gen→Link→PR** in einem Lauf.

---

## Prompt Engineering (Best Practice)

- **Hero:** Cinematic lighting, shallow DOF, natural grading; negatives gegen CGI/Text.  
- **Slider:** Macro/close-up, tactile textures, moody low-key, realistic noise; konsistente Serien via gleiches Prompt.  
- **Produkt:** Edit mit Originalfoto; „preserve exact proportions and labels“; Soft shadow on pure white.  
- **Transparenz:** Für echte Transparenz `images.edits` mit `background:'transparent'`; sonst BG‑Removal.

---

## Observability & Resilience

- **pino**-Logs, **retries** (exponential backoff), **Ajv**-Validation.
- Fallbacks im Product‑Edit: Edits → BG‑Removal → generische Studio‑Gen.

---

## Security

- Nur ENV/Secrets; niemals Keys committen.
- Node 22.x LTS; Actions auf aktuelle Major‑Versionen.

---

## License

MIT (optional – füge ggf. eure Unternehmenslizenz ein).
