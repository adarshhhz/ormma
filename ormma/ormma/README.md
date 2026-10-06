# Ormma - Your AI Assistant

A simple glass-effect chat app for Ormma, built with Next.js and OpenRouter.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and put your OpenRouter API key in it.
3. `npm run dev`, then open http://localhost:3000

## Deploy on Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel: Add New > Project > import the repo.
3. In Project Settings > Environment Variables, add `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`).
4. Deploy. Every `git push` redeploys automatically.

## Where to change things

- Personality, language rules, safety: `lib/systemPrompt.ts`
- Chat page and voice buttons: `app/page.tsx`
- Colours and layout: `app/globals.css`
- API call and model: `app/api/chat/route.ts`

Never commit your API key. `.env.local` is already in `.gitignore`.
