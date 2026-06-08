import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Injects the authenticated user's id (Auth0 `sub`) into a handler param.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.sub;
  },
);
