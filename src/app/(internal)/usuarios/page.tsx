import { redirect } from "next/navigation";

import { getAuthenticatedInternalUser } from "../../../lib/current-internal-user.ts";

import { UsersAdminPanel } from "./users-admin-panel";
import styles from "./usuarios.module.css";

export default async function UsersPage() {
  const user = await getAuthenticatedInternalUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Usuarios</h1>
          <p>Creá usuarios STAFF y administrá sus contraseñas.</p>
        </div>
      </header>

      <UsersAdminPanel currentUsername={user.username} />
    </section>
  );
}
