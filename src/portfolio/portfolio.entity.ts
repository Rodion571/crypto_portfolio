import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { HoldingEntity } from '../holding/holding.entity'; 

@Entity('portfolios')
export class PortfolioEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; 

  @CreateDateColumn()
  createdAt!: Date; 

  @OneToMany(() => HoldingEntity, (holding) => holding.portfolio)
  holdings!: HoldingEntity[]; 
}