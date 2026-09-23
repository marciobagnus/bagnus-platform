"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "../app/(internal)/internal-shell.module.css";

const items = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/reparaciones", label: "Reparaciones" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Navegación principal">
      {items.map((item) => {
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
