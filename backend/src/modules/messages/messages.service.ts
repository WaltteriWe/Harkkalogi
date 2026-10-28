import { prisma } from "../../lib/prisma.ts";

export class MessagesService {
  async getInboxForUser(userId: number) {
    return prisma.message.findMany({
      where: {
        OR: [{ recipientId: userId }, { senderId: userId }],
        parentId: null, // Thread roots
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
      orderBy: { createdAt: "desc" },
    });
  }

  async getThreadById(messageId: number) {
    return prisma.message.findUnique({
      where: { id: messageId },
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
  }
}

export const messagesService = new MessagesService();

