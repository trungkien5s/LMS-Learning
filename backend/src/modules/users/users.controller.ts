// src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  Request,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/passport/jwt-auth.guard';
import { Public } from '@/decorator/customize';
import { Roles } from '@/decorator/roles.decorator';
import { RolesGuard } from '@/auth/passport/roles.guard';
import { UserRole } from './entities/user.entity';
import { Request as ExpressRequest } from 'express';

interface AuthUser {
  userId: string;
  role: UserRole;
  email: string;
}

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Accounts')
@Controller('accounts')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List All Accounts' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'current', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 10 })
  @ApiQuery({ name: 'role', required: false })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  findAll(
    @Query('query') query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('role') role: string,
  ) {
    return this.usersService.findAll(query, +current, +pageSize, role);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retrieve Current Account' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getCurrentUser(@Request() req: RequestWithUser) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update Existing Account' })
  @ApiBody({ type: UpdateUserDto })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateCurrentUser(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.userId, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete Existing Account' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteCurrentUser(@Request() req: RequestWithUser) {
    return this.usersService.remove(req.user.userId);
  }

  @Get(':account_id')
  @ApiOperation({ summary: 'Retrieve Account' })
  @ApiParam({ name: 'account_id' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('account_id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':account_id')
  @ApiOperation({ summary: 'Update Existing Account' })
  @ApiParam({ name: 'account_id' })
  @ApiBody({ type: UpdateUserDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  update(
    @Param('account_id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':account_id')
  @ApiOperation({ summary: 'Delete Existing Account' })
  @ApiParam({ name: 'account_id' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  remove(@Param('account_id') id: string) {
    return this.usersService.remove(id);
  }

  // ============= PASSWORD RESET FLOW =============

  @Post('password-reset-request')
  @Public()
  @ApiOperation({ summary: 'Request Password Reset' })
  @ApiBody({ type: RequestPasswordResetDto })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.usersService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Reset password bằng mã đã gửi qua email' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(
      dto.reset_code,
      dto.new_password,
    );
  }

  // ============= CHANGE PASSWORD (đã login) =============

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for current logged-in user' })
  @ApiBody({ type: ChangePasswordDto })
  changePassword(
    @Request() req: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const { userId } = req.user;
    return this.usersService.changePassword(
      userId,
      dto.old_password,
      dto.new_password,
      dto.confirm_new_password,
    );
  }
}
