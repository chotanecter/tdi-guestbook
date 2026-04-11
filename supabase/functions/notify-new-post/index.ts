// Supabase Edge Function: notify-new-post
//
// Sends an email to every subscriber when a new post is made.
// Uses SMTP (Deno SMTP client). Configure these Edge Function secrets:
//
//   supabase secrets set \
//     SMTP_HOST=smtp.resend.com \
//     SMTP_PORT=465 \
//     SMTP_USERNAME=resend \
//     SMTP_PASSWORD=YOUR_RESEND_API_KEY \
//     SMTP_FROM="Technically Doing It <hello@your-domain.com>" \
//     SITE_URL=https://tdi-guestbook.vercel.app
//
// You can also use Gmail (app password), Mailgun, SendGrid SMTP, etc.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const { post_id } = await req.json().catch(() => ({ post_id: null }));
  if (!post_id) return new Response('missing post_id', { status: 400 });

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', post_id)
    .single();
  if (!post) return new Response('post not found', { status: 404 });

  const { data: subs } = await supabase
    .from('subscribers')
    .select('email')
    .eq('unsubscribed', false);

  const recipients = (subs ?? [])
    .map((s) => s.email)
    .filter((e) => e && e !== post.email); // don't email the author

  if (recipients.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const siteUrl = Deno.env.get('SITE_URL') || 'https://example.com';
  const subject = `New post on Technically Doing It`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; background:#f5f5f5; padding:24px;">
      <div style="max-width:520px; margin:auto; background:#fff; border-radius:16px; padding:24px; border:1px solid #eee;">
        <h1 style="font-family:'Space Grotesk',sans-serif; margin:0 0 8px;">New guestbook post</h1>
        <p style="color:#666; margin:0 0 16px;">${escapeHtml(post.name)} just left a mark.</p>
        <p style="white-space:pre-wrap; line-height:1.5;">${escapeHtml(post.message.slice(0, 400))}${
          post.message.length > 400 ? '…' : ''
        }</p>
        <p style="margin-top:24px;">
          <a href="${siteUrl}" style="display:inline-block; background:#000; color:#fff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:500;">
            View the guestbook
          </a>
        </p>
        <p style="color:#999; font-size:12px; margin-top:24px;">
          You're receiving this because you signed the Technically Doing It guestbook.
        </p>
      </div>
    </div>
  `;

  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get('SMTP_HOST')!,
      port: Number(Deno.env.get('SMTP_PORT') || 465),
      tls: true,
      auth: {
        username: Deno.env.get('SMTP_USERNAME')!,
        password: Deno.env.get('SMTP_PASSWORD')!,
      },
    },
  });

  let sent = 0;
  for (const email of recipients) {
    try {
      await client.send({
        from: Deno.env.get('SMTP_FROM')!,
        to: email,
        subject,
        content: 'auto',
        html,
      });
      sent++;
    } catch (e) {
      console.error('send failed', email, e);
    }
  }
  await client.close();

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
