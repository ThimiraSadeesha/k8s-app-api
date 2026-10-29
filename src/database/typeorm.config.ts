import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

export function buildDbOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    // entities and migrations are resolved from src (ts-node) or dist (node)
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    // schema changes only through migrations
    synchronize: false,
    // the app role is not a superuser, so do not let TypeORM try CREATE EXTENSION
    installExtensions: false,
  };
}
