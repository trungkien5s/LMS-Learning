import { IsUUID, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID('4')
  course_id: string;

  // student_id được set từ JWT trong service, không cho FE gửi
}