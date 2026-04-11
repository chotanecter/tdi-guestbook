'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getVisitorId } from '@/lib/visitor';

export default function LikeButton({
  postId,
  initialCount,
}: {
  postId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const visitor = getVisitorId();
    supabase
      .from('likes')
      .select('visitor_id')
      .eq('post_id', postId)
      .eq('visitor_id', visitor)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [postId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const visitor = getVisitorId();

    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('visitor_id', visitor);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('likes').insert({ post_id: postId, visitor_id: visitor });
      setLiked(true);
      setCount((c) => c + 1);
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'like', path: `/post/${postId}`, visitor_id: visitor }),
      }).catch(() => {});
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`transition ${liked ? 'text-red-600' : 'hover:text-black'}`}
      aria-pressed={liked}
    >
      {liked ? '❤️' : '🤍'} {count}
    </button>
  );
}
