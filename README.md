# chromie

##### v1 demo: https://youtu.be/5807ieV35kU?si=VqQ-1LQymLrTEPAL

### TODOs
P0 <br>
1. Persistent sessions in hyperbrowser https://docs.hyperbrowser.ai/sessions/profiles
2. fix schema mandatory fields so generic extensions don't generate empty files
3. auto pin extension at start
4. suggest prompts to users at start. maybe survey or prompt library, something like "Extensions for marketers"

P1 <br>
1. testing modal doesnt work after restart (second session)
2. when puppeteer fails, button state doesnt update and user can't retry
3. test product end to end, along with billing
4. functionality to publish extensions directly to chrome web store (when unblocked)
5. ace follow up conversation: ask LLM for git diffs rather than all code rewritten - will save context and tokens
6. dropdown to select a specific frontend type before code gen?
7. Upload your own extension/files?

P2. <br>
1. integrate custom APIs (verify)
2. integrate google oauth apis

### BUGS
1. API modal doesn't complete code gen when used. Also is not extremely clear for users
2. Browser session for a second run doesn't work. Once the 3 minutes are up, even if the user has more total_minutes, they can't start a new session successfully
3. token tracking is not updating even though logs say they are
4. icons arent always downloaded to the extension.
5. project limits are not correctly enforced. free user can build up to 3 projects
6. UX: chromie as default icon for extensions, auto-submit prompt after sign up 



<br><br>
### Model Comparison (gpt 4o vs claude haiku 3.5 vs gemini 2.5 pro vs gemini 2.5 flash vs deepseek-reasoner
TODO: try o3 with low temperature, sonnet 4.5, gpt4.1, deepseek-coder ...

use akshay-{model} branch and run "npm run dev" to test out each model, setting corresponding API key in env

Notes:
- Gemini models have thinking by default: https://ai.google.dev/gemini-api/docs/quickstart#thinking_is_on_by_default_on_many_of_our_code_samples
- Context limit for free tier on 2.5 pro will probably be an issue (definitely the move if we can shorten prompt)
- 2.5 flash might be the move too, slightly worse on average but much cheaper. Still very good though, outperforms 2.5 pro in some cases. However, slower response time than expected - need to optimize.
  
| Prompt | 4o | haiku 3.5 | 2.5 pro | 2.5 flash | deepseek |
|-------|-------|-------|-------|-------|-------|
|  Develop a note-taking popup extension that allows users to quickly jot down thoughts, save links, and easily see their past notes. Include a generate summary button that creates a 2-3 sentence AI summary for the current page I'm looking at. Make it very interactive, stylish, and easy to use. |  Basic save button works, nothing else really. No organized record of past notes. Low quality, not visually appealing. Summary feature doesn't work, nor does it request user for API key.   |  Better than 4o. Slightly better UI, ability to save URL. Understands that summary generation requires API key, but does not provide way for user to enter it. Some buggy behavior.   |  Lowkey pretty slow. Fire though. Cleaner UI, all the functionality works (save pages, save links, generate summary (questionable just scrapes page). Response, not buggy.   |  Aside from bad UI, this was probably the best response. Included clear place to input API key, recognized that it was needed for the summary task. Other functionality works well. <img width="302" height="477" alt="image" src="https://github.com/user-attachments/assets/3a92c498-ad0b-4689-a827-d7d662256bc5" /> Very descriptive explanation. <img width="457" height="712" alt="image" src="https://github.com/user-attachments/assets/18fe7093-15ae-44c5-ab39-ef568162bbe4" /> |  F1   |
|  Create a calculator extension with basic and scientific functions, unit conversions, and calculation history  |  Disappointing. The trig and unit functions somewhat work, but can't do simple addition or clear values. UI is buggy. History does not work.   |  Disappointing. Shows a menu bar that lets you change between types (basic, scientific, conversion, history) but none of the functions actually work. UI is buggy. History does not work. |  Almost perfect. Everything works except primitive operations for some reason (+, -, *, /). Trig operations and unit conversions work great, and UI is super clean.  |  Interesting. Only one with working history. Bad UI however and some of the buttons are not English. <img width="165" height="214" alt="image" src="https://github.com/user-attachments/assets/ac0ec847-746f-4c88-a0cd-579961f231cb" /> |  F2   |
|  Create a simple to-do list extension that helps users track tasks and manage productivity directly from their browser toolbar | Decent. Expected due to simplicity of prompt. Includes simple delete and add functionality. |  Decent. Expected due to simplicity of prompt. Some of the buttons have non-english symbols on them, which is weird. But they let you do a strikethrough or delete completed items, which is good.     |  Perfect. Went above and beyond, even spawned icons somehow. <img width="307" height="187" alt="image" src="https://github.com/user-attachments/assets/16553f3a-931b-45a3-bcf3-e22611fd3a08" /> |  Great. All features work properly.   |  F3   |
|  Create a youtube video bookmarker extension   |  Bad. No overlay/button injection. After clicking popup and including details, it says saved, but cannot see saved anywhere. Didn't trigger input website tool call for some reason.  |  Bad. No overlay/button injection. After clicking popup and including details, it says saved, but cannot see saved anywhere. Didn't trigger input website tool call for some reason.  |  About time this extension worked again. <img width="619" height="333" alt="image" src="https://github.com/user-attachments/assets/abacc950-3b96-48eb-b76c-c6f27256e637" /> Fire explanation, and makes a "YouTube Bookmarks" folder in chrome too. <img width="466" height="485" alt="image" src="https://github.com/user-attachments/assets/3616bd02-fe1b-483c-93e2-51f7ac7cb9c8" />  <img width="949" height="563" alt="IMG_8992" src="https://github.com/user-attachments/assets/41ae3ab8-4838-4eee-9630-653653c5d94e" /> Tried it again as shown above, great injection of the button. Icons not loading, but can easily fix. Doesn't let you type, but also fixable. |  Incredible. Fully functional, best one so far. <img width="1284" height="692" alt="image" src="https://github.com/user-attachments/assets/4e207dfd-fcf6-4c21-9a8e-83b06d748cf6" /> |  F4   |
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
   

   













   
