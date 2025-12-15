# chromie


### TODOs
1. no hybrid ui types, i.e. popup x content injection
2. offline job for scraping api docs. live API expensive and sometimes times out (max 29s)
3. migrate to sonnet 4.5 for coding. make easy client for model switching
4. conversation history (sliding window of 3 turns before reintroducing code as context)
5. samples to home page for easy forking - use for outreach. put easy samples on chrome store
6. store initial prompts for all projects, only description from manifest is saved right now.

<br>
### BUGS

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

   













   
