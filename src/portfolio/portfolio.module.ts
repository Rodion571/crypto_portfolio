import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioEntity } from './portfolio.entity'; 
import { PortfolioHistory } from './portfolio-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioEntity, PortfolioHistory])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}