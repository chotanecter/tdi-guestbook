'use client';

import { useEffect, useState } from 'react';
import type { Post, Comment } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import LikeButton from './LikeButton';
import CommentList from './CommentList';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function PostCard({ post }: { post: Post }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);

  useEffect(() => {
    if (!showComments) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data ?? []) as Comment[]));
  }, [showComments, post.id]);

  return (
    <article className="bg-white border border-black/10 rounded-2xl p-5 shadow-sm">
      <header className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display font-bold text-base">{post.name}</p>
          <p className="text-xs text-neutral-500">{timeAgo(post.created_at)}</p>
        </div>
      </header>

      {post.media_url && post.media_type === 'image' && (
        <img
          src={post.media_url}
          alt=""
          className="w-full rounded-xl mb-3 max-h-[520px] object-cover"
          loading="lazy"
        />
      )}

      {post.media_url && post.media_type === 'video' && (
        <video
          src={post.media_url}
          controls
          playsInline
          className="w-full rounded-xl mb-3 max-h-[520px] bg-black"
        />
      )}

      <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4">
        {post.message}
      </p>

      <div className="flex items-center gap-4 text-sm text-neutral-600 border-t border-black/10 pt-3">
        <LikeButton postId={post.id} initialCount={post.like_count ?? 0} />
        <button
          onClick={() => setShowComments((v) => !v)}
          className="hover:text-black transition"
        >
          💬 {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {showComments && (
        <CommentList
          postId={post.id}
          comments={comments}
          setComments={setComments}
          onNewComment={() => setCommentCount((c) => c + 1)}
        />
      )}
    </article>
  );
}
