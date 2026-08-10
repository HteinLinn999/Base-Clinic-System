import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Role } from '@/modules/auth/dto/index.js';

interface RequestWithUser {
  user?: {
    role?: Role;
    [key: string]: unknown;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException(
        'ဤလုပ်ဆောင်ချက်ကို လုပ်ဆောင်ရန် ခွင့်ပြုချက်မရှိပါ',
      );
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        'ဤလုပ်ဆောင်ချက်ကို လုပ်ဆောင်ရန် ခွင့်ပြုချက်မရှိပါ',
      );
    }

    return true;
  }
}
