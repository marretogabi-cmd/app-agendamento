export const PALETAS = [
  {
    id: "confianca",
    nome: "Confiança",
    para: "Padrão do app",
    resumo:
      "Teal escuro, fácil de associar a WhatsApp e a negócio organizado. Boa para qualquer ofício.",
  },
  {
    id: "feira",
    nome: "Feira",
    para: "Salão, comida, costura",
    resumo:
      "Terracota no papel quente. Parece vizinhança, não clínica cara nem app de banco.",
  },
  {
    id: "clareza",
    nome: "Clareza",
    para: "Sol e tela fraca",
    resumo:
      "Marinho no branco, borda mais grossa. Máxima leitura no celular velho ou na rua.",
  },
  {
    id: "oficina",
    nome: "Oficina",
    para: "Serviço e ofício",
    resumo:
      "Laranja de oficina no grafite. Direto, de ferramenta — entrega, conserto, visita.",
  },
] as const;

export type PaletaId = (typeof PALETAS)[number]["id"];

export const SWATCHES = [
  { token: "primary", label: "Primária" },
  { token: "secondary", label: "Secundária" },
  { token: "accent", label: "Destaque" },
  { token: "neutral", label: "Neutra" },
  { token: "base-100", label: "Fundo" },
  { token: "base-content", label: "Texto" },
  { token: "success", label: "Confirmado" },
  { token: "warning", label: "Pendente" },
  { token: "error", label: "Cancelado" },
] as const;
