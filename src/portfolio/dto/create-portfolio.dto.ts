import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}