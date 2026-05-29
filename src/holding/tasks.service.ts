import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CryptoApiService } from './crypto-api.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceSnapshot } from './price-snapshot.entity';
import { HoldingEntity } from './holding.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly cryptoApiService: CryptoApiService,
    @InjectRepository(PriceSnapshot)
    private readonly priceSnapshotRepository: Repository<PriceSnapshot>,
    @InjectRepository(HoldingEntity) 
    private readonly holdingRepository: Repository<HoldingEntity>
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    try {
      const holdings = await this.holdingRepository
        .createQueryBuilder('holding')
        .select('DISTINCT holding.coinId', 'coinId')
        .getRawMany();

      const uniqueCoinIds = holdings.map(h => h.coinId.toLowerCase());

      if (uniqueCoinIds.length === 0) {
        return;
      }

      for (const coinId of uniqueCoinIds) {
        try {
          const price = await this.cryptoApiService.getPriceInUSD(coinId);
          
          if (price > 0) {
            const snapshot = this.priceSnapshotRepository.create({
              coinId,
              priceUsd: price,
            });
            await this.priceSnapshotRepository.save(snapshot);
          }
        } catch (err: any) {
          console.error(`Error saving snapshot for ${coinId}:`, err.message || err);
        }
      }
    } catch (globalErr: any) {
      console.error('Error running price collector cron job:', globalErr.message || globalErr);
    }
  }
}