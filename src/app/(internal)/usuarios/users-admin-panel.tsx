"use client";

import { type FormEvent, useEffect, useState } from "react";

import styles from "./usuarios.module.css";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../../../modules/users/domain/password-policy.ts";

type InternalUser = {
  id: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "STAFF";
};

function emptyForm() {
  return {
    displayName: "",
    username: "",
    password: "",
    passwordConfirmation: "",
  };
}

export function UsersAdminPanel({ currentUsername }: { currentUsername: string }) {
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedUsername, setSelectedUsername] = useState(currentUsername);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  async function loadUsers() {
    try {
      const response = await fetch("/api/users");
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar los usuarios.");
      }

      setUsers(body.users as InternalUser[]);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/users")
      .then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "No se pudieron cargar los usuarios.");
        }

        return body.users as InternalUser[];
      })
      .then((loadedUsers) => {
        if (!cancelled) {
          setUsers(loadedUsers);
          setLoadingUsers(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResetError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
          setLoadingUsers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateMessage("");
    setCreateError("");
    setCreating(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const body = await response.json();

      if (!response.ok) {
        setCreateError(body.error ?? "No se pudo crear el usuario STAFF.");
        return;
      }

      setCreateMessage(body.message);
      setCreateForm(emptyForm());
      await loadUsers();
      setSelectedUsername(body.user.username);
    } catch {
      setCreateError("No se pudo conectar con el servidor.");
    } finally {
      setCreating(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetMessage("");
    setResetError("");

    const isOwnAccount = selectedUsername === currentUsername;

    if (isOwnAccount && !window.confirm("Vas a cambiar la contraseña de tu propia cuenta. Se cerrarán todas tus sesiones y deberás iniciar sesión nuevamente. ¿Continuar?")) {
      return;
    }

    setResetting(true);

    try {
      const response = await fetch("/api/users/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: selectedUsername,
          password: resetPassword,
          passwordConfirmation: resetConfirmation,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setResetError(body.error ?? "No se pudo restablecer la contraseña.");
        return;
      }

      if (isOwnAccount) {
        window.location.replace("/login?password-reset=success");
        return;
      }

      setResetMessage(body.message);
      setResetPassword("");
      setResetConfirmation("");
    } catch {
      setResetError("No se pudo conectar con el servidor.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className={styles.sections}>
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <h2>Crear usuario STAFF</h2>
          <p>La cuenta quedará activa y podrá iniciar sesión.</p>
        </div>

        <form className={styles.form} onSubmit={handleCreate}>
          <label>
            Nombre visible
            <input
              value={createForm.displayName}
              onChange={(event) => setCreateForm({ ...createForm, displayName: event.target.value })}
              required
            />
          </label>

          <label>
            Nombre de usuario
            <input
              value={createForm.username}
              autoComplete="username"
              onChange={(event) => setCreateForm({ ...createForm, username: event.target.value })}
              required
            />
          </label>

          <div className={styles.formGrid}>
            <label>
              Contraseña inicial
              <input
                type="password"
                value={createForm.password}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                required
              />
            </label>

            <label>
              Confirmar contraseña
              <input
                type="password"
                value={createForm.passwordConfirmation}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                onChange={(event) => setCreateForm({ ...createForm, passwordConfirmation: event.target.value })}
                required
              />
            </label>
          </div>

          <p className={styles.hint}>La contraseña debe tener entre {PASSWORD_MIN_LENGTH} y {PASSWORD_MAX_LENGTH} caracteres.</p>
          {createError && <p className={styles.error} role="alert">{createError}</p>}
          {createMessage && <p className={styles.success} role="status">{createMessage}</p>}
          <button type="submit" disabled={creating}>
            {creating ? "Creando..." : "Crear usuario STAFF"}
          </button>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <h2>Restablecer contraseña</h2>
          <p>También podés seleccionar tu propia cuenta.</p>
        </div>

        <form className={styles.form} onSubmit={handleReset}>
          <label>
            Usuario interno
            <select
              value={selectedUsername}
              onChange={(event) => setSelectedUsername(event.target.value)}
              disabled={loadingUsers}
              required
            >
              <option value="" disabled>Seleccioná un usuario</option>
              {users.map((user) => (
                <option key={user.id} value={user.username}>
                  {user.displayName} ({user.username}) - {user.role}
                </option>
              ))}
            </select>
          </label>

          <label>
            Nueva contraseña
            <input
              type="password"
              value={resetPassword}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              onChange={(event) => setResetPassword(event.target.value)}
              required
            />
          </label>

          <label>
            Confirmar contraseña
            <input
              type="password"
              value={resetConfirmation}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              onChange={(event) => setResetConfirmation(event.target.value)}
              required
            />
          </label>

          {resetError && <p className={styles.error} role="alert">{resetError}</p>}
          {resetMessage && <p className={styles.success} role="status">{resetMessage}</p>}
          <button type="submit" disabled={resetting || loadingUsers}>
            {resetting ? "Restableciendo..." : "Restablecer contraseña"}
          </button>
        </form>
      </section>
    </div>
  );
}
