import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

// Validates Auth0 RS256 access tokens against the tenant's JWKS, checking
// issuer + audience + expiry. The `sub` claim is the stable user id.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const domain = process.env.AUTH0_DOMAIN;
    const audience = process.env.AUTH0_AUDIENCE;
    if (!domain || !audience) {
      throw new Error('AUTH0_DOMAIN and AUTH0_AUDIENCE environment variables are required');
    }
    const issuer = `https://${domain}/`;
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience,
      issuer,
      algorithms: ['RS256'],
    });
  }

  validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException();
    return { sub: payload.sub as string, email: payload.email };
  }
}
