import { IsString, IsUUID } from "class-validator";

// src/modules/quizzes/dto/start-quiz.dto.ts
export class StartQuizDto {
  @IsString()
  @IsUUID('4')
  quiz_id: string;

  // Response: { attempt_id, started_at, time_limit }
}