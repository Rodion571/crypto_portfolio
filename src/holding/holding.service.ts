import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HoldingEntity } from './holding.entity';
import { PortfolioEntity } from '../portfolio/portfolio.entity';
import { PriceSnapshot } from './price-snapshot.entity';

@Injectable()
export class HoldingService {
  constructor(
    @InjectRepository(HoldingEntity)
    private readonly holdingRepository: Repository<HoldingEntity>,
    @InjectRepository(PortfolioEntity)
    private readonly portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PriceSnapshot)
    private readonly priceSnapshotRepository: Repository<PriceSnapshot>,
  ) {}

  async create(data: { portfolioId: number; coinId: string; amount: number }) {
    const portfolio = await this.portfolioRepository.findOne({ where: { id: data.portfolioId } });
    if (!portfolio) throw new Error('Portfolio not found');

    const holding = this.holdingRepository.create({
      coinId: data.coinId,
      amount: data.amount,
      portfolio,
    });
    return this.holdingRepository.save(holding);
  }

  async findAll() {
    return this.holdingRepository.find({
      relations: {
        portfolio: true,
      },
    });
  }

  async remove(id: number): Promise<void> {
    await this.holdingRepository.delete(id);
  }

  async getCoinHistory(coinId: string): Promise<PriceSnapshot[]> {
    return this.priceSnapshotRepository.find({
      where: { coinId: coinId.toLowerCase() },
      order: { capturedAt: 'DESC' },
      take: 10,
    });
  }

  async reduceAmount(id: number, amountToRemove: number) {
    const holding = await this.holdingRepository.findOne({ where: { id } });
    if (!holding) {
      throw new Error('Актив не найден');
    }

    if (holding.amount <= amountToRemove) {
      await this.holdingRepository.delete(id);
    } else {
      holding.amount = Number((holding.amount - amountToRemove).toFixed(8));
      await this.holdingRepository.save(holding);
    }
    return { success: true };
  }

  async getPortfolioStats(portfolioId: number) {
    const holdings = await this.holdingRepository.find({
      where: { portfolio: { id: portfolioId } },
    });

    if (holdings.length === 0) {
      return {
        totalValue: 0,
        change24hPercent: 0,
        change24hAbsolute: 0,
        topCoins: [],
        averagePrices7Days: {},
      };
    }

    const coinIds = Array.from(new Set(holdings.map((h) => h.coinId)));
    const currentPrices: Record<string, number> = {};
    
    for (const coinId of coinIds) {
      const lastSnapshot = await this.priceSnapshotRepository.findOne({
        where: { coinId: coinId.toLowerCase() },
        order: { capturedAt: 'DESC' },
      });
      currentPrices[coinId] = lastSnapshot ? Number(lastSnapshot.priceUsd) : 0;
    }

    let totalValue = 0;
    const coinValues: Record<string, number> = {};

    holdings.forEach((h) => {
      const currentPrice = currentPrices[h.coinId] || 0;
      const value = Number((Number(h.amount) * currentPrice).toFixed(2));
      totalValue = Number((totalValue + value).toFixed(2));
      coinValues[h.coinId] = Number(((coinValues[h.coinId] || 0) + value).toFixed(2));
    });

    const topCoins = Object.entries(coinValues)
      .map(([coinId, value]) => ({
        coinId,
        value: isNaN(value) ? 0 : Number(value.toFixed(2)),
        share: totalValue > 0 && !isNaN(value) ? Number(((value / totalValue) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const now = new Date();
    const date24hAgoStart = new Date(now.getTime() - 24 * 60 * 60 * 1000 - 15 * 60 * 1000);
    const date24hAgoEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000 + 15 * 60 * 1000);

    let totalValue24hAgo = 0;

    for (const h of holdings) {
      const snapshot24h = await this.priceSnapshotRepository.createQueryBuilder('snapshot')
        .where('snapshot.coinId = :coinId', { coinId: h.coinId.toLowerCase() })
        .andWhere('snapshot.capturedAt BETWEEN :start AND :end', { start: date24hAgoStart, end: date24hAgoEnd })
        .orderBy('snapshot.capturedAt', 'DESC')
        .getOne();
      
      const price24h = snapshot24h ? Number(snapshot24h.priceUsd) : currentPrices[h.coinId];
      const value24h = Number((Number(h.amount) * price24h).toFixed(2));
      totalValue24hAgo = Number((totalValue24hAgo + value24h).toFixed(2));
    }

    const change24hAbsolute = Number((totalValue - totalValue24hAgo).toFixed(2));
    const change24hPercent = totalValue24hAgo > 0 
      ? ((totalValue - totalValue24hAgo) / totalValue24hAgo) * 100 
      : 0;

    const date7DaysAgo = new Date();
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
    
    const averagePrices7Days: Record<string, number> = {};

    for (const coinId of coinIds) {
      const snapshots = await this.priceSnapshotRepository.find({
        where: { coinId: coinId.toLowerCase() },
      });

      const filteredSnapshots = snapshots.filter(s => new Date(s.capturedAt) >= date7DaysAgo);

      if (filteredSnapshots.length > 0) {
        const sum = filteredSnapshots.reduce((acc, s) => acc + Number(s.priceUsd), 0);
        averagePrices7Days[coinId] = Number((sum / filteredSnapshots.length).toFixed(2));
      } else {
        averagePrices7Days[coinId] = Number(currentPrices[coinId].toFixed(2));
      }
    }

    const safeTotalValue = isNaN(totalValue) ? 0 : Number(totalValue.toFixed(2));
    const safeChangePercent = isNaN(change24hPercent) || !isFinite(change24hPercent) ? 0 : Number(change24hPercent.toFixed(2));
    const safeChangeAbsolute = isNaN(change24hAbsolute) ? 0 : Number(change24hAbsolute.toFixed(2));

    return {
      totalValue: safeTotalValue,
      change24hPercent: safeChangePercent,
      change24hAbsolute: safeChangeAbsolute,
      topCoins,
      averagePrices7Days,
    };
  }
}