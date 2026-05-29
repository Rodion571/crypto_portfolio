import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioEntity } from './portfolio.entity'; 
import { PortfolioController } from './portfolio.controller'; 
import { PortfolioService } from './portfolio.service'; 

@Module({

  imports: [TypeOrmModule.forFeature([PortfolioEntity])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}