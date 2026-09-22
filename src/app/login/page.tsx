"use client";

import {
  type FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username,
            password,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            "No se pudo iniciar sesión.",
        );

        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        "No se pudo conectar con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.brand}>
          <div className={styles.logo}>
            B
          </div>

          <div>
            <h1>Bagnus</h1>
            <p>Gestión del taller</p>
          </div>
        </header>

        <div className={styles.heading}>
          <h2>Iniciar sesión</h2>

          <p>
            Ingresá con tu usuario del taller.
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <label>
            Usuario

            <input
              value={username}
              autoComplete="username"
              onChange={(event) =>
                setUsername(
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            Contraseña

            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              required
            />
          </label>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Ingresando..."
              : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}