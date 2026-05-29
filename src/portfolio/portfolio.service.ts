import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PortfolioEntity } from './portfolio.entity'; 

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfolioRepository: Repository<PortfolioEntity>, 
    private readonly dataSource: DataSource,
  ) {}

  async create(name: string) {
    const portfolio = this.portfolioRepository.create({ name });
    return await this.portfolioRepository.save(portfolio);
  }

  async findAll() {
    return await this.portfolioRepository.find();
  }

  async remove(id: number): Promise<void> {
    await this.portfolioRepository.delete(id);
  }

  async findOneWithHoldings(id: number) {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id },
      relations: { holdings: true },
    });
    if (!portfolio) throw new Error('Portfolio not found');

    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return { ...portfolio, holdings: [] };
    }

    const priceSnapshotRepository = this.dataSource.getRepository('PriceSnapshot');

    const holdingsWithPrices = await Promise.all(
      portfolio.holdings.map(async (h: any) => {
        const amount = Number(h.amount);
        const buyPrice = Number(h.buyPrice || 0);

        const lastSnapshot = await priceSnapshotRepository.findOne({
          where: { coinId: h.coinId.toLowerCase() },
          order: { capturedAt: 'DESC' },
        });
        const currentPrice = lastSnapshot ? Number(lastSnapshot.priceUsd) : 0;

        return {
          id: h.id,
          coinId: h.coinId,
          amount: amount,
          buyPrice: buyPrice > 0 ? buyPrice : currentPrice,
          currentPrice: currentPrice,
          totalValue: Number((amount * currentPrice).toFixed(2)),
        };
      }),
    );

    return {
      id: portfolio.id,
      name: portfolio.name,
      holdings: holdingsWithPrices,
    };
  }
}