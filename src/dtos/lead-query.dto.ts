import { IsOptional, IsString, IsIn } from 'class-validator';

export class LeadQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsIn(['DATE_CREATE', 'TITLE'])
  sort?: 'DATE_CREATE' | 'TITLE';
}
