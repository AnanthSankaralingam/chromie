# Chromie dashboard — agent guidance

## Persisted browser login (Browserbase Contexts)

If a feature or page (including future ones like a `chromie.dev/new` onboarding/automation
flow) needs a workflow to **stay logged into a third-party site across scheduled runs**, it
must use a Browserbase persisted **Context**. Detailed guidance is in
`.cursor/rules/browserbase-persisted-context.mdc`; read it before building such a feature.

Two things that silently break persistence:
- **Recreating the context per run/save.** Provision exactly ONE stable id per automation
  (`ensureBrowserbaseContextId` / `createBrowserbaseContext`) and store it on
  `automations.browserbase_context_id`.
- **Treating "context created" as "logged in."** A new context is an empty cookie jar; it is
  not authenticated until a human completes the first login once in Live View.

Reliability (IP/fingerprint pinning, captcha handling, `/login`→dashboard reload) is handled
runner-side — see the `chromie-runner` / `chromie-tools` rules; don't reinvent it here.
