import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Restricts Efí admin endpoints to the internal operations channel.
 * This is NOT merchant RBAC and cannot be used to expose multi-tenant APIs.
 * Never accept token in URL query/body. Do not log authentication tokens.
 */
@Injectable()
export class EfiOperationsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configured = process.env.NEXTGEN_ADMIN_TOKEN;
    if (!configured || configured.length < 32 || /SUBSTITUA|PLACEHOLDER|TROCAR|EXAMPLE|XXXXX/i.test(configured)) {
      throw new ServiceUnavailableException('EFI_OPERATIONS_AUTH_NOT_CONFIGURED');
    }
    const req = context.switchToHttp().getRequest();
    const supplied = req.headers?.['x-nextgen-admin-token'];
    if (typeof supplied !== 'string' || supplied.length !== configured.length) {
      throw new UnauthorizedException('UNAUTHORIZED_EFI_OPERATIONS');
    }
    if (!timingSafeEqual(Buffer.from(supplied, 'utf8'), Buffer.from(configured, 'utf8'))) {
      throw new UnauthorizedException('UNAUTHORIZED_EFI_OPERATIONS');
    }
    return true;
  }
}
