import { isAdmin } from '@/lib/admin';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!isAdmin()) {
    return <AdminLogin />;
  }

  const supabase = createSupabaseAdminClient();

  const [postsRes, commentsRes, subsRes, analyticsRes, totalsRes] = await Promise.all([
    supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('subscribers').select('*').order('created_at', { ascending: false }),
    supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true }),
      supabase.from('subscribers').select('email', { count: 'exact', head: true }),
      supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event', 'pageview'),
    ]),
  ]);

  const totals = {
    posts: totalsRes[0].count ?? 0,
    comments: totalsRes[1].count ?? 0,
    subscribers: totalsRes[2].count ?? 0,
    pageviews: totalsRes[3].count ?? 0,
  };

  return (
    <AdminDashboard
      posts={postsRes.data ?? []}
      comments={commentsRes.data ?? []}
      subscribers={subsRes.data ?? []}
      events={analyticsRes.data ?? []}
      totals={totals}
    />
  );
}
