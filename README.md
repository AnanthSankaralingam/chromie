# chromie

##### v1 demo: https://youtu.be/5807ieV35kU?si=VqQ-1LQymLrTEPAL

TODOs
1. ~P0: billing - valid_until is 5 years in future~
2. ~update prompt mandatory fields based on prompt selection; ie side panel doesnt need popup empty files~
3. add styling
4. test product end to end, along with billing


Model SxSxSxSxS (gpt 4o vs claude haiku 3.5 vs gemini 2.5 pro vs gemini 2.5 flash vs deepseek-reasoner
use akshay-{model} branch and run "npm run dev" to test out each model, setting corresponding API key in env

| Prompt | 4o | haiku 3.5 | 2.5 pro | 2.5 flash | deepseek |
|-------|-------|-------|-------|-------|-------|
|  Develop a note-taking popup extension that allows users to quickly jot down thoughts, save links, and easily see their past notes. Include a generate summary button that creates a 2-3 sentence AI summary for the current page I'm looking at. Make it very interactive, stylish, and easy to use. |  Basic save button works, nothing else really. No organized record of past notes. Low quality, not visually appealing. Summary feature doesn't work, nor does it request user for API key.   |  Better than 4o. Slightly better UI, ability to save URL. Understands that summary generation requires API key, but does not provide way for user to enter it. Some buggy behavior.   |  D1   |  E1   |  F1   |
|  Create a calculator extension with basic and scientific functions, unit conversions, and calculation history  |  Disappointing. The trig and unit functions somewhat work, but can't do simple addition or clear values. UI is buggy. History does not work.   |  Disappointing. Shows a menu bar that lets you change between types (basic, scientific, conversion, history) but none of the functions actually work. UI is buggy. History does not work. |  D2   |  E2   |  F2   |
|  Create a simple to-do list extension that helps users track tasks and manage productivity directly from their browser toolbar | Decent. Expected due to simplicity of prompt. Includes simple delete and add functionality. |  Decent. Expected due to simplicity of prompt. Some of the buttons have non-english symbols on them, which is weird. But they let you do a strikethrough or delete completed items, which is good.     |  D3   |  E3   |  F3   |
|  Create a youtube video bookmarker extension   |  Bad. No overlay/button injection. After clicking popup and including details, it says saved, but cannot see saved anywhere.   |  Bad. No overlay/button injection. After clicking popup and including details, it says saved, but cannot see saved anywhere.   |  D4   |  E4   |  F4   |
|  A5   |  B5   |  C5   |  D5   |  E5   |  F5   |





Security TODOs
1. move all API calls (fireworks, openai) to a nextjs route or lambda function. ideally lambda/ec2 for security, don't think .env file is impenetrable.

Optimizing TODOs
1. cache files in builder while a session is in progress. upsert to db but don't repeatedly fetch. might be solved with chat history
2. cache billing plan and token limit checks in generate to minimize calls to supabase 
3. separate all validations that go on in generate to different files 
4. update project metadata only once - unnecessary to continually update supabase with this. user can do from /profile 
5. Parallelize the project creation and display frontend first when generating new extension (ananth)
6. ~summarize conversation history based on context window. if we use reasoning model we'll either hit window limits or performance degredation after around 5 turns.~
7. all users share the generic chromie icons, but supabase populates them by project id in code_files so there's hella duplicates of all icons. need a way to share these between all projects in code_files table.
   

   













   
