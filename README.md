# chromie todo

Focus on actual platform usage, scalability and consumer features. We'll handle enterprise requests as they come.
Less focus on token costs and more on actual performance. 

P0:
1. ~scalable Metrics SDK: for chromie premium users~
2. ~10-15 templates for niche extenisons. The more we can match, the more robust/cheap our system gets.~
3. Deploy 5 public template extensions where users bring their API keys: ChatGPT/Claude in sidepanel, Speech to Text with Fireworks, etc. This is our main GTM

P1:

1. Follow up MOAT: Planning LLM call (similar to new ext), some basic context thinning too with selected files and method search. Either   
2. Explore major connectors: pricing (ExtPay, Stripe), database (Firebase). Leave them as "Coming Soon" if takes too long.
3. ~Blog/Case Studies. Minimal but effective for enterprise CTA~
4. Fix Google branding errors so we can do export to chrome. Privacy policy, branding, etc. (Ananth)
5. Gallery of chromie-built extensions:
6. ~Quick, basic, effective Puppeteer unit tests across different UI types (solid for popup rn)~

P2:
1. Detect build errors in extensions, similar to Vercel article.
2. Fix logging in tester and allow users to append them as context to next request.
3. Migrate to Vercel AI-SDK and remove our custom hooks/components. replace ui and service classes
4. ~Fix AI testing. Don't need anything complicated yet.~
5. Add more blog posts

P3 Scalablility: 
1. ~Fix CDN issues with Vercel~
2. Enable concurrency on backend
3. Explore offline extenison testing like Plasmo

P4:
1. Experiment with bundler
2. UI overhaul
3. Remove loading page's purple gradient
4. no hybrid ui types, i.e. popup + content injection
5. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.


Bugbash:
1. “Ask” mode
2.  Yield model thoughts (title, description hidden) like in Gemini UI
3.  Take out purple gradient from coder prompt
4.  Rest of "Bugs" section

---
### TODOs
1. no hybrid ui types, i.e. popup + content injection
2. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.
3. build reusable html components that coder can reference instead of re-building every time.
4. put easy samples on chrome store (i.e. ChatGPT in side panel)
5. Record videos from template extensions to reuse for future outreach.
6. store initial prompts for all projects, only description from manifest is saved right now.

---
### BUGS
1. show projects section first on profile page.
2. shared links section not needed/working on /profile.
3. can't rename projects
4. WORKSPACE_AUTH_INSTRUCTIONS (commented out) injected into all coding prompts. needs to be conditional.
5. Remove suggestions?
6. Remove loading page's purple gradient
7. API input has commonly hallucinated APIs (LinkedIn, YouTube, etc.). Add these to a list and statically remove them from final planning output if found.
8. often get random host_permissions. encourage one shot coder to use minimally. maybe API list is getting past planning phase even when user skips.
9. errors not yielded correctly in UI, giving user a place to go. especially with HB errors, should clearly explain what's wrong (i.e. manifest)
10. prompt_tokens is always extracted from gemini object as 0.
11. Long files (client secret keys, Firebase CDN) can be input into coder as raw content and mess up context.
12. Introduce "Ask" mode

---
### SECURITY
1. Wrap SQL requests with safety measure
2. move all API calls (planning, coding) to a nextjs route or lambda function. ideally lambda/ec2 for security, .env file not impenetrable. can rotate API keys for security/centralized billing
3. sanitize all user inputs: prompt, URL, endpoints, etc. Also have maximum input lengths
4. minimize use of service role supabase, it bypasses RLS.

---
### Random
1. Upload your own extension/files?
2. dropdown to select a specific frontend type before code gen?
3. templates can include small branding things like uninstallListeners
4. CONNECTORS: reference Lovable, ChatGPT connectors. Probably MCP with auth but can save us a lot of templating solution time if we get it.
5. tag certain files in the chat
6. Security audit. Scan for risks before exporting (API keys, non-proxy or rate limited calls)

   













   
