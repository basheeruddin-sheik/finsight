import { Controller, Get, Post, Delete, Patch, Put, Body, Param } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  // ── Types ──────────────────────────────────────────────────────────────────

  @Post('types')
  addType(@Body() dto: {
    key: string; label: string; icon: string; behavior: string;
    hasCategories: boolean; requiresPerson: boolean; personType: string;
  }) { return this.service.addType(dto); }

  @Delete('types/:key')
  deleteType(@Param('key') key: string) { return this.service.deleteType(key); }

  @Patch('types/:key')
  updateType(@Param('key') key: string, @Body() dto: {
    label?: string; icon?: string; behavior?: string;
    hasCategories?: boolean; requiresPerson?: boolean; personType?: string;
  }) {
    return this.service.updateType(key, dto);
  }

  @Put('types/:key/archive')
  archiveType(@Param('key') key: string) { return this.service.setTypeArchived(key, true); }

  @Put('types/:key/restore')
  restoreType(@Param('key') key: string) { return this.service.setTypeArchived(key, false); }

  // ── Categories ─────────────────────────────────────────────────────────────

  @Post('categories')
  addCategory(@Body() dto: { key: string; label: string; icon: string }) {
    return this.service.addCategory(dto);
  }

  @Delete('categories/:key')
  deleteCategory(@Param('key') key: string) { return this.service.deleteCategory(key); }

  @Patch('categories/:key')
  updateCategory(@Param('key') key: string, @Body() dto: { label?: string; icon?: string }) {
    return this.service.updateCategory(key, dto);
  }

  @Put('categories/:key/archive')
  archiveCategory(@Param('key') key: string) { return this.service.setCategoryArchived(key, true); }

  @Put('categories/:key/restore')
  restoreCategory(@Param('key') key: string) { return this.service.setCategoryArchived(key, false); }
}
