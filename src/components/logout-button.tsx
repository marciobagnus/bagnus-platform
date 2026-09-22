"use client";

import { useRouter } from "next/navigation";

type Props = {
  className?: string;
};

export function LogoutButton({
  className,
}: Props) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={className}
      onClick={logout}
    >
      Cerrar sesión
    </button>
  );
}