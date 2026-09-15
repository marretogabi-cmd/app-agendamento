# Agenda — Design system (paleta Confiança)

App de agendamento para microempreendedores no Brasil. Next.js 16 + Tailwind 4 + DaisyUI 5. Público: MEI de baixa renda, celular primeiro, telas fracas e uso na rua. Uma paleta só: **Confiança** (`data-theme="confianca"`).

## Jobs to be done (home do dono)

- Ver os horários de hoje sem errar nome, hora ou status
- Marcar um novo horário em poucos toques
- Mandar lembrete no WhatsApp
- Distinguir confirmado / pendente / cancelado sem decorar cores novas

## Key screens

1. **Home (esta tela)** — agenda de hoje + atalho de novo horário
2. Depois: Agenda, Clientes, Novo horário (fora deste draft)

## Color (DaisyUI Confiança — use ONLY these)

| Token | Hex | Use |
| --- | --- | --- |
| base-100 | `#f3f7f7` | Fundo da página |
| base-200 | `#e3ecec` | Faixas, chips quietos |
| base-300 | `#c5d4d4` | Bordas, divisores |
| base-content | `#14383c` | Texto principal |
| primary | `#0a5558` | CTA, marca, selecionado |
| primary-content | `#f3fffe` | Texto em cima do primary |
| secondary | `#d7c4a3` | Ação secundária (WhatsApp / apoio) |
| secondary-content | `#3a2c16` | Texto no secondary |
| accent | `#1f7a4d` | Destaque positivo extra |
| accent-content | `#f3fff7` | Texto no accent |
| neutral | `#1f3336` | Chrome escuro, nav |
| neutral-content | `#eef6f6` | Texto no neutral |
| info | `#1d4f8c` | Lembrete |
| success | `#166534` | Confirmado |
| warning | `#c98910` | Pendente (texto `#2a1d00`) |
| error | `#b42318` | Cancelado |

Proibido: peach `#FFB7B2`, cream `#FDFCF8`, lavanda, blobs, grain, cursive, vidro, gradiente neon, dark mode.

## Type & shape

- Font: Geist / system sans. Sem Reenie Beanie, Outfit ou serif.
- Texto 16px+ no corpo. Títulos sentence-case, sem tracking decorativo.
- Radius 0.75rem. Borda 1.5px. Sem sombra teatral (`depth: 0`).
- Botões grandes (área de dedo). Primary = teal com texto claro.

## Home layout (mobile, 390px)

Não é landing. É ferramenta do dono:

- Topo: nome do negócio (ex. “Salão da Ana”) + data de hoje
- CTA larga “Novo horário” (primary)
- Lista de hoje: 4 cards (cliente, serviço, hora, preço, badge de status)
  - 10:30 Maria · Corte · Confirmado
  - 11:30 João · Barba · Pendente
  - 14:00 Rita · Coloração · Confirmado
  - 16:00 Pedro · Corte · Cancelado
- Bloco “2 pendentes amanhã” (warning)
- Botão “Enviar lembretes no WhatsApp” (secondary)
- Bottom nav fixa: Início (ativo), Agenda, Clientes, Mais — ícones + rótulo, alvo grande

Copy em português do Brasil. Sem lorem. Sem logo inventado: wordmark “Agenda” em primary, sem monograma/emoji/SVG genérico.
