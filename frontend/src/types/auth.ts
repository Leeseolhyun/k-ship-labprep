export type UserRole = "관리자" | "일반사용자";

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  role: UserRole;
  phone: string;
  joinedAt: string;
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
}
