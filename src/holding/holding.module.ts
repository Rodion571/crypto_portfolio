import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HoldingEntity } from './holding.entity';
import { HoldingController } from './holding.controller';
import { HoldingService } from './holding.service';
import { PortfolioEntity } from '../portfolio/portfolio.entity'; 
import { CryptoApiService } from './crypto-api.service';
import { PriceSnapshot } from './price-snapshot.entity';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HoldingEntity, PortfolioEntity, PriceSnapshot]),
    HttpModule,
  ],
  controllers: [HoldingController],
  providers: [HoldingService, CryptoApiService, TasksService],
})
export class HoldingModule {}