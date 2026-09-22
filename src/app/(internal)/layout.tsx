import type { ReactNode } from "react";

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getCurrentInternalUser,
} from "../../modules/users/application/internal-auth.ts";

import {
  PrismaInternalAuthRepository,
} from "../../modules/users/infrastructure/prisma-internal-auth-repository.ts";

import {
  INTERNAL_SESSION_COOKIE,
} from "../../modules/users/infrastructure/session-cookie.ts";

import {
  LogoutButton,
} from "../../components/logout-button.tsx";

import styles from "./internal-shell.module.css";

export default async function InternalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    INTERNAL_SESSION_COOKIE,
  )?.value;

  const repository =
    new PrismaInternalAuthRepository();

  const user =
    await getCurrentInternalUser(
      token,
      repository,
    );

  if (!user) {
    redirect("/login");
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <header className={styles.brand}>
          <div className={styles.logo}>
            B
          </div>

          <div>
            <strong>Bagnus</strong>
            <span>Smart Tech</span>
          </div>
        </header>

        <nav className={styles.navigation}>
          <Link href="/dashboard">
            Inicio
          </Link>

          <Link href="/clientes">
            Clientes
          </Link>

          <Link href="/reparaciones">
            Reparaciones
          </Link>
        </nav>

        <footer className={styles.account}>
          <div>
            <strong>
              {user.displayName}
            </strong>

            <span>
              {user.role === "ADMIN"
                ? "Administrador"
                : "Empleado"}
            </span>
          </div>

          <LogoutButton
            className={styles.logout}
          />
        </footer>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}