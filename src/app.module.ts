import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDbOptions } from './database/typeorm.config';
import { HealthController } from './health.controller';
import { ItemsModule } from './items/items.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDbOptions(config.getOrThrow<string>('DATABASE_URL')),
        // apply pending migrations on startup (single-node deploy; see README)
        migrationsRun: true,
      }),
    }),
    UsersModule,
    ItemsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
