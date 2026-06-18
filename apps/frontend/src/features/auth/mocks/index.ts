import type { AuthResponse } from "../interfaces";

export const mockUser: AuthResponse["user"] = {
  id: "user-1",
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "USER",
  isActive: true,
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockAdminUser: AuthResponse["user"] = {
  ...mockUser,
  id: "user-admin",
  email: "admin@example.com",
  firstName: "Admin",
  role: "ADMIN",
};

export const mockAuthResponse: AuthResponse = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: mockUser,
};
