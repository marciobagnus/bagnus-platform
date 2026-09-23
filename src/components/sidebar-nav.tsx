"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "../app/(internal)/internal-shell.module.css";

import type { InternalUserRole } from "../modules/users/domain/internal-user-role.ts";

const items = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/reparaciones", label: "Reparaciones" },
];

export function SidebarNav({ role }: { role: InternalUserRole }) {
  const pathname = usePathname();

  const visibleItems = role === "ADMIN"
    ? [...items, { href: "/usuarios", label: "Usuarios" }]
    : items;

  return (
    <nav className={styles.navigation} aria-label="Navegación principal">
      {visibleItems.map((item) => {
        const isActive =
          item.href === pathname ||
          (pathname.startsWith(item.href + "/") && item.href !== "/dashboard");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? `${styles.navigationLink} ${styles.active}`
                : styles.navigationLink
            }
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
