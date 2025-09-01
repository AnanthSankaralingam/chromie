# chromie

TODOs
1. local updates to extension code --> minimal saves (updates to supabase)
2. follow up prompts: fix add_to_existing prompt, git diff, effectively add changes/engineer context, update hooks in builder with last convo id (ananth)
3. encourage comments in new_ext prompt
4. Testing extension needs a way to just render html files
5. Testing extension side by side view needs option to focus on one. browser testing shouldn't be assumed.
6. display project names on builder page
7. after purchasing a plan, a user's current token usage and monthly_reset should reset to 0.
8. move all API calls (fireworks, openai) to a nextjs route or lambda function. ideally lambda/ec2 for security, don't think .env file is impenetrable.
9. stream code gen and thinking responses from openai and display snippets in frontend. bad ux if nothing in between. for followup and init reqs.
10. frontend shouldn't disable the text box when code is generating, only send button.
   

Optimizing TODOs
1. cache files in builder while a session is in progress. upsert to db but don't repeatedly fetch. might be solved with chat history
2. cache billing plan and token limit checks in generate to minimize calls to supabase 
3. separate all validations that go on in generate to different files 
4. update project metadata only once - unnecessary to continually update supabase with this. user can do from /profile 
5. Parallelize the project creation and display frontend first when generating new extension (ananth)
6. summarize conversation history based on context window. if we use reasoning model we'll either hit window limits or performance degredation after ~5 turns.
7. all users share the generic chromie icons, but supabase populates them by project id in code_files so there's hella duplicates of all icons. need a way to share these between all projects in code_files table.
   

   













   
