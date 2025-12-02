import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

// src/modules/quizzes/dto/submit-answers.dto.ts
class AnswerItemDto {
  @IsString()
  @IsUUID('4')
  question_id: string;

  @IsOptional()
  @IsString()
  @IsUUID('4')
  option_id?: string; // For MCQ_SINGLE

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  option_ids?: string[]; // For MCQ_MULTI

  @IsOptional()
  @IsString()
  answer_text?: string; // For future text answer
}

export class SubmitAnswersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}