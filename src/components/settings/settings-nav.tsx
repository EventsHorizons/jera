import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const SETTINGS_LINKS = [
  { href: "/settings/profile", label: "Perfil" },
  { href: "/settings/security", label: "Seguridad" },
  { href: "/settings/account", label: "Cuenta" },
] as const;

export function SettingsNav({ active }: { active: (typeof SETTINGS_LINKS)[number]["href"] }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {SETTINGS_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px",
            active === link.href
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
