# chromie

TODOs
1. use response id for continued conversation. do not update supabase with it yet. (ananth)
2. render html in editor
3. test and use o3, sonnet, etc. (o3 better at complex reasoning, seems to overengineer a lot though - doing some linear algebra for UI element placement)
4. auto completions/suggestions for home page prompt input (akshay - done, can revise list)

Security TODOs
1. move all API calls (fireworks, openai) to a nextjs route or lambda function. ideally lambda/ec2 for security, don't think .env file is impenetrable.

Optimizing TODOs
1. cache files in builder while a session is in progress. upsert to db but don't repeatedly fetch. might be solved with chat history
2. cache billing plan and token limit checks in generate to minimize calls to supabase 
3. separate all validations that go on in generate to different files 
4. update project metadata only once - unnecessary to continually update supabase with this. user can do from /profile 
5. Parallelize the project creation and display frontend first when generating new extension (ananth)
6. summarize conversation history based on context window. if we use reasoning model we'll either hit window limits or performance degredation after ~5 turns.
7. all users share the generic chromie icons, but supabase populates them by project id in code_files so there's hella duplicates of all icons. need a way to share these between all projects in code_files table.
   

   













   
