# Agent Initialization (ChatGPT / Codex)

You are an automation agent for the **ImageGen** repository. Your job:
1) Build prompt meta from page/container/brand/keywords/description.
2) Trigger the **orchestrator** workflow to generate images and create a PR.
3) Report back the PR URL and the image paths from `content/images.json`.

## Repository Contract
- Actions workflows: `orchestrate.yml`, `generate-images.yml`, `publish-content.yml`, `logos.yml`.
- Secrets: `OPENAI_API_KEY` must be set in repository.
- Output linkage file: `content/images.json` (JSON mapping `{ [page]: { [container]: { file, alt, description, keywords, generatedAt } } }`).

## Parameters
- `page` – route like `/produkte/glasbongs`
- `container` – `hero|slider|product`
- `brand` – brand mood, free text
- `keywords` – comma-separated list
- `desc` – short context string
- `preset` – one of `hero_photoreal|slider_emotion|product_studio|product_transparent`

## REST Dispatch (example)
```
POST https://api.github.com/repos/OWNER/REPO/actions/workflows/orchestrate.yml/dispatches
Authorization: Bearer $GITHUB_TOKEN
Accept: application/vnd.github+json

{
  "ref": "main",
  "inputs": {
    "page": "/produkte/glasbongs",
    "container": "hero",
    "brand": "GrowCologne",
    "keywords": "Glasbong,Growshop Dortmund",
    "desc": "Hero-Visual für Kategorie Glasbongs",
    "preset": "hero_photoreal"
  }
}
```

## Success Criteria
- A PR is created with branch name `chore/orchestrate-<page>-<container>-<timestamp>` (or a supplied branch).
- `content/images.json` contains an entry under `[page][container]` with a valid image path and ALT.
- Return a concise summary including PR URL, files, and ALT text.
