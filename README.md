# chromie todo

launch lauch launch

---

## P0 
1. Enable user to select front end type for new extensions if we're not confident. (ananth)
2. Add read file tool to coder. (ananth)
3. Create and stress test scraping with intent in followups. (ananth)
4. Allow agent to delete files safely

---

## P1
1. Improve testing UX: unify test results, logs, and explanations within testing browser view.
2. Improve demo generation flow (record AI demo, provide downloadable `.mp4`).
3. Let followup agent use `grep` search tool.

---

## P2

1. Stress test with popular use cases; confirm `options.html` and host permissions correctness.
2. Puppeteer tests always pass and aren't clearly explained to the user — clarify test logic, explain results, and provide transparent feedback to user.
---

## P3

1. Offline job for scraping API docs (handle timeouts, caching).
2. Add more blog posts and featured creations (gallery + preview).
3. Security audit feature for users before exporting extensions.

---

## SECURITY

1. Wrap SQL requests with safety measures.
2. Move API calls to Next.js route or Lambda for key security.
3. Minimize use of service-role Supabase (keep these in external envs); enforce RLS.
4. Add API key rotation feature for internal services.

---

## ✅ Completed (Archived)

### P0
- Privacy policy hosting for users.  
- Base template for common extension behaviors.  
- Universal log handling.  
- Testing clarity improvements (initial).  
- Deploy to Chrome Store walkthrough system.  
- Brand image generation for Chrome Store.  
- Canva template for brand decks.

### P1
- Icon generation.  
- Permission justification automation.  
- Demo creation base flow.

### P2
- API selection system.  

### P3
- Restart profile feature.  
- Copy prompt button.  
- Removed “here’s what I built for you” prefix.

### BUGS
- Fixed: No preview when `.md` files created.  
- Fixed: User could not delete or manually create files.  
- Fixed: Reloading builder page didn’t kill testing session.  
- Pending: `.chromie` folder visibility decision.

### SECURITY
- Sanitized all user inputs (prompt, URL, endpoints).  
- Validated uploaded extensions for size and file types.

---

## RANDOM / IDEAS

1. Dropdown to select a specific frontend type before code generation.
2. CONNECTORS: Reference Lovable, ChatGPT connectors. Possibly MCP with auth — could save templating time.
3. Security audit for users feature (scan for API keys, rate-limiting).
4. Define SLA for Chromie premium users.

---
