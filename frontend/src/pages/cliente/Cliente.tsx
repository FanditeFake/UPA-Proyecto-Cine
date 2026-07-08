import { useState } from "react";
import { AppShell, type MenuOption } from "../../components/AppShell";
import { IconTicket, IconFilm, IconHistory } from "../../components/icons";
import { BoletosSection } from "./BoletosSection";

const MENU: MenuOption[] = [
  { key: "catalogo", label: "Comprar boletos", icon: IconTicket },
  { key: "cartelera", label: "Cartelera", icon: IconFilm },
  { key: "historial", label: "Historial", icon: IconHistory },
];

export function Cliente() {
  const [vista, setVista] = useState("catalogo");

  return (
    <AppShell
      menu={MENU}
      active={vista}
      onSelect={setVista}
      onHome={() => setVista("catalogo")}
      hideHeader={vista === "catalogo"}
      title={
        vista === "catalogo" ? "Comprar boletos" :
        vista === "cartelera" ? "Cartelera" : "Historial de compras"
      }
      subtitle={
        vista === "catalogo" ? "Elige el estreno de la semana o busca en la cartelera completa." :
        vista === "cartelera" ? "Pasa el cursor sobre una película y toca para ver sus horarios." :
        "Consulta tus compras anteriores de forma clara."
      }
    >
      <BoletosSection vista={vista} nombreEditable={false} />
    </AppShell>
  );
}
