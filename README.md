# chromie

##### v1 demo: https://youtu.be/5807ieV35kU?si=VqQ-1LQymLrTEPAL

### TODOs

### BUGS
1. no hybrid ui types: popup x content injection


### SECURITY
1. "See" feature needs to check for malicious additions before running html in frontend
2. Wrap SQL requests with safety measure
3. move all API calls (fireworks, openai) to a nextjs route or lambda function. ideally lambda/ec2 for security, don't think .env file is impenetrable.
4. ensure code_files for a project always renders a manifest.json, prevent hallucinations/mishandling of files
5. sanitize all user inputs: prompt, URL, endpoints, etc.
6. minimize use of service role supabase, it bypasses RLS.

### Random
1. Upload your own extension/files?
2. dropdown to select a specific frontend type before code gen?
3. expand planning phase to multiple LLM calls and different purposes. this is probably the next big improvement. expand our use cases from frontend types into highlight -> action, newTab modifier, site blocker, etc.   

   













   
