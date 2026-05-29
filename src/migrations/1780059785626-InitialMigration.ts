import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1780059785626 implements MigrationInterface {
    name = 'InitialMigration1780059785626'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "holdings" ("id" SERIAL NOT NULL, "coinId" character varying NOT NULL, "amount" double precision NOT NULL, "portfolioId" integer, CONSTRAINT "PK_df4e42f95014be15a4ccc8547c0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "portfolios" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_488aa6e9b219d1d9087126871ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "price_snapshots" ("id" SERIAL NOT NULL, "coinId" character varying NOT NULL, "priceUsd" double precision NOT NULL, "capturedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_506dbfba578050df342b613daec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "holdings" ADD CONSTRAINT "FK_2fe2a52fb8c0d40f400285b9dba" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holdings" DROP CONSTRAINT "FK_2fe2a52fb8c0d40f400285b9dba"`);
        await queryRunner.query(`DROP TABLE "price_snapshots"`);
        await queryRunner.query(`DROP TABLE "portfolios"`);
        await queryRunner.query(`DROP TABLE "holdings"`);
    }

}
