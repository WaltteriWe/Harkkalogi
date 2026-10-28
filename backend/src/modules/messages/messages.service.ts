import { prisma } from "../../lib/prisma.ts";
import { AppError } from "../../middlewares/error.middleware.ts";
import { Role } from "../../../generated/prisma/client.ts";
import type { CreateMessageInput } from "./messages.schemas.ts";

export class MessagesService {
  async getInboxForUser(
    userId: number,
    filters?: { search?: string; unreadOnly?: boolean }
  ) {
    const searchFilter = filters?.search?.trim();

    const threads = await prisma.message.findMany({
      where: {
        parentId: null, // Root messages only
        OR: [{ recipientId: userId }, { senderId: userId }],
        ...(searchFilter
          ? {
              OR: [
                { subject: { contains: searchFilter, mode: "insensitive" } },
                { body: { contains: searchFilter, mode: "insensitive" } },
                {
                  sender: {
                    name: { contains: searchFilter, mode: "insensitive" },
                  },
                },
                {
                  recipient: {
                    name: { contains: searchFilter, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        recipient: { select: { id: true, name: true, email: true, role: true } },
        attachments: true,
        replies: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const enriched = threads.map((thread) => {
      const lastActivityAt =
        thread.replies.length > 0
          ? thread.replies[thread.replies.length - 1].createdAt
          : thread.createdAt;

      let unreadCount = 0;
      if (thread.recipientId === userId && !thread.read) {
        unreadCount += 1;
      }
      for (const reply of thread.replies) {
        if (reply.recipientId === userId && !reply.read) {
          unreadCount += 1;
        } else if (!reply.recipientId && reply.senderId !== userId && !reply.read) {
          unreadCount += 1;
        }
      }

      return {
        ...thread,
        lastActivityAt: lastActivityAt.toISOString(),
        unreadCount,
      };
    });

    let filtered = enriched;
    if (filters?.unreadOnly) {
      filtered = filtered.filter((t) => t.unreadCount > 0);
    }

    filtered.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    return filtered;
  }

  async getThreadById(threadId: number, userId: number, role: Role | string) {
    const thread = await prisma.message.findUnique({
      where: { id: threadId },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        recipient: { select: { id: true, name: true, email: true, role: true } },
        attachments: true,
        replies: {
          include: {
            sender: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread || thread.parentId !== null) {
      throw new AppError("Message thread not found", 404);
    }

    if (
      role !== Role.ADMIN &&
      thread.senderId !== userId &&
      thread.recipientId !== userId
    ) {
      throw new AppError("You do not have permission to view this thread", 403);
    }

    const lastActivityAt =
      thread.replies.length > 0
        ? thread.replies[thread.replies.length - 1].createdAt
        : thread.createdAt;

    let unreadCount = 0;
    if (thread.recipientId === userId && !thread.read) unreadCount++;
    for (const reply of thread.replies) {
      if (reply.recipientId === userId && !reply.read) unreadCount++;
    }

    return {
      ...thread,
      lastActivityAt: lastActivityAt.toISOString(),
      unreadCount,
    };
  }

  async getAvailableRecipients(userId: number, role: Role | string) {
    if (role === Role.STUDENT || role === "STUDENT") {
      const internship = await prisma.internship.findFirst({
        where: { studentId: userId },
        include: {
          teacher: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { startDate: "desc" },
      });

      if (!internship || !internship.teacher) {
        return {
          hasSupervisor: false,
          supervisor: null,
          recipients: [],
        };
      }

      return {
        hasSupervisor: true,
        supervisor: internship.teacher,
        recipients: [
          {
            id: internship.teacher.id,
            name: internship.teacher.name,
            email: internship.teacher.email,
            role: internship.teacher.role,
            label: "Supervising teacher",
          },
        ],
      };
    }

    if (role === Role.TEACHER || role === "TEACHER") {
      const internships = await prisma.internship.findMany({
        where: { teacherId: userId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              studyType: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      });

      const studentMap = new Map<
        number,
        {
          id: number;
          name: string;
          email: string;
          role: string;
          company?: string;
        }
      >();

      for (const item of internships) {
        if (item.student && !studentMap.has(item.student.id)) {
          studentMap.set(item.student.id, {
            id: item.student.id,
            name: item.student.name,
            email: item.student.email,
            role: item.student.role,
            company: item.company,
          });
        }
      }

      return {
        hasSupervisor: true,
        supervisor: null,
        recipients: Array.from(studentMap.values()),
      };
    }

    // Role == ADMIN
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    return {
      hasSupervisor: true,
      supervisor: null,
      recipients: users,
    };
  }

  async createThread(
    senderId: number,
    senderRole: Role | string,
    data: CreateMessageInput
  ) {
    if (data.recipientId === senderId) {
      throw new AppError("Cannot message yourself", 400);
    }

    let internshipId: number | null = data.internshipId ?? null;

    if (senderRole === Role.STUDENT || senderRole === "STUDENT") {
      const internship = await prisma.internship.findFirst({
        where: { studentId: senderId },
        include: { teacher: true },
        orderBy: { startDate: "desc" },
      });

      if (!internship || !internship.teacherId || !internship.teacher) {
        throw new AppError("Supervisor not assigned", 400);
      }

      if (data.recipientId !== internship.teacherId) {
        throw new AppError(
          "Students may only message their assigned supervising teacher",
          403
        );
      }

      internshipId = internship.id;
    } else {
      const recipient = await prisma.user.findUnique({
        where: { id: data.recipientId },
      });
      if (!recipient) {
        throw new AppError("Recipient not found", 404);
      }
    }

    const message = await prisma.message.create({
      data: {
        subject: data.subject,
        body: data.body,
        read: false,
        senderId,
        recipientId: data.recipientId,
        internshipId,
        parentId: null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        recipient: { select: { id: true, name: true, email: true, role: true } },
        attachments: true,
        replies: true,
      },
    });

    return {
      ...message,
      lastActivityAt: message.createdAt.toISOString(),
      unreadCount: 0,
    };
  }

  async replyToThread(
    threadId: number,
    senderId: number,
    senderRole: Role | string,
    body: string
  ) {
    const thread = await prisma.message.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.parentId !== null) {
      throw new AppError("Message thread not found", 404);
    }

    if (senderRole === Role.STUDENT || senderRole === "STUDENT") {
      const internship = await prisma.internship.findFirst({
        where: { studentId: senderId },
        orderBy: { startDate: "desc" },
      });

      if (!internship || !internship.teacherId) {
        throw new AppError("Supervisor not assigned", 400);
      }
    }

    if (
      senderRole !== Role.ADMIN &&
      thread.senderId !== senderId &&
      thread.recipientId !== senderId
    ) {
      throw new AppError("You do not have permission to reply to this thread", 403);
    }

    const recipientId =
      thread.senderId === senderId ? thread.recipientId : thread.senderId;

    const reply = await prisma.message.create({
      data: {
        parentId: thread.id,
        senderId,
        recipientId,
        body,
        subject: thread.subject ? `Re: ${thread.subject}` : null,
        read: false,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await prisma.message.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    return reply;
  }

  async markThreadAsRead(threadId: number, userId: number) {
    const thread = await prisma.message.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.parentId !== null) {
      throw new AppError("Message thread not found", 404);
    }

    if (thread.senderId !== userId && thread.recipientId !== userId) {
      throw new AppError("You do not have permission to access this thread", 403);
    }

    const updateResult = await prisma.message.updateMany({
      where: {
        OR: [{ id: threadId }, { parentId: threadId }],
        recipientId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true, count: updateResult.count };
  }
}

export const messagesService = new MessagesService();
