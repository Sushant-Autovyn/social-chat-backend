import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity/user.entity';

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  avatar?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const user = this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      avatar: dto.avatar ?? null,
    });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async findByIds(ids: number[]): Promise<UserEntity[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.find({ where: { id: In(ids) } });
  }

  async updateProfile(
    id: number,
    patch: { fullName?: string; avatar?: string | null },
  ): Promise<UserEntity> {
    const user = await this.findById(id);
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.avatar !== undefined) user.avatar = patch.avatar;
    return this.usersRepository.save(user);
  }
}
