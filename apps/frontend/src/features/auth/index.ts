// Public API — import from here, not from internal paths
export { AuthProvider } from "./components/AuthProvider/AuthProvider";
export { LoginForm } from "./components/LoginForm/LoginForm";
export { RegisterForm } from "./components/RegisterForm/RegisterForm";
export { AuthSplitPanel } from "./components/AuthSplitPanel/AuthSplitPanel";

export { useLogin } from "./hooks/useLogin";
export { useLogout } from "./hooks/useLogout";
export { useRegister } from "./hooks/useRegister";
export { useAuthHydration } from "./hooks/useAuthHydration";
export { useForgotPassword } from "./hooks/useForgotPassword";
export { useResetPassword } from "./hooks/useResetPassword";
export {
  use2faSetup,
  use2faEnable,
  use2faVerify,
  use2faDisable,
} from "./hooks/use2fa";
export { useOAuthCallback } from "./hooks/useOAuthCallback";

export { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
export { ResetPasswordPage } from "./pages/ResetPasswordPage";
