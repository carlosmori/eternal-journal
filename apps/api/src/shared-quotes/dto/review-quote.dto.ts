import { IsIn, IsString } from 'class-validator';

export class ReviewQuoteDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}
