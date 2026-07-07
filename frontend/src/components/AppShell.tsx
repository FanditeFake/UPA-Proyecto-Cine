import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import { BorderGlow } from "./BorderGlow";
import { StaggeredMenu, type StaggeredMenuItem } from "./StaggeredMenu";
import styles from "./Layout.module.css";

const NAV_GLOW_COLORS = ["#e3b23c", "#7d0f22", "#f0d48a"];
const MENU_COLORS = ["#7d0f22", "#e3b23c"];

export interface MenuOption {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface AppShellProps {
  menu: MenuOption[];
  active: string;
  onSelect: (key: string) => void;
  onHome?: () => void;
  title: string;
  subtitle: string;
  hideHeader?: boolean;
  children: ReactNode;
}

export function AppShell({ menu, active, onSelect, onHome, title, subtitle, hideHeader, children }: AppShellProps) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    cerrarSesion();
    navigate("/login", { replace: true });
  }

  function handleLogoClick() {
    if (onHome) onHome();
    else navigate(usuario?.rol === "administrador" ? "/admin" : "/cliente");
  }

  const menuItems: StaggeredMenuItem[] = menu.map((item) => ({
    label: item.label,
    active: active === item.key,
    onClick: () => onSelect(item.key),
  }));

  return (
    <div className={styles.shell}>
      <StaggeredMenu
        isFixed={false}
        items={menuItems}
        socialItems={[
          { label: `${usuario?.nombre ?? ""} · ${usuario?.rol === "administrador" ? "Administración" : "Cliente"}` },
          { label: "Cerrar sesión", onClick: handleLogout },
        ]}
        displaySocials
        displayItemNumbering
        colors={MENU_COLORS}
        accentColor="#7d0f22"
        menuButtonColor="#f6eee0"
        openMenuButtonColor="#f6eee0"
        logoText="CineMax"
        onLogoClick={handleLogoClick}
      />

      <main className={hideHeader ? styles.contentFlush : styles.content}>
        {!hideHeader && (
          <BorderGlow
            className={styles.topbarGlow}
            backgroundColor="var(--paper)"
            borderRadius={8}
            glowColor="43 70 55"
            colors={NAV_GLOW_COLORS}
            glowIntensity={0.7}
            glowRadius={14}
            edgeSensitivity={40}
            coneSpread={35}
          >
            <div className={styles.topbar}>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </BorderGlow>
        )}

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
