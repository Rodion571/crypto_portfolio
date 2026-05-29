import { Controller, Get, Post, Put, Body, Delete, Param } from '@nestjs/common';
import { HoldingService } from './holding.service';
import { CryptoApiService } from './crypto-api.service';
import { AddHoldingDto } from './dto/add-holding.dto';

@Controller()
export class HoldingController {
  constructor(
    private readonly holdingService: HoldingService,
    private readonly cryptoApiService: CryptoApiService,
  ) {}

  @Post('portfolios/:portfolioId/holdings')
  create(
    @Param('portfolioId') portfolioId: string,
    @Body() addHoldingDto: AddHoldingDto,
  ) {
    return this.holdingService.create({
      portfolioId: Number(portfolioId),
      coinId: addHoldingDto.coinId,
      amount: addHoldingDto.amount
    });
  }

  @Delete('holdings/:id')
  remove(@Param('id') id: string) {
    return this.holdingService.remove(Number(id));
  }

  @Get('holdings/history/:coinId')
  getHistory(@Param('coinId') coinId: string) {
    return this.holdingService.getCoinHistory(coinId);
  }

  @Put('holdings/:id/reduce')
  async reduceHolding(
    @Param('id') id: string,
    @Body('amount') amount: number,
  ) {
    return this.holdingService.reduceAmount(Number(id), amount);
  }

  @Get('portfolios/:portfolioId/stats')
  async getStats(@Param('portfolioId') portfolioId: string) {
    return this.holdingService.getPortfolioStats(Number(portfolioId));
  }
}