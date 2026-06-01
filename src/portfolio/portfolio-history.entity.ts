import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { PortfolioEntity } from './portfolio.entity';

@Entity('portfolio_history')
export class PortfolioHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalValue!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => PortfolioEntity, { onDelete: 'CASCADE' })
  portfolio!: PortfolioEntity;
}