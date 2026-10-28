# AI Email Draft Helper

React + Node.js/Express + Supabase (PostgreSQL). Type a short instruction, pick a tone, get a polite email draft. Copy it, edit it, and find it again in history.

Works out of the box with **no keys**: it uses built-in template drafts and stores history in memory. Add keys to switch on the real AI and the real database.

## Run it (2 terminals)

```bash
# Terminal 1 - backend (port 5000)
cd server
npm install
cp .env.example .env
npm start

# Terminal 2 - frontend (port 5173)
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Turn on the AI (optional)
In `server/.env` set `ANTHROPIC_API_KEY=your_key`. The key stays on the server and never reaches the browser. If the key is missing or the API fails, the app falls back to template drafts and says so on screen.

## Turn on Supabase (optional)
1. Create a project at supabase.com and open **SQL Editor**.
2. Run:
```sql
create table drafts (
  id uuid primary key default gen_random_uuid(),
  instruction text not null,
  tone text not null,
  subject text not null,
  body text not null,
  source text not null default 'template',
  created_at timestamptz not null default now()
);
```
3. In `server/.env` set `SUPABASE_URL` and `SUPABASE_KEY` (use the service_role key; keep it server-side only).

## API
| Method | Route | Purpose |
|---|---|---|
| POST | /api/draft | Generate and save a draft `{instruction, tone}` |
| GET | /api/history | List saved drafts, newest first |
| PUT | /api/history/:id | Save edits `{subject, body}` |
| DELETE | /api/history/:id | Delete a draft |

## Structure
```
server/index.js     Express API, AI call, fallback, storage
client/src/App.jsx  Form, draft editor, copy, history
```
