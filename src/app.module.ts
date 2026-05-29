import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PortfolioModule } from './portfolio/portfolio.module';
import { HoldingModule } from './holding/holding.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'Rodion05041999',
      database: 'crypto_portfolio',
      autoLoadEntities: true,
      synchronize: false,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    PortfolioModule,
    HoldingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}