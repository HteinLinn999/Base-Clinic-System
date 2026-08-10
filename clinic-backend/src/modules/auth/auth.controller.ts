import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '@/modules/auth/auth.service.js';
import {
  RegisterPatientDto,
  RegisterStaffDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  Role,
} from '@/modules/auth/dto/index.js';

// Index ဖိုင်တိုက်ရိုက် ခေါ်မရပါက လမ်းကြောင်းအပြည့်အစုံ ရေးပေးနိုင်ပါသည်
// (သို့မဟုတ် src/common/index.ts ရှိပါက '@/common/index.js' အတိုင်း သုံးနိုင်ပါသည်)
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { GetUser } from '@/common/decorators/get-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Patient များ အကောင့်ဖွင့်ရန်
  @Post('register/patient')
  async registerPatient(@Body() dto: RegisterPatientDto) {
    return await this.authService.registerPatient(dto);
  }

  // 2. Staff / Doctor များ အကောင့်ဖွင့်ရန်
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('register/staff')
  async registerStaff(@Body() dto: RegisterStaffDto) {
    return await this.authService.registerStaff(dto);
  }

  // 3. Login ဝင်ရန်
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  // 4. Access Token Refresh လုပ်ရန်
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto.refreshToken);
  }

  // 5. လက်ရှိ User အချက်အလက် ယူရန်
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@GetUser() user: Record<string, unknown>) {
    return user;
  }

  // 6. စကားဝှက် ပြောင်းရန်
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(userId, dto);
  }
}
