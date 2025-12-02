// src/modules/lessons/lessons.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Course])],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
