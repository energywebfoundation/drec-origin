import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ExtendedBaseEntity } from '@energyweb/origin-backend-utils';
import { ApiProperty } from '@nestjs/swagger';
import { Role, UserStatus } from '../../utils/eums';
import { IsEnum, IsString } from 'class-validator';
import { IUser } from '../../models';

@Entity()
export class User extends ExtendedBaseEntity implements IUser {
  constructor(user: Partial<User>) {
    super();

    Object.assign(this, user);
  }

  @ApiProperty({ type: Number })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: String })
  @Column({ nullable: true })
  @IsString()
  title: string;

  @ApiProperty({ type: String })
  @Column({ nullable: true })
  @IsString()
  firstName: string;

  @ApiProperty({ type: String })
  @Column({ nullable: true })
  @IsString()
  lastName: string;

  @ApiProperty({ type: String })
  @Column({ nullable: true })
  @IsString()
  telephone: string;

  @ApiProperty({ type: String })
  @Column({ unique: true })
  @IsString()
  email: string;

  @ApiProperty({ type: String })
  @Column({ select: false })
  @Exclude()
  @IsString()
  password: string;

  @Column({ nullable: true })
  notifications: boolean;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  @Column({ default: UserStatus.Pending, nullable: true })
  @IsEnum(UserStatus)
  status: UserStatus;

  @Column()
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ type: Number })
  @Column()
  organizationId: number;
}
