# k8s-app-api

NestJS + TypeORM + Postgres API, deployed to k3s (see `k8s-config`).

| Resource | Data access |
|---|---|
| `/api/users` | Postgres stored routines only (`sp_user_*`), no entity or repository |
| `/api/items` | Plain TypeORM repository |
| `/health` | Liveness/readiness probe (outside the `/api` prefix) |

## Run locally

```bash
cp .env.example .env
docker compose up -d        # Postgres on :5432
npm install
npm run start:dev           # http://localhost:3000, migrations run on startup
```

## Endpoints

Both resources expose the same shape:

| Method | Path | Result |
|---|---|---|
| POST | `/api/<resource>` | 201 created |
| GET | `/api/<resource>?limit=50&offset=0` | 200 list (limit 1-200) |
| GET | `/api/<resource>/:id` | 200, 404 if missing |
| PATCH | `/api/<resource>/:id` | 200, partial update |
| DELETE | `/api/<resource>/:id` | 204, 404 if missing |

Users: `{ "name": "Ada", "email": "ada@example.com" }`. A duplicate email returns 409.
Items: `{ "name": "Widget", "description": "optional" }`.
Unknown fields are rejected (400), and ids must be UUIDs.

```bash
curl -X POST localhost:3000/api/users -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

## Stored routines

Defined in `src/migrations/1730000000000-InitSchema.ts`:

| Routine | Called as |
|---|---|
| `sp_user_create(name, email)` | `SELECT * FROM sp_user_create($1, $2)` |
| `sp_user_get(id)` | `SELECT * FROM sp_user_get($1)` |
| `sp_user_list(limit, offset)` | `SELECT * FROM sp_user_list($1, $2)` |
| `sp_user_update(id, name, email)` | `SELECT * FROM sp_user_update($1, $2, $3)`, NULL leaves a column unchanged |
| `sp_user_delete(id)` | `SELECT sp_user_delete($1)`, returns whether a row was deleted |

These are Postgres functions (`CREATE FUNCTION`), not `CREATE PROCEDURE`. Postgres procedures
cannot return rows to the caller, and each call here needs the row back.

## Migrations

`synchronize` is off; schema changes only go through migrations in `src/migrations`.
They run automatically on startup (`migrationsRun: true`). Manually:

```bash
npm run migration:run
npm run migration:revert
```

With 2+ replicas starting at once (prod), two pods can race on a new migration: the loser
crashes once and restarts after the winner finishes. For heavier migrations, run them as a
Job before rolling out and set `migrationsRun` to false.

## Deploy

Push to `dev` -> image to GHCR -> dev namespace. Push to `main` -> prod (after approval).
Config: `DATABASE_URL` comes from the `k8s-app-api-secrets` Secret in each namespace.
