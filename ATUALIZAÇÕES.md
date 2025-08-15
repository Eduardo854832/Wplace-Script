# Histórico de Atualizações – Auto Imagem WPlace

Este documento registra as principais mudanças realizadas no script `AUTO-IMAGE.js`.

## Legenda
- [NOVO] Funcionalidade inédita
- [MELHORIA] Aperfeiçoamento de algo existente
- [CORREÇÃO] Bug fix / ajuste de comportamento
- [INTERNO] Alteração estrutural sem impacto direto para o usuário

---
## Versão Inicial (commit 8cba59f – base remodelada)
**Principais entregas:**
- [NOVO] Interface totalmente remodelada e responsiva (desktop + mobile) em painel flutuante.
- [NOVO] Suporte multilíngue (pt / en) com dicionário centralizado.
- [NOVO] Temas Claro / Escuro com variáveis CSS dinâmicas.
- [NOVO] Sistema de construção da lista de pixels com filtros:
  - Ignorar pixels transparentes (limite configurado `TRANSPARENCY_THRESHOLD`).
  - Ignorar pixels brancos (`WHITE_THRESHOLD`).
  - Ordenação configurável: Esquerda→Direita, Direita→Esquerda ou Aleatória.
- [NOVO] Diferentes velocidades de pintura: segura / normal / rápida (impacta atraso entre pixels).
- [NOVO] Extração automática da paleta de cores disponível no site, ignorando cores bloqueadas (IDs 0 e 5).
- [NOVO] Mapeamento de cor por distância Euclidiana (RGB) para selecionar a cor mais próxima.
- [NOVO] Modal de redimensionamento com:
  - Manter proporção (checkbox).
  - Pré-visualização em tempo real (canvas de preview sem smoothing).
- [NOVO] Loop de pintura com:
  - Controle de “charges” (consultando `/me`).
  - Espera automática do cooldown quando as cargas acabam.
  - Cálculo de tempo estimado restante (ETA) aproximado.
  - Atualização periódica de progresso.
- [NOVO] Estatísticas em tempo real: progresso %, pixels (pintados/total), charges, tempo estimado, pixels por segundo (janela de 10s).
- [NOVO] Sistema de toasts estilizados para feedback rápido.
- [NOVO] Painel minimizável e seção de configurações colapsável.
- [NOVO] Botões principais: iniciar bot, carregar imagem, redimensionar, definir posição, começar pintura, parar, reconstruir pixels.
- [MELHORIA] Código modularizado em utilitários, API, processamento de imagem, UI e loop de pintura.
- [MELHORIA] Uso de `requestAnimationFrame` e timers controlados para suavizar UI.

---
## Ajuste de Drag – Tentativa (commit 2d42ad66)
**Objetivo:** Migrar de listeners separados de mouse / touch para Pointer Events.

**O que aconteceu:**
- [CORREÇÃO] Introduzido conceito de Pointer Events unificados, clamp de limites e conversão right→left.
- [PROBLEMA] O commit removeu (por truncamento) partes críticas do código: vários listeners dos botões e blocos da UI foram “omitidos”; resultou em painel arrastável mas sem interações (cliques não funcionavam). **Regrediu funcionalidade.**

---
## Ajuste de Drag – Correção Completa (commit c3c7b84)
**Principais correções e melhorias:**
- [CORREÇÃO] Restauração de TODOS os handlers de interface (cliques em botões, colapso, minimizar, etc.).
- [CORREÇÃO] Área de drag limitada corretamente ao header sem bloquear cliques nos botões (checagem de `closest('.no-drag')`).
- [CORREÇÃO] Garantida liberação do pointer capture em `pointerup` e `pointercancel` prevenindo perda de cliques subsequentes.
- [MELHORIA] Conversão única de posicionamento baseado em `right` para `left` após o primeiro frame, eliminando salto inicial ao iniciar drag.
- [MELHORIA] Clamp de posição (margem) para impedir que o painel saia da tela.
- [MELHORIA] Reaproveitamento completo da lógica do loop de pintura, sem perdas.
- [INTERNO] Refatoração comentada do sistema de drag e documentação no cabeçalho.

---
## Estado Atual (após c3c7b84)
Funcionalidades ativas e estáveis:
- Drag suave (desktop e mobile) com Pointer Events.
- Painel funcional (todos botões clicáveis e responsivos).
- Traduções, tema, redimensionamento, filtros de pixels, construção de lista e pintura automatizada.
- Estatísticas e ETA atualizados dinamicamente.

---
## Próximas Melhorias Sugeridas
(Não implementadas ainda – backlog proposto)
1. Persistir posição do painel em `localStorage`.
2. Botão “Reset posição” para recentrar painel.
3. Persistir tema, idioma e preferências (ordem, velocidade, filtros) entre recargas.
4. Threshold de movimento para distinguir clique de drag (ex: só iniciar drag após mover >4px).
5. Opção de pausa / retomada granular salvando índice atual.
6. Visual de sobreposição mostrando a arte alinhada sobre o mapa para conferência antes de pintar.
7. Modo de verificação de divergências (apenas repintar onde a cor atual difere).
8. Métrica adicional: estimativa de conclusão em horário local.
9. Expor API interna para scripts externos interagirem (ex: window.WPlaceBot).
10. Suporte a múltiplas imagens em fila.

---
## Notas Técnicas
- Distância de cor: Euclidiana simples; pode ser substituída futuramente por ponderada (ex: luminosidade) se necessário.
- ETA: aproximação; considera ciclos de charges completos.
- Performance: janela móvel de 10s para px/s.
- Drag: pointer capture evita perda de eventos quando o dedo sai do header durante o arraste.

---
## Créditos
- Base / lógica original: @Eduardo854833 (reconstruída).
- Refatoração e melhorias atuais: esta série de commits.

---
## Histórico de Commits Relevantes
- 8cba59f – Versão base remodelada (UI + funcionalidades principais).
- 2d42ad66 – Primeira tentativa de unificar drag (introduziu bug de clique).
- c3c7b84 – Correção completa do drag + restauração da lógica.

---
Se desejar que eu gere o backlog como Issues no repositório, é só pedir.