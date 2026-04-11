import PostForm from '@/components/PostForm';

export default function NewPostPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-2">Leave a mark</h1>
      <p className="text-neutral-600 mb-6 text-sm">
        Add your photo or short video, a message, and your name. Your email is only
        used to notify you when someone else posts.
      </p>
      <PostForm />
    </div>
  );
}
