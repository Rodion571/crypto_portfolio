import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PortfolioEntity } from '../portfolio/portfolio.entity';

@Entity('holdings')
export class HoldingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  coinId!: string;

  @Column('double precision')
  amount!: number;

  @ManyToOne(() => PortfolioEntity, (portfolio) => portfolio.holdings, { onDelete: 'CASCADE' })
  portfolio!: PortfolioEntity;
}