export type Post = {
  id: string;
  name: string;
  email: string;
  message: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
  is_hidden: boolean;
  like_count?: number;
  comment_count?: number;
};

export type Comment = {
  id: string;
  post_id: string;
  name: string;
  body: string;
  created_at: string;
  is_hidden: boolean;
};
