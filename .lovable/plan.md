# Plano de Ação: Intergo Logística - Reorganização e Expansão

Vou transformar o projeto em um hub completo de logística institucional e mobilidade urbana, reorganizando a arquitetura atual para suportar os novos fluxos sem quebrar o que já existe.

## 1. Identidade e SEO
- **Rebranding Global:** Atualizar meta tags, `title` em `__root.tsx`, e textos institucionais para "Intergo Logística".
- **Slogan:** Implementar "Sua plataforma completa de logística e mobilidade urbana".
- **Splash Screen:** Refinar animação de abertura e labels no seletor inicial.

## 2. Reorganização da Home (Hub de Serviços)
- **Novo Layout Hub:** Criar `src/routes/hub.tsx` (ou refatorar a index) com dois blocos principais:
    - **Logística Institucional:** Transporte de Servidores (renomear labels), Solicitação Institucional, Frotas/Relatórios.
    - **Mobilidade Urbana:** Novos cards para Automóvel e Mototáxi (particular).
- **Seletor de Perfil:** Implementar interface de entrada clara: "Sou Servidor", "Sou Passageiro Comum", "Sou Motorista".

## 3. Módulo de Mobilidade Urbana (Particular)
- **Fluxo do Cliente:**
    - Mapa interativo (Leaflet) integrado à seleção de serviço.
    - Fluxo de solicitação: Seleção de destino -> Estimativa -> Chamada -> Acompanhamento.
    - Status da corrida: Procurando -> A caminho -> Em viagem -> Concluída.
- **Fluxo do Motorista:**
    - Cadastro unificado: Dados pessoais, CNH, Documentos do Veículo (Carro/Moto).
    - Painel do Motorista: Gerenciamento de disponibilidade, aceitação de corridas e extrato de ganhos.

## 4. Navegação e UX
- **Bottom Nav Unificada:** Home, Serviços, Minhas Viagens, Carteira, Perfil.
- **Design System:** Consolidar paleta (Branco #FFFFFF / Verde #3DB54A) e padrões Apple (bordas arredondadas, spring animations).
- **Responsividade:** Garantir experiência Mobile-first e compatibilidade Desktop (menu lateral).

## 5. Qualidade e Segurança
- **Segurança:** Revisar RLS nas tabelas e garantir que apenas usuários autorizados acessem o painel administrativo.
- **Error Handling:** Implementar página 404 personalizada e amigável.
- **Limpeza:** Remover rotas legadas e componentes órfãos.

## Detalhes Técnicos
- **TanStack Router:** Organização de rotas em `/passageiro/*` (comum), `/servidor/*` (institucional) e `/motorista/*`.
- **Supabase:** Extensão da tabela de perfis para incluir `tipo_usuario` e `veiculo_tipo`.
- **Framer Motion:** Uso de `animate-apple-*` tokens para transições fluidas.
