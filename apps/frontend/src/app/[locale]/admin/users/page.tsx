// src/app/admin/users/page.tsx

import type { Metadata } from "next";
import { AdminUsersClientWrapper } from "./AdminUsersClientWrapper";

export const metadata: Metadata = {
  title: "Users | Admin",
  description: "Manage users",
  robots: { index: false },
};

export default function UsersAdminPage() {
  return <AdminUsersClientWrapper />;
}
