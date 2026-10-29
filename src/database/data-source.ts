import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDbOptions } from './typeorm.config';

// Used by the TypeORM CLI (npm run migration:run)
export default new DataSource(
  buildDbOptions(
    process.env.DATABASE_URL ??
      'postgres://nest_app:nest_app@localhost:5432/nest_app',
  ),
);
