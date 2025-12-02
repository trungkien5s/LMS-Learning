import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { QuestionType } from "../entities/question.entity";
import { Type } from "class-transformer";

// src/modules/quizzes/dto/create-question.dto.ts
export class CreateOptionDto {
  @IsString()
  content: string;

  @IsBoolean()
  is_correct: boolean;
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(5)
  content: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsNumber()
  @Min(1)
  points: number;

  @IsOptional()
  @IsNumber()
  order_index?: number;

  @IsArray()
  @ArrayMinSize(2, { message: 'Phải có ít nhất 2 đáp án' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];

  // ⚠️ Validation: 
  // - MCQ_SINGLE: Chỉ 1 is_correct=true
  // - MCQ_MULTI: Ít nhất 1 is_correct=true
  // - TRUE_FALSE: Phải có đúng 2 options
}
