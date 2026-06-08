import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Config, ConfigDocument } from '../schemas/config.schema';
import { BEHAVIOR_COLORS } from './config.defaults';

// Per-user default types/categories are seeded by OnboardingService on first
// login. This service only manages an authenticated user's own config, which
// the tenant plugin auto-scopes by userId.
export { BEHAVIOR_COLORS };

@Injectable()
export class ConfigService {
  constructor(@InjectModel(Config.name) private model: Model<ConfigDocument>) {}

  async getAll() {
    const [types, categories] = await Promise.all([
      this.model.find({ configType: 'type'     }).sort({ order: 1, _id: 1 }),
      this.model.find({ configType: 'category' }).sort({ order: 1, _id: 1 }),
    ]);
    return { types, categories };
  }

  // ── Types ──────────────────────────────────────────────────────────────────

  async addType(dto: {
    key: string; label: string; icon: string; behavior: string;
    hasCategories: boolean; requiresPerson: boolean; personType: string;
  }) {
    const key = dto.key.toUpperCase().replace(/\s+/g, '_');
    if (await this.model.findOne({ configType: 'type', key }))
      throw new BadRequestException('A type with this key already exists');
    const color = BEHAVIOR_COLORS[dto.behavior] ?? 'text-slate-600';
    const count = await this.model.countDocuments({ configType: 'type' });
    return this.model.create({ configType: 'type', key, label: dto.label, icon: dto.icon, color, behavior: dto.behavior, hasCategories: dto.hasCategories ?? false, requiresPerson: dto.requiresPerson ?? false, personType: dto.personType ?? 'ANY', isBuiltin: false, order: count });
  }

  async deleteType(key: string) {
    const doc = await this.model.findOne({ configType: 'type', key });
    if (!doc) throw new NotFoundException('Type not found');
    if (doc.isBuiltin) throw new BadRequestException('Cannot delete a built-in type');
    await this.model.deleteOne({ configType: 'type', key });
    return { deleted: true };
  }

  async updateType(key: string, dto: {
    label?: string; icon?: string; behavior?: string;
    hasCategories?: boolean; requiresPerson?: boolean; personType?: string;
  }) {
    const existing = await this.model.findOne({ configType: 'type', key });
    if (!existing) throw new NotFoundException('Type not found');

    const update: any = {};
    if (dto.icon !== undefined) update.icon = dto.icon;        // icon is always editable
    if (!existing.isBuiltin) {                                  // built-ins: icon only
      if (dto.label     !== undefined) update.label          = dto.label.trim();
      if (dto.behavior  !== undefined) { update.behavior = dto.behavior; update.color = BEHAVIOR_COLORS[dto.behavior] ?? 'text-slate-600'; }
      if (dto.hasCategories  !== undefined) update.hasCategories  = dto.hasCategories;
      if (dto.requiresPerson !== undefined) update.requiresPerson = dto.requiresPerson;
      if (dto.personType     !== undefined) update.personType     = dto.personType;
    }
    return this.model.findOneAndUpdate({ configType: 'type', key }, update, { new: true });
  }

  async setTypeArchived(key: string, archived: boolean) {
    const doc = await this.model.findOne({ configType: 'type', key });
    if (!doc) throw new NotFoundException('Type not found');
    if (doc.isBuiltin) throw new BadRequestException('Built-in types cannot be archived');
    return this.model.findOneAndUpdate({ configType: 'type', key }, { archived }, { new: true });
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async addCategory(dto: { key: string; label: string; icon: string }) {
    const key = dto.key.toUpperCase().replace(/\s+/g, '_');
    if (await this.model.findOne({ configType: 'category', key }))
      throw new BadRequestException('Category already exists');
    const count = await this.model.countDocuments({ configType: 'category' });
    return this.model.create({ configType: 'category', key, label: dto.label, icon: dto.icon, isBuiltin: false, order: count });
  }

  async deleteCategory(key: string) {
    const doc = await this.model.findOne({ configType: 'category', key });
    if (!doc) throw new NotFoundException('Category not found');
    if (doc.isBuiltin) throw new BadRequestException('Cannot delete a built-in category');
    await this.model.deleteOne({ configType: 'category', key });
    return { deleted: true };
  }

  async updateCategory(key: string, dto: { label?: string; icon?: string }) {
    const existing = await this.model.findOne({ configType: 'category', key });
    if (!existing) throw new NotFoundException('Category not found');

    const update: any = {};
    if (dto.icon !== undefined) update.icon = dto.icon;                      // always editable
    if (!existing.isBuiltin && dto.label !== undefined) update.label = dto.label.trim(); // built-ins: icon only
    return this.model.findOneAndUpdate({ configType: 'category', key }, update, { new: true });
  }

  async setCategoryArchived(key: string, archived: boolean) {
    const doc = await this.model.findOne({ configType: 'category', key });
    if (!doc) throw new NotFoundException('Category not found');
    if (doc.isBuiltin) throw new BadRequestException('Built-in categories cannot be archived');
    return this.model.findOneAndUpdate({ configType: 'category', key }, { archived }, { new: true });
  }

  // ── Behavior map (used by other services) ─────────────────────────────────

  async getBehaviorMap(): Promise<Map<string, string>> {
    const types = await this.model.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }
}
