'use client';

import { useState } from 'react';
import type { Comment } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CommentList({
  postId,
  comments,
  setComments,
  onNewComment,
}: {
  postId: string;
  comments: Comment[];
  setComments: (updater: (prev: Comment[]) => Comment[]) => void;
  onNewComment: () => void;
}) {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr('Please enter your name.');
    if (!body.trim()) return setErr('Please write a comment.');
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, name: name.trim(), body: body.trim() })
      .select()
      .single();
    setBusy(false);
    if (error) return setErr(error.message);
    setComments((prev) => [...prev, data as Comment]);
    onNewComment();
    setBody('');
  }

  return (
    <div className="mt-4 border-t border-black/10 pt-4">
      {comments.length === 0 && (
        <p className="text-sm text-neutral-500 mb-3">
          No comments yet. Be the first.
        </p>
      )}
      <ul className="space-y-3 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-bold">{c.name}</span>{' '}
            <span className="text-neutral-500 text-xs">
              · {new Date(c.created_at).toLocaleDateString()}
            </span>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="space-y-2">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-neutral-50 focus:outline-none focus:border-black"
        />
        <textarea
          placeholder="Write a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-black/15 rounded-lg bg-neutral-50 focus:outline-none focus:border-black resize-none"
        />
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="text-sm font-medium bg-black text-white px-4 py-1.5 rounded-full disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
