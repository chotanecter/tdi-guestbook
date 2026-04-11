import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createSupabaseAdminClient();
    await supabase.from('analytics_events').insert({
      event: String(body.event || 'pageview'),
      path: body.path ?? null,
      referrer: body.referrer ?? null,
      visitor_id: body.visitor_id ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      country: req.headers.get('x-vercel-ip-country') ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
