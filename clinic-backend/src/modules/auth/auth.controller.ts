import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import Role from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
interface RegisterBody {
  phone: string;
  email?: string;
  password: string;
  //role?: 'PATIENT' | 'DOCTOR' | 'STAFF';
  role?: Role.Role;
  fullName?: string;
}

interface LoginBody {
  phone: string;
  password: string;
}

export class AuthController {
  // 1. Register User (Patient / Staff / Doctor)
  static async register(req: Request, res: Response) {
    try {
      const { phone, email, password, role, fullName } =
        req.body as RegisterBody;

      const existingUser = await prisma.user.findUnique({ where: { phone } });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: 'Phone number already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            phone,
            email,
            password: hashedPassword,
            role: role || 'PATIENT',
          },
        });

        if (user.role === 'PATIENT') {
          await tx.patientProfile.create({
            data: {
              userId: user.id,
              fullName: fullName || 'New Patient',
            },
          });
        }

        return user;
      });

      return res
        .status(201)
        .json({ message: 'User registered successfully', userId: result.id });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  // 2. Login User
  static async login(req: Request, res: Response) {
    try {
      const { phone, password } = req.body as LoginBody;

      const user = await prisma.user.findUnique({
        where: { phone },
        include: {
          patientProfile: true,
          doctorProfile: true,
          staffProfile: true,
        },
      });

      if (!user || !user.isActive) {
        return res
          .status(401)
          .json({ message: 'Invalid credentials or inactive account' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: '7d',
      });

      // Create Session Log
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      return res.json({
        token,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role,
          patientProfile: user.patientProfile,
          doctorProfile: user.doctorProfile,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }
}
