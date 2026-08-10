import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '@prisma/client';
// ==========================================
// 1. ROLES DEFINITION (Prisma Schema အတိုင်း)
// ==========================================
// export enum Role {
//   ADMIN = 'ADMIN',
//   STAFF = 'STAFF',
//   DOCTOR = 'DOCTOR',
//   PATIENT = 'PATIENT',
// }
// DTO ထဲတွင် Enum အသစ် မဆောက်ဘဲ Prisma မှ Role ကို Re-export လုပ်ပါ
// ==========================================
// 2. PATIENT REGISTER SCHEMA
// ==========================================
export const RegisterPatientSchema = z.object({
  fullName: z.string().min(1, 'အမည် ဖြည့်သွင်းရန် လိုအပ်ပါသည်။'),
  phone: z
    .string()
    .min(9, 'ဖုန်းနံပါတ် အနည်းဆုံး ၉ လုံး ရှိရပါမည်')
    .max(20, 'ဖုန်းနံပါတ် မှားယွင်းနေပါသည်။'),
  email: z
    .string()
    .email('အီးမေးလ် ပုံစံ မှားယွင်းနေပါသည်။')
    .optional()
    .or(z.literal('')),
  password: z.string().min(6, 'စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။'),
});

export class RegisterPatientDto extends createZodDto(RegisterPatientSchema) {}

// ==========================================
// 3. STAFF / DOCTOR REGISTER SCHEMA
// ==========================================
export const RegisterStaffSchema = z.object({
  fullName: z.string().min(1, 'အမည် ဖြည့်သွင်းရန် လိုအပ်ပါသည်။'),
  phone: z.string().min(9, 'ဖုန်းနံပါတ် အနည်းဆုံး ၉ လုံး ရှိရပါမည်'),
  email: z
    .string()
    .email('အီးမေးလ် ပုံစံ မှားယွင်းနေပါသည်။')
    .optional()
    .or(z.literal('')),
  password: z.string().min(6, 'စကားဝှက်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်။'),
  role: z.nativeEnum(Role, {
    message: 'Role အမျိုးအစား မှားယွင်းနေပါသည်။',
  }),
  title: z.string().optional(), // Doctor ဖြစ်ပါက "Dr."
  specialization: z.string().optional(), // Doctor ဖြစ်ပါက "General Physician"
  position: z.string().optional(), // Staff ဖြစ်ပါက "Receptionist"
});

export class RegisterStaffDto extends createZodDto(RegisterStaffSchema) {}

// ==========================================
// 4. LOGIN SCHEMA
// ==========================================
export const LoginSchema = z.object({
  account: z.string().min(1, 'ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ် ဖြည့်ပါ'),
  password: z.string().min(1, 'စကားဝှက် ဖြည့်ပေးပါ'),
});

export class LoginDto extends createZodDto(LoginSchema) {}

// ==========================================
// 5. REFRESH TOKEN SCHEMA
// ==========================================
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token လိုအပ်ပါသည်။'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

// ==========================================
// 6. CHANGE PASSWORD SCHEMA
// ==========================================
export const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'ယခင် စကားဝှက် ဖြည့်ပါ'),
    newPassword: z.string().min(6, 'စကားဝှက်သစ်သည် အနည်းဆုံး ၆ လုံး ရှိရပါမည်'),
    confirmPassword: z.string().min(1, 'စကားဝှက်သစ်အား အတည်ပြုပေးပါ'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'စကားဝှက်သစ် နှစ်ခု ကိုက်ညီမှု မရှိပါ',
    path: ['confirmPassword'],
  });

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
