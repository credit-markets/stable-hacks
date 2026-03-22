export function getFaixaBadge(faixa: string | undefined): {
  level: string;
  label: string;
  color: string;
} {
  switch (faixa) {
    case "Baixo":
      return {
        level: "green",
        label: "Baixo",
        color: "text-terminal-green border-terminal-green",
      };
    case "Moderado":
      return {
        level: "amber",
        label: "Moderado",
        color: "text-terminal-amber border-terminal-amber",
      };
    case "Alto":
      return {
        level: "red",
        label: "Alto",
        color: "text-terminal-red border-terminal-red",
      };
    case "Elevado":
      return {
        level: "red",
        label: "Elevado",
        color: "text-terminal-red border-terminal-red",
      };
    case "Crítico":
      return {
        level: "red",
        label: "Crítico",
        color: "text-terminal-red border-terminal-red",
      };
    default:
      return {
        level: "unknown",
        label: "—",
        color: "text-text-tertiary border-subtle",
      };
  }
}
