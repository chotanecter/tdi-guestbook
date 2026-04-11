'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type AnyRow = Record<string, any>;

function downloadCsv(filename: string, rows: AnyRow[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) =>
    `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({
  posts,
  comments,
  subscribers,
  events,
  totals,
}: {
  posts: AnyRow[];
  comments: AnyRow[];
  subscribers: AnyRow[];
  events: AnyRow[];
  totals: { posts: number; comments: number; subscribers: number; pageviews: number };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'posts' | 'comments' | 'emails' | 'analytics'>('overview');

  // Simple daily pageview series from last 500 events
  const dailySeries = useMemo(() => {
    const by: Record<string, number> = {};
    for (const e of events) {
      if (e.event !== 'pageview') continue;
      const d = new Date(e.created_at).toISOString().slice(0, 10);
      by[d] = (by[d] || 0) + 1;
    }
    return Object.entries(by).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const topPaths = useMemo(() => {
    const by: Record<string, number> = {};
    for (const e of events) {
      if (e.event !== 'pageview') continue;
      const p = e.path || '/';
      by[p] = (by[p] || 0) + 1;
    }
    return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  async function deleteComment(id: string) {
    if (!confirm('Hide this comment?')) return;
    await fetch('/api/admin/delete-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function deletePost(id: string) {
    if (!confirm('Hide this post? (The post will no longer appear publicly.)')) return;
    await fetch('/api/admin/delete-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">Admin</h1>
        <button
          onClick={logout}
          className="text-xs text-neutral-600 hover:text-black underline"
        >
          Log out
        </button>
      </div>

      <nav className="flex gap-2 mb-6 flex-wrap">
        {(['overview', 'posts', 'comments', 'emails', 'analytics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize ${
              tab === t ? 'bg-black text-white' : 'bg-white border border-black/10'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Posts" value={totals.posts} />
          <Stat label="Comments" value={totals.comments} />
          <Stat label="Emails" value={totals.subscribers} />
          <Stat label="Pageviews" value={totals.pageviews} />
        </div>
      )}

      {tab === 'posts' && (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="bg-white border border-black/10 rounded-xl p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-bold">
                    {p.name}{' '}
                    {p.is_hidden && (
                      <span className="ml-2 text-xs text-red-600">[hidden]</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(p.created_at).toLocaleString()} · {p.email}
                  </p>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{p.message}</p>
                </div>
                {!p.is_hidden && (
                  <button
                    onClick={() => deletePost(p.id)}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'comments' && (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white border border-black/10 rounded-xl p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-bold text-sm">
                    {c.name}{' '}
                    {c.is_hidden && (
                      <span className="ml-2 text-xs text-red-600">[hidden]</span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{c.body}</p>
                </div>
                {!c.is_hidden && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'emails' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-neutral-600">
              {subscribers.length} emails collected
            </p>
            <button
              onClick={() => downloadCsv('subscribers.csv', subscribers)}
              className="text-sm bg-black text-white px-3 py-1.5 rounded-full"
            >
              Export CSV
            </button>
          </div>
          <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.email} className="border-t border-black/5">
                    <td className="px-3 py-2">{s.email}</td>
                    <td className="px-3 py-2">{s.name ?? ''}</td>
                    <td className="px-3 py-2 text-neutral-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold mb-2">Pageviews (recent)</h2>
            <div className="bg-white border border-black/10 rounded-xl p-4 space-y-1 text-sm">
              {dailySeries.length === 0 && (
                <p className="text-neutral-500">No data yet.</p>
              )}
              {dailySeries.map(([day, count]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-24 text-neutral-600">{day}</span>
                  <div className="flex-1 bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-black h-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (count / Math.max(...dailySeries.map(([, v]) => v))) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold mb-2">Top pages</h2>
            <div className="bg-white border border-black/10 rounded-xl p-4 space-y-1 text-sm">
              {topPaths.length === 0 && (
                <p className="text-neutral-500">No data yet.</p>
              )}
              {topPaths.map(([path, count]) => (
                <div key={path} className="flex justify-between">
                  <span className="truncate">{path}</span>
                  <span className="text-neutral-500">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4">
      <p className="text-xs text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
