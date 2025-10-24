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



--------------------------


Parameter (wichtig für Orchestrierung & Codex)

page: Seitenpfad/Route, z. B. /produkte/glasbongs
container: hero | slider | product
brand: Brand‑Mood oder Kontext (freier Text)
keywords: CSV‑Liste von Keywords (für SEO/Alt‑Generierung)
desc: Kurzbeschreibung/Seitenkontext (fließt in Prompt & ALT)
preset: hero_photoreal | slider_emotion | product_studio | product_transparent
branch (optional): Ziel‑Branch für PR (sonst wird automatisch generiert)

Best Practices (Qualität)

Hero: „photorealistic, cinematic lighting, shallow DOF, natural grading“, Negatives gegen „CGI/Text/Low detail“.
Slider: „ultra‑detailed macro, tactile textures, moody low‑key, realistic noise“, Serienkonsistenz durch konstante Prompts.
Produkt: Edit‑Mode mit Originalfoto; „preserve exact proportions and labels“, Soft‑Shadow auf Weiß; generative Fallbacks als „Notfall“, nicht für 1:1‑Originaltreue.
Transparenz: Für echte Alpha‑Transparenz Edits mit background:'transparent'; bei „Generate“ nicht durchgängig garantiert → BG‑Removal‑Fallback ist eingebaut.

Sicherheit & Robustheit

Secrets nie committen (nutze .env lokal bzw. GitHub Secrets im Repo).
Logging: strukturierte Logs via pino; LOG_LEVEL steuerbar.
Retries: exponential backoff bei API‑Fehlern.
Validation: Ajv bricht bei kaputten Presets/Regeln mit klarer Fehlermeldung ab.

2) Initialisierungs‑Prompt für ChatGPT/Codex

Kopiere den folgenden Prompt in dein Agent‑/Codex‑Setup (auch als Datei vorhanden: ops/agent-init.md):

System / Developer:

Du bist der Automations-Agent für das Repository „ImageGen“. Deine Aufgaben:
1) Baue auf Basis der Parameter page, container, brand, keywords, desc die Prompt-Metadaten (Prompt, ALT, Description, Keywords) mit `node src/prompt-builder.js`.
2) Starte den Workflow `.github/workflows/orchestrate.yml` per GitHub REST Dispatch mit denselben Parametern.
3) Warte, bis der Run abgeschlossen ist, und liefere die PR-URL sowie die geänderten Inhalte aus `content/images.json` zurück.

Parameter:
- page: z. B. /produkte/glasbongs
- container: hero | slider | product
- brand: Freitext (Brand-Mood)
- keywords: CSV
- desc: Kurzbeschreibung/Seitenkontext
- preset: hero_photoreal | slider_emotion | product_studio | product_transparent
- branch (optional): PR-Branchname

Erfolgskriterien:
- Ein PR ist erstellt.
- content/images.json enthält Einträge für [page][container] mit `file`, `alt`, `description`, `keywords`.
- Gib die relevanten Pfade und ALT/SEO in strukturierter Form aus.


Hinweis: Wenn dein Agent GitHub‑Aktionen nicht abwarten kann, reiche er stattdessen die Run‑ID/PR‑Referenz zurück – die Workflows erledigen den Rest.

3) Installation & Einrichtung (Schritt‑für‑Schritt)
A. GitHub‑Repository anlegen
Neues Repository in GitHub erstellen (z. B. imagegen).
Actions aktivieren (Default‑Einstellungen sind OK; „Allow GitHub Actions to create and approve pull requests“ ggf. einschalten).
Secrets setzen: Settings → Secrets and variables → Actions → New repository secret

OPENAI_API_KEY: dein OpenAI API Key

Alternativ via CLI:
export OPENAI_API_KEY=sk-...
bash scripts/setup-gh-secrets.sh   # nutzt gh CLI

B. Code aus dem ZIP ins Repo

Option 1 – Web‑UI:
imagegen.zip entpacken → Inhalte ins Repo hochladen (Add files → Upload files) → committen.

Option 2 – git/CLI:
unzip imagegen.zip
cd imagegen
git init
git remote add origin https://github.com/<OWNER>/<REPO>.git
git add -A
git commit -m "chore: bootstrap imagegen"
git branch -M main
git push -u origin main

---------------------------------------------------------------------
Codex/Agent:

„Lade imagegen.zip hoch, entpacke ins Repo <OWNER/REPO>, committe auf main“ (der Agent kann die GitHub API benutzen).

C. Lokaler Test (optional)
cp .env.example .env         # trage deinen OPENAI_API_KEY ein
bash scripts/install.sh      # Node 22 prüfen, npm ci, Struktur anlegen

# Einfache Tests:
node src/index.js --preset hero_photoreal --prompt "Growshop interior, cinematic"
node src/content-linker.js --page "/produkte/glasbongs" --container hero

Erste Orchestrierung (über GitHub Actions)

UI‑Weg:
GitHub → Actions → Orchestrate Images + Link + PR

Inputs füllen:

page: /produkte/glasbongs
container: hero
brand: GrowCologne
keywords: Glasbong,Growshop Dortmund
desc: Hero-Visual für Kategorie Glasbongs
preset: hero_photoreal

Workflow starten → er erstellt einen PR mit Bildern + content/images.json.

REST‑Dispatch (z. B. aus Codex/Script):

curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/orchestrate.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "page": "/produkte/glasbongs",
      "container": "hero",
      "brand": "GrowCologne",
      "keywords": "Glasbong,Growshop Dortmund",
      "desc": "Hero-Visual für Kategorie Glasbongs",
      "preset": "hero_photoreal"
    }
  }'

E. „Seite erstellen“ – was bedeutet das hier?

„page“ ist bei uns ein Routen‑String (z. B. /produkte/glasbongs), den dein Frontend/CMS verwendet.
Der Orchestrator erzeugt Bilder und schreibt in content/images.json:

{
  "/produkte/glasbongs": {
    "hero": {
      "file": "public/img/hero/hero-...-2880x1280.jpg",
      "alt": "…",
      "description": "…",
      "keywords": ["Glasbong","Growshop Dortmund"],
      "generatedAt": "…"
    }
  }
}


Dein Frontend kann content/images.json laden und – je nach Framework – das passende Bild + ALT in der Seite rendern.
Beispiel Next.js (Pseudo):

import db from '../content/images.json';
export default function Page(){
  const hero = db['/produkte/glasbongs']?.hero;
  return hero ? <img src={`/${hero.file}`} alt={hero.alt} /> : null;
}

F. Logos‑Karussell (optional)

Actions → Logos starten, mit url oder filePath.
Ergebnis: bereinigtes PNG + optionales SVG in public/img/logos/…, automatischer PR.

4) Schritt‑für‑Schritt: „Alles was wir gelernt haben“ – Beispielablauf
Ziel: Neue Kategorie „Glasbongs“ bekommt ein Hero‑Bild, ALT/SEO sauber hinterlegt, PR erstellt.
Orchestrate starten (UI oder REST) mit:

page = /produkte/glasbongs
container = hero
brand = GrowCologne
keywords = Glasbong,Growshop Dortmund
desc = Hero-Visual für Kategorie Glasbongs
preset = hero_photoreal
Workflow Schritte:
Prompt‑Meta wird generiert (inkl. ALT/SEO).
OpenAI Images generiert das Asset, sharp erzeugt JPG/WebP/AVIF (inkl. LQIP).
manifest.json wird erweitert.
content-linker aktualisiert content/images.json (Pfad/ALT/SEO).
create‑pull‑request erstellt den PR.
Review/merge PR → Bilder gehen in main, content/images.json ist aktuell → Frontend nutzt die Daten sofort.
Optional: Logos für Markenkarussell nachziehen (Workflow „Logos“) und im Frontend integrieren.

Troubleshooting

PR fehlt / keine Änderungen: Prüfe Actions‑Logs; ggf. wurden identische Dateien erzeugt → git commit ist „nothing to commit“.
OpenAI Fehler (429/5xx): Retries greifen automatisch; ggf. OPENAI_MAX_RETRIES erhöhen.
Transparenz erwartet, aber fehlt: Für echte Transparenz Edits mit background:'transparent' oder product_transparent/BG‑Removal nutzen.
Seeds/Konstanz: OpenAI Images hat kein garantiertes Seed‑Interface; wenn Serien absolut konstant sein müssen, plane einen Zweit‑Provider (Stability/FLUX) – der Code ist erweiterbar.

Anhänge
A) Wichtige NPM‑Scripts (aus package.json)
npm run gen:hero      # Beispiel Hero-Gen lokal
npm run gen:product   # Produkt-Edit (eigene Fotos in input/product)
npm run gen:logos     # Logo Cleanup/Vectorize (URL o. Pfad)
npm run gen:auto      # Prompt-Build + Image-Gen (lokal)

B) Umgebungsvariablen (.env.example)
OPENAI_API_KEY=your_openai_key
OPENAI_TIMEOUT_MS=180000
OPENAI_MAX_RETRIES=3
LOG_LEVEL=info
