import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePortfolioHistoryTable1780303008071 implements MigrationInterface {
    name = 'CreatePortfolioHistoryTable1780303008071'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "portfolio_history" (
                "id" SERIAL NOT NULL, 
                "totalValue" NUMERIC(12,2) NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "portfolioId" integer, 
                CONSTRAINT "PK_portfolio_history_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "portfolio_history" 
            ADD CONSTRAINT "FK_portfolio_history_portfolio" 
            FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "portfolio_history" DROP CONSTRAINT "FK_portfolio_history_portfolio"`);
        await queryRunner.query(`DROP TABLE "portfolio_history"`);
    }
}