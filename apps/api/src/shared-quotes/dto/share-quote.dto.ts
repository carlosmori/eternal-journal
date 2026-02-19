import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ShareQuoteDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  sourceEntryId?: string;
}
