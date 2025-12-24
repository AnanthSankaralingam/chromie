# chromie

### Next big features
1. Follow-up Conversation tooling: patches (prompt and util), linter verification, file replacement fallback. schemas and prefill
2. Conversation History. Don't need to store all but most recent convos would be useful.
3. CONNECTORS: reference Lovable, ChatGPT connectors. Probably MCP with auth but can save us a lot of templating solution time if we get it.
4. Auth in extensions. Experiment with OAuth (store JWT) vs. External providers. If OmniSpeech finds solution use it or implement Promptly Firebase solution.
5. Pricing in extensions. Explore ExtPay vs. Direct Stripe connection. Next feature after MVP would be to surface pricing metrics in dashboard.
6. metrics SDK and MVP usage data dashboard in chromie
7. Introduce "Ask" mode
8. Version history of extensions. Can do fuzzy Google Docs type
9. Branding: allow for user icon upload (verify size based on store requirements, allow only up to 5 and alias them icon-16, icon-48, etc. to fit with what we already have)
10. Security audit. Scan for risks before exporting (API keys, non-proxy or rate limited calls)

---
### TODOs
1. no hybrid ui types, i.e. popup + content injection
2. offline job for scraping api docs. live API expensive and sometimes times out (max 29s). add a profile to scraper.
3. migrate to sonnet 4.5 for coding. make easy client for model switching
4. conversation history (sliding window of 3 turns before reintroducing code as context)
5. samples to home page for easy forking - use for outreach. put easy samples on chrome store
6. Record videos from template extensions to reuse for future outreach.
7. store initial prompts for all projects, only description from manifest is saved right now.
8. templates can include small branding things like uninstallListeners


---
### BUGS
1. show projects section first on profile page.
2. shared links section not needed/working on /profile.
3. can't rename projects
4. WORKSPACE_AUTH_INSTRUCTIONS (commented out) but injected into all coding prompts. needs to be conditional

<br>
### SECURITY
1. Wrap SQL requests with safety measure
2. move all API calls (planning, coding) to a nextjs route or lambda function. ideally lambda/ec2 for security, .env file not impenetrable. can rotate API keys for security/centralized billing
3. sanitize all user inputs: prompt, URL, endpoints, etc. Also have maximum input lengths
4. minimize use of service role supabase, it bypasses RLS.

<br>
### Random
1. Upload your own extension/files?
2. dropdown to select a specific frontend type before code gen?
3. expand planning phase to multiple LLM calls and different purposes. this is probably the next big improvement. expand our use cases from frontend types into highlight -> action, newTab modifier, site blocker, etc.   

##### v1 demo: https://youtu.be/5807ieV35kU?si=VqQ-1LQymLrTEPAL

   













   
