import { IsOptional, IsString } from 'class-validator';

export class GetBatchQueryDto {
  @IsOptional()
  @IsString()
  count?: string;

  @IsOptional()
  @IsString()
  exclude?: string;
}
