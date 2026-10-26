## Session handoff

- At the start of every session, read `HANDOFF.md` before making changes. If it does not exist, create it.
- Keep it updated at the end of each session, after significant milestones, and whenever a blocker or important decision comes up: goal and current task, current state, files touched, decisions, failures/blockers, next steps, verification.
- Record only verified results; mark anything unverified as such, and never drop unresolved issues to make work look complete. If the handoff conflicts with the code, check the code and correct the handoff.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
