import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

export interface StoredUser {
  id: string; // googleId
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class AuthService {
  private users = new Map<string, StoredUser>();

  constructor(private jwtService: JwtService) {}

  findOrCreateUser(googleUser: GoogleUser): StoredUser {
    const existing = this.users.get(googleUser.googleId);
    if (existing) {
      existing.email = googleUser.email;
      existing.name = googleUser.name;
      existing.picture = googleUser.picture;
      return existing;
    }

    const user: StoredUser = {
      id: googleUser.googleId,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    };
    this.users.set(user.id, user);
    return user;
  }

  generateTokens(user: StoredUser) {
    const payload = { sub: user.id, email: user.email, name: user.name };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  refreshAccessToken(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);
    const user = this.users.get(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }
    return this.generateTokens(user);
  }

  getUserById(id: string): StoredUser | undefined {
    return this.users.get(id);
  }
}
