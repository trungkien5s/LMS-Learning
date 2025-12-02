// src/modules/lessons/dto/reorder-lessons.dto.ts
import { IsArray, ArrayMinSize, ValidateNested, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class LessonOrderItem {
  @IsString()
  id: string;

  @IsNumber()
  @Min(1)
  order_index: number;
}

export class ReorderLessonsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LessonOrderItem)
  lessons: LessonOrderItem[];
}