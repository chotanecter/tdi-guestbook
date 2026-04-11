import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await req.json();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('posts').update({ is_hidden: true }).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
