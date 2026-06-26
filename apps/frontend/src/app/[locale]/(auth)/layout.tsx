import styles from "./auth.layout.module.scss";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <div className={styles.container}>{children}</div>;
}
