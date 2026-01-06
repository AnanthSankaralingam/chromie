# chromie

P-1:
1. Outreach
   
P0:
1. ~Prompt engineer that tailors user ideas to a predefined format to match planner expectations~
2. metrics platform (look at how orchids did it)
3. ~templates for planner (convert new req to add to existing w/ patch)~
4. ~Clear conversation button~

P1:

1. FOLLOW UP STUFF:

~Add image input for just patches ("copy this UI use case")~

Develop moat for add to existing patches by creating streamlined planner w/ tool calls

Todos for follow ups

2. Pricing in extensions. Explore ExtPay vs. Direct Stripe connection. Next feature after MVP would be to surface pricing metrics in dashboard.
3. ai within extension (nanobrowser as a use case template and also as a tool within reg exts)
4. ~Fork your own project~

P5:
1. Experiment with bundler
2. UI overhaul
3. Remove loading page's purple gradient
4. no hybrid ui types, i.e. popup + content injection
5. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.
6. Put easy samples on Chrome store w/ demo videos (put in "featured creations" page on website)


Bugbash:
1. “Ask” mode
2.  Yield model thoughts (title, description hidden) like in Gemini UI
3.  Take out purple gradient from coder prompt
4.  Rest of "Bugs" section






### Next big features
1. ~Follow-up Conversation tooling: patches (prompt and util), linter verification, file replacement fallback.~ schemas and prefill?
2. ~Conversation History. Store most recent convo and expire within 2 hrs no usage; store user queries and model explanation response (no code). final query includes codebase current state.~ expire sooner than 2 hrs?
3. ~Branding: allow for user icon upload (verify size based on store requirements, allow only up to 5 and alias them icon-16, icon-48, etc. to fit with what we already have)~ Auto re-size icons if needed.
4. Auth in extensions. Experiment with OAuth (store JWT) vs. External providers. If OmniSpeech finds solution use it or implement Promptly Firebase solution.
5. Pricing in extensions. Explore ExtPay vs. Direct Stripe connection. Next feature after MVP would be to surface pricing metrics in dashboard.
6. metrics SDK and MVP usage data dashboard in chromie
7. ~Version history of extensions. Can do fuzzy Google Docs type or just allow for reverting to a certain point in conversation.~
8. Yield model thoughts (title, description hidden) how Gemini UI does it. 

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

   













   
