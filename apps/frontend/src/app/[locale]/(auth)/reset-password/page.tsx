import { Suspense } from "react";
import { ResetPasswordPage } from "@/features/auth";

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  );
}
