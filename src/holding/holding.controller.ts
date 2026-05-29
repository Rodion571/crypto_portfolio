import { Controller, Get, Post, Put, Body, Delete, Param } from '@nestjs/common';
import { HoldingService } from './holding.service';
import { CryptoApiService } from './crypto-api.service';
import { AddHoldingDto } from './dto/add-holding.dto';

@Controller('holdings')
export class HoldingController {
  constructor(
    private readonly holdingService: HoldingService,
    private readonly cryptoApiService: CryptoApiService,
  ) {}

  @Post('add')
  create(@Body() addHoldingDto: AddHoldingDto) {
    return this.holdingService.create({
      portfolioId: addHoldingDto.portfolioId,
      coinId: addHoldingDto.coinId,
      amount: addHoldingDto.amount
    });
  }

  @Get('all')
  async findAll() {
    const holdings = await this.holdingService.findAll();
    
    return Promise.all(
      holdings.map(async (h) => {
        const currentPrice = await this.cryptoApiService.getPriceInUSD(h.coinId);
        const totalValue = currentPrice * h.amount;
        
        return {
          ...h,
          currentPrice: currentPrice,
          totalValue: Number(totalValue.toFixed(2)),
        };
      })
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.holdingService.remove(Number(id));
  }

  @Get('history/:coinId')
  getHistory(@Param('coinId') coinId: string) {
    return this.holdingService.getCoinHistory(coinId);
  }

  @Put(':id/reduce')
  async reduceHolding(
    @Param('id') id: string,
    @Body('amount') amount: number,
  ) {
    return this.holdingService.reduceAmount(Number(id), amount);
  }

  @Get('stats/:portfolioId')
  async getStats(@Param('portfolioId') portfolioId: string) {
    return this.holdingService.getPortfolioStats(Number(portfolioId));
  }
}