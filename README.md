# RAVIN Core

RAVIN Core is the lightweight, phone-first prototype of the physical RAVIN device.

## What v0.2 does

- Runs inside GitHub Codespaces
- Serves a mobile-first RAVIN Core interface
- Sends requests to Cloudflare Workers AI
- Reuses the RAVIN personality and model-routing ideas from Project-R.A.V.I.N.-1.1
- Keeps short-term conversation memory on the server
- Supports Conversation and Work modes
- Speaks RAVIN replies through the phone browser
- Keeps API credentials on the server, never in browser JavaScript

## Codespaces setup

Open this repository in a Codespace, then run:

```bash
npm install
cp .env.example .env
```

Fill in:

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_workers_ai_token
```

Then start RAVIN:

```bash
npm start
```

Open the **PORTS** tab and open/forward port **8765**. On your iPhone, open the forwarded HTTPS URL.

> Do not commit your real `.env` file. It is ignored by git.

## Recommended secret setup in Codespaces

Instead of storing the token in a repo file, add these as Codespaces secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Then restart the Codespace terminal and run `npm start`.

## Architecture

```text
iPhone / browser
      |
      | HTTPS
      v
GitHub Codespace
  RAVIN Core server
      |
      +-- short-term session memory
      +-- RAVIN system prompt
      +-- Conversation / Work routing
      |
      v
Cloudflare Workers AI
```

## Current limitation

Session memory is intentionally in-memory for v0.2. Restarting the Codespace resets it. Persistent Project / Permanent memory comes next.

## Next milestones

1. Real hold-to-talk microphone input
2. Streaming responses
3. Better TTS voice
4. Persistent memory
5. Arrow / Waypoint / Atlas context
6. Move hosting off Codespaces for always-on Core behavior
