import {
  IsEnum,
  IsISO31661Alpha2,
  IsString,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IFullOrganization } from '../../../models';
import { OrganizationStatus } from '../../../utils/eums';

export class UpdateOrganizationDTO
  implements Omit<IFullOrganization, 'id' | 'blockchainAccountAddress'>
{
  @ApiProperty({ type: String })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty({ type: String })
  @IsString()
  zipCode: string;

  @ApiProperty({ type: String })
  @IsString()
  city: string;

  @ApiProperty({ type: String })
  @IsISO31661Alpha2()
  country: string;

  @ApiProperty({ type: String })
  @IsString()
  businessType: string;

  @ApiProperty({ type: String })
  @IsString()
  tradeRegistryCompanyNumber: string;

  @ApiProperty({ type: String })
  @IsString()
  vatNumber: string;

  @ApiProperty({ enum: OrganizationStatus, enumName: 'OrganizationStatus' })
  @IsEnum(OrganizationStatus)
  @IsString()
  status: OrganizationStatus;

  @ApiProperty({ type: String })
  @IsString()
  signatoryFullName: string;

  @ApiProperty({ type: String })
  @IsString()
  signatoryAddress: string;

  @ApiProperty({ type: String })
  @IsString()
  signatoryZipCode: string;

  @ApiProperty({ type: String })
  @IsString()
  signatoryCity: string;

  @ApiProperty({ type: String })
  @IsISO31661Alpha2()
  signatoryCountry: string;

  @ApiProperty({ type: String })
  @IsEmail()
  signatoryEmail: string;

  @ApiProperty({ type: String })
  @IsString()
  signatoryPhoneNumber: string;
}
