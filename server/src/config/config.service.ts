import { Injectable, OnApplicationBootstrap, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Config, ConfigDocument } from '../schemas/config.schema';

// Behavior drives all math — label/icon/key are just display
// INCOME       → positive savings impact
// EXPENSE      → negative savings impact
// TRANSFER     → neutral (family / household send)
// LEND         → money lent out (tracked via borrows)
// RECEIVE_BACK → borrow recovery

export const BEHAVIOR_COLORS: Record<string, string> = {
  INCOME:       'text-emerald-600',
  EXPENSE:      'text-rose-500',
  TRANSFER:     'text-blue-500',
  LEND:         'text-amber-500',
  RECEIVE_BACK: 'text-violet-500',
};

const DEFAULT_TYPES = [
  { configType: 'type', key: 'EXPENSE',         label: 'Expense',         icon: '💸', color: 'text-rose-500',    behavior: 'EXPENSE',      hasCategories: true,  requiresPerson: false, personType: 'ANY',    isBuiltin: true, order: 0 },
  { configType: 'type', key: 'INCOME',           label: 'Income',           icon: '💰', color: 'text-emerald-600', behavior: 'INCOME',       hasCategories: false, requiresPerson: false, personType: 'ANY',    isBuiltin: true, order: 1 },
  { configType: 'type', key: 'FAMILY_TRANSFER',  label: 'Family',           icon: '👨‍👩‍👦', color: 'text-blue-500',   behavior: 'TRANSFER',     hasCategories: false, requiresPerson: true,  personType: 'FAMILY', isBuiltin: true, order: 2 },
  { configType: 'type', key: 'BORROW_GIVEN',     label: 'Borrow Given',     icon: '🤝', color: 'text-amber-500',  behavior: 'LEND',         hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true, order: 3 },
  { configType: 'type', key: 'BORROW_RECEIVED',  label: 'Borrow Received',  icon: '📥', color: 'text-violet-500', behavior: 'RECEIVE_BACK', hasCategories: false, requiresPerson: true,  personType: 'ANY',    isBuiltin: true, order: 4 },
];

const DEFAULT_CATEGORIES = [
  { configType: 'category', key: 'FOOD_DINING',   label: 'Food',          icon: '🍜', isBuiltin: true, order: 0 },
  { configType: 'category', key: 'GROCERIES',     label: 'Groceries',     icon: '🛒', isBuiltin: true, order: 1 },
  { configType: 'category', key: 'SHOPPING',      label: 'Shopping',      icon: '🛍️', isBuiltin: true, order: 2 },
  { configType: 'category', key: 'FUEL_TRAVEL',   label: 'Fuel / Travel', icon: '⛽', isBuiltin: true, order: 3 },
  { configType: 'category', key: 'SUBSCRIPTIONS', label: 'Subscriptions', icon: '📱', isBuiltin: true, order: 4 },
  { configType: 'category', key: 'MEDICAL',       label: 'Medical',       icon: '💊', isBuiltin: true, order: 5 },
  { configType: 'category', key: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎬', isBuiltin: true, order: 6 },
  { configType: 'category', key: 'UTILITIES',     label: 'Utilities',     icon: '💡', isBuiltin: true, order: 7 },
  { configType: 'category', key: 'OTHER',         label: 'Other',         icon: '💰', isBuiltin: true, order: 8 },
];

@Injectable()
export class ConfigService implements OnApplicationBootstrap {
  constructor(@InjectModel(Config.name) private model: Model<ConfigDocument>) {}

  async onApplicationBootstrap() {
    const [typeCount, catCount] = await Promise.all([
      this.model.countDocuments({ configType: 'type' }),
      this.model.countDocuments({ configType: 'category' }),
    ]);
    if (typeCount === 0) await this.model.insertMany(DEFAULT_TYPES);
    if (catCount  === 0) await this.model.insertMany(DEFAULT_CATEGORIES);
  }

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
    const update: any = {};
    if (dto.label     !== undefined) update.label          = dto.label.trim();
    if (dto.icon      !== undefined) update.icon           = dto.icon;
    if (dto.behavior  !== undefined) { update.behavior = dto.behavior; update.color = BEHAVIOR_COLORS[dto.behavior] ?? 'text-slate-600'; }
    if (dto.hasCategories  !== undefined) update.hasCategories  = dto.hasCategories;
    if (dto.requiresPerson !== undefined) update.requiresPerson = dto.requiresPerson;
    if (dto.personType     !== undefined) update.personType     = dto.personType;
    const doc = await this.model.findOneAndUpdate({ configType: 'type', key }, update, { new: true });
    if (!doc) throw new NotFoundException('Type not found');
    return doc;
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
    const update: any = {};
    if (dto.label) update.label = dto.label.trim();
    if (dto.icon)  update.icon  = dto.icon;
    const doc = await this.model.findOneAndUpdate({ configType: 'category', key }, update, { new: true });
    if (!doc) throw new NotFoundException('Category not found');
    return doc;
  }

  // ── Behavior map (used by other services) ─────────────────────────────────

  async getBehaviorMap(): Promise<Map<string, string>> {
    const types = await this.model.find({ configType: 'type' });
    return new Map(types.map(t => [t.key, t.behavior]));
  }
}
