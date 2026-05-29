import { DataSource } from 'typeorm';
import { PortfolioEntity } from './portfolio/portfolio.entity';
import { HoldingEntity } from './holding/holding.entity';
import { PriceSnapshot } from './holding/price-snapshot.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'Rodion05041999',
  database: 'crypto_portfolio',
  synchronize: false,
  logging: true,
  entities: [PortfolioEntity, HoldingEntity, PriceSnapshot],
  migrations: ['src/migrations/*{.ts,.js}'],
});