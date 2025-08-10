import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class LeadDto {
  @IsString()
  title: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiFieldDto)
  phone?: MultiFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultiFieldDto)
  email?: MultiFieldDto[];

  @IsOptional()
  @IsString()
  statusId?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class MultiFieldDto {
  @IsString()
  value: string;

  @IsString()
  valueType: string;
}
