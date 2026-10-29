import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './item.entity';

// Plain TypeORM repository CRUD
@Injectable()
export class ItemsService {
  constructor(@InjectRepository(Item) private readonly repo: Repository<Item>) {}

  create(dto: CreateItemDto): Promise<Item> {
    return this.repo.save(this.repo.create({ description: null, ...dto }));
  }

  findAll(limit: number, offset: number): Promise<Item[]> {
    return this.repo.find({
      order: { createdAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);
    await this.repo.save(Object.assign(item, dto));
    // save() returns only the changed columns, so re-read the full row
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException(`Item ${id} not found`);
  }
}
