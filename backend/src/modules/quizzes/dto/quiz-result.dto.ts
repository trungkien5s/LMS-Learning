import { QuizAttemptStatus } from "../entities/quiz-attempt.entity";

// src/modules/quizzes/dto/quiz-result.dto.ts
export class QuizResultDto {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_points: number;
  percentage: number;
  status: QuizAttemptStatus;
  started_at: Date;
  completed_at: Date;
  time_taken_seconds: number;

  // Chi tiết từng câu
  answers: {
    question_id: string;
    question_content: string;
    question_points: number;
    your_answer: string | string[];
    correct_answer: string | string[];
    is_correct: boolean;
    points_earned: number;
  }[];
}