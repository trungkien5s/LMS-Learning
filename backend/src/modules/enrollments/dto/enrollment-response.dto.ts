// src/modules/enrollments/dto/enrollment-response.dto.ts
export class EnrollmentResponseDto {
  id: string;
  status: string;
  progress_percent: number;
  last_accessed_at: Date;
  enrolled_at: Date;

  student: {
    id: string;
    full_name: string;
    avatar_url: string;
  };

  course: {
    id: string;
    title: string;
    thumbnail_url: string;
  };
}
