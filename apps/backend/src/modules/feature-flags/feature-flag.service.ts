import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import type { FeatureFlag } from '@prisma/client';

const CACHE_TTL_S = 30;
const CACHE_PREFIX = 'feature_flag:';

function userBucket(flagName: string, userId: string): number {
  const hex = createHash('md5').update(`${flagName}:${userId}`).digest('hex');
  return parseInt(hex.slice(0, 8), 16) % 100;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const flag = await this.getFlag(flagName);
    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;
    if (!userId) return false;
    return userBucket(flagName, userId) < flag.rolloutPercentage;
  }

  async findAll(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: {
    name: string;
    enabled?: boolean;
    rolloutPercentage?: number;
    description?: string;
  }): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.create({ data });
    await this.cache.del(`${CACHE_PREFIX}${data.name}`);
    return flag;
  }

  async update(
    name: string,
    data: { enabled?: boolean; rolloutPercentage?: number; description?: string },
  ): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.update({ where: { name }, data });
    await this.cache.del(`${CACHE_PREFIX}${name}`);
    return flag;
  }

  async remove(name: string): Promise<void> {
    await this.prisma.featureFlag.delete({ where: { name } });
    await this.cache.del(`${CACHE_PREFIX}${name}`);
  }

  private async getFlag(name: string): Promise<FeatureFlag | null> {
    const cached = await this.cache.get<FeatureFlag>(`${CACHE_PREFIX}${name}`);
    if (cached) return cached;
    const flag = await this.prisma.featureFlag.findUnique({ where: { name } }).catch(() => {
      this.logger.warn(`Feature flag lookup failed for '${name}' — defaulting to disabled`);
      return null;
    });
    if (flag) await this.cache.set(`${CACHE_PREFIX}${name}`, flag, CACHE_TTL_S);
    return flag;
  }
}
