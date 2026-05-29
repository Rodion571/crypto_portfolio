import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class AddHoldingDto {
  @IsNumber()
  @IsNotEmpty()
  portfolioId!: number;

  @IsString()
  @IsNotEmpty()
  coinId!: string;

  @IsNumber()
  @Min(0.1)
  amount!: number;
}