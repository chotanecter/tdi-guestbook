'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MAX_FILE_BYTES = 80 * 1024 * 1024; // 80 MB cap
const MAX_VIDEO_SECONDS = 60;

export default function PostForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setErr('File is too large (max 80MB).');
      return;
    }
    if (f.type.startsWith('video/')) {
      // Check duration
      const ok = await new Promise<boolean>((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(v.src);
          resolve(v.duration <= MAX_VIDEO_SECONDS + 0.5);
        };
        v.onerror = () => resolve(false);
        v.src = URL.createObjectURL(f);
      });
      if (!ok) {
        setErr(`Video must be under ${MAX_VIDEO_SECONDS} seconds.`);
        return;
      }
    } else if (!f.type.startsWith('image/')) {
      setErr('Only photos or short videos are allowed.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr('Please enter your name.');
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return setErr('Please enter a valid email.');
    }
    if (!message.trim()) return setErr('Please write a message.');

    setBusy(true);
    const supabase = createSupabaseBrowserClient();

    let media_url: string | null = null;
    let media_type: 'image' | 'video' | null = null;

    try {
      if (file) {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('guestbook-media')
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('guestbook-media').getPublicUrl(path);
        media_url = pub.publicUrl;
        media_type = file.type.startsWith('video/') ? 'video' : 'image';
      }

      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim(),
          media_url,
          media_type,
        })
        .select()
        .single();
      if (postErr) throw postErr;

      // Add to subscribers list (ignore conflict)
      await supabase.from('subscribers').upsert(
        { email: email.trim().toLowerCase(), name: name.trim(), source: 'guestpost' },
        { onConflict: 'email', ignoreDuplicates: true }
      );

      // Fire notification (server route invokes edge function)
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      }).catch(() => {});

      router.push('/');
      router.refresh();
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Your name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="w-full px-4 py-3 border border-black/15 rounded-xl bg-white focus:outline-none focus:border-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-black/15 rounded-xl bg-white focus:outline-none focus:border-black"
        />
        <p className="text-xs text-neutral-500 mt-1">
          You&apos;ll be notified by email when new posts arrive.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Photo or short video (≤60s)</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          onChange={onFileChange}
          className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-black file:text-white hover:file:bg-neutral-800"
        />
        {preview && file?.type.startsWith('image/') && (
          <img src={preview} alt="" className="mt-3 max-h-64 rounded-xl" />
        )}
        {preview && file?.type.startsWith('video/') && (
          <video src={preview} controls className="mt-3 max-h-64 rounded-xl bg-black" />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message *</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
          className="w-full px-4 py-3 border border-black/15 rounded-xl bg-white focus:outline-none focus:border-black resize-none"
          placeholder="Say something…"
        />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-black text-white py-3 rounded-full font-medium hover:bg-neutral-800 transition disabled:opacity-50"
      >
        {busy ? 'Posting…' : 'Leave my mark'}
      </button>
    </form>
  );
}
