// ---------- THREAD RESPONSE DTO ----------
export class ThreadResponseDto {
  id: string;
  title: string;
  pinned: boolean;
  created_at: Date;

  course: {
    id: string;
    title: string;
  };

  lesson?: {
    id: string;
    title: string;
  };

  created_by: {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };

  // Số lượng posts
  posts_count: number;

  // Post gần nhất
  latest_post?: {
    id: string;
    content: string;
    created_at: Date;
    created_by: {
      id: string;
      full_name: string;
    };
  };
}