# Padrões de Frontend — Next.js

Este documento define as convenções de arquitetura, composição visual, estilos, assincronismo, acessibilidade, desempenho e qualidade deste projeto.

As palavras **DEVE**, **NÃO DEVE**, **RECOMENDADO** e **PODE** indicam o nível da regra.

## 1. Princípios

1. A interface é um sistema de componentes, não uma coleção de páginas isoladas.
2. Atomic Design organiza a **composição visual**; módulos por domínio/feature organizam **regras, dados e fluxos**.
3. Componentes de servidor são o padrão. Um componente só recebe `'use client'` quando precisa de estado, efeitos, eventos ou APIs do navegador.
4. Acessibilidade é critério de aceite, não melhoria posterior.
5. Todo fluxo assíncrono possui estados explícitos: `idle`, `pending`, `success`, `empty` e `error`, conforme aplicável.
6. Responsividade começa no menor viewport. Temas usam tokens semânticos, nunca cores fixas espalhadas pelo código.
7. Lazy loading é aplicado por custo e momento de uso, não indiscriminadamente.
8. Cada módulo expõe uma API pública pequena. Outros módulos NÃO DEVEM importar detalhes internos.

## 2. Arquitetura proposta

```text
src/
├── app/                         # Rotas, layouts, loading, error e composição final
│   ├── (public)/
│   ├── (private)/
│   ├── layout.tsx
│   └── providers.tsx
├── features/                    # Casos de uso e fluxos do usuário
│   └── appointment/
│       ├── actions/             # Server Actions/mutações
│       ├── api/                 # Integrações e queries da feature
│       ├── components/          # UI específica da feature
│       │   ├── molecules/
│       │   └── organisms/
│       ├── hooks/               # Hooks específicos da feature
│       ├── schemas/             # Validação e contratos de entrada
│       ├── utils/
│       └── index.ts             # API pública da feature
├── entities/                    # Modelos e UI ligados a conceitos de domínio
│   └── user/
│       ├── api/
│       ├── components/
│       ├── types/
│       └── index.ts
├── components/                  # Design system reutilizável e sem regra de negócio
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── lib/                         # Infraestrutura compartilhada
│   ├── api/
│   ├── auth/
│   ├── env/
│   └── utils/
├── hooks/                       # Apenas hooks realmente genéricos
├── types/                       # Tipos globais mínimos
└── styles/
    └── globals.css              # Tailwind, daisyUI, resets e tokens globais
```

### 2.1 Regras de dependência

```text
app → features → entities → components/lib
```

- Uma camada PODE importar apenas a si mesma ou camadas à sua direita.
- `components/` NÃO DEVE importar `features/`, `entities/` ou `app/`.
- `entities/` NÃO DEVE importar `features/` ou `app/`.
- Features distintas NÃO DEVEM acessar arquivos internos umas das outras. A comunicação ocorre pela API pública (`index.ts`) ou sobe para um compositor em `app/`.
- Código usado por uma única feature permanece dentro dela. Só deve ser movido para o compartilhado após reutilização real e sem dependência de domínio.
- Imports internos usam caminhos relativos; consumidores externos usam o alias `@/` e a API pública do módulo.

## 3. Atomic Design no projeto

Atomic Design é um modelo mental simultâneo entre partes e todo; não é uma linha de produção rígida.

| Nível | Responsabilidade | Exemplos | Local principal |
| --- | --- | --- | --- |
| Átomo | Elemento indivisível e reutilizável | `Button`, `Input`, `Icon`, `Badge` | `components/atoms` |
| Molécula | Pequena combinação com uma tarefa clara | `FormField`, `SearchBox`, `DateInput` | `components/molecules` ou feature |
| Organismo | Seção completa formada por componentes menores | `Header`, `AppointmentForm`, `ResultsTable` | `components/organisms` ou feature |
| Template | Estrutura da tela sem dados finais | shell, layout, slots | `app/**/layout.tsx` ou organismo da feature |
| Página | Instância real com rota e dados | tela de agenda, cadastro | `app/**/page.tsx` |

### Critério de localização

- Se conhece termos do negócio, pertence a `entities/` ou `features/`.
- Se é reutilizável, visual e agnóstico ao domínio, pertence a `components/`.
- Átomos globais NÃO DEVEM buscar dados, chamar Server Actions ou conhecer stores.
- Organismos podem coordenar UI, mas regras de negócio e acesso a dados permanecem na feature, action, serviço ou componente contêiner.
- Não criar um novo nível atômico apenas para espelhar uma `<div>`; extração exige identidade, responsabilidade e potencial de manutenção próprios.

## 4. Convenção de cada componente

Cada componente vive em uma pasta com nome `PascalCase`:

```text
Button/
├── component.tsx
├── component.types.ts
├── component.module.css
├── component.test.tsx          # Quando houver comportamento testável
└── index.ts
```

### `component.types.ts`

```ts
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  isLoading?: boolean;
}
```

### `component.tsx`

```tsx
import styles from './component.module.css';
import type { ButtonProps } from './component.types';

const variantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
} as const;

export function Button({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn ${variantClass[variant]} ${styles.root} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <span className="loading loading-spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
```

### `component.module.css`

```css
.root {
  min-block-size: 2.75rem;
  text-wrap: balance;
}

@media (prefers-reduced-motion: reduce) {
  .root {
    transition: none;
  }
}
```

### `index.ts`

```ts
export { Button } from './component';
export type { ButtonProps, ButtonVariant } from './component.types';
```

### Regras de implementação

- Exportações nomeadas são o padrão. `default export` fica reservado aos arquivos exigidos pelo Next.js, como `page.tsx` e `layout.tsx`.
- Props de evento seguem `onEvento`; handlers internos seguem `handleEvento`.
- Booleanos usam `is`, `has`, `can` ou `should`.
- Props estendem o elemento HTML nativo adequado sempre que isso preservar sua API e acessibilidade.
- O elemento semântico correto é preferido a `<div role="...">`.
- Não armazenar em estado o que pode ser derivado de props ou de outro estado.
- Evitar componentes com múltiplos booleanos que criam combinações inválidas. Para fluxos complexos, usar união discriminada, reducer ou máquina de estados.

## 5. Server e Client Components

### Server Component — padrão

Usar para:

- buscar dados;
- acessar banco, segredos e serviços internos;
- renderizar conteúdo estático ou orientado a dados;
- reduzir JavaScript enviado ao navegador.

### Client Component — exceção explícita

Usar `'use client'` somente no menor limite possível quando houver:

- estado ou hooks do React;
- event handlers;
- APIs do navegador;
- bibliotecas que dependem do DOM.

Não transformar uma página inteira em Client Component porque um botão é interativo. Isolar o botão ou organismo interativo em uma folha cliente.

## 6. Dados e envios assíncronos

### 6.1 Leituras

- Preferir leitura em Server Components.
- Iniciar operações independentes juntas e aguardá-las em conjunto para evitar waterfalls.
- Colocar `<Suspense>` em fronteiras que possam carregar independentemente.
- Usar `loading.tsx` para feedback de rota e skeletons específicos para regiões lentas.
- A resposta vazia é um estado de produto (`empty`), não um erro.
- Dados do cliente só devem ser buscados no cliente quando dependem de interação contínua, atualização em tempo real ou cache local deliberado.

```tsx
const appointmentsPromise = getAppointments();
const professionalsPromise = getProfessionals();

const [appointments, professionals] = await Promise.all([
  appointmentsPromise,
  professionalsPromise,
]);
```

### 6.2 Mutações e formulários

- Preferir `<form>` semântico com Server Action para mutações internas.
- Validar e autorizar novamente no servidor, mesmo que exista validação no cliente.
- Erros esperados devem ser retornados como dados serializáveis; exceções ficam para falhas inesperadas.
- Usar `useActionState` para estado da action e `useFormStatus` para o estado pendente do formulário.
- Enquanto pendente, fornecer feedback visual e impedir submissão duplicada quando a operação não for idempotente.
- Preservar os dados digitados após erro recuperável.
- Após sucesso, revalidar/invalidate apenas o dado afetado e redirecionar quando fizer sentido.
- UI otimista só é recomendada quando a ação é rápida de desfazer ou reconciliar.

Contrato recomendado:

```ts
export type ActionState<T = undefined> =
  | { status: 'idle'; data?: undefined; message?: undefined }
  | { status: 'success'; data: T; message?: string }
  | { status: 'error'; data?: undefined; message: string; fieldErrors?: Record<string, string[]> };
```

### 6.3 APIs externas/BFF

- Route Handlers atuam como fronteira BFF quando o consumidor precisa de HTTP, webhook ou integração externa.
- Centralizar cliente, base URL, autenticação, timeout e normalização de erros em `lib/api`.
- Nunca expor tokens ou segredos em módulos cliente.
- Em buscas disparadas pela digitação, aplicar debounce quando adequado e cancelar a requisição anterior com `AbortController`.
- Diferenciar falha de rede, validação, não autorização, não encontrado e erro inesperado.
- Logs técnicos ficam no servidor; a interface mostra mensagem útil, ação de recuperação e identificador de suporte quando disponível.

## 7. Acessibilidade como fundamento

Todo componente DEVE:

- funcionar com teclado, incluindo ordem de foco previsível;
- manter foco visível com contraste suficiente;
- usar HTML semântico antes de ARIA;
- possuir nome acessível para controles e ícones interativos;
- associar `label`, ajuda e erro ao campo com `htmlFor`, `aria-describedby` e `aria-invalid`;
- comunicar feedback assíncrono relevante com `aria-live` ou `role="status"`, sem anúncios excessivos;
- não depender apenas de cor, posição, som ou movimento para transmitir informação;
- respeitar `prefers-reduced-motion`;
- preservar zoom, reflow e legibilidade em telas estreitas;
- fornecer `alt` útil a imagens informativas e `alt=""` a imagens decorativas;
- usar botão para ação e link para navegação;
- evitar `tabIndex` positivo e não esconder foco sem substituto equivalente.

Formulários DEVEM:

- apresentar instruções antes do envio;
- identificar campos obrigatórios em texto e programaticamente;
- posicionar mensagens de erro próximas aos campos;
- levar o foco ao resumo de erros ou ao primeiro campo inválido após uma falha;
- manter o botão com nome estável durante loading e informar o progresso separadamente.

Meta mínima: WCAG 2.2 nível AA. Testar navegação somente por teclado, leitor de tela, zoom de 200%, reflow e contraste.

## 8. Estilos: CSS Modules + Tailwind + daisyUI

Cada ferramenta tem uma responsabilidade:

| Ferramenta | Usar para | Evitar |
| --- | --- | --- |
| daisyUI | componentes-base, estados visuais e tokens semânticos de tema | depender do tema visual padrão sem customização do produto |
| Tailwind CSS | layout, grid, flex, espaçamento, responsividade e estados simples | sequências enormes repetidas em vários componentes |
| CSS Modules | regras detalhadas, seletores complexos, animações e estilo exclusivo do componente | duplicar utilitários simples ou criar estilos globais |
| `globals.css` | setup, tokens globais, resets e estilos realmente globais | estilo específico de componente |

### Regras

- Aplicar mobile-first: classes sem prefixo representam a base; `sm:`, `md:`, `lg:` e superiores ampliam o layout.
- Usar cores semânticas daisyUI, como `bg-base-100`, `text-base-content`, `btn-primary`, `text-error`.
- Não codificar `#fff`, `#000` ou paletas `gray-*` em componentes temáveis, salvo requisito visual explícito.
- O tema é selecionado por `data-theme` em um elemento ancestral.
- Preferir propriedades lógicas no CSS Module: `margin-inline`, `padding-block`, `inset-inline-start`.
- Evitar `!important`, seletores por tag aninhados profundamente e dependência da estrutura interna de outro componente.
- Não usar CSS Module apenas para renomear uma única utility do Tailwind.
- Quando um conjunto de classes se repetir e representar um conceito de UI, transformá-lo em componente ou variante tipada.

```tsx
<html lang="pt-BR" data-theme="light">
```

Exemplo responsivo:

```tsx
<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  {/* conteúdo */}
</section>
```

## 9. Lazy loading, imagens e streaming

- Server Components já são separados por código; usar lazy loading deliberado principalmente para Client Components e bibliotecas pesadas.
- Usar `next/dynamic` para editores, gráficos, mapas, modais raros e componentes abaixo da dobra com custo relevante.
- Usar `import()` dentro do evento para bibliotecas necessárias apenas após interação.
- Não lazy-load de forma automática conteúdo crítico acima da dobra, navegação primária ou controles necessários para a primeira tarefa.
- `ssr: false` só é permitido para Client Components que realmente dependem do navegador.
- Todo fallback deve reservar espaço para evitar layout shift e comunicar carregamento quando relevante.
- Preferir `next/image`, definir dimensões ou `fill` com container dimensionado, `sizes` coerente e `priority` apenas para imagens realmente críticas.
- Usar `<Suspense>` para streaming de regiões independentes; o fallback deve se parecer estruturalmente com o conteúdo final.

```tsx
'use client';

import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('./HeavyChart').then((module) => module.HeavyChart),
  { loading: () => <div className="skeleton h-72 w-full" role="status" aria-label="Carregando gráfico" /> },
);
```

## 10. Padrões de composição

### Presentational + Container

- O componente de apresentação recebe dados e callbacks por props.
- O contêiner busca dados, coordena estados e conecta actions.
- O contêiner pertence à feature; a apresentação pode ser compartilhada somente se for agnóstica ao domínio.

### Custom Hooks

- Hooks genéricos ficam em `src/hooks`.
- Hooks de negócio ficam dentro da feature/entity correspondente.
- Um hook encapsula comportamento reutilizável; não deve apenas esconder uma linha simples.

### Compound Components

Usar em componentes altamente configuráveis, como `Tabs`, `Modal`, `Menu` e `Stepper`, quando uma API composta for mais clara que dezenas de props.

```tsx
<Tabs defaultValue="agenda">
  <Tabs.List aria-label="Seções do painel">
    <Tabs.Trigger value="agenda">Agenda</Tabs.Trigger>
    <Tabs.Trigger value="clientes">Clientes</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="agenda">...</Tabs.Panel>
</Tabs>
```

### Máquina de estados

Usar reducer, união discriminada ou biblioteca de state machine em fluxos com transições críticas, como onboarding, recuperação de conta ou agendamento em etapas. Evitar múltiplos booleanos independentes como `isLoading`, `isSuccess`, `hasError` quando podem produzir estados impossíveis.

## 11. API pública e imports

Uma feature expõe somente o necessário:

```ts
// features/appointment/index.ts
export { AppointmentForm } from './components/organisms/AppointmentForm';
export { createAppointment } from './actions/create-appointment';
export type { Appointment } from './types/appointment';
```

Consumidor:

```ts
import { AppointmentForm } from '@/features/appointment';
```

Import proibido:

```ts
import { AppointmentForm } from '@/features/appointment/components/organisms/AppointmentForm/component';
```

## 12. Estados obrigatórios de UI

Toda tela ou organismo orientado a dados deve definir, quando aplicável:

| Estado | Comportamento esperado |
| --- | --- |
| Loading | skeleton/progresso, região estável, controles coerentes |
| Empty | explicar ausência e oferecer próximo passo |
| Error | mensagem útil, recuperação e preservação de contexto |
| Success | feedback proporcional, sem interromper a tarefa |
| Disabled | motivo perceptível; não usar como substituto de autorização no servidor |
| Offline/timeout | distinguir de erro definitivo e permitir tentar novamente |

## 13. Critérios de qualidade

Antes de concluir um componente ou feature:

- [ ] Está no nível atômico e no domínio corretos.
- [ ] Mantém uma responsabilidade principal e uma API pequena.
- [ ] É Server Component por padrão; `'use client'` está no menor limite possível.
- [ ] Não possui importação que viole as camadas.
- [ ] Usa `component.tsx`, `component.types.ts` e `component.module.css` conforme a convenção.
- [ ] Possui HTML semântico, foco visível, nomes acessíveis e operação por teclado.
- [ ] Define loading, vazio, sucesso e erro quando aplicáveis.
- [ ] Evita submissão duplicada e valida/autoriza no servidor.
- [ ] Funciona nos temas suportados sem cores fixas indevidas.
- [ ] Foi verificado em viewport pequeno, médio e grande.
- [ ] Não adiciona JavaScript cliente ou lazy loading sem justificativa.
- [ ] Imagens têm dimensões, `sizes` e texto alternativo corretos.
- [ ] Comportamento relevante possui teste; fluxo crítico possui teste de integração/E2E.

## 14. Antipadrões proibidos

- Componentes globais com regras específicas de negócio.
- Páginas contendo consulta, validação, transformação, estado e JSX complexo no mesmo arquivo.
- `useEffect` para toda busca de dados sem necessidade de cliente.
- Arquivos genéricos como `helpers.ts`, `utils.ts` ou `types.ts` sem coesão clara.
- Barrel files globais que criam dependências circulares; `index.ts` deve ser local à slice/componente.
- Props como `isRed`, `big`, `left` ou outras decisões puramente visuais sem semântica.
- Click handler em `<div>` quando existe elemento HTML interativo apropriado.
- Spinner sem texto acessível, erro apenas por cor ou placeholder usado como label.
- `dynamic(..., { ssr: false })` usado para esconder erro de hidratação.
- Duplicação de classes Tailwind extensas em vez de componente/variante.
- CSS global para corrigir detalhes internos de um componente.

## 15. Referências

- [Designing Systems — Brad Frost](https://atomicdesign.bradfrost.com/chapter-1/)
- [Atomic Design Methodology — Brad Frost](https://atomicdesign.bradfrost.com/chapter-2/)
- [Frontend Design Patterns — Feature-Sliced Design](https://feature-sliced.design/uz/blog/frontend-design-patterns)
- [Next.js: Forms](https://nextjs.org/docs/app/guides/forms)
- [Next.js: Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js: CSS](https://nextjs.org/docs/app/getting-started/css)
- [daisyUI: Themes](https://daisyui.com/docs/themes/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
