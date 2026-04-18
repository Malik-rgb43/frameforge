# FrameForge

Node-native studio for producing AI ad creatives at scale. Upload product shots, pick a concept, generate AI variants via NanoBanana Pro, build a numbered storyboard, and export a production-ready prompt pack for Seedance 2 / Kling 3.

**Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Realtime + RLS) + Vercel.

## Local development

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Environment

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | https://renkgdonyyifkuvhhmsj.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key |

## Schema

Tables in `public` schema (RLS-enabled, owner-gated):
- `projects` — name, client, aspect, status, concept
- `board_items` — reference + generated images on the infinite canvas
- `connections` — typed edges between board items
- `shots` — ordered timeline with prompts, duration, VO
- `concepts` — AI-proposed creative directions

## Screens

- **Home** — project library (grid + list views)
- **Concept** — 5 AI-proposed concepts + brief panel
- **Board** — infinite canvas with Reference / Generated nodes + Prompt Card
- **Storyboard** — timeline + scrub-able preview + shot detail slide-over
- **Export** — final preview + delivery options + editor pack
- **Settings** slide-over — General / Brand / Team / Models / Export defaults
