// src/modules/discussions/discussions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { DiscussionThread } from './entites/discussion-thread.entity';
import { DiscussionPost } from './entites/discussion-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DiscussionThread, DiscussionPost])],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
