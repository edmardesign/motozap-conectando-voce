# Plano: Refatoração do Fluxo de Transporte Institucional (Hub Centralizado)

Ajuste do roteamento para reutilizar a tela de mapa existente (`/hub`) e implementação da área do prestador (motorista) com rastreamento em tempo real.

## User Review Required

> [!IMPORTANT]
> A tela `/hub` será adaptada para aceitar o parâmetro `tipo` (automovel ou moto_taxi), permitindo a reutilização da lógica de mapa e geocoding já existente.

- **Fluxo do Servidor:** Cards em `/passageiro/transporte-servidores` agora levam ao `/hub` com o parâmetro correto.
- **Área do Motorista:** Nova área `/motorista` com login, painel online/offline e gestão de corridas.

## Technical Details

### Roteamento e Parâmetros
- **Passageiro:** `/hub?tipo=automovel` ou `/hub?tipo=moto_taxi`.
- **Motorista:** `/motorista/home`, `/motorista/corrida/:id`, `/auth/motorista`.

### Banco de Dados (Supabase)
- **Tabela `drivers`**: Rastreamento de localização e status online.
- **Tabela `ride_requests`**: Registro de solicitações com status e vinculação motorista/passageiro.
- **Realtime**: Habilitado em ambas para sincronização de posição e status da corrida.

## Step-by-Step Implementation

1.  **Ajuste do Hub (`/hub`)**:
    - Adicionar `validateSearch` para aceitar `tipo` e `id_demanda`.
    - Adaptar a lógica de estimativa e ícones com base no tipo de veículo.
2.  **Roteamento Institucional**:
    - Atualizar `/passageiro/transporte-servidores` para navegar para `/hub`.
3.  **Área do Motorista**:
    - Implementar `/auth/motorista` (login).
    - Criar `/motorista/home` com watchPosition e canal realtime de solicitações.
    - Criar `/motorista/corrida/:id` para o fluxo de execução da viagem.
4.  **Integração Realtime**:
    - Lado passageiro: Monitorar status da `ride_request` e posição do motorista em `drivers`.
    - Lado motorista: Tocar som e abrir modal ao receber `ride_request` compatível.
5.  **Segurança e RLS**:
    - Aplicar políticas para que motoristas vejam apenas pedidos pendentes compatíveis.
