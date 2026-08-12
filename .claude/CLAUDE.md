# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Default token-efficient workflow:
- ALWAYS use Graphify as the first-pass tool for repo understanding, architecture questions, and dependency tracing.
- Prefer `graphify query`, `graphify path`, and `graphify explain` over broad grep or large file reads.
- Only fall back to raw file inspection when Graphify cannot answer the exact fact needed.
- After code changes, refresh the graph with `graphify update .`.
