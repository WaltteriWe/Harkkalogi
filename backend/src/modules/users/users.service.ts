import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../middlewares/error.middleware.ts";
import { toUserResponse, UserResponse } from "../../types/index.ts";

export class UsersService {
  async getAllUsers(): Promise<UserResponse[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map(toUserResponse);
  }

  async getUserById(id: number): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return toUserResponse(user);
  }
}

export const usersService = new UsersService();

