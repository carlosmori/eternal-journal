import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async findOrCreateUser(googleUser: GoogleUser): Promise<User> {
    return this.prisma.user.upsert({
      where: { googleId: googleUser.googleId },
      update: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
      create: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
    });
  }

  generateTokens(user: User) {
    const payload = { sub: user.googleId, email: user.email, name: user.name };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { googleId: payload.sub },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return this.generateTokens(user);
  }

  async getUserById(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }
}
