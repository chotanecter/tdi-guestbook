import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// Sends an email to every subscriber when a new post is made.
// Uses Resend REST API (no npm package needed).
// Env vars needed: RESEND_API_KEY, optionally RESEND_FROM

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: Request) {
  const { post_id } = await req.json().catch(() => ({ post_id: null }));
  if (!post_id) return NextResponse.json({ ok: false, error: 'missing post_id' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set \u2014 skipping email notifications');
    return NextResponse.json({ ok: false, error: 'no api key' }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  // Fetch the post
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', post_id)
    .single();
  if (!post) return NextResponse.json({ ok: false, error: 'post not found' }, { status: 404 });

  // Fetch all active subscribers
  const { data: subs } = await supabase
    .from('subscribers')
    .select('email')
    .eq('unsubscribed', false);

  const recipients = (subs ?? [])
    .map((s) => s.email)
    .filter((e): e is string => !!e && e !== post.email); // exclude the author

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://literallydoingit.com';
  const fromAddress = process.env.RESEND_FROM || 'Technically Doing It <onboarding@resend.dev>';

  const html = `
    <div style="font-family: -apple-system, sans-serif; background:#f5f5f5; padding:24px;">
      <div style="max-width:520px; margin:auto; background:#fff; border-radius:16px; padding:24px; border:1px solid #eee;">
        <h1 style="font-family:'Space Grotesk',sans-serif; margin:0 0 8px;">New guestbook post</h1>
        <p style="color:#666; margin:0 0 16px;">${escapeHtml(post.name)} just left a mark.</p>
        <p style="white-space:pre-wrap; line-height:1.5;">${escapeHtml(
          post.message.slice(0, 400)
        )}${post.message.length > 400 ? '\u2026' : ''}</p>
        <p style="margin-top:24px;">
          <a href="${siteUrl}" style="display:inline-block; background:#000; color:#fff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:500;">
            View the guestbook
          </a>
        </p>
        <p style="color:#999; font-size:12px; margin-top:24px;">
          You\u2019re receiving this because you signed the Technically Doing It guestbook.
        </p>
      </div>
    </div>
  `;

  let sent = 0;
  for (const email of recipients) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: 'New post on Technically Doing It',
          html,
        }),
      });
      if (res.ok) {
        sent++;
      } else {
        const errBody = await res.text();
        console.error('Resend error for', email, res.status, errBody);
      }
    } catch (e) {
      console.error('send failed', email, e);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
