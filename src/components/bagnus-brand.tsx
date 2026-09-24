import Image from "next/image";

type BrandVariant =
  | "dark"
  | "light"
  | "symbol-dark"
  | "symbol-light"
  | "symbol-primary";

type Props = {
  variant?: BrandVariant;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

const variants: Record<BrandVariant, { src: string; alt: string }> = {
  dark: {
    src: "/brand/bagnus_logo_principal_fondo_blanco_3000px.png",
    alt: "Bagnus Platform",
  },
  light: {
    src: "/brand/bagnus_logo_blanco_transparente_3000px.png",
    alt: "Bagnus Platform",
  },
  "symbol-dark": {
    src: "/brand/bagnus_simbolo_negro_transparente_1024px.png",
    alt: "Símbolo Bagnus",
  },
  "symbol-light": {
    src: "/brand/bagnus_simbolo_blanco_transparente_1024px.png",
    alt: "Símbolo Bagnus",
  },
  "symbol-primary": {
    src: "/brand/bagnus_simbolo_principal_transparente_1024px.png",
    alt: "Símbolo Bagnus",
  },
};

export function BagnusBrand({
  variant = "dark",
  className,
  priority = false,
  width = 220,
  height = 56,
}: Props) {
  const asset = variants[variant];

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      unoptimized
    />
  );
}
