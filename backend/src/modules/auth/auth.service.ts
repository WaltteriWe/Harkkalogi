import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.ts";
import { env } from "../../config/env.ts";
import { AppError } from "../../middlewares/error.middleware.ts";
import { toUserResponse, UserResponse } from "../../types/index.ts";
import { LoginInput } from "./auth.schemas.ts";

export interface LoginResult {
  token: string;
  user: UserResponse;
}

export class AuthService {
  async login(input: LoginInput): Promise<LoginResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: toUserResponse(user),
    };
  }

  async getMe(userId: number): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return toUserResponse(user);
  }
}

export const authService = new AuthService();

