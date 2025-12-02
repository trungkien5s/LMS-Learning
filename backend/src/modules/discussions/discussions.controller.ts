// src/modules/discussions/discussions.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { DiscussionsService, PaginatedResult } from './discussions.service';

import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { Roles } from '@/decorator/roles.decorator';
import { Public } from '@/decorator/customize';
import { UserRole } from '@/modules/users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { QueryThreadsDto } from './dto/query-thread-dto';
import { ThreadResponseDto } from './dto/thread-response-dto';
import { CreateThreadDto, UpdateThreadDto } from './dto/create-discussion-thread-dto';
import { CreatePostDto } from './dto/create-post-dto';
import { UpdatePostDto } from './dto/update-post-dto';

interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Discussions')
@Controller('discussions')
export class DiscussionsController {
  constructor(
    private readonly discussionsService: DiscussionsService,
  ) {}

  // ============================ THREADS =============================

  @Get('threads')
  @Public()
  @ApiOperation({ summary: 'List discussion threads' })
  @ApiQuery({ name: 'course_id', required: false })
  @ApiQuery({ name: 'lesson_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getThreads(
    @Query() query: QueryThreadsDto,
  ): Promise<PaginatedResult<ThreadResponseDto>> {
    return this.discussionsService.getThreads(query);
  }

  @Get('threads/:id')
  @Public()
  @ApiOperation({ summary: 'Get thread detail with basic info' })
  @ApiParam({ name: 'id' })
  async getThreadById(
    @Param('id') id: string,
  ): Promise<ThreadResponseDto> {
    return this.discussionsService.getThreadById(id);
  }

  @Post('threads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new discussion thread' })
  @ApiBody({ type: CreateThreadDto })
  async createThread(
    @Req() req: RequestWithUser,
    @Body() dto: CreateThreadDto,
  ) {
    const { userId } = req.user;
    return this.discussionsService.createThread(dto, userId);
  }

  @Patch('threads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update discussion thread (owner or teacher/admin, pinned only teacher/admin)',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateThreadDto })
  async updateThread(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdateThreadDto,
  ) {
    const { userId, role } = req.user;
    return this.discussionsService.updateThread(
      id,
      dto,
      userId,
      role,
    );
  }

  @Delete('threads/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete discussion thread (owner or teacher/admin)',
  })
  @ApiParam({ name: 'id' })
  async deleteThread(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    return this.discussionsService.deleteThread(id, userId, role);
  }

  // ============================ POSTS ===============================

  @Get('threads/:threadId/posts')
  @Public()
  @ApiOperation({ summary: 'List posts in a thread' })
  @ApiParam({ name: 'threadId' })
  async getPostsByThread(
    @Param('threadId') threadId: string,
  ) {
    return this.discussionsService.getPostsByThread(threadId);
  }

  @Post('threads/:threadId/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create post or reply in a thread' })
  @ApiParam({ name: 'threadId' })
  @ApiBody({ type: CreatePostDto })
  async createPost(
    @Param('threadId') threadId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreatePostDto,
  ) {
    const { userId } = req.user;
    return this.discussionsService.createPost(
      threadId,
      dto,
      userId,
    );
  }

  @Patch('posts/:postId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update post content (owner or teacher/admin)',
  })
  @ApiParam({ name: 'postId' })
  @ApiBody({ type: UpdatePostDto })
  async updatePost(
    @Param('postId') postId: string,
    @Req() req: RequestWithUser,
    @Body() dto: UpdatePostDto,
  ) {
    const { userId, role } = req.user;
    return this.discussionsService.updatePost(
      postId,
      dto,
      userId,
      role,
    );
  }

  @Delete('posts/:postId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Delete post (soft delete) – owner or teacher/admin',
  })
  @ApiParam({ name: 'postId' })
  async deletePost(
    @Param('postId') postId: string,
    @Req() req: RequestWithUser,
  ) {
    const { userId, role } = req.user;
    return this.discussionsService.deletePost(
      postId,
      userId,
      role,
    );
  }
}
