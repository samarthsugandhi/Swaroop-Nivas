"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, UserPlus, History, FileBarChart2 } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { TouchLink } from "@/components/Touch";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  const NAV_ITEMS = [
    { href: "/dashboard",    icon: LayoutDashboard, label: t("home") },
    { href: "/units",        icon: Building2,       label: t("units") },
    { href: "/tenants/new",  icon: UserPlus,        label: t("add"), isFab: true },
    { href: "/history",      icon: History,         label: t("history") },
    { href: "/reports",      icon: FileBarChart2,   label: t("reports") },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 dark:border-stone-800 safe-bottom"
      style={{ background: "var(--sn-surface, #fff)" }}
    >
      <div className="flex items-end justify-around px-1 py-2 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label, isFab }) => {
          const active = pathname === href || (href !== "/tenants/new" && pathname.startsWith(href + "/"));

          if (isFab) {
            return (
              <TouchLink key={href} href={href} className="flex flex-col items-center -mt-6">
                <motion.span 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 bg-walnut-600 dark:bg-walnut-400 rounded-full flex items-center justify-center shadow-lg shadow-walnut-200 dark:shadow-walnut-900"
                >
                  <Icon className="text-white dark:text-walnut-950" size={28} />
                </motion.span>
                <span className="text-[11px] text-walnut-600 dark:text-walnut-400 font-semibold mt-1">{label}</span>
              </TouchLink>
            );
          }

          return (
            <TouchLink
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl min-w-[56px]"
            >
              <Icon
                size={24}
                className={active
                  ? "text-walnut-600 dark:text-walnut-400"
                  : "text-stone-400 dark:text-stone-600"}
              />
              <span className={`text-[11px] font-medium ${active
                ? "text-walnut-600 dark:text-walnut-400"
                : "text-stone-400 dark:text-stone-600"}`}
              >
                {label}
              </span>
            </TouchLink>
          );
        })}
      </div>
    </motion.nav>
  );
}
