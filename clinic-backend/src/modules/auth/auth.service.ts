import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service.js';
import {
  RegisterPatientDto,
  RegisterStaffDto,
  LoginDto,
  ChangePasswordDto,
} from './dto/index.js';
import { Role } from '@prisma/client'; // Prisma မှ Role ကို တိုက်ရိုက် သုံးပါ
import * as bcrypt from 'bcrypt';

// Password ကို Type-safe ဖြင့် ဖျက်ထုတ်ပေးမည့် Helper Function
function excludePassword<T extends Record<string, unknown>>(
  user: T,
): Omit<T, 'password'> {
  const userCopy = { ...user } as Record<string, unknown>;
  delete userCopy['password'];
  return userCopy as Omit<T, 'password'>;
}
interface JwtPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 1. Patient Registration Logic
  async registerPatient(dto: RegisterPatientDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'ဒီဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ဖြင့် အကောင့်ဖွင့်ထားပြီးသား ဖြစ်ပါသည်။',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email || null,
        password: hashedPassword,
        role: Role.PATIENT,
        patientProfile: {
          create: {
            fullName: dto.fullName,
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    // '_password' ဟု prefix သုံးခြင်းဖြင့် unused var error မတက်ဘဲ password ကို ဖျက်ထုတ်နိုင်ပါသည်
    return excludePassword(user);
  }

  // 2. Staff / Doctor Registration Logic
  async registerStaff(dto: RegisterStaffDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'ဒီဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ဖြင့် အကောင့်ဖွင့်ထားပြီးသား ဖြစ်ပါသည်။',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email || null,
        password: hashedPassword,
        role: dto.role,
        ...(dto.role === Role.DOCTOR && {
          doctorProfile: {
            create: {
              fullName: dto.fullName,
              title: dto.title || 'Dr.',
              specialization: dto.specialization || 'General Physician',
            },
          },
        }),
        ...(dto.role === Role.STAFF && {
          staffProfile: {
            create: {
              fullName: dto.fullName,
              position: dto.position || 'Staff',
            },
          },
        }),
      },
      include: {
        doctorProfile: true,
        staffProfile: true,
      },
    });

    return excludePassword(user);
  }

  // 3. Login Logic
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.account }, { email: dto.account }],
        deletedAt: null,
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
        staffProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'ဖုန်းနံပါတ်/အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('ဤအကောင့်ကို ခေတ္တပိတ်ထားပါသည်။');
    }

    const isPasswordMatch = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException(
        'ဖုန်းနံပါတ်/အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။',
      );
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: excludePassword(user),
      ...tokens,
    };
  }

  // 4. Refresh Token Logic
  async refreshToken(refreshToken: string) {
    try {
      // Generic Parameter <JwtPayload> ကို တိုက်ရိုက် သုံးထားပါသည်
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
        },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException('အကောင့်သုံးစွဲခွင့် မရှိတော့ပါ');
      }

      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, role: user.role },
        {
          secret: process.env.JWT_ACCESS_SECRET || 'accessSecretKey',
          expiresIn: '1h',
        },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException(
        'အတည်မပြုနိုင်သော Refresh Token ဖြစ်ပါသည်',
      );
    }
  }

  // 5. Change Password Logic
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('အသုံးပြုသူ ရှာမတွေ့ပါ');
    }

    const isOldPasswordMatch = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );

    if (!isOldPasswordMatch) {
      throw new BadRequestException('ယခင် စကားဝှက် မှားယွင်းနေပါသည်');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return { message: 'စကားဝှက် အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ' };
  }

  // Helper Function: Tokens ဖန်တီးပေးခြင်း
  private async generateTokens(userId: string, role: Role) {
    const payload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'accessSecretKey',
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
