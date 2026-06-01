import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioEntity } from './portfolio.entity';
import { PortfolioHistory } from './portfolio-history.entity';
import { DataSource } from 'typeorm';
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';

describe('PortfolioService (Unit Stats Math)', () => {
  let service: PortfolioService;

  const mockPortfolioRepository = {
    findOne: jest.fn<() => Promise<any>>(),
  };

  const mockSnapshotRepository = {
    findOne: jest.fn<() => Promise<any>>(),
  };

  const mockPortfolioHistoryRepository = {
    find: jest.fn<() => Promise<any>>(),
    findOne: jest.fn<() => Promise<any>>(),
    save: jest.fn<() => Promise<any>>(),
  };

  const mockDataSource = {
    getRepository: jest.fn<() => any>().mockReturnValue(mockSnapshotRepository),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(PortfolioEntity),
          useValue: mockPortfolioRepository,
        },
        {
          provide: getRepositoryToken(PortfolioHistory),
          useValue: mockPortfolioHistoryRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty stats if portfolio has no holdings', async () => {
    mockPortfolioRepository.findOne.mockResolvedValue({
      id: 1,
      name: 'Base Portfolio',
      holdings: [],
    } as any);

    const result = await service.findOneWithHoldings(1);

    expect(result.id).toBe(1);
    expect(result.holdings).toEqual([]);
  });

  it('should correctly calculate total value for coins', async () => {
    mockPortfolioRepository.findOne.mockResolvedValue({
      id: 1,
      name: 'Crypto Core',
      holdings: [
        { id: 10, coinId: 'bitcoin', amount: 2, buyPrice: 50000 },
        { id: 11, coinId: 'ethereum', amount: 10, buyPrice: 3000 },
      ],
    } as any);

    (mockSnapshotRepository.findOne as any).mockImplementation((options: any) => {
      const coinId = options.where.coinId;
      if (coinId === 'bitcoin') return Promise.resolve({ priceUsd: 60000 });
      if (coinId === 'ethereum') return Promise.resolve({ priceUsd: 4000 });
      return Promise.resolve(null);
    });

    const result = await service.findOneWithHoldings(1);

    const btc = result.holdings.find((h: any) => h.coinId === 'bitcoin');
    const eth = result.holdings.find((h: any) => h.coinId === 'ethereum');

    expect(btc?.totalValue).toBe(120000); 
    expect(eth?.totalValue).toBe(40000);
  });

  it('should handle zero amounts gracefully without crashing', async () => {
    mockPortfolioRepository.findOne.mockResolvedValue({
      id: 1,
      name: 'Empty State Portfolio',
      holdings: [{ id: 12, coinId: 'bitcoin', amount: 0, buyPrice: 0 }],
    } as any);

    mockSnapshotRepository.findOne.mockResolvedValue({ priceUsd: 60000 } as any);

    const result = await service.findOneWithHoldings(1);

    expect(result.holdings[0].totalValue).toBe(0);
  });
});