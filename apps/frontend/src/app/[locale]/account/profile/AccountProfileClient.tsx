"use client";

import { useAuthStore } from "@/store/auth.store";
import { ProfileForm } from "@/features/account";

export function AccountProfileClient() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return <ProfileForm user={user} />;
}
