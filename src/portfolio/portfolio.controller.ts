import { Controller, Post, Body, Get, Delete, Param } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Controller('portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post('create')
  async create(@Body() createPortfolioDto: CreatePortfolioDto) {
    return await this.portfolioService.create(createPortfolioDto.name);
  }

  @Get('all')
  async findAll() {
    return await this.portfolioService.findAll();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.portfolioService.remove(+id);
  }
}