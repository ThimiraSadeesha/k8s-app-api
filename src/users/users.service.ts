import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

const UNIQUE_VIOLATION = '23505';

// Every operation goes through a stored routine (see migrations/*-InitSchema.ts);
// there is deliberately no User entity or repository here.
@Injectable()
export class UsersService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async create(dto: CreateUserDto): Promise<User> {
    const rows = await this.call<UserRow>(
      'SELECT * FROM sp_user_create($1, $2)',
      [dto.name, dto.email],
    );
    return toUser(rows[0]);
  }

  async findAll(limit: number, offset: number): Promise<User[]> {
    const rows = await this.call<UserRow>(
      'SELECT * FROM sp_user_list($1, $2)',
      [limit, offset],
    );
    return rows.map(toUser);
  }

  async findOne(id: string): Promise<User> {
    const rows = await this.call<UserRow>('SELECT * FROM sp_user_get($1)', [id]);
    if (rows.length === 0) throw new NotFoundException(`User ${id} not found`);
    return toUser(rows[0]);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const rows = await this.call<UserRow>(
      'SELECT * FROM sp_user_update($1, $2, $3)',
      [id, dto.name ?? null, dto.email ?? null],
    );
    if (rows.length === 0) throw new NotFoundException(`User ${id} not found`);
    return toUser(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const rows = await this.call<{ sp_user_delete: boolean }>(
      'SELECT sp_user_delete($1)',
      [id],
    );
    if (!rows[0].sp_user_delete) throw new NotFoundException(`User ${id} not found`);
  }

  private async call<T>(sql: string, params: unknown[]): Promise<T[]> {
    try {
      return await this.db.query(sql, params);
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException('A user with this email already exists');
      }
      throw err;
    }
  }
}

function toUser(r: UserRow): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
