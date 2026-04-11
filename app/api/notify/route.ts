import { NextResponse } from 'next/server';

// Triggers the Supabase Edge Function that emails the subscriber list.
// Called fire-and-forget from the post form after a successful insert.
export async function POST(req: Request) {
  const { post_id } = await req.json().catch(() => ({ post_id: null }));
  if (!post_id) return NextResponse.json({ ok: false }, { status: 400 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-new-post`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ post_id }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
