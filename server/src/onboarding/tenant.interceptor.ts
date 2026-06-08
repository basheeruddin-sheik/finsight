import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../context/request-context';
import { OnboardingService } from './onboarding.service';

// Runs after the auth guard: bootstraps the user's data if needed, then runs
// the route handler inside the tenant context so every query is auto-scoped.
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly onboarding: OnboardingService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req?.user?.sub;
    if (!userId) return next.handle(); // public routes — no tenant context

    await this.onboarding.ensureUser(userId);

    return new Observable((subscriber) => {
      RequestContext.run({ userId }, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
