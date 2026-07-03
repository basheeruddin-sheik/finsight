import { Controller, Post, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

// Admin-only endpoint to manually trigger seeding for a specific user.
// Protected by ADMIN_SECRET env var — not exposed to the frontend.
@Controller('admin')
export class AdminController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('reseed/:userId')
  async reseed(
    @Param('userId') userId: string,
    @Headers('x-admin-secret') secret: string,
  ) {
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      throw new UnauthorizedException();
    }
    await this.onboarding.reseedUser(userId);
    return { ok: true, userId };
  }
}
