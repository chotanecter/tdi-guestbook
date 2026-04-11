import { createSupabaseServerClient } from '@/lib/supabase/server';
import PostCard from '@/components/PostCard';
import type { Post } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('posts_with_counts')
    .select('*')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(100);

  const posts = (data ?? []) as Post[];

  return (
    <div>
      <section className="text-center mb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-3">
          The Guestbook
        </h1>
        <p className="text-neutral-600 max-w-md mx-auto">
          A living yearbook of moments from the Technically Doing It community.
          Tap a sticker, leave a mark.
        </p>
        <Link
          href="/post"
          className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-neutral-800 transition"
        >
          + Leave a guest post
        </Link>
      </section>

      {error && (
        <p className="text-red-600 text-sm text-center">
          Couldn&apos;t load posts. Check your Supabase config.
        </p>
      )}

      {!error && posts.length === 0 && (
        <p className="text-center text-neutral-500 py-16">
          No posts yet. Be the first to leave a mark.
        </p>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
