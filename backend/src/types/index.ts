import { Role, StudyType } from "../../generated/prisma/client.ts";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  studyType?: StudyType | null;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: "student" | "teacher" | "admin";
  studyType?: "DAYTIME" | "MULTIFORM" | null;
  landingPath: string;
}

export function toUserResponse(user: {
  id: number;
  email: string;
  name: string;
  role: Role;
  studyType?: StudyType | null;
}): UserResponse {
  let landingPath = "/";
  let clientRole: "student" | "teacher" | "admin" = "student";

  switch (user.role) {
    case Role.TEACHER:
      landingPath = "/teacher-view";
      clientRole = "teacher";
      break;
    case Role.ADMIN:
      landingPath = "/admin";
      clientRole = "admin";
      break;
    case Role.STUDENT:
    default:
      landingPath = "/";
      clientRole = "student";
      break;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: clientRole,
    studyType: user.studyType ?? null,
    landingPath,
  };
}

