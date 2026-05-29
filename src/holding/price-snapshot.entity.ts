import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'price_snapshots' })
export class PriceSnapshot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  coinId!: string;

  @Column('float')
  priceUsd!: number;

  @CreateDateColumn()
  capturedAt!: Date;
}