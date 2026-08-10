import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// User Payload Type သတ်မှတ်ခြင်း
export interface UserPayload {
  id?: string;
  role?: string;
  [key: string]: unknown;
}

// User ပါဝင်သော Request Interface
interface RequestWithUser {
  user?: UserPayload;
}

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    // getRequest ကို Generic Type ဖြင့် explicit သတ်မှတ်ပေးလိုက်သဖြင့် 'any' မဟုတ်တော့ပါ
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
