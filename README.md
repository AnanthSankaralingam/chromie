# chromie todo

launch lauch launch

---

## P0 
1. Add read file tool to coder.
2. Add plan mode to followup conditionally. Dynamically classify difficult requests with existing file analysis flow.
3. Bring all tooling to follow up. 

---
## Bugs
1. upload extension bugs even with valid files
2. Template matching UI doesn't have any loading anymore with model thoughts or anything of that nature.
3. In deployment wizard, show category and tool section as well as the store icon, which is just the base 128 icon from the manifest.
4. Extension name when downloaded from deployment wizard doesn't have chromie-project-name prefix. 
---

## P1
1. Improve demo generation flow (record AI demo, provide downloadable `.mp4`).
2. Let followup agent use `grep` search tool.
3. explore bundler for extensions. Try out one and post
4.  potentially convert tech stack to something like Vite or Next.js. Use StackBlitz for building packages

---

## P2
1. Puppeteer tests always pass and aren't clearly explained to the user — clarify test logic, explain results, and provide transparent feedback to user.
---

## P3

1. Offline job for scraping API docs (handle timeouts, caching).
2. Add more blog posts and featured creations (gallery + preview).

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
