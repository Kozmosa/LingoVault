# Article Import Design

## Overview
The Smart Import view now exposes a target selector with two options:
- **📚 Words** keeps the original CSV/JSON mapping flow.
- **📝 Reference Essay** routes the pasted text through the new article pipeline described below.

The selector lives above the raw input field in SmartImport.tsx. Changing the selection clears previous plans, counts, and errors so the UI always reflects the active mode.

## AI Workflow
1. **Draft extraction** – `buildEssayImportResult()` calls a provider-agnostic prompt that requests JSON containing `structureComplete`, `formatIssuesDetected`, `title`, and `content`.
2. **Title inference** – if the draft returns content but no title, a second prompt infers a likely title. When this succeeds the UI reports `titleRestored = true`.
3. **Format repair** – when `formatIssuesDetected` is true, a third prompt rewrites the essay to fix spacing, punctuation, and stray line breaks. Performing this step toggles `formatFixed = true`.
4. **Result packaging** – the helper returns `{ structureComplete, formatFixed, titleRestored, title, content }`, which the component pairs with metadata (`id`, `createdAt`, `source`, `rawInput`).

All prompts require JSON-only responses and support Gemini, OpenAI-compatible, and Anthropic providers through the existing `executeProviderRequest` abstraction.

## Persistence
Essay outputs are stored separately from word data to avoid collisions:
- **Key**: `lingovault_essays`
- **Shape** (`EssayRecord`):
  ```json
  {
    "id": "uuid",
    "createdAt": 1712345678901,
    "source": "import-250402-1045",
    "rawInput": "pasted text",
    "structureComplete": true,
    "formatFixed": false,
    "titleRestored": true,
    "title": "Campus Volunteering",
    "content": "Cleaned essay body"
  }
  ```

Records are prepended so the latest extraction appears first. Failures to parse or write data are logged but do not block the UI.

## Error Handling
- When the AI cannot find essay content it throws `essay_content_missing`; the UI surfaces `essayImportMissingContent`.
- Any other error during essay mode surfaces `essayImportError`.
- Word mode retains the previous CSV/JSON validation flow.

## UI Output
Successful essay imports show a summary card with:
- Boolean badges for structure, format repair, and title restoration.
- The resolved title (or "Untitled essay" placeholder).
- The cleaned essay body rendered with preserved line breaks.

This output gives immediate feedback without affecting the word vault list.
