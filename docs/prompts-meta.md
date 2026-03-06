# Prompt display names and descriptions (meta JSON)

The Admin Dashboard (Simulation Studio → Scenario Prompts) shows each prompt’s **name** and **description**. Those values can be defined in the codebase via optional **`.meta.json`** files, so they appear clearly in the UI without editing in the dashboard.

## Where meta JSON lives

Meta files are **not** in ally-web. They live next to the prompt `.txt` files in:

- **ally-be:** `src/prompts/<subdir>/_meta/<stem>.meta.json`
- **ally-ai-learn:** `app/prompts/<subdir>/_meta/<stem>.meta.json`

For each prompt file `subdir/<stem>.txt`, the corresponding meta file is:

```
subdir/_meta/<stem>.meta.json
```

Example: prompt `openai_translation/guardrail_translation.txt` → meta `openai_translation/_meta/guardrail_translation.meta.json`.

## Schema

Each `.meta.json` is a JSON object with optional keys:

| Key           | Type   | Description                                      |
| ------------- | ------ | ------------------------------------------------ |
| `name`        | string | Display name shown in the dashboard list/header. |
| `description` | string | Short description shown in the dashboard.        |

If a key is missing or empty, the backend falls back to a path-derived label (e.g. from `subdir_filename`).

**Example:**

```json
{
  "name": "Guardrail Translation",
  "description": "Localizes conversational guardrails for role-play into natural spoken language. Preserves JSON structure and Markdown."
}
```

## How the dashboard gets name/description

1. **ally-be:** On app startup, `PromptsSyncService` scans `src/prompts/`, reads each `.txt` and, when present, the matching `_meta/<stem>.meta.json`. It syncs to the database (add new prompts; for existing, update `defaultPrompt`, `name`, `description`). The dashboard then loads prompts via `GET /api/v1/prompts` and displays the stored `name` and `description`.
2. **ally-ai-learn:** The script `scripts/sync_prompts.py` scans `app/prompts/`, reads each `.txt` and, when present, the matching `_meta/<stem>.meta.json`. It sends the payload to ally-be’s `POST /api/v1/prompts/sync`, which updates the same DB. So ally-ai-learn prompts also show up in the dashboard with the names and descriptions from their meta files.

## Important

- **Prompt content (body)** edited in the dashboard is **not** overwritten by sync; only the codebase default is updated. **Name and description** are overwritten on every sync, so any custom name/description should be maintained in the repo via `.meta.json` (or accepted as reset on deploy).
- Adding or changing a `.meta.json` only takes effect after the next sync (ally-be startup or ally-ai-learn sync script run). The dashboard always shows what is currently in the database.

## References

- **ally-be:** Central docs: `ally-be/docs/prompts-folder.md` (prompt folder, naming, meta JSON), `ally-be/docs/prompts-api.md` (API for the dashboard and sync).
- **ally-ai-learn:** Sync script and meta: `ally-ai-learn/scripts/sync_prompts.py` (docstring and `load_meta()`).
