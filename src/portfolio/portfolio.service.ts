import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioEntity } from './portfolio.entity'; 

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private readonly portfolioRepository: Repository<PortfolioEntity>, 
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
}