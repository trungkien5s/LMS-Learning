import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { QuestionType } from "../entities/question.entity";
import { Type } from "class-transformer";
import { CreateOptionDto } from "./create-question.dto";
// src/modules/quizzes/dto/update-question.dto.ts
export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  content?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  order_index?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}