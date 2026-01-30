# chromie todo

Focus on getting production ready extensions to the store. we can't directly deploy yet due to google perms (waiting on approval again) but we can solve the problems there. lowkey ready to soft launch too.

---

### P0
1. Privacy policy creation is a big bottleneck in going to prod, for both google oauth and extensions. allow chromie to host them for user projects (wip ananth)
2. Generate brand images for production: Using extension icon and optionally the ext frontend (like sidepanel.html for example), generate images and resize them to Chrome Store requirements.
3. Brand assets: use Canva template with brand images (#2) and create a deck for users. Like image replacement on Google Slides template. If too hard can fade.

---

### P1
1. Add read file tool to coder, stress test scraping with intent in followups.
2. Allow users to generate icons, or select from shared icons table.
3. permission justification: use AI to read extension summary and fill in permissions needed to go to prod in Chrome Store.
4. Demo creation: automate demo creation with HB and Veo. We can record AI demoing the extension then make it flashy with video AI. Lowkey a product idea of its own too. Bottleneck is that user needs to post it and get a YT link themselves so we can only let them download .mp4 for foreseeable future.

---

### P2
1. Add more blog posts  
2. Add more featured creations + preview (either render the ext or simply play YT vid demo)

---

### P3
1. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.  
2. Create scraping with intent job for follow up requests
3. Add more blog posts  
4. Add more featured creations + preview (either render the ext or simply play YT vid demo)

---

### BUGS
1. 
---

### TODOs
1. ~store initial prompts for all projects, only description from manifest is saved right now.~  
2. ~tag specific files in the chat~  

---

### SECURITY
1. Wrap SQL requests with safety measure  
2. move all API calls (planning, coding) to a nextjs route or lambda function. ideally lambda/ec2 for security, .env file not impenetrable. can rotate API keys for security/centralized billing  
3. minimize use of service role supabase, it bypasses RLS.  

---

### Random
1. ~Upload your own extension/files?~  
2. dropdown to select a specific frontend type before code gen?  
3. CONNECTORS: reference Lovable, ChatGPT connectors. Probably MCP with auth but can save us a lot of templating solution time if we get it.  
4. Security audit for users feature: Scan for risks before exporting (API keys, non-proxy or rate limited calls)  
5. What's our SLA?

---

### ✅ Completed

#### P0
1. scalable Metrics SDK: for chromie premium users  
2. 10–15 templates for niche extensions. The more we can match, the more robust/cheap our system gets.  
3. Deploy 5 public template extensions where users bring their API keys: ChatGPT/Claude/etc. in sidepanel, Speech to Text with Fireworks, etc. This is our main GTM  

#### P1
1. Follow up MOAT: Planning LLM call (similar to new ext), some basic context thinning too with selected files and method search.  
2. Blog/Case Studies. Minimal but effective for enterprise CTA  
3. Fix Google branding errors so we can do export to chrome. Privacy policy, branding, etc. (Ananth)  
4. Gallery of chromie-built extensions? like blink.new  
5. integrate options.html pattern  
6. Quick, basic, effective Puppeteer unit tests across different UI types (solid for popup rn)  

#### P2
1. Detect HB errors in extension upload automatically.  
2. make logs easily appendable to the chat  
3. no hybrid ui types, i.e. popup + content injection  

#### P3
1. Unclear: what's the difference between icon upload and image upload to AI. Not every icon should be resized to all 4 sizes too, only main one.  
2. Patch applying for hunks sometimes fails, but still mostly working  
3. add /uninstall page for metrics users  

#### SECURITY
1. sanitize all user inputs: prompt, URL, endpoints, etc. Also have maximum input lengths  
2. Thoroughly validate uploaded extensions for size, file types, etc.  
