# Extension Generation Unit Economics

Cost to generate a single new Chrome extension, based on typical token usage.

## Token Usage (per extension)

| Phase | Model | Input Tokens | Output Tokens |
|-------|-------|--------------|---------------|
| **Planning Orchestrator** | Claude Haiku 4.5 | 2,000 | 200 |
| **Meta Planner** | Claude Sonnet 4.5 | 2,500 | 1,500 |
| **Manifest** | Fireworks K2 / Gemini 3 Flash | 1,500 | 2,000 |
| **Content Scripts** | Fireworks K2 / Gemini 3 Flash | 2,000 | 6,000 |
| **HTML (×2)** | Fireworks K2 / Gemini 3 Flash | 4,000 | 8,000 |
| **HTML JS (×2)** | Fireworks K2 / Gemini 3 Flash | 6,000 | 10,000 |
| **CSS** | Fireworks K2 / Gemini 3 Flash | 4,000 | 4,000 |
| **Background JS** | Fireworks K2 / Gemini 3 Flash | 3,000 | 4,000 |
| **Executors total** | | **20,500** | **34,000** |

## Pricing (per 1M tokens, USD)

| Provider | Input | Output |
|----------|-------|--------|
| Fireworks K2 | $0.60 | $3.00 |
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Gemini 3 Flash | $0.50 | $3.00 |

## Cost Breakdown

### Planning Phase (Claude)
- Planning Orchestrator: (2,000 × $1 + 200 × $5) / 1M = **$0.003**
- Meta Planner: (2,500 × $3 + 1,500 × $15) / 1M = **$0.030**
- **Planning subtotal: ~$0.033**

### Executors (Fireworks K2)
- 20,500 input × $0.60 + 34,000 output × $3.00 = **$0.114**
- **Executors subtotal: ~$0.114**

### Executors (Gemini 3 Flash)
- 20,500 input × $0.50 + 34,000 output × $3.00 = **$0.112**
- **Executors subtotal: ~$0.112**

## Total Cost per Extension

| Executor Provider | Total Cost |
|-------------------|------------|
| **Fireworks K2** | **~$0.15** |
| **Gemini 3 Flash** | **~$0.145** |

## Follow-Up Generation

Follow-ups use patch-based output (diffs) instead of full file re-generation, reducing output tokens significantly.

| Follow-up complexity | Est. cost | User credits |
|----------------------|-----------|--------------|
| Trivial (e.g. color change) | ~$0.02 | 1 |
| Medium (e.g. add tooltip) | ~$0.05 | 1 |
| Large (e.g. add auth flow) | ~$0.10 | 1 |
| **Range** | **$0.02 – $0.10** | 1 |

## Branding (Icon & Asset Generation)

Icon and brand asset generation use **Gemini 2.5 Flash Image**. Each costs the user **3 credits** (IMAGE_GENERATION).

| Asset | Model | Est. cost | User credits |
|-------|-------|-----------|--------------|
| **Icon** (1:1) | Gemini 2.5 Flash Image | ~$0.04 | 3 |
| **Brand image** (16:9) | Gemini 2.5 Flash Image | ~$0.04 | 3 |
| **Upload** (Supabase storage) | — | negligible | — |

- Gemini 2.5 Flash Image: ~$0.039 per image (1,290 output tokens, $30/1M)
- Upload: Storage/bandwidth typically negligible on Supabase plans

## Browser Testing (Hyperbrowser)

Each "try it out" session costs the user **1 credit**. Chromie pays Hyperbrowser for the underlying session.

| Item | Hyperbrowser pricing | Chromie cost |
|------|---------------------|--------------|
| **Plan** | $30/month | — |
| **Credits** | 30,000 credits | $0.001/credit |
| **Test sessions** | 100 credits/hour | ~$0.005/session (3 min) |
| **Scrape** | 1 credit/page | ~$0.001/page (caching reduces effective cost) |

- Session duration: ~3 minutes max
- 3 min session ≈ 5 Hyperbrowser credits → **~$0.005 per user testing session**
- Scrape: 1 credit/page; caching lowers actual usage

## Unit Economics Summary

| Operation | User credits | Est. cost |
|-----------|--------------|-----------|
| Initial generation | 3 | ~$0.15 |
| Follow-up generation | 1 | $0.02 – $0.10 |
| Icon / brand generation | 3 | ~$0.04 |
| Browser testing | 1 | ~$0.005 |

- **Pro plan**: $9.99/month, 500 credits
- **Blended example** (1 initial + 5 follow-ups + 3 tests): 3 + 5 + 3 = 11 credits, cost ≈ $0.15 + 5×$0.05 + 3×$0.005 ≈ **$0.42**
- **Cost per credit** (this mix): ~$0.038
