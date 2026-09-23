"use client";

import {
  type FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { BagnusBrand } from "../../components/bagnus-brand";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [notice] = useState(() =>
    typeof window !== "undefined" &&
    window.location.search.includes("password-reset=success")
      ? "La contraseña fue actualizada. Iniciá sesión nuevamente con la nueva contraseña."
      : "",
  );
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
            <BagnusBrand
              variant="dark"
              width={190}
              height={52}
              priority
            />
          </div>
        </header>

        <div className={styles.heading}>
          <h2>Iniciar sesión</h2>

          <p>
            Ingresá con tu usuario del taller.
          </p>
        </div>

        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}

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