import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1730000000000 implements MigrationInterface {
  name = 'InitSchema1730000000000';

  public async up(q: QueryRunner): Promise<void> {
    // items: managed through the TypeORM repository (see src/items)
    await q.query(`
      CREATE TABLE items (
        id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        name        varchar(100) NOT NULL,
        description text,
        created_at  timestamptz  NOT NULL DEFAULT now(),
        updated_at  timestamptz  NOT NULL DEFAULT now()
      )`);

    // users: managed only through the stored routines below (see src/users)
    await q.query(`
      CREATE TABLE users (
        id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        name       varchar(100) NOT NULL,
        email      varchar(255) NOT NULL UNIQUE,
        created_at timestamptz  NOT NULL DEFAULT now(),
        updated_at timestamptz  NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE FUNCTION sp_user_create(p_name text, p_email text)
      RETURNS SETOF users LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY
          INSERT INTO users (name, email) VALUES (p_name, p_email)
          RETURNING *;
      END $$`);

    await q.query(`
      CREATE FUNCTION sp_user_get(p_id uuid)
      RETURNS SETOF users LANGUAGE sql STABLE AS $$
        SELECT * FROM users WHERE id = p_id
      $$`);

    await q.query(`
      CREATE FUNCTION sp_user_list(p_limit int, p_offset int)
      RETURNS SETOF users LANGUAGE sql STABLE AS $$
        SELECT * FROM users ORDER BY created_at, id LIMIT p_limit OFFSET p_offset
      $$`);

    // NULL arguments leave the column unchanged (partial update)
    await q.query(`
      CREATE FUNCTION sp_user_update(p_id uuid, p_name text, p_email text)
      RETURNS SETOF users LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY
          UPDATE users
             SET name       = COALESCE(p_name, name),
                 email      = COALESCE(p_email, email),
                 updated_at = now()
           WHERE id = p_id
          RETURNING *;
      END $$`);

    await q.query(`
      CREATE FUNCTION sp_user_delete(p_id uuid)
      RETURNS boolean LANGUAGE plpgsql AS $$
      BEGIN
        DELETE FROM users WHERE id = p_id;
        RETURN FOUND;
      END $$`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP FUNCTION IF EXISTS sp_user_delete(uuid)');
    await q.query('DROP FUNCTION IF EXISTS sp_user_update(uuid, text, text)');
    await q.query('DROP FUNCTION IF EXISTS sp_user_list(int, int)');
    await q.query('DROP FUNCTION IF EXISTS sp_user_get(uuid)');
    await q.query('DROP FUNCTION IF EXISTS sp_user_create(text, text)');
    await q.query('DROP TABLE IF EXISTS users');
    await q.query('DROP TABLE IF EXISTS items');
  }
}
