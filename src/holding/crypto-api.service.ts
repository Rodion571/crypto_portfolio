import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { PriceSnapshot } from './price-snapshot.entity';

interface CacheEntry {
  price: number;
  expiresAt: number;
}

@Injectable()
export class CryptoApiService {
  private cache: Record<string, CacheEntry> = {};

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(PriceSnapshot)
    private readonly priceSnapshotRepository: Repository<PriceSnapshot>,
  ) {}

  async getPriceInUSD(coinId: string): Promise<number> {
    const normalizedCoinId = coinId.toLowerCase();
    const now = Date.now();

    if (this.cache[normalizedCoinId] && this.cache[normalizedCoinId].expiresAt > now) {
      return this.cache[normalizedCoinId].price;
    }

    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${normalizedCoinId}&vs_currencies=usd`;
      const response: any = await firstValueFrom(this.httpService.get(url));
      
      if (response.data && response.data[normalizedCoinId]) {
        const price = response.data[normalizedCoinId].usd;
        
        this.cache[normalizedCoinId] = {
          price,
          expiresAt: now + 60000,
        };

        return price;
      }
    } catch (error) {
      const lastSnapshot = await this.priceSnapshotRepository.findOne({
        where: { coinId: normalizedCoinId },
        order: { id: 'DESC' },
      });

      if (lastSnapshot) {
        return Number(lastSnapshot.priceUsd);
      }
    }

    return 0;
  }
}