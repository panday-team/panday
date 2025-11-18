# Q&A Operations Guide

This doc explains how to run the three cron-style endpoints that maintain the chat-based FAQ system: extraction, clustering, and FAQ generation. Use these commands whenever you need to refresh Q&A insights from support chats or investigate issues in the pipeline.

## Prerequisites

- Dev server running on `http://localhost:3000`
- `.env` configured with `CRON_SECRET`
- Auth header for every request: `Authorization: Bearer $CRON_SECRET`
- Postgres container/services running so Prisma writes succeed (`bun run services:start` or `docker compose up -d postgres`)

## 1. Extract chat sessions into Q&A pairs

Endpoint: `/api/cron/extract-qas`  
Source: `src/app/api/cron/extract-qas/route.ts`

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/extract-qas
```

What it does:

- Finds `ChatSession`s with messages but no `QAPair`s
- Streams transcripts through the LLM to create structured question/answer pairs
- Persists user and assistant messages in `QAPair` records
- Marks the session `endedAt` once processed

Troubleshooting:

- If you see “Extractor model call failed”, verify `OPENAI_API_KEY`/provider envs and rerun.
- The route returns `{ sessionsProcessed, totalPairs }`; if `sessionsProcessed` is `0`, there were no idle sessions eligible for extraction.

## 2. Generate embeddings and cluster similar Q&As

Endpoint: `/api/cron/cluster-qas`  
Source: `src/app/api/cron/cluster-qas/route.ts`

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/cluster-qas
```

What it does:

- Automatically assigns any uncategorized pairs (`categoryId = null`) to the fallback **Global** category so they can participate in clustering
- Embeds up to 25 unembedded `QAPair`s via `text-embedding-3-small`
- Samples up to 200 eligible pairs and groups any whose cosine similarity ≥ 0.88
- Assigns a shared `clusterId` to each grouped set

Troubleshooting:

- If `globalAssignments` is `0` but you expect uncategorized pairs, confirm the `CRON_SECRET` header is correct and that rows truly have `categoryId = null`.
- If `embeddingsGenerated` stays `0`, confirm new Q&A rows exist without embeddings (check `embedding` column for `null`).
- `clustersCreated` remains `0` either when everything is already clustered or cosine similarity never reaches `0.88`; add more data or lower the threshold if needed.

## 3. Consolidate clusters into FAQ entries

Endpoint: `/api/cron/generate-faqs`  
Source: `src/app/api/cron/generate-faqs/route.ts`

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/generate-faqs
```

What it does:

- Loads up to 10 distinct `clusterId`s that haven’t been consolidated yet
- Sends the grouped questions/answers to the LLM to produce a canonical FAQ question, merged answer, and optional variations
- Upserts `FAQEntry` rows keyed by the cluster id and flags clusters as `isGlobal` when they have enough supporting pairs

Troubleshooting:

- Response `{ processed: 0, message: "No clusters available" }` means the clustering step hasn’t produced any groups yet.
- Parsing errors typically mean the LLM returned invalid JSON—re-run the job and check the log for the raw response.

## Suggested run order

1. `extract-qas` – populate `QAPair`s from chat history
2. `cluster-qas` – embed and bucket related pairs
3. `generate-faqs` – convert clusters into FAQ entries

Repeat the pipeline whenever you ingest new chat sessions. For scheduled automation, hit these endpoints via a managed cron (e.g., Vercel Cron) using the same `CRON_SECRET` header.
