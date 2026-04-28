# chromie todo

launch lauch launch

---

## P0 
1. Adopt the Langchain or Harness library for code generation, probably our biggest win for reliability and production.
2. ~Output even clearer testing instructions (modals, AI responses, HB loading screens) and simplify Hyper browser setup as much as possible (improve setup speed).~
3. ~Instead of just emailing users once, create a five-step email campaign with an option to unsubscribe. Update evals repo amd Supabase to support this instead and we can run a script once a day instead of worrying about which user was last emailed.~
4. ~Update blogs and add gallery as preview to marketplace.~ Then, build out chromie marketplace with functionality for people to upload their extension (Chrome store links + YouTube video required) and we can advertise them.
5. Add AI Agent integrations to ClawdBot and browser use ASAP. Post as previews for now then launch Product Hunt and LinkedIn after.
6. Create chromie LLM endpoint. Most users ask for AI extensions, so a native endpoint instead won’t force them to upload API keys for testing. Generate each user an API key for our system automatically and wrap model providers.
7. Scale chromie.dev extension as marketing. Bring pricing in for it in later iterations
8. Update free tier to have daily credits or one week trial instead of only 10 credits.


---

## SECURITY

1. Wrap SQL requests with safety measures.
2. Move API calls to Next.js route or Lambda for key security.
3. Minimize use of service-role Supabase (keep these in external envs); enforce RLS.
4. Add API key rotation feature for internal services.

---