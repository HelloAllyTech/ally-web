import { FC, useEffect, useId, useRef, useState } from "react";

import { LogOut, MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { HelplineOrg } from "@types";

export interface TalkerMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

interface TalkerHeaderProps {
  org: HelplineOrg | null;
  subtitle?: string | null;
  onQuickExit: () => void;
  /** Kebab menu items; the menu is hidden when empty. */
  menuItems?: TalkerMenuItem[];
}

/**
 * Org name + logo on the left, the always-visible labelled Quick exit on the
 * right (it must be findable in a second, so it is a real button with text, not
 * an icon), and an optional kebab for the rarer actions.
 */
export const TalkerHeader: FC<TalkerHeaderProps> = ({ org, subtitle, onQuickExit, menuItems }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const orgName = org?.name ?? "";

  useEffect(() => {
    if (!menuOpen) return undefined;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !menuButtonRef.current?.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border-light bg-white">
      <div className="relative mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {org?.logoUrl && (
            <img
              src={org.logoUrl}
              alt=""
              className="h-8 w-8 flex-shrink-0 rounded-md object-contain"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-primary text-base font-medium text-typography-900">
              {orgName}
            </p>
            {subtitle && (
              <p className="truncate font-primary text-sm text-typography-700">{subtitle}</p>
            )}
          </div>
        </div>

        {menuItems && menuItems.length > 0 && (
          // Below sm the menu hangs off the header row, not the kebab: the kebab sits left of
          // Quick exit, so a 220px menu right-aligned to it would run off a 320px screen.
          <div className="sm:relative">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={t("helplineTalker.header.moreOptions")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              onClick={() => setMenuOpen(open => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-typography-900 hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <MoreVertical aria-hidden="true" className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label={t("helplineTalker.header.moreOptions")}
                onKeyDown={onMenuKeyDown}
                className="absolute right-4 top-14 z-40 min-w-[220px] max-w-[calc(100vw-2rem)] rounded-xl border border-border-light bg-white py-1 shadow-lg sm:right-0 sm:top-12"
              >
                {menuItems.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onSelect();
                    }}
                    className={`flex min-h-[44px] w-full items-center px-4 text-left font-primary text-base hover:bg-background-secondary focus-visible:bg-background-secondary focus-visible:outline-none ${
                      item.destructive ? "text-destructive-700" : "text-typography-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onQuickExit}
          title={t("helplineTalker.header.quickExitHint")}
          data-testid="helpline-quick-exit"
          className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-1.5 rounded-full bg-typography-900 px-4 font-primary text-base font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          {t("helplineTalker.header.quickExit")}
        </button>
      </div>
    </header>
  );
};
