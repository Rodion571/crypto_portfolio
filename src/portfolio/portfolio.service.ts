import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PortfolioEntity } from './portfolio.entity'; 
import { PortfolioHistory } from './portfolio-history.entity';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfolioRepository: Repository<PortfolioEntity>, 
    @InjectRepository(PortfolioHistory)
    private readonly historyRepository: Repository<PortfolioHistory>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePortfolioSnapshots() {
    try {
      const portfolios = await this.findAll();
      for (const portfolio of portfolios) {
        const details = await this.findOneWithHoldings(portfolio.id);
        const holdings = (details as any)?.holdings as any[]; //TODO: fix this typing
        
        const currentTotalValue = holdings && holdings.length > 0 
          ? holdings.reduce((sum: number, h: any) => sum + Number(h.totalValue || 0), 0)
          : 0;

        await this.historyRepository.save({
          portfolio: { id: portfolio.id } as any,
          totalValue: Number(currentTotalValue.toFixed(2)),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async create(name: string) {
    const portfolio = this.portfolioRepository.create({ name });
    return await this.portfolioRepository.save(portfolio);
  }

  async findAll() {
    return await this.portfolioRepository.find();
  }

  async remove(id: number): Promise<void> {
    await this.historyRepository.delete({ portfolio: { id } });
    await this.portfolioRepository.delete(id);
  }

  async getHistoryData(portfolioId: number) {
    return await this.historyRepository.find({
      where: { portfolio: { id: portfolioId } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOneWithHoldings(id: number) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: { holdings: true },
    });
    if (!portfolio) throw new Error('Portfolio not found');

    const priceSnapshotRepository = this.dataSource.getRepository('PriceSnapshot');

    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return { 
        ...portfolio, 
        holdings: [], 
        stats24h: { changeInDollars: 0, changeInPercentage: 0 } 
      };
    }

    const groupedHoldingsMap = new Map<string, { amount: number; ids: number[] }>();
    for (const h of portfolio.holdings) {
      const key = h.coinId.toLowerCase();
      const current = groupedHoldingsMap.get(key) || { amount: 0, ids: [] };
      groupedHoldingsMap.set(key, {
        amount: current.amount + Number(h.amount),
        ids: [...current.ids, h.id],
      });
    }

    let currentTotalValue = 0;
    let totalValue24hAgo = 0;

    const now = new Date();
    const target24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const date7DaysAgo = new Date();
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);

    const holdingsWithPrices = await Promise.all(
      Array.from(groupedHoldingsMap.entries()).map(async ([coinId, data]) => {
        const amount = data.amount;

        const lastSnapshot = await priceSnapshotRepository.findOne({
          where: { coinId },
          order: { capturedAt: 'DESC' },
        });
        const currentPrice = lastSnapshot ? Number(lastSnapshot.priceUsd) : 0;
        const totalValue = Number((amount * currentPrice).toFixed(2));
        currentTotalValue += totalValue;

        const snapshots7Days = await priceSnapshotRepository.find({
          where: { coinId },
        });
        const filteredSnapshots = snapshots7Days.filter(
          (s: any) => new Date(s.capturedAt) >= date7DaysAgo,
        );
        
        const average7DaysPrice = filteredSnapshots.length > 0
          ? Number((filteredSnapshots.reduce((acc: number, s: any) => acc + Number(s.priceUsd), 0) / filteredSnapshots.length).toFixed(2))
          : currentPrice;

        const snapshot24h = await priceSnapshotRepository.createQueryBuilder('snapshot')
          .where('snapshot.coinId = :coinId', { coinId })
          .andWhere('snapshot.capturedAt <= :target', { target: target24hAgo })
          .orderBy('snapshot.capturedAt', 'DESC')
          .getOne();
        
        const fallbackSnapshot = snapshot24h || await priceSnapshotRepository.findOne({
          where: { coinId },
          order: { capturedAt: 'ASC' }
        });

        const price24h = fallbackSnapshot ? Number(fallbackSnapshot.priceUsd) : currentPrice;
        const value24h = Number((amount * price24h).toFixed(2));
        totalValue24hAgo += value24h;

        return {
          id: data.ids[0],
          allIds: data.ids,
          coinId: coinId,
          amount: amount,
          buyPrice: average7DaysPrice, 
          currentPrice: currentPrice,
          totalValue: totalValue,
        };
      }),
    );

    const changeInDollars = Number((currentTotalValue - totalValue24hAgo).toFixed(2));
    const changeInPercentage = totalValue24hAgo > 0 
      ? Number(((changeInDollars / totalValue24hAgo) * 100).toFixed(2)) 
      : 0;

    return {
      id: portfolio.id,
      name: portfolio.name,
      holdings: holdingsWithPrices,
      stats24h: {
        changeInDollars,
        changeInPercentage,
      },
    };
  }
}