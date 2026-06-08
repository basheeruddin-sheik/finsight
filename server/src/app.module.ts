import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TransactionsModule } from './transactions/transactions.module';
import { PersonsModule } from './persons/persons.module';
import { BorrowsModule } from './borrows/borrows.module';
import { SplitsModule } from './splits/splits.module';
import { ReportsModule } from './reports/reports.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TenantInterceptor } from './onboarding/tenant.interceptor';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/finsight'),
    AuthModule,
    OnboardingModule,
    ConfigModule,
    TransactionsModule,
    PersonsModule,
    BorrowsModule,
    SplitsModule,
    ReportsModule,
    BudgetsModule,
  ],
  providers: [
    // Every route requires a valid Auth0 token (unless @Public).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // After auth: bootstrap the user and run handlers in their tenant context.
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
