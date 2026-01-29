# chromie todo

Focus on actual platform usage, scalability and consumer features. We'll handle enterprise requests as they come.
Less focus on token costs and more on actual performance. 

P0:
1. ~scalable Metrics SDK: for chromie premium users~
2. ~10-15 templates for niche extenisons. The more we can match, the more robust/cheap our system gets.~
3. Deploy 5 public template extensions where users bring their API keys: ChatGPT/Claude/etc. in sidepanel, Speech to Text with Fireworks, etc. This is our main GTM

P1:
1. ~Follow up MOAT: Planning LLM call (similar to new ext), some basic context thinning too with selected files and method search.~ Add read file tool to coder, stress test scraping.   
2. ~Blog/Case Studies. Minimal but effective for enterprise CTA~
3. ~Fix Google branding errors so we can do export to chrome. Privacy policy, branding, etc. (Ananth)~
4. ~Gallery of chromie-built extensions? like blink.new~
5. ~integrate options.html pattern~
6. ~Quick, basic, effective Puppeteer unit tests across different UI types (solid for popup rn)~

P2:
1. ~Detect HB errors in extension upload automatically. If it's an extension error, instantly debug. For example, if coder hallucinates icons, run an auto fixer to match most similar icon. Or simply tell followup error and ask it to debug.~
2. ~make logs ***easily appendable*** to the chat~ 
3. ~no hybrid ui types, i.e. popup + content injection~
4. Add more blog posts
5. Add more featured creations + preview (either render the ext or simply play YT vid demo)

P3:
1. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.
2. Create scraping with intent job
3. Unclear: what's the difference between icon upload and image upload to AI. Not every icon should be resized to all 4 sizes too, only main one.
4. Patch applying for hunks sometimes fails, but still mostly working
5. add /uninstall page for metrics users
6. Explore major connectors: pricing (ExtPay, Stripe), database (Firebase). Leave them as "Coming Soon" if takes too long.

P4 Scalablility: 
1. Enable concurrency on backend. What's our SLA?

---
### BUGS
1. when users have multiple extensions built and a consistent profile, the Hyperbrowser instance loads multiple extensions, I think. When I have a new tab extension in another project, it sometimes interferes with my current testing. local storage is also persisted
2. WORKSPACE_AUTH_INSTRUCTIONS (commented out) injected into all coding prompts. needs to be conditional.
3. user can't open code while code is generating
4. ~often get random host_permissions. encourage one shot coder to use minimally.~ Move API requirements to its own LLM call, don't group it
5. ~prompt_tokens is always extracted from gemini object as 0.~
6. Long files (client secret keys, Firebase CDN) can be input into coder as raw content and mess up context.

---
### TODOs
1. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.
2. build reusable html components that coder can reference instead of re-building every time.
3. ~store initial prompts for all projects, only description from manifest is saved right now.~
4. tag specific files in the chat
---
### SECURITY
1. Wrap SQL requests with safety measure
2. move all API calls (planning, coding) to a nextjs route or lambda function. ideally lambda/ec2 for security, .env file not impenetrable. can rotate API keys for security/centralized billing
3. sanitize all user inputs: prompt, URL, endpoints, etc. Also have maximum input lengths
4. minimize use of service role supabase, it bypasses RLS.
5. Thoroughly validate uploaded extensions for size, file types, etc.

---
### Random
1. ~Upload your own extension/files?~
2. dropdown to select a specific frontend type before code gen?
3. templates can include small branding things like uninstallListeners
4. CONNECTORS: reference Lovable, ChatGPT connectors. Probably MCP with auth but can save us a lot of templating solution time if we get it.
6. Security audit. Scan for risks before exporting (API keys, non-proxy or rate limited calls)
7. I used the conditional context upload for the followups, and one of the files didn't exist in the recommended context. It wasn't passed in as a file to the coder, but the coder still managed to edit that file as needed. Is there persistent memory going on between API calls that we don't know about?
   













   
