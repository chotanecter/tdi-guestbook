# Technically Doing It — Digital Guestbook

A Next.js + Supabase app that powers a digital yearbook for the Technically Doing It brand. Tap an NFC sticker, land here, scroll the feed, like/comment, and leave a guest post (name, email, photo or short video, message). Every new post blasts an email to the subscriber list. Admin panel lets you moderate, export emails, and see simple analytics.

## Features

- Public feed of guest posts (photo or ≤60s video + message)
- Leave a guest post: name, email, media, message
- Like posts (anonymous, one per browser)
- Comment on posts (name required)
- Automatic email to all subscribers on every new post (via Supabase Edge Function + SMTP)
- Admin panel at `/admin` (password-gated)
  - Hide/unhide posts and comments
  - Export subscriber emails to CSV
  - Pageview analytics, top pages, totals
- Built-in pageview + event tracking stored in your own Supabase DB

## Stack

- Next.js 14 (App Router, TypeScript, Tailwind)
- Supabase (Postgres, Storage, Edge Functions)
- Deployed to Vercel

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
3. In the **SQL editor**, paste the contents of `supabase/migrations/0001_init.sql` and run it. This creates all tables, the media storage bucket, and RLS policies.

## 2. Configure local environment

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, NEXT_PUBLIC_SITE_URL
```

Add one more variable for the admin password:

```
ADMIN_PASSWORD=pick-a-strong-password
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.

## 4. Deploy the Edge Function for email notifications

The post-notification email is sent from a Supabase Edge Function so it runs server-side with your service role key, independent of Vercel.

Install the Supabase CLI (one-time): https://supabase.com/docs/guides/cli

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy notify-new-post --no-verify-jwt
```

Then set the SMTP secrets. **Supabase's built-in email only handles auth flows, so we need a real SMTP sender for blast emails.** Any SMTP provider works — Resend, Mailgun, SendGrid, Gmail app password, etc. Example with Resend (free tier: 100 emails/day, 3000/month):

```bash
supabase secrets set \
  SMTP_HOST=smtp.resend.com \
  SMTP_PORT=465 \
  SMTP_USERNAME=resend \
  SMTP_PASSWORD=re_your_resend_api_key \
  SMTP_FROM="Technically Doing It <hello@your-verified-domain.com>" \
  SITE_URL=https://tdi-guestbook.vercel.app
```

Test it:

```bash
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"post_id":"SOME_POST_ID"}' \
  https://YOUR_PROJECT.supabase.co/functions/v1/notify-new-post
```

## 5. Deploy to Vercel

```bash
npx vercel
```

In the Vercel dashboard, add the same env vars from `.env.local` under **Project Settings → Environment Variables**, then redeploy. Point your NFC stickers at the production URL.

## 6. NFC stickers

Program each sticker to open `https://your-site.com/` (the feed) or `https://your-site.com/post` (straight into the post form — faster for in-person moments). Any NFC writer app works (e.g. NFC Tools on iOS/Android).

## Project layout

```
app/
  page.tsx              # Public feed
  post/page.tsx         # Guest post form
  admin/page.tsx        # Admin panel (password gated)
  api/
    analytics/          # Pageview tracking endpoint
    notify/             # Triggers the edge function
    admin/login/        # Admin password check
    admin/delete-post/
    admin/delete-comment/
components/
  PostCard.tsx  LikeButton.tsx  CommentList.tsx
  PostForm.tsx  AdminLogin.tsx  AdminDashboard.tsx
  AnalyticsBeacon.tsx
lib/
  supabase/client.ts  supabase/server.ts
  admin.ts  types.ts  visitor.ts
supabase/
  migrations/0001_init.sql
  functions/notify-new-post/index.ts
```

## Notes / next steps

- "Delete" in the admin panel is a soft delete (`is_hidden = true`) so content is recoverable. Change the API routes to `.delete()` if you want hard delete.
- Analytics is intentionally simple (event rows in Postgres). Swap for Plausible/Umami/Vercel Analytics later if you outgrow it.
- Media uploads land in the `guestbook-media` public bucket. Consider adding virus scanning or size quotas for production.
- Rate limiting: add a middleware or use Vercel's built-in bot protection if spam becomes an issue.
- Unsubscribe link: add an `/unsubscribe?email=` route that flips `subscribers.unsubscribed` if you want CAN-SPAM compliance.
