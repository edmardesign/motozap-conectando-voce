# Plan: Implementação do Fluxo Completo de Solicitação (Motorista e Servidor)

Implementação do sistema de transporte de ponta a ponta para a Intergo Logística, incluindo integração com Mapbox para geolocalização e rotas, e comunicação em tempo real via Supabase para rastreamento de motoristas.

## User Review Required

> [!IMPORTANT]
> A integração com o Mapbox requer um Token de Acesso (VITE_MAPBOX_TOKEN). Implementarei uma interface para configuração caso o token não esteja presente.

- **Fluxo de Motorista:** O motorista terá um painel para ficar online e aceitar solicitações.
- **Geolocalização:** O app pedirá permissão de localização para centralizar o mapa e calcular rotas.

## Technical Details

### Database Schema (Supabase)
1.  **Tabela `drivers`**:
    - `id` (uuid, fk profiles)
    - `tipo_veiculo` (automovel | moto)
    - `placa`, `modelo`
    - `is_online` (boolean)
    - `current_location` (geography point)
2.  **Tabela `ride_requests`**:
    - `id`, `passageiro_id`, `motorista_id`
    - `tipo` (automovel | moto_taxi)
    - `origem_lat`, `origem_lng`, `origem_endereco`
    - `destino_lat`, `destino_lng`, `destino_endereco`
    - `valor_estimado`, `distancia_km`
    - `status` (pendente | aceito | chegou | em_andamento | finalizado | cancelado)

### Frontend (React + Mapbox)
- **Mapbox GL JS**: Renderização de mapa e rotas.
- **Supabase Realtime**: Assinatura de mudanças na tabela `ride_requests` para atualização instantânea da UI.
- **Framer Motion**: Animações Apple-like nos modais e transições.

## Step-by-Step Implementation

1.  **Infraestrutura Supabase**:
    - Criar migração SQL com tabelas, RLS e PostGIS.
    - Habilitar Realtime para as tabelas principais.
2.  **Módulo de Mapas**:
    - Criar componente `MapContainer` reutilizável com suporte a marcadores e rotas.
    - Implementar utilitários de Geocoding.
3.  **Fluxo do Servidor (Passageiro)**:
    - Página de solicitação com busca de endereço e estimativa de preço.
    - Tela de espera com rastreamento do motorista.
4.  **Fluxo do Motorista**:
    - Painel "Online/Offline" com watchPosition.
    - Modal de recebimento de corrida com som de notificação.
    - Controle de estados da corrida (Cheguei -> Iniciar -> Finalizar).
5.  **Polimento**:
    - Integração visual com a identidade INTERGO (Verde #3DB54A).
    - Tratamento de erros de GPS e falta de motoristas.
