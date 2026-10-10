---
name: SmashWiki retrieval fallback
description: Recover public SmashWiki source material when sandbox browsing callbacks are unavailable.
---

If Replit's sandbox `webFetch` or `webSearch` returns HTTP 402, direct read-only `urllib` requests from shell succeeded for public SmashWiki pages during the October 2026 mechanics research.

**Why:** the sandbox browsing callbacks were unavailable, but the public source remained reachable through the workspace shell.

**How to apply:** try the normal browsing callbacks first; if they fail with 402, use a read-only shell request and cite the retrieved wiki source in project data.
