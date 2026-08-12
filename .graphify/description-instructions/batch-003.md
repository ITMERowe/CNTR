# Node Description Batch 4 of 4

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the prompt below and write
your JSON answer to the answer file.

## Prompt

You are documenting nodes in a knowledge graph.
For each entry below, write ONE concise factual plain-language sentence
describing what it is or does. Use only the provided context.
For a code symbol (kind=code-symbol — a function, class, or constant),
describe what the function/symbol does based on its name, source location
and neighbors — e.g. "Resolves the configured ontology profile from graphify.yaml.".
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "src_main_saveproducthistory": "saveProductHistory()" | kind=code-symbol | source=src/main.ts:L105 | neighbors=[main.ts]
- "src_main_settingscompacttoggle": "settingsCompactToggle" | kind=code-symbol | source=src/main.ts:L1951 | neighbors=[main.ts]
- "src_main_settingscurrencyselect": "settingsCurrencySelect" | kind=code-symbol | source=src/main.ts:L1950 | neighbors=[main.ts]
- "src_main_shade": "shade()" | kind=code-symbol | source=src/main.ts:L718 | neighbors=[main.ts]
- "src_main_toggleoptionsmenu": "toggleOptionsMenu()" | kind=code-symbol | source=src/main.ts:L1684 | neighbors=[main.ts]
- "src_main_tx": "tx" | kind=code-symbol | source=src/main.ts:L78 | neighbors=[main.ts]
- "vite_config": "vite.config.ts" | kind=code-symbol | source=vite.config.ts:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\User\Downloads\The Hub\CNTR\.graphify\description-instructions\batch-003.json

Keep each description factual and concise (one sentence). No markdown, no prose
outside the JSON object. It is acceptable to omit a node if context is
insufficient — but include every node you can ground confidently.

Example answer format:
```json
{
  "node_id_1": "Resolves the configured ontology profile from graphify.yaml.",
  "node_id_2": "Colonel James Barclay, an antagonist in The Crooked Man."
}
```
