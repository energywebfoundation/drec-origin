import {
  IsString,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  Installation,
  OffTaker,
  Sector,
  StandardCompliance,
} from '../../../utils/eums';
import { IDevice } from '../../../models';

export class NewDeviceDTO
  implements Omit<IDevice, 'id' | 'status' | 'organizationId'>
{
  @ApiProperty()
  @IsString()
  drecID: string;

  @ApiProperty()
  @IsString()
  projectName: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  latitude: string;

  @ApiProperty()
  @IsString()
  longitude: string;

  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  zipCode: number;

  @ApiProperty()
  @IsString()
  fuelCode: string;

  @ApiProperty()
  @IsString()
  deviceTypeCode: string;

  @ApiProperty()
  @IsEnum(Installation)
  installationConfiguration: Installation;

  @ApiProperty()
  @IsNumber()
  capacity: number;

  @ApiProperty()
  @IsString()
  commissioningDate: string;

  @ApiProperty()
  @IsBoolean()
  gridInterconnection: boolean;

  @ApiProperty()
  @IsEnum(OffTaker)
  offTaker: OffTaker;

  @ApiProperty()
  @IsEnum(Sector)
  sector: Sector;

  @ApiProperty()
  @IsEnum(StandardCompliance)
  standardCompliance: StandardCompliance;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  yieldValue: number;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  generatorsIds: number[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  labels: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  impactStory: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  data: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  images: string[];
}
