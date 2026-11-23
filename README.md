# Marketplace

A responsive marketplace built with Next.js 15, React 19, Tailwind CSS, and Supabase.

## Local setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase

The schema creates the `listings` and `messages` tables, indexes, SQL grants, RLS policies, and the public `listing-images` Storage bucket. Browser visitors can read and create listings and insert messages, but no message read policy is granted. If the tables already exist, rerun the schema in Supabase SQL Editor to apply the grants.

## Production

Set the same public environment variables in Vercel. Never use or expose a Supabase secret/service-role key.
