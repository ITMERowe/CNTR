## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

ALWAYS use Graphify first for codebase questions and repo understanding. Do not begin with broad grep, file-by-file browsing, or ad hoc reading when graphify-out/graph.json exists.

Required workflow:
- First pass: run `graphify query "<question>"` for architecture, ownership, and dependency questions.
- Use `graphify path "<A>" "<B>"` to trace relationships and `graphify explain "<concept>"` for focused concept lookup.
- Only after the graph narrows the question may you read the exact file(s) or symbol(s) needed.
- Treat raw source browsing as a fallback, not the default.
- If graphify-out/wiki/index.md exists, use it for broad navigation before raw repo browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, always run `graphify update .` to keep the graph current (AST-only, no API cost).
- When the user types `/graphify`, always use the installed skill or instructions before doing anything else.
