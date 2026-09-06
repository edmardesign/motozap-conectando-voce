export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allowed_neighbor_cities: {
        Row: {
          added_at: string
          added_by: string | null
          created_at: string
          id: string
          neighbor_city_id: string
          primary_city_id: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          created_at?: string
          id?: string
          neighbor_city_id: string
          primary_city_id: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          created_at?: string
          id?: string
          neighbor_city_id?: string
          primary_city_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowed_neighbor_cities_neighbor_city_id_fkey"
            columns: ["neighbor_city_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowed_neighbor_cities_primary_city_id_fkey"
            columns: ["primary_city_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_administrativa: {
        Row: {
          acao: string
          autor_user_id: string | null
          cidade_id: string | null
          criado_em: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade: string | null
          entidade_id: string | null
          id: string
          tipo_autor: Database["public"]["Enums"]["nivel_admin_enum"] | null
        }
        Insert: {
          acao: string
          autor_user_id?: string | null
          cidade_id?: string | null
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          tipo_autor?: Database["public"]["Enums"]["nivel_admin_enum"] | null
        }
        Update: {
          acao?: string
          autor_user_id?: string | null
          cidade_id?: string | null
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          tipo_autor?: Database["public"]["Enums"]["nivel_admin_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_administrativa_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          avaliado_id: string
          avaliador_id: string
          comentario: string | null
          corrida_id: string
          criado_em: string
          id: string
          nota: number
        }
        Insert: {
          avaliado_id: string
          avaliador_id: string
          comentario?: string | null
          corrida_id: string
          criado_em?: string
          id?: string
          nota: number
        }
        Update: {
          avaliado_id?: string
          avaliador_id?: string
          comentario?: string | null
          corrida_id?: string
          criado_em?: string
          id?: string
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas_broadcast"
            referencedColumns: ["id"]
          },
        ]
      }
      bairros: {
        Row: {
          aliases: string[]
          ativo: boolean
          cidade_id: string
          created_at: string
          id: string
          nome: string
          nome_normalizado: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          ativo?: boolean
          cidade_id: string
          created_at?: string
          id?: string
          nome: string
          nome_normalizado: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          ativo?: boolean
          cidade_id?: string
          created_at?: string
          id?: string
          nome?: string
          nome_normalizado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bairros_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      bairros_adicional: {
        Row: {
          ativo: boolean
          cidade_id: string
          criado_em: string
          id: string
          nome_bairro: string
          valor_adicional: number
        }
        Insert: {
          ativo?: boolean
          cidade_id: string
          criado_em?: string
          id?: string
          nome_bairro: string
          valor_adicional: number
        }
        Update: {
          ativo?: boolean
          cidade_id?: string
          criado_em?: string
          id?: string
          nome_bairro?: string
          valor_adicional?: number
        }
        Relationships: [
          {
            foreignKeyName: "bairros_adicional_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_mototaxista: {
        Row: {
          atualizado_em: string
          mototaxista_id: string
          saldo_disponivel: number
          saldo_pendente: number
          total_recebido_historico: number
        }
        Insert: {
          atualizado_em?: string
          mototaxista_id: string
          saldo_disponivel?: number
          saldo_pendente?: number
          total_recebido_historico?: number
        }
        Update: {
          atualizado_em?: string
          mototaxista_id?: string
          saldo_disponivel?: number
          saldo_pendente?: number
          total_recebido_historico?: number
        }
        Relationships: [
          {
            foreignKeyName: "carteira_mototaxista_mototaxista_id_fkey"
            columns: ["mototaxista_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      carteira_passageiro: {
        Row: {
          atualizado_em: string
          passageiro_id: string
          saldo_disponivel: number
          saldo_pendente: number
          total_recarregado_historico: number
        }
        Insert: {
          atualizado_em?: string
          passageiro_id: string
          saldo_disponivel?: number
          saldo_pendente?: number
          total_recarregado_historico?: number
        }
        Update: {
          atualizado_em?: string
          passageiro_id?: string
          saldo_disponivel?: number
          saldo_pendente?: number
          total_recarregado_historico?: number
        }
        Relationships: [
          {
            foreignKeyName: "carteira_passageiro_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades_configuradas: {
        Row: {
          ativa: boolean
          cidade: string
          criado_em: string
          delivery_ativo: boolean
          estado: string
          id: string
          mercado_ativo: boolean
          mototaxi_ativo: boolean
        }
        Insert: {
          ativa?: boolean
          cidade: string
          criado_em?: string
          delivery_ativo?: boolean
          estado: string
          id?: string
          mercado_ativo?: boolean
          mototaxi_ativo?: boolean
        }
        Update: {
          ativa?: boolean
          cidade?: string
          criado_em?: string
          delivery_ativo?: boolean
          estado?: string
          id?: string
          mercado_ativo?: boolean
          mototaxi_ativo?: boolean
        }
        Relationships: []
      }
      configuracoes_plataforma: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao?: string
          valor: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string
          valor?: string
        }
        Relationships: []
      }
      configuracoes_tarifarias: {
        Row: {
          ativo: boolean
          cidade_id: string | null
          created_at: string
          criado_por: string | null
          fim_vigencia: string | null
          id: string
          inicio_vigencia: string
          justificativa: string
          taxa_bora_ze: number
          updated_at: string
          valor_base: number | null
          versao: number
        }
        Insert: {
          ativo?: boolean
          cidade_id?: string | null
          created_at?: string
          criado_por?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string
          justificativa: string
          taxa_bora_ze: number
          updated_at?: string
          valor_base?: number | null
          versao?: number
        }
        Update: {
          ativo?: boolean
          cidade_id?: string | null
          created_at?: string
          criado_por?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string
          justificativa?: string
          taxa_bora_ze?: number
          updated_at?: string
          valor_base?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_tarifarias_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      contador_corridas_passageiro: {
        Row: {
          atualizado_em: string
          corridas_desde_ultimo_brinde: number
          passageiro_id: string
          total_concluidas: number
        }
        Insert: {
          atualizado_em?: string
          corridas_desde_ultimo_brinde?: number
          passageiro_id: string
          total_concluidas?: number
        }
        Update: {
          atualizado_em?: string
          corridas_desde_ultimo_brinde?: number
          passageiro_id?: string
          total_concluidas?: number
        }
        Relationships: [
          {
            foreignKeyName: "contador_corridas_passageiro_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      corridas: {
        Row: {
          aceita_em: string | null
          atualizado_em: string
          bairro_destino: string | null
          bairro_destino_id: string | null
          bairro_origem: string | null
          bairro_origem_id: string | null
          chat_resumo: Json | null
          cidade: string | null
          cidade_id: string | null
          configuracao_tarifaria_id: string | null
          criado_em: string
          descricao: string | null
          destino_endereco: string
          destino_lat: number | null
          destino_lng: number | null
          distancia_final_km: number | null
          distancia_km: number | null
          duracao_min: number | null
          eh_gratuita: boolean
          em_nome_de: string | null
          estado: string | null
          finalizada_em: string | null
          foto_pagamento_url: string | null
          foto_retirada_url: string | null
          foto_url: string | null
          gateway_transaction_id: string | null
          id: string
          iniciada_em: string | null
          mototaxista_id: string | null
          municipio_destino_id: string | null
          municipio_excecao_id: string | null
          ninguem_recebe_iniciado_em: string | null
          origem_endereco: string
          origem_lat: number | null
          origem_lng: number | null
          pagamento_no_local: boolean
          pagamento_tipo: Database["public"]["Enums"]["tipo_pagamento_corrida"]
          passageiro_id: string
          perto_fronteira: boolean
          regra_tarifaria_id: string | null
          status: Database["public"]["Enums"]["status_corrida"]
          status_encomenda: string | null
          taxa_bora_ze_aplicada: number | null
          tipo: string
          valor_base_aplicado: number | null
          valor_estimado: number
          valor_final: number | null
          valor_pagamento_local: number | null
          valor_pago_via_app: boolean
          valor_produto_ajustado: number | null
          valor_total_passageiro: number | null
        }
        Insert: {
          aceita_em?: string | null
          atualizado_em?: string
          bairro_destino?: string | null
          bairro_destino_id?: string | null
          bairro_origem?: string | null
          bairro_origem_id?: string | null
          chat_resumo?: Json | null
          cidade?: string | null
          cidade_id?: string | null
          configuracao_tarifaria_id?: string | null
          criado_em?: string
          descricao?: string | null
          destino_endereco: string
          destino_lat?: number | null
          destino_lng?: number | null
          distancia_final_km?: number | null
          distancia_km?: number | null
          duracao_min?: number | null
          eh_gratuita?: boolean
          em_nome_de?: string | null
          estado?: string | null
          finalizada_em?: string | null
          foto_pagamento_url?: string | null
          foto_retirada_url?: string | null
          foto_url?: string | null
          gateway_transaction_id?: string | null
          id?: string
          iniciada_em?: string | null
          mototaxista_id?: string | null
          municipio_destino_id?: string | null
          municipio_excecao_id?: string | null
          ninguem_recebe_iniciado_em?: string | null
          origem_endereco: string
          origem_lat?: number | null
          origem_lng?: number | null
          pagamento_no_local?: boolean
          pagamento_tipo?: Database["public"]["Enums"]["tipo_pagamento_corrida"]
          passageiro_id: string
          perto_fronteira?: boolean
          regra_tarifaria_id?: string | null
          status?: Database["public"]["Enums"]["status_corrida"]
          status_encomenda?: string | null
          taxa_bora_ze_aplicada?: number | null
          tipo?: string
          valor_base_aplicado?: number | null
          valor_estimado?: number
          valor_final?: number | null
          valor_pagamento_local?: number | null
          valor_pago_via_app?: boolean
          valor_produto_ajustado?: number | null
          valor_total_passageiro?: number | null
        }
        Update: {
          aceita_em?: string | null
          atualizado_em?: string
          bairro_destino?: string | null
          bairro_destino_id?: string | null
          bairro_origem?: string | null
          bairro_origem_id?: string | null
          chat_resumo?: Json | null
          cidade?: string | null
          cidade_id?: string | null
          configuracao_tarifaria_id?: string | null
          criado_em?: string
          descricao?: string | null
          destino_endereco?: string
          destino_lat?: number | null
          destino_lng?: number | null
          distancia_final_km?: number | null
          distancia_km?: number | null
          duracao_min?: number | null
          eh_gratuita?: boolean
          em_nome_de?: string | null
          estado?: string | null
          finalizada_em?: string | null
          foto_pagamento_url?: string | null
          foto_retirada_url?: string | null
          foto_url?: string | null
          gateway_transaction_id?: string | null
          id?: string
          iniciada_em?: string | null
          mototaxista_id?: string | null
          municipio_destino_id?: string | null
          municipio_excecao_id?: string | null
          ninguem_recebe_iniciado_em?: string | null
          origem_endereco?: string
          origem_lat?: number | null
          origem_lng?: number | null
          pagamento_no_local?: boolean
          pagamento_tipo?: Database["public"]["Enums"]["tipo_pagamento_corrida"]
          passageiro_id?: string
          perto_fronteira?: boolean
          regra_tarifaria_id?: string | null
          status?: Database["public"]["Enums"]["status_corrida"]
          status_encomenda?: string | null
          taxa_bora_ze_aplicada?: number | null
          tipo?: string
          valor_base_aplicado?: number | null
          valor_estimado?: number
          valor_final?: number | null
          valor_pagamento_local?: number | null
          valor_pago_via_app?: boolean
          valor_produto_ajustado?: number | null
          valor_total_passageiro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "corridas_bairro_destino_id_fkey"
            columns: ["bairro_destino_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_bairro_origem_id_fkey"
            columns: ["bairro_origem_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_configuracao_tarifaria_id_fkey"
            columns: ["configuracao_tarifaria_id"]
            isOneToOne: false
            referencedRelation: "configuracoes_tarifarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_mototaxista_id_fkey"
            columns: ["mototaxista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_municipio_destino_id_fkey"
            columns: ["municipio_destino_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_municipio_excecao_id_fkey"
            columns: ["municipio_excecao_id"]
            isOneToOne: false
            referencedRelation: "ride_exception_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corridas_regra_tarifaria_id_fkey"
            columns: ["regra_tarifaria_id"]
            isOneToOne: false
            referencedRelation: "regras_preco_bairro"
            referencedColumns: ["id"]
          },
        ]
      }
      cpf_validacao_log: {
        Row: {
          cpf_mascarado: string
          criado_em: string
          id: string
          origem: string
          resultado: Json
          sucesso: boolean
          user_id: string | null
        }
        Insert: {
          cpf_mascarado: string
          criado_em?: string
          id?: string
          origem?: string
          resultado?: Json
          sucesso?: boolean
          user_id?: string | null
        }
        Update: {
          cpf_mascarado?: string
          criado_em?: string
          id?: string
          origem?: string
          resultado?: Json
          sucesso?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      destinos_passageiro: {
        Row: {
          criado_em: string
          endereco: string
          favorito: boolean
          id: string
          latitude: number | null
          longitude: number | null
          nome: string | null
          passageiro_id: string
          ultima_vez_usado: string
          vezes_usado: number
        }
        Insert: {
          criado_em?: string
          endereco: string
          favorito?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string | null
          passageiro_id: string
          ultima_vez_usado?: string
          vezes_usado?: number
        }
        Update: {
          criado_em?: string
          endereco?: string
          favorito?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string | null
          passageiro_id?: string
          ultima_vez_usado?: string
          vezes_usado?: number
        }
        Relationships: []
      }
      drivers: {
        Row: {
          current_lat: number | null
          current_lng: number | null
          is_online: boolean | null
          modelo: string | null
          placa: string | null
          tipo_veiculo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_lat?: number | null
          current_lng?: number | null
          is_online?: boolean | null
          modelo?: string | null
          placa?: string | null
          tipo_veiculo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_lat?: number | null
          current_lng?: number | null
          is_online?: boolean | null
          modelo?: string | null
          placa?: string | null
          tipo_veiculo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      empresa_auth: {
        Row: {
          criado_em: string
          email: string
          empresa_id: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          email: string
          empresa_id: string
          user_id: string
        }
        Update: {
          criado_em?: string
          email?: string
          empresa_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_auth_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          atualizado_em: string
          cidade: string | null
          cidade_id: string | null
          criado_em: string
          documento: string | null
          endereco: string | null
          endereco_bairro: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          mensalidade_ativa: boolean
          nome: string
          plano_validade: string | null
          responsavel: string | null
          telefone: string
          termos_aceitos_em: string | null
          termos_versao: string | null
          tipo_documento: string | null
          tipo_negocio: string
        }
        Insert: {
          atualizado_em?: string
          cidade?: string | null
          cidade_id?: string | null
          criado_em?: string
          documento?: string | null
          endereco?: string | null
          endereco_bairro?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mensalidade_ativa?: boolean
          nome: string
          plano_validade?: string | null
          responsavel?: string | null
          telefone: string
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo_documento?: string | null
          tipo_negocio?: string
        }
        Update: {
          atualizado_em?: string
          cidade?: string | null
          cidade_id?: string | null
          criado_em?: string
          documento?: string | null
          endereco?: string | null
          endereco_bairro?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mensalidade_ativa?: boolean
          nome?: string
          plano_validade?: string | null
          responsavel?: string | null
          telefone?: string
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo_documento?: string | null
          tipo_negocio?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          atualizado_em: string
          cidade_id: string | null
          criado_em: string
          descricao_item: string | null
          empresa_id: string
          endereco_coleta: string
          endereco_entrega: string
          id: string
          lat_coleta: number | null
          lat_entrega: number | null
          lng_coleta: number | null
          lng_entrega: number | null
          mototaxista_id: string | null
          status: Database["public"]["Enums"]["status_entrega"]
          valor_combinado: number
        }
        Insert: {
          atualizado_em?: string
          cidade_id?: string | null
          criado_em?: string
          descricao_item?: string | null
          empresa_id: string
          endereco_coleta: string
          endereco_entrega: string
          id?: string
          lat_coleta?: number | null
          lat_entrega?: number | null
          lng_coleta?: number | null
          lng_entrega?: number | null
          mototaxista_id?: string | null
          status?: Database["public"]["Enums"]["status_entrega"]
          valor_combinado: number
        }
        Update: {
          atualizado_em?: string
          cidade_id?: string | null
          criado_em?: string
          descricao_item?: string | null
          empresa_id?: string
          endereco_coleta?: string
          endereco_entrega?: string
          id?: string
          lat_coleta?: number | null
          lat_entrega?: number | null
          lng_coleta?: number | null
          lng_entrega?: number | null
          mototaxista_id?: string | null
          status?: Database["public"]["Enums"]["status_entrega"]
          valor_combinado?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_mototaxista_id_fkey"
            columns: ["mototaxista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_acertos: {
        Row: {
          a_receber: number
          a_repassar: number
          comissao: number
          created_at: string
          fechado_em: string
          fechado_por: string | null
          id: string
          loja_id: string
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          qtd_pedidos: number
          total_vendido: number
          updated_at: string
        }
        Insert: {
          a_receber?: number
          a_repassar?: number
          comissao?: number
          created_at?: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          loja_id: string
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          qtd_pedidos?: number
          total_vendido?: number
          updated_at?: string
        }
        Update: {
          a_receber?: number
          a_repassar?: number
          comissao?: number
          created_at?: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          loja_id?: string
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          qtd_pedidos?: number
          total_vendido?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_acertos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      food_adicionais: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          preco: number
          produto_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          preco?: number
          produto_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          preco?: number
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_adicionais_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "food_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      food_categorias_cardapio: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          loja_id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          loja_id: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          loja_id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_categorias_cardapio_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      food_cupons: {
        Row: {
          apenas_primeira_compra: boolean
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          loja_id: string
          tipo: string
          updated_at: string
          usos: number
          usos_max: number | null
          validade: string | null
          valor: number
        }
        Insert: {
          apenas_primeira_compra?: boolean
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          loja_id: string
          tipo: string
          updated_at?: string
          usos?: number
          usos_max?: number | null
          validade?: string | null
          valor: number
        }
        Update: {
          apenas_primeira_compra?: boolean
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          loja_id?: string
          tipo?: string
          updated_at?: string
          usos?: number
          usos_max?: number | null
          validade?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_cupons_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      food_cupons_uso: {
        Row: {
          cliente_user_id: string
          cupom_id: string
          id: string
          loja_id: string
          pedido_id: string | null
          usado_em: string
        }
        Insert: {
          cliente_user_id: string
          cupom_id: string
          id?: string
          loja_id: string
          pedido_id?: string | null
          usado_em?: string
        }
        Update: {
          cliente_user_id?: string
          cupom_id?: string
          id?: string
          loja_id?: string
          pedido_id?: string | null
          usado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_cupons_uso_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "food_cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_cupons_uso_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_cupons_uso_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "food_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      food_horarios: {
        Row: {
          abre: string
          ativo: boolean
          created_at: string
          dia_semana: number
          fecha: string
          id: string
          loja_id: string
          updated_at: string
        }
        Insert: {
          abre: string
          ativo?: boolean
          created_at?: string
          dia_semana: number
          fecha: string
          id?: string
          loja_id: string
          updated_at?: string
        }
        Update: {
          abre?: string
          ativo?: boolean
          created_at?: string
          dia_semana?: number
          fecha?: string
          id?: string
          loja_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_horarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      food_lojas: {
        Row: {
          aberto: boolean
          ativo: boolean
          avaliacao: number
          bairro: string | null
          categoria: string
          cidade_id: string | null
          comissao_percentual: number
          created_at: string
          descricao: string | null
          distancia_max_km: number
          dono_user_id: string
          endereco: string | null
          id: string
          imagem_capa_url: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          nome: string
          pausado: boolean
          promo_destaque: string | null
          slug: string
          tags: string[]
          taxa_entrega: number
          telefone: string | null
          tempo_preparo_max: number
          tempo_preparo_min: number
          updated_at: string
        }
        Insert: {
          aberto?: boolean
          ativo?: boolean
          avaliacao?: number
          bairro?: string | null
          categoria: string
          cidade_id?: string | null
          comissao_percentual?: number
          created_at?: string
          descricao?: string | null
          distancia_max_km?: number
          dono_user_id: string
          endereco?: string | null
          id?: string
          imagem_capa_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nome: string
          pausado?: boolean
          promo_destaque?: string | null
          slug: string
          tags?: string[]
          taxa_entrega?: number
          telefone?: string | null
          tempo_preparo_max?: number
          tempo_preparo_min?: number
          updated_at?: string
        }
        Update: {
          aberto?: boolean
          ativo?: boolean
          avaliacao?: number
          bairro?: string | null
          categoria?: string
          cidade_id?: string | null
          comissao_percentual?: number
          created_at?: string
          descricao?: string | null
          distancia_max_km?: number
          dono_user_id?: string
          endereco?: string | null
          id?: string
          imagem_capa_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nome?: string
          pausado?: boolean
          promo_destaque?: string | null
          slug?: string
          tags?: string[]
          taxa_entrega?: number
          telefone?: string | null
          tempo_preparo_max?: number
          tempo_preparo_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_lojas_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      food_pedido_itens: {
        Row: {
          adicionais: Json
          created_at: string
          id: string
          nome_snapshot: string
          observacao: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          adicionais?: Json
          created_at?: string
          id?: string
          nome_snapshot: string
          observacao?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade?: number
          subtotal: number
        }
        Update: {
          adicionais?: Json
          created_at?: string
          id?: string
          nome_snapshot?: string
          observacao?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "food_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "food_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      food_pedidos: {
        Row: {
          acerto_id: string | null
          bairro_entrega: string | null
          cancelado_em: string | null
          cidade_id: string | null
          cliente_user_id: string
          complemento: string | null
          confirmado_em: string | null
          created_at: string
          cupom_id: string | null
          desconto: number
          em_entrega_em: string | null
          em_preparo_em: string | null
          endereco_entrega: string
          entregador_user_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["food_forma_pagamento"]
          id: string
          latitude_entrega: number | null
          loja_id: string
          longitude_entrega: number | null
          motivo_cancelamento: string | null
          numero_pedido: number
          observacao: string | null
          pronto_em: string | null
          status: Database["public"]["Enums"]["food_status_pedido"]
          subtotal: number
          taxa_entrega: number
          tempo_estimado_min: number | null
          total: number
          troco_para: number | null
          updated_at: string
        }
        Insert: {
          acerto_id?: string | null
          bairro_entrega?: string | null
          cancelado_em?: string | null
          cidade_id?: string | null
          cliente_user_id: string
          complemento?: string | null
          confirmado_em?: string | null
          created_at?: string
          cupom_id?: string | null
          desconto?: number
          em_entrega_em?: string | null
          em_preparo_em?: string | null
          endereco_entrega: string
          entregador_user_id?: string | null
          entregue_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["food_forma_pagamento"]
          id?: string
          latitude_entrega?: number | null
          loja_id: string
          longitude_entrega?: number | null
          motivo_cancelamento?: string | null
          numero_pedido?: number
          observacao?: string | null
          pronto_em?: string | null
          status?: Database["public"]["Enums"]["food_status_pedido"]
          subtotal?: number
          taxa_entrega?: number
          tempo_estimado_min?: number | null
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Update: {
          acerto_id?: string | null
          bairro_entrega?: string | null
          cancelado_em?: string | null
          cidade_id?: string | null
          cliente_user_id?: string
          complemento?: string | null
          confirmado_em?: string | null
          created_at?: string
          cupom_id?: string | null
          desconto?: number
          em_entrega_em?: string | null
          em_preparo_em?: string | null
          endereco_entrega?: string
          entregador_user_id?: string | null
          entregue_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["food_forma_pagamento"]
          id?: string
          latitude_entrega?: number | null
          loja_id?: string
          longitude_entrega?: number | null
          motivo_cancelamento?: string | null
          numero_pedido?: number
          observacao?: string | null
          pronto_em?: string | null
          status?: Database["public"]["Enums"]["food_status_pedido"]
          subtotal?: number
          taxa_entrega?: number
          tempo_estimado_min?: number | null
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_pedidos_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      food_produtos: {
        Row: {
          categoria_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          disponivel: boolean
          id: string
          imagem_url: string | null
          loja_id: string
          nome: string
          ordem: number
          preco: number
          preco_de: number | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          disponivel?: boolean
          id?: string
          imagem_url?: string | null
          loja_id: string
          nome: string
          ordem?: number
          preco: number
          preco_de?: number | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          disponivel?: boolean
          id?: string
          imagem_url?: string | null
          loja_id?: string
          nome?: string
          ordem?: number
          preco?: number
          preco_de?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "food_categorias_cardapio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_produtos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "food_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      gestor_cidades: {
        Row: {
          cidade_id: string
          criado_em: string
          id: string
          perfil_id: string
          vinculo_ativo: boolean
        }
        Insert: {
          cidade_id: string
          criado_em?: string
          id?: string
          perfil_id: string
          vinculo_ativo?: boolean
        }
        Update: {
          cidade_id?: string
          criado_em?: string
          id?: string
          perfil_id?: string
          vinculo_ativo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gestor_cidades_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestor_cidades_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_administrativos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_corrida: {
        Row: {
          anexo_url: string | null
          corrida_id: string
          criada_em: string
          expira_em: string
          id: string
          lida: boolean
          remetente_id: string
          remetente_tipo: Database["public"]["Enums"]["remetente_tipo_msg"]
          texto: string | null
        }
        Insert: {
          anexo_url?: string | null
          corrida_id: string
          criada_em?: string
          expira_em?: string
          id?: string
          lida?: boolean
          remetente_id: string
          remetente_tipo: Database["public"]["Enums"]["remetente_tipo_msg"]
          texto?: string | null
        }
        Update: {
          anexo_url?: string | null
          corrida_id?: string
          criada_em?: string
          expira_em?: string
          id?: string
          lida?: boolean
          remetente_id?: string
          remetente_tipo?: Database["public"]["Enums"]["remetente_tipo_msg"]
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_corrida_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_corrida_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas_broadcast"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          criado_em: string
          id: string
          mototaxista_id: string
          pago_em: string | null
          status: Database["public"]["Enums"]["status_mensalidade"]
          valor: number
          vencimento: string
        }
        Insert: {
          criado_em?: string
          id?: string
          mototaxista_id: string
          pago_em?: string | null
          status?: Database["public"]["Enums"]["status_mensalidade"]
          valor?: number
          vencimento: string
        }
        Update: {
          criado_em?: string
          id?: string
          mototaxista_id?: string
          pago_em?: string | null
          status?: Database["public"]["Enums"]["status_mensalidade"]
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_mototaxista_id_fkey"
            columns: ["mototaxista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_acertos: {
        Row: {
          a_receber: number
          a_repassar: number
          comissao: number
          created_at: string
          fechado_em: string
          fechado_por: string | null
          id: string
          loja_id: string
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          qtd_pedidos: number
          total_vendido: number
          updated_at: string
        }
        Insert: {
          a_receber: number
          a_repassar: number
          comissao: number
          created_at?: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          loja_id: string
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          qtd_pedidos: number
          total_vendido: number
          updated_at?: string
        }
        Update: {
          a_receber?: number
          a_repassar?: number
          comissao?: number
          created_at?: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          loja_id?: string
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          qtd_pedidos?: number
          total_vendido?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_acertos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_adicionais: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          preco: number
          produto_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          preco?: number
          produto_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          preco?: number
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_adicionais_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "mercado_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_categorias_cardapio: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          loja_id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          loja_id: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          loja_id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_categorias_cardapio_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_cupons: {
        Row: {
          apenas_primeira_compra: boolean
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          loja_id: string
          tipo: string
          updated_at: string
          usos: number
          usos_max: number | null
          validade: string | null
          valor: number
        }
        Insert: {
          apenas_primeira_compra?: boolean
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          loja_id: string
          tipo: string
          updated_at?: string
          usos?: number
          usos_max?: number | null
          validade?: string | null
          valor: number
        }
        Update: {
          apenas_primeira_compra?: boolean
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          loja_id?: string
          tipo?: string
          updated_at?: string
          usos?: number
          usos_max?: number | null
          validade?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "mercado_cupons_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_cupons_uso: {
        Row: {
          cliente_user_id: string
          cupom_id: string
          id: string
          loja_id: string
          pedido_id: string | null
          usado_em: string
        }
        Insert: {
          cliente_user_id: string
          cupom_id: string
          id?: string
          loja_id: string
          pedido_id?: string | null
          usado_em?: string
        }
        Update: {
          cliente_user_id?: string
          cupom_id?: string
          id?: string
          loja_id?: string
          pedido_id?: string | null
          usado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_cupons_uso_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "mercado_cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_cupons_uso_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_cupons_uso_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "mercado_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_horarios: {
        Row: {
          abre: string
          ativo: boolean
          created_at: string
          dia_semana: number
          fecha: string
          id: string
          loja_id: string
          updated_at: string
        }
        Insert: {
          abre: string
          ativo?: boolean
          created_at?: string
          dia_semana: number
          fecha: string
          id?: string
          loja_id: string
          updated_at?: string
        }
        Update: {
          abre?: string
          ativo?: boolean
          created_at?: string
          dia_semana?: number
          fecha?: string
          id?: string
          loja_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_horarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_lojas: {
        Row: {
          aberto: boolean
          ativo: boolean
          avaliacao: number
          bairro: string | null
          categoria: string
          cidade_id: string | null
          comissao_percentual: number
          created_at: string
          descricao: string | null
          distancia_max_km: number
          dono_user_id: string
          endereco: string | null
          id: string
          imagem_capa_url: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          nome: string
          pausado: boolean
          promo_destaque: string | null
          slug: string
          tags: string[]
          taxa_entrega: number
          telefone: string | null
          tempo_preparo_max: number
          tempo_preparo_min: number
          updated_at: string
        }
        Insert: {
          aberto?: boolean
          ativo?: boolean
          avaliacao?: number
          bairro?: string | null
          categoria: string
          cidade_id?: string | null
          comissao_percentual?: number
          created_at?: string
          descricao?: string | null
          distancia_max_km?: number
          dono_user_id: string
          endereco?: string | null
          id?: string
          imagem_capa_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nome: string
          pausado?: boolean
          promo_destaque?: string | null
          slug: string
          tags?: string[]
          taxa_entrega?: number
          telefone?: string | null
          tempo_preparo_max?: number
          tempo_preparo_min?: number
          updated_at?: string
        }
        Update: {
          aberto?: boolean
          ativo?: boolean
          avaliacao?: number
          bairro?: string | null
          categoria?: string
          cidade_id?: string | null
          comissao_percentual?: number
          created_at?: string
          descricao?: string | null
          distancia_max_km?: number
          dono_user_id?: string
          endereco?: string | null
          id?: string
          imagem_capa_url?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nome?: string
          pausado?: boolean
          promo_destaque?: string | null
          slug?: string
          tags?: string[]
          taxa_entrega?: number
          telefone?: string | null
          tempo_preparo_max?: number
          tempo_preparo_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      mercado_pedido_itens: {
        Row: {
          adicionais: Json
          created_at: string
          id: string
          nome_snapshot: string
          observacao: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          adicionais?: Json
          created_at?: string
          id?: string
          nome_snapshot: string
          observacao?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          subtotal: number
        }
        Update: {
          adicionais?: Json
          created_at?: string
          id?: string
          nome_snapshot?: string
          observacao?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "mercado_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "mercado_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "mercado_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_pedidos: {
        Row: {
          acerto_id: string | null
          bairro_entrega: string | null
          cancelado_em: string | null
          cidade_id: string | null
          cliente_user_id: string
          complemento: string | null
          confirmado_em: string | null
          created_at: string
          cupom_id: string | null
          desconto: number
          em_entrega_em: string | null
          em_preparo_em: string | null
          endereco_entrega: string
          entregador_user_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["mercado_forma_pagamento"]
          id: string
          latitude_entrega: number | null
          loja_id: string
          longitude_entrega: number | null
          motivo_cancelamento: string | null
          numero_pedido: number
          observacao: string | null
          pronto_em: string | null
          status: Database["public"]["Enums"]["mercado_status_pedido"]
          subtotal: number
          taxa_entrega: number
          tempo_estimado_min: number | null
          total: number
          troco_para: number | null
          updated_at: string
        }
        Insert: {
          acerto_id?: string | null
          bairro_entrega?: string | null
          cancelado_em?: string | null
          cidade_id?: string | null
          cliente_user_id: string
          complemento?: string | null
          confirmado_em?: string | null
          created_at?: string
          cupom_id?: string | null
          desconto?: number
          em_entrega_em?: string | null
          em_preparo_em?: string | null
          endereco_entrega: string
          entregador_user_id?: string | null
          entregue_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["mercado_forma_pagamento"]
          id?: string
          latitude_entrega?: number | null
          loja_id: string
          longitude_entrega?: number | null
          motivo_cancelamento?: string | null
          numero_pedido?: number
          observacao?: string | null
          pronto_em?: string | null
          status?: Database["public"]["Enums"]["mercado_status_pedido"]
          subtotal: number
          taxa_entrega?: number
          tempo_estimado_min?: number | null
          total: number
          troco_para?: number | null
          updated_at?: string
        }
        Update: {
          acerto_id?: string | null
          bairro_entrega?: string | null
          cancelado_em?: string | null
          cidade_id?: string | null
          cliente_user_id?: string
          complemento?: string | null
          confirmado_em?: string | null
          created_at?: string
          cupom_id?: string | null
          desconto?: number
          em_entrega_em?: string | null
          em_preparo_em?: string | null
          endereco_entrega?: string
          entregador_user_id?: string | null
          entregue_em?: string | null
          forma_pagamento?: Database["public"]["Enums"]["mercado_forma_pagamento"]
          id?: string
          latitude_entrega?: number | null
          loja_id?: string
          longitude_entrega?: number | null
          motivo_cancelamento?: string | null
          numero_pedido?: number
          observacao?: string | null
          pronto_em?: string | null
          status?: Database["public"]["Enums"]["mercado_status_pedido"]
          subtotal?: number
          taxa_entrega?: number
          tempo_estimado_min?: number | null
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_pedidos_acerto_fk"
            columns: ["acerto_id"]
            isOneToOne: false
            referencedRelation: "mercado_acertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_pedidos_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "mercado_cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_produtos: {
        Row: {
          categoria_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          disponivel: boolean
          id: string
          imagem_url: string | null
          loja_id: string
          nome: string
          ordem: number
          preco: number
          preco_de: number | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          disponivel?: boolean
          id?: string
          imagem_url?: string | null
          loja_id: string
          nome: string
          ordem?: number
          preco: number
          preco_de?: number | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          disponivel?: boolean
          id?: string
          imagem_url?: string | null
          loja_id?: string
          nome?: string
          ordem?: number
          preco?: number
          preco_de?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "mercado_categorias_cardapio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_produtos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "mercado_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      mototaxista_documentos: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          cidade_id: string | null
          content_type: string | null
          created_at: string
          enviado_em: string
          id: string
          motivo_rejeicao: string | null
          status: Database["public"]["Enums"]["status_documento_moto"]
          storage_path: string
          tamanho_bytes: number | null
          tipo_documento: string
          updated_at: string
          user_id: string
          versao: number
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          cidade_id?: string | null
          content_type?: string | null
          created_at?: string
          enviado_em?: string
          id?: string
          motivo_rejeicao?: string | null
          status?: Database["public"]["Enums"]["status_documento_moto"]
          storage_path: string
          tamanho_bytes?: number | null
          tipo_documento: string
          updated_at?: string
          user_id: string
          versao?: number
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          cidade_id?: string | null
          content_type?: string | null
          created_at?: string
          enviado_em?: string
          id?: string
          motivo_rejeicao?: string | null
          status?: Database["public"]["Enums"]["status_documento_moto"]
          storage_path?: string
          tamanho_bytes?: number | null
          tipo_documento?: string
          updated_at?: string
          user_id?: string
          versao?: number
        }
        Relationships: []
      }
      mototaxista_documentos_hist: {
        Row: {
          acao: string
          ator_id: string | null
          cidade_id: string | null
          documento_id: string
          id: string
          motivo_rejeicao: string | null
          registrado_em: string
          status_anterior:
            | Database["public"]["Enums"]["status_documento_moto"]
            | null
          status_novo:
            | Database["public"]["Enums"]["status_documento_moto"]
            | null
          storage_path: string | null
          tipo_documento: string
          user_id: string
          versao: number | null
        }
        Insert: {
          acao: string
          ator_id?: string | null
          cidade_id?: string | null
          documento_id: string
          id?: string
          motivo_rejeicao?: string | null
          registrado_em?: string
          status_anterior?:
            | Database["public"]["Enums"]["status_documento_moto"]
            | null
          status_novo?:
            | Database["public"]["Enums"]["status_documento_moto"]
            | null
          storage_path?: string | null
          tipo_documento: string
          user_id: string
          versao?: number | null
        }
        Update: {
          acao?: string
          ator_id?: string | null
          cidade_id?: string | null
          documento_id?: string
          id?: string
          motivo_rejeicao?: string | null
          registrado_em?: string
          status_anterior?:
            | Database["public"]["Enums"]["status_documento_moto"]
            | null
          status_novo?:
            | Database["public"]["Enums"]["status_documento_moto"]
            | null
          storage_path?: string | null
          tipo_documento?: string
          user_id?: string
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mototaxista_documentos_hist_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "mototaxista_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mototaxistas: {
        Row: {
          aceita_delivery: boolean
          aceita_pegue_ali: boolean
          aceitar_corridas: boolean
          aceitar_entregas: boolean
          ano_moto: number | null
          atualizado_em: string
          categoria_cnh: string | null
          chave_pix: string | null
          chave_pix_tipo: string | null
          ciclo_iniciado_em: string | null
          cnh_informada_em: string | null
          conta_bloqueada_comissao: boolean
          cor_moto: string | null
          corridas_desde_pagamento: number
          cpf: string | null
          cpf_nome_confere: boolean | null
          cpf_validado_em: string | null
          cpf_valido: boolean | null
          endereco: string | null
          ficou_offline_em: string | null
          ficou_online_em: string | null
          foto_cnh_frente_url: string | null
          foto_crlv_url: string | null
          foto_selfie_cnh_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          mensalidade_ativa: boolean
          modelo_moto: string | null
          numero_cnh: string | null
          pagamento_confirmado: boolean
          pagamento_declarado: boolean
          pagamento_declarado_em: string | null
          placa_moto: string | null
          plano: Database["public"]["Enums"]["plano_mototaxista"] | null
          plano_validade: string | null
          preferencias: Json
          recebimento_via_app: boolean
          status: Database["public"]["Enums"]["status_mototaxista"]
          status_cadastro: Database["public"]["Enums"]["status_cadastro_mototaxista"]
          status_disponibilidade: Database["public"]["Enums"]["status_disponibilidade_moto"]
          taxa_ciclo_atual: number | null
          total_corridas: number
          ultima_atividade_em: string | null
          ultima_localizacao_em: string | null
          ultimo_pagamento_comissao: string | null
          validade_cnh: string | null
        }
        Insert: {
          aceita_delivery?: boolean
          aceita_pegue_ali?: boolean
          aceitar_corridas?: boolean
          aceitar_entregas?: boolean
          ano_moto?: number | null
          atualizado_em?: string
          categoria_cnh?: string | null
          chave_pix?: string | null
          chave_pix_tipo?: string | null
          ciclo_iniciado_em?: string | null
          cnh_informada_em?: string | null
          conta_bloqueada_comissao?: boolean
          cor_moto?: string | null
          corridas_desde_pagamento?: number
          cpf?: string | null
          cpf_nome_confere?: boolean | null
          cpf_validado_em?: string | null
          cpf_valido?: boolean | null
          endereco?: string | null
          ficou_offline_em?: string | null
          ficou_online_em?: string | null
          foto_cnh_frente_url?: string | null
          foto_crlv_url?: string | null
          foto_selfie_cnh_url?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          mensalidade_ativa?: boolean
          modelo_moto?: string | null
          numero_cnh?: string | null
          pagamento_confirmado?: boolean
          pagamento_declarado?: boolean
          pagamento_declarado_em?: string | null
          placa_moto?: string | null
          plano?: Database["public"]["Enums"]["plano_mototaxista"] | null
          plano_validade?: string | null
          preferencias?: Json
          recebimento_via_app?: boolean
          status?: Database["public"]["Enums"]["status_mototaxista"]
          status_cadastro?: Database["public"]["Enums"]["status_cadastro_mototaxista"]
          status_disponibilidade?: Database["public"]["Enums"]["status_disponibilidade_moto"]
          taxa_ciclo_atual?: number | null
          total_corridas?: number
          ultima_atividade_em?: string | null
          ultima_localizacao_em?: string | null
          ultimo_pagamento_comissao?: string | null
          validade_cnh?: string | null
        }
        Update: {
          aceita_delivery?: boolean
          aceita_pegue_ali?: boolean
          aceitar_corridas?: boolean
          aceitar_entregas?: boolean
          ano_moto?: number | null
          atualizado_em?: string
          categoria_cnh?: string | null
          chave_pix?: string | null
          chave_pix_tipo?: string | null
          ciclo_iniciado_em?: string | null
          cnh_informada_em?: string | null
          conta_bloqueada_comissao?: boolean
          cor_moto?: string | null
          corridas_desde_pagamento?: number
          cpf?: string | null
          cpf_nome_confere?: boolean | null
          cpf_validado_em?: string | null
          cpf_valido?: boolean | null
          endereco?: string | null
          ficou_offline_em?: string | null
          ficou_online_em?: string | null
          foto_cnh_frente_url?: string | null
          foto_crlv_url?: string | null
          foto_selfie_cnh_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mensalidade_ativa?: boolean
          modelo_moto?: string | null
          numero_cnh?: string | null
          pagamento_confirmado?: boolean
          pagamento_declarado?: boolean
          pagamento_declarado_em?: string | null
          placa_moto?: string | null
          plano?: Database["public"]["Enums"]["plano_mototaxista"] | null
          plano_validade?: string | null
          preferencias?: Json
          recebimento_via_app?: boolean
          status?: Database["public"]["Enums"]["status_mototaxista"]
          status_cadastro?: Database["public"]["Enums"]["status_cadastro_mototaxista"]
          status_disponibilidade?: Database["public"]["Enums"]["status_disponibilidade_moto"]
          taxa_ciclo_atual?: number | null
          total_corridas?: number
          ultima_atividade_em?: string | null
          ultima_localizacao_em?: string | null
          ultimo_pagamento_comissao?: string | null
          validade_cnh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mototaxistas_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          bounding_box: Json | null
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          geojson: Json
          geom: unknown
          ibge_code: string
          id: string
          name: string
          uf: string
          updated_at: string
        }
        Insert: {
          bounding_box?: Json | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          geojson: Json
          geom?: unknown
          ibge_code: string
          id?: string
          name: string
          uf: string
          updated_at?: string
        }
        Update: {
          bounding_box?: Json | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          geojson?: Json
          geom?: unknown
          ibge_code?: string
          id?: string
          name?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      parceiros: {
        Row: {
          ativo: boolean
          criado_em: string
          cupom: string | null
          desconto_percentual: number
          descricao: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_parceiro"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          cupom?: string | null
          desconto_percentual?: number
          descricao?: string | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_parceiro"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          cupom?: string | null
          desconto_percentual?: number
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_parceiro"]
        }
        Relationships: []
      }
      passageiro_enderecos_favoritos: {
        Row: {
          contagem_uso: number
          criado_em: string
          endereco: string
          id: string
          latitude: number | null
          longitude: number | null
          passageiro_id: string
          ultimo_uso: string
        }
        Insert: {
          contagem_uso?: number
          criado_em?: string
          endereco: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          passageiro_id: string
          ultimo_uso?: string
        }
        Update: {
          contagem_uso?: number
          criado_em?: string
          endereco?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          passageiro_id?: string
          ultimo_uso?: string
        }
        Relationships: [
          {
            foreignKeyName: "passageiro_enderecos_favoritos_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_administrativos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          id: string
          nivel: Database["public"]["Enums"]["nivel_admin_enum"]
          observacao: string | null
          suspenso: boolean
          todas_cidades: boolean
          ultimo_acesso_em: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          nivel: Database["public"]["Enums"]["nivel_admin_enum"]
          observacao?: string | null
          suspenso?: boolean
          todas_cidades?: boolean
          ultimo_acesso_em?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_admin_enum"]
          observacao?: string | null
          suspenso?: boolean
          todas_cidades?: boolean
          ultimo_acesso_em?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permissoes_administrativas: {
        Row: {
          atualizado_em: string
          codigo: Database["public"]["Enums"]["permissao_admin_enum"]
          concedido_por: string | null
          criado_em: string
          id: string
          perfil_id: string
          permitido: boolean
        }
        Insert: {
          atualizado_em?: string
          codigo: Database["public"]["Enums"]["permissao_admin_enum"]
          concedido_por?: string | null
          criado_em?: string
          id?: string
          perfil_id: string
          permitido?: boolean
        }
        Update: {
          atualizado_em?: string
          codigo?: Database["public"]["Enums"]["permissao_admin_enum"]
          concedido_por?: string | null
          criado_em?: string
          id?: string
          perfil_id?: string
          permitido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_administrativas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_administrativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_reset_tokens: {
        Row: {
          bloqueado_em: string | null
          codigo: string
          codigo_hash: string | null
          consumido_em: string | null
          criado_em: string
          expira_em: string
          id: string
          ip_origem: unknown
          proposito: string
          telefone: string
          tentativas: number
          usado: boolean
          user_id: string | null
        }
        Insert: {
          bloqueado_em?: string | null
          codigo: string
          codigo_hash?: string | null
          consumido_em?: string | null
          criado_em?: string
          expira_em: string
          id?: string
          ip_origem?: unknown
          proposito?: string
          telefone: string
          tentativas?: number
          usado?: boolean
          user_id?: string | null
        }
        Update: {
          bloqueado_em?: string | null
          codigo?: string
          codigo_hash?: string | null
          consumido_em?: string | null
          criado_em?: string
          expira_em?: string
          id?: string
          ip_origem?: unknown
          proposito?: string
          telefone?: string
          tentativas?: number
          usado?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          cargo: string | null
          cidade: string | null
          cidade_id: string | null
          criado_em: string
          endereco_bairro: string | null
          endereco_complemento: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estado: string | null
          foto_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          lotacao: string | null
          municipality_id: string | null
          nome: string
          telefone: string
          termos_aceitos_em: string | null
          termos_versao: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cidade?: string | null
          cidade_id?: string | null
          criado_em?: string
          endereco_bairro?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado?: string | null
          foto_url?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          lotacao?: string | null
          municipality_id?: string | null
          nome: string
          telefone: string
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cidade?: string | null
          cidade_id?: string | null
          criado_em?: string
          endereco_bairro?: string | null
          endereco_complemento?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lotacao?: string | null
          municipality_id?: string | null
          nome?: string
          telefone?: string
          termos_aceitos_em?: string | null
          termos_versao?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          criado_em: string
          endpoint: string
          id: string
          p256dh: string
          topico: string
          user_id: string
        }
        Insert: {
          auth_key: string
          criado_em?: string
          endpoint: string
          id?: string
          p256dh: string
          topico?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          criado_em?: string
          endpoint?: string
          id?: string
          p256dh?: string
          topico?: string
          user_id?: string
        }
        Relationships: []
      }
      quota_grants: {
        Row: {
          amount: number
          granted_at: string
          granted_by: string
          id: string
          month: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          granted_at?: string
          granted_by: string
          id?: string
          month: string
          reason?: string
          user_id: string
        }
        Update: {
          amount?: number
          granted_at?: string
          granted_by?: string
          id?: string
          month?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      quota_requests: {
        Row: {
          created_at: string
          id: string
          month: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regras_preco_bairro: {
        Row: {
          ativo: boolean
          bairro_destino_id: string | null
          bairro_origem_id: string | null
          cidade_id: string
          created_at: string
          criado_por: string | null
          fim_vigencia: string | null
          id: string
          inicio_vigencia: string
          justificativa: string
          prioridade: number
          tipo_aplicacao: Database["public"]["Enums"]["tipo_aplicacao_regra"]
          updated_at: string
          valor_base: number
        }
        Insert: {
          ativo?: boolean
          bairro_destino_id?: string | null
          bairro_origem_id?: string | null
          cidade_id: string
          created_at?: string
          criado_por?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string
          justificativa: string
          prioridade?: number
          tipo_aplicacao: Database["public"]["Enums"]["tipo_aplicacao_regra"]
          updated_at?: string
          valor_base: number
        }
        Update: {
          ativo?: boolean
          bairro_destino_id?: string | null
          bairro_origem_id?: string | null
          cidade_id?: string
          created_at?: string
          criado_por?: string | null
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string
          justificativa?: string
          prioridade?: number
          tipo_aplicacao?: Database["public"]["Enums"]["tipo_aplicacao_regra"]
          updated_at?: string
          valor_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "regras_preco_bairro_bairro_destino_id_fkey"
            columns: ["bairro_destino_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_preco_bairro_bairro_origem_id_fkey"
            columns: ["bairro_origem_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_preco_bairro_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_acknowledgements: {
        Row: {
          acknowledged_at: string
          created_at: string
          id: string
          ip_address: string | null
          ride_request_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          ride_request_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          ride_request_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ride_exception_requests: {
        Row: {
          consumed_at: string | null
          created_at: string
          id: string
          notes: string | null
          reason: string
          requested_city_id: string
          requested_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          requested_city_id: string
          requested_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          requested_city_id?: string
          requested_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_exception_requests_requested_city_id_fkey"
            columns: ["requested_city_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          created_at: string | null
          destino_endereco: string | null
          destino_lat: number
          destino_lng: number
          id: string
          motorista_id: string | null
          origem_endereco: string | null
          origem_lat: number
          origem_lng: number
          passageiro_id: string
          status: string | null
          tipo: string
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string | null
          destino_endereco?: string | null
          destino_lat: number
          destino_lng: number
          id?: string
          motorista_id?: string | null
          origem_endereco?: string | null
          origem_lat: number
          origem_lng: number
          passageiro_id: string
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string | null
          destino_endereco?: string | null
          destino_lat?: number
          destino_lng?: number
          id?: string
          motorista_id?: string | null
          origem_endereco?: string | null
          origem_lat?: number
          origem_lng?: number
          passageiro_id?: string
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: []
      }
      ride_route_points: {
        Row: {
          corrida_id: string
          id: string
          lat: number
          lng: number
          motorista_id: string | null
          recorded_at: string
        }
        Insert: {
          corrida_id: string
          id?: string
          lat: number
          lng: number
          motorista_id?: string | null
          recorded_at?: string
        }
        Update: {
          corrida_id?: string
          id?: string
          lat?: number
          lng?: number
          motorista_id?: string | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_route_points_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_route_points_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas_broadcast"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_saque: {
        Row: {
          chave_pix: string | null
          id: string
          mototaxista_id: string
          observacao: string | null
          processado_em: string | null
          solicitado_em: string
          status: Database["public"]["Enums"]["status_solicitacao_saque"]
          tipo: Database["public"]["Enums"]["tipo_solicitacao_saque"]
          valor: number
        }
        Insert: {
          chave_pix?: string | null
          id?: string
          mototaxista_id: string
          observacao?: string | null
          processado_em?: string | null
          solicitado_em?: string
          status?: Database["public"]["Enums"]["status_solicitacao_saque"]
          tipo: Database["public"]["Enums"]["tipo_solicitacao_saque"]
          valor: number
        }
        Update: {
          chave_pix?: string | null
          id?: string
          mototaxista_id?: string
          observacao?: string | null
          processado_em?: string | null
          solicitado_em?: string
          status?: Database["public"]["Enums"]["status_solicitacao_saque"]
          tipo?: Database["public"]["Enums"]["tipo_solicitacao_saque"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_saque_mototaxista_id_fkey"
            columns: ["mototaxista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sorteios_mensais: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          ganhador_id: string | null
          id: string
          mes: string
          parceiro: string | null
          sorteado_em: string | null
          status: Database["public"]["Enums"]["status_sorteio"]
          tipo: Database["public"]["Enums"]["tipo_premio_sorteio"]
          valor_premio: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          ganhador_id?: string | null
          id?: string
          mes: string
          parceiro?: string | null
          sorteado_em?: string | null
          status?: Database["public"]["Enums"]["status_sorteio"]
          tipo?: Database["public"]["Enums"]["tipo_premio_sorteio"]
          valor_premio?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          ganhador_id?: string | null
          id?: string
          mes?: string
          parceiro?: string | null
          sorteado_em?: string | null
          status?: Database["public"]["Enums"]["status_sorteio"]
          tipo?: Database["public"]["Enums"]["tipo_premio_sorteio"]
          valor_premio?: number
        }
        Relationships: [
          {
            foreignKeyName: "sorteios_mensais_ganhador_id_fkey"
            columns: ["ganhador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_horario: {
        Row: {
          ativo: boolean
          cidade_id: string
          criado_em: string
          hora_fim: string
          hora_inicio: string
          id: string
          nome: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          cidade_id: string
          criado_em?: string
          hora_fim: string
          hora_inicio: string
          id?: string
          nome: string
          valor: number
        }
        Update: {
          ativo?: boolean
          cidade_id?: string
          criado_em?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_horario_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades_configuradas"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes_carteira: {
        Row: {
          corrida_id: string | null
          criado_em: string
          descricao: string
          id: string
          mototaxista_id: string
          status: Database["public"]["Enums"]["status_transacao_carteira"]
          tipo: Database["public"]["Enums"]["tipo_transacao_carteira"]
          valor: number
        }
        Insert: {
          corrida_id?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          mototaxista_id: string
          status?: Database["public"]["Enums"]["status_transacao_carteira"]
          tipo: Database["public"]["Enums"]["tipo_transacao_carteira"]
          valor: number
        }
        Update: {
          corrida_id?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          mototaxista_id?: string
          status?: Database["public"]["Enums"]["status_transacao_carteira"]
          tipo?: Database["public"]["Enums"]["tipo_transacao_carteira"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_carteira_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_carteira_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas_broadcast"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_carteira_mototaxista_id_fkey"
            columns: ["mototaxista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes_carteira_passageiro: {
        Row: {
          corrida_id: string | null
          criado_em: string
          descricao: string
          id: string
          passageiro_id: string
          status: Database["public"]["Enums"]["status_transacao_carteira"]
          tipo: Database["public"]["Enums"]["tipo_transacao_passageiro"]
          valor: number
        }
        Insert: {
          corrida_id?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          passageiro_id: string
          status?: Database["public"]["Enums"]["status_transacao_carteira"]
          tipo: Database["public"]["Enums"]["tipo_transacao_passageiro"]
          valor: number
        }
        Update: {
          corrida_id?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          passageiro_id?: string
          status?: Database["public"]["Enums"]["status_transacao_carteira"]
          tipo?: Database["public"]["Enums"]["tipo_transacao_passageiro"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_carteira_passageiro_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_carteira_passageiro_corrida_id_fkey"
            columns: ["corrida_id"]
            isOneToOne: false
            referencedRelation: "corridas_broadcast"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_carteira_passageiro_passageiro_id_fkey"
            columns: ["passageiro_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ride_quotas: {
        Row: {
          created_at: string
          extra_granted: number
          id: string
          limit: number
          month: string
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          extra_granted?: number
          id?: string
          limit?: number
          month: string
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          extra_granted?: number
          id?: string
          limit?: number
          month?: string
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      valor_entrega_dia: {
        Row: {
          criado_em: string
          data: string
          empresa_id: string
          id: string
          observacao: string | null
          valor_por_entrega: number
        }
        Insert: {
          criado_em?: string
          data?: string
          empresa_id: string
          id?: string
          observacao?: string | null
          valor_por_entrega: number
        }
        Update: {
          criado_em?: string
          data?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          valor_por_entrega?: number
        }
        Relationships: [
          {
            foreignKeyName: "valor_entrega_dia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cidades_backfill_pendentes: {
        Row: {
          cidade: string | null
          criado_em: string | null
          entidade: string | null
          estado: string | null
          registro_id: string | null
        }
        Relationships: []
      }
      corridas_broadcast: {
        Row: {
          bairro_destino: string | null
          bairro_origem: string | null
          cidade: string | null
          criado_em: string | null
          distancia_km: number | null
          estado: string | null
          id: string | null
          origem_lat: number | null
          origem_lng: number | null
          status: Database["public"]["Enums"]["status_corrida"] | null
          tipo: string | null
          valor_estimado: number | null
        }
        Insert: {
          bairro_destino?: string | null
          bairro_origem?: string | null
          cidade?: string | null
          criado_em?: string | null
          distancia_km?: number | null
          estado?: string | null
          id?: string | null
          origem_lat?: number | null
          origem_lng?: number | null
          status?: Database["public"]["Enums"]["status_corrida"] | null
          tipo?: string | null
          valor_estimado?: number | null
        }
        Update: {
          bairro_destino?: string | null
          bairro_origem?: string | null
          cidade?: string | null
          criado_em?: string | null
          distancia_km?: number | null
          estado?: string | null
          id?: string | null
          origem_lat?: number | null
          origem_lng?: number | null
          status?: Database["public"]["Enums"]["status_corrida"] | null
          tipo?: string | null
          valor_estimado?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _hash_codigo: {
        Args: { _codigo: string; _telefone: string }
        Returns: string
      }
      _hash_codigo_bcrypt: { Args: { _codigo: string }; Returns: string }
      _pode_alterar_precos_cidade: {
        Args: { _cidade_id: string }
        Returns: boolean
      }
      _verificar_codigo_bcrypt: {
        Args: { _codigo: string; _hash: string }
        Returns: boolean
      }
      aceitar_corrida: {
        Args: { _corrida_id: string; _mototaxista_id: string }
        Returns: {
          motivo: string
          sucesso: boolean
        }[]
      }
      admin_analisar_documento_moto: {
        Args: { _aprovar: boolean; _documento_id: string; _motivo?: string }
        Returns: Json
      }
      admin_aprovar_empresa: {
        Args: { _id: string; _validade?: string }
        Returns: undefined
      }
      admin_aprovar_mototaxista: {
        Args: {
          _dias?: number
          _id: string
          _plano?: Database["public"]["Enums"]["plano_mototaxista"]
        }
        Returns: undefined
      }
      admin_aprovar_saque: { Args: { _id: string }; Returns: undefined }
      admin_ativar_por_codigo: {
        Args: { _codigo: string; _telefone: string }
        Returns: Json
      }
      admin_auditoria_mobilidade: {
        Args: {
          _busca?: string
          _fim?: string
          _inicio?: string
          _limit?: number
          _offset?: number
          _status?: string
        }
        Returns: {
          aceita_em: string
          cargo: string
          criada_em: string
          destino: string
          destino_lat: number
          destino_lng: number
          distancia_km: number
          duracao_min: number
          finalizada_em: string
          fora_expediente: boolean
          id: string
          iniciada_em: string
          lotacao: string
          modalidade: string
          motorista: string
          origem: string
          origem_lat: number
          origem_lng: number
          servidor: string
          status: string
          total_registros: number
        }[]
      }
      admin_auditoria_rota: {
        Args: { _corrida_id: string }
        Returns: {
          lat: number
          lng: number
          recorded_at: string
        }[]
      }
      admin_bloquear_empresa: { Args: { _id: string }; Returns: undefined }
      admin_cidade_ativar: { Args: { _id: string }; Returns: undefined }
      admin_cidade_criar: {
        Args: { _cidade: string; _estado: string }
        Returns: string
      }
      admin_cidade_definir_servicos: {
        Args: {
          _delivery_ativo: boolean
          _id: string
          _mercado_ativo: boolean
          _mototaxi_ativo: boolean
        }
        Returns: undefined
      }
      admin_cidade_editar: {
        Args: { _cidade: string; _estado: string; _id: string }
        Returns: undefined
      }
      admin_cidade_suspender: { Args: { _id: string }; Returns: undefined }
      admin_confirmar_pagamento_comissao: {
        Args: { _mototaxista_id: string }
        Returns: undefined
      }
      admin_confirmar_pagamento_mototaxista: {
        Args: {
          _dias: number
          _id: string
          _plano: Database["public"]["Enums"]["plano_mototaxista"]
        }
        Returns: undefined
      }
      admin_confirmar_recarga: { Args: { _id: string }; Returns: undefined }
      admin_criar_embaixador: {
        Args: { _cidade_id: string; _user_id: string }
        Returns: string
      }
      admin_criar_ou_promover_subadmin: {
        Args: {
          _observacao?: string
          _todas_cidades?: boolean
          _user_id: string
        }
        Returns: string
      }
      admin_definir_cidades_subadmin: {
        Args: { _cidade_ids: string[]; _perfil_id: string }
        Returns: undefined
      }
      admin_definir_limite_mobilidade: {
        Args: { _limit: number }
        Returns: number
      }
      admin_definir_municipio_servidor: {
        Args: { _municipio: string; _user: string }
        Returns: undefined
      }
      admin_definir_permissao: {
        Args: {
          _codigo: Database["public"]["Enums"]["permissao_admin_enum"]
          _perfil_id: string
          _permitido: boolean
        }
        Returns: undefined
      }
      admin_definir_taxa_cidade: {
        Args: {
          _cidade_id: string
          _inicio_vigencia?: string
          _justificativa: string
          _taxa: number
          _valor_base: number
        }
        Returns: string
      }
      admin_definir_taxa_global: {
        Args: {
          _inicio_vigencia?: string
          _justificativa: string
          _taxa: number
        }
        Returns: string
      }
      admin_documentos_moto_fila: {
        Args: {
          _cidade_id?: string
          _status?: Database["public"]["Enums"]["status_documento_moto"]
        }
        Returns: {
          cidade_id: string
          documento_id: string
          enviado_em: string
          nome: string
          status: Database["public"]["Enums"]["status_documento_moto"]
          storage_path: string
          tipo_documento: string
          user_id: string
          versao: number
        }[]
      }
      admin_excecao_decidir: {
        Args: { _aprovar: boolean; _id: string; _notas?: string }
        Returns: undefined
      }
      admin_excecoes_listar: {
        Args: { _status?: string }
        Returns: {
          cargo: string
          cidade: string
          consumed_at: string
          criada_em: string
          id: string
          lotacao: string
          notes: string
          reason: string
          requested_date: string
          reviewed_at: string
          servidor: string
          status: string
          uf: string
        }[]
      }
      admin_food_definir_comissao: {
        Args: { _loja_id: string; _percentual: number }
        Returns: undefined
      }
      admin_food_definir_status_loja: {
        Args: { _ativo: boolean; _loja_id: string; _pausado: boolean }
        Returns: undefined
      }
      admin_gerar_codigo_ativacao: { Args: { _user_id: string }; Returns: Json }
      admin_liberar_cota_extra: {
        Args: { _amount: number; _reason?: string; _user_id: string }
        Returns: {
          created_at: string
          extra_granted: number
          id: string
          limit: number
          month: string
          updated_at: string
          used: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_ride_quotas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_listar_corridas_mobilidade: {
        Args: { _month?: string }
        Returns: {
          criada_em: string
          destino: string
          id: string
          origem: string
          passageiro: string
          status: string
          tipo: string
        }[]
      }
      admin_listar_cotas: {
        Args: { _busca?: string; _month?: string }
        Returns: {
          cidade: string
          extra_granted: number
          limite: number
          month: string
          nome: string
          restantes: number
          used: number
          user_id: string
        }[]
      }
      admin_listar_embaixadores_escopo: {
        Args: never
        Returns: {
          ativo: boolean
          cidade: string
          cidade_id: string
          criado_em: string
          estado: string
          nome: string
          perfil_id: string
          suspenso: boolean
          telefone: string
          ultimo_acesso_em: string
          user_id: string
        }[]
      }
      admin_listar_subadmins: {
        Args: never
        Returns: {
          ativo: boolean
          criado_em: string
          nome: string
          perfil_id: string
          suspenso: boolean
          telefone: string
          todas_cidades: boolean
          ultimo_acesso_em: string
          user_id: string
        }[]
      }
      admin_marcar_mensalidade_paga: {
        Args: { _id: string }
        Returns: undefined
      }
      admin_mercado_definir_comissao: {
        Args: { _loja_id: string; _percentual: number }
        Returns: undefined
      }
      admin_mercado_definir_status_loja: {
        Args: { _ativo: boolean; _loja_id: string; _pausado: boolean }
        Returns: undefined
      }
      admin_municipio_vizinho: {
        Args: { _neighbor: string; _primary: string; _remover?: boolean }
        Returns: undefined
      }
      admin_perfis_pendentes_ativacao: {
        Args: never
        Returns: {
          codigo_expira_em: string
          criado_em: string
          nivel: Database["public"]["Enums"]["nivel_admin_enum"]
          nome: string
          perfil_id: string
          telefone: string
          tem_codigo_ativo: boolean
          user_id: string
        }[]
      }
      admin_registrar_acesso: { Args: never; Returns: undefined }
      admin_registrar_admin_principal: {
        Args: { _user_id: string }
        Returns: string
      }
      admin_remover_funcao_admin: {
        Args: { _perfil_id: string }
        Returns: undefined
      }
      admin_suspender_perfil: {
        Args: { _perfil_id: string; _suspenso: boolean }
        Returns: undefined
      }
      admin_transferir_embaixador: {
        Args: { _nova_cidade_id: string; _perfil_id: string }
        Returns: undefined
      }
      cadastrar_empresa: {
        Args: {
          _cidade: string
          _documento: string
          _estado: string
          _nome: string
          _pin: string
          _telefone: string
          _tipo_documento: string
        }
        Returns: string
      }
      calcular_preco_corrida: {
        Args: {
          _bairro_destino_id: string
          _bairro_origem_id: string
          _cidade_id: string
        }
        Returns: {
          configuracao_id: string
          regra_id: string
          taxa_bora_ze: number
          valor_base: number
          valor_total: number
        }[]
      }
      calcular_valor_corrida: {
        Args: {
          _bairro_destino: string
          _bairro_origem: string
          _cidade_id: string
        }
        Returns: {
          adicional: number
          tarifa_id: string
          tarifa_nome: string
          tarifa_valor: number
          total: number
        }[]
      }
      cidade_de_corrida: { Args: { _id: string }; Returns: string }
      cidade_de_mototaxista: { Args: { _id: string }; Returns: string }
      cidades_acessiveis: {
        Args: { _uid?: string }
        Returns: {
          cidade_id: string
        }[]
      }
      confirmar_reset_pin: {
        Args: { _codigo: string; _telefone: string }
        Returns: Json
      }
      food_aplicar_cupom: {
        Args: { _codigo: string; _loja_id: string; _subtotal: number }
        Returns: Json
      }
      food_fechar_acerto: {
        Args: { _ate: string; _desde: string; _loja_id: string; _obs?: string }
        Returns: string
      }
      food_loja_aberta: { Args: { _loja_id: string }; Returns: Json }
      food_relatorio_acerto: {
        Args: { _ate: string; _desde: string; _loja_id: string }
        Returns: Json
      }
      gestor_ativar_regra_preco_bairro: {
        Args: { _ativo: boolean; _id: string }
        Returns: undefined
      }
      gestor_cadastrar_bairro: {
        Args: { _aliases?: string[]; _cidade_id: string; _nome: string }
        Returns: string
      }
      gestor_criar_regra_preco_bairro: {
        Args: {
          _bairro_destino_id: string
          _bairro_origem_id: string
          _cidade_id: string
          _fim_vigencia?: string
          _inicio_vigencia?: string
          _justificativa: string
          _prioridade: number
          _tipo_aplicacao: Database["public"]["Enums"]["tipo_aplicacao_regra"]
          _valor_base: number
        }
        Returns: string
      }
      gestor_definir_valor_base_cidade: {
        Args: {
          _cidade_id: string
          _justificativa: string
          _valor_base: number
        }
        Returns: string
      }
      gestor_editar_bairro: {
        Args: {
          _aliases: string[]
          _ativo: boolean
          _id: string
          _nome: string
        }
        Returns: undefined
      }
      gestor_editar_regra_preco_bairro: {
        Args: {
          _fim_vigencia?: string
          _id: string
          _inicio_vigencia?: string
          _justificativa: string
          _prioridade: number
          _valor_base: number
        }
        Returns: undefined
      }
      get_mototaxista_publico: {
        Args: { _id: string }
        Returns: {
          foto_url: string
          id: string
          latitude: number
          longitude: number
          modelo_moto: string
          nome: string
          placa_moto: string
          plano: Database["public"]["Enums"]["plano_mototaxista"]
          telefone: string
        }[]
      }
      get_mototaxistas_delivery_cidade: {
        Args: { _cidade: string; _estado: string }
        Returns: {
          foto_url: string
          id: string
          latitude: number
          longitude: number
          modelo_moto: string
          nome: string
          placa_moto: string
          telefone: string
        }[]
      }
      get_mototaxistas_online_cidade: {
        Args: { _cidade: string; _estado: string }
        Returns: {
          foto_url: string
          id: string
          latitude: number
          longitude: number
          modelo_moto: string
          nome: string
          placa_moto: string
        }[]
      }
      has_role: {
        Args: {
          _tipo: Database["public"]["Enums"]["tipo_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_admin_principal: { Args: { _uid?: string }; Returns: boolean }
      limpar_mensagens_expiradas: { Args: never; Returns: undefined }
      listar_auditoria_escopo: {
        Args: { _cidade_id?: string; _limit?: number }
        Returns: {
          acao: string
          autor_nome: string
          autor_user_id: string
          cidade_id: string
          criado_em: string
          entidade: string
          entidade_id: string
          id: string
          tipo_autor: Database["public"]["Enums"]["nivel_admin_enum"]
        }[]
      }
      me_cidades_acessiveis: {
        Args: never
        Returns: {
          cidade_id: string
        }[]
      }
      me_is_admin_principal: { Args: never; Returns: boolean }
      me_nivel_admin: {
        Args: never
        Returns: Database["public"]["Enums"]["nivel_admin_enum"]
      }
      me_pode_acessar_cidade: { Args: { _cidade_id: string }; Returns: boolean }
      me_tem_permissao: {
        Args: {
          _cidade_id?: string
          _codigo: Database["public"]["Enums"]["permissao_admin_enum"]
        }
        Returns: boolean
      }
      mercado_aplicar_cupom: {
        Args: { _codigo: string; _loja_id: string; _subtotal: number }
        Returns: Json
      }
      mercado_fechar_acerto: {
        Args: { _ate: string; _desde: string; _loja_id: string; _obs?: string }
        Returns: string
      }
      mercado_loja_aberta: { Args: { _loja_id: string }; Returns: Json }
      mercado_relatorio_acerto: {
        Args: { _ate: string; _desde: string; _loja_id: string }
        Returns: Json
      }
      mob_garantir_cota: {
        Args: { _month?: string; _user_id: string }
        Returns: {
          created_at: string
          extra_granted: number
          id: string
          limit: number
          month: string
          updated_at: string
          used: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_ride_quotas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mob_limite_padrao: { Args: never; Returns: number }
      mob_mes_atual: { Args: never; Returns: string }
      mob_minha_cota: {
        Args: never
        Returns: {
          extra_granted: number
          limite: number
          month: string
          restantes: number
          used: number
        }[]
      }
      mototaxista_aceitar_pedido_food: {
        Args: { _pedido_id: string }
        Returns: {
          acerto_id: string | null
          bairro_entrega: string | null
          cancelado_em: string | null
          cidade_id: string | null
          cliente_user_id: string
          complemento: string | null
          confirmado_em: string | null
          created_at: string
          cupom_id: string | null
          desconto: number
          em_entrega_em: string | null
          em_preparo_em: string | null
          endereco_entrega: string
          entregador_user_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["food_forma_pagamento"]
          id: string
          latitude_entrega: number | null
          loja_id: string
          longitude_entrega: number | null
          motivo_cancelamento: string | null
          numero_pedido: number
          observacao: string | null
          pronto_em: string | null
          status: Database["public"]["Enums"]["food_status_pedido"]
          subtotal: number
          taxa_entrega: number
          tempo_estimado_min: number | null
          total: number
          troco_para: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "food_pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mototaxista_aceitar_pedido_mercado: {
        Args: { _pedido_id: string }
        Returns: {
          acerto_id: string | null
          bairro_entrega: string | null
          cancelado_em: string | null
          cidade_id: string | null
          cliente_user_id: string
          complemento: string | null
          confirmado_em: string | null
          created_at: string
          cupom_id: string | null
          desconto: number
          em_entrega_em: string | null
          em_preparo_em: string | null
          endereco_entrega: string
          entregador_user_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["mercado_forma_pagamento"]
          id: string
          latitude_entrega: number | null
          loja_id: string
          longitude_entrega: number | null
          motivo_cancelamento: string | null
          numero_pedido: number
          observacao: string | null
          pronto_em: string | null
          status: Database["public"]["Enums"]["mercado_status_pedido"]
          subtotal: number
          taxa_entrega: number
          tempo_estimado_min: number | null
          total: number
          troco_para: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mercado_pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mototaxista_alterar_valor_produto: {
        Args: { _corrida_id: string; _novo_valor: number }
        Returns: undefined
      }
      mototaxista_chegou: { Args: { _corrida_id: string }; Returns: undefined }
      mototaxista_definir_disponibilidade: {
        Args: { _aceitar: boolean }
        Returns: Json
      }
      mototaxista_definir_preferencias: {
        Args: {
          _aceitar_corridas_mototaxi: boolean
          _aceitar_entregas: boolean
        }
        Returns: Json
      }
      mototaxista_finalizar_cadastro:
        | {
            Args: {
              _ano_moto: number
              _cor_moto: string
              _cpf: string
              _modelo_moto: string
              _numero_cnh: string
              _placa_moto: string
              _termos_versao?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _ano_moto: number
              _categoria_cnh: string
              _cpf: string
              _foto_cnh_frente_url: string
              _foto_crlv_url: string
              _foto_selfie_cnh_url: string
              _modelo_moto: string
              _numero_cnh: string
              _placa_moto: string
              _termos_versao?: string
              _validade_cnh: string
            }
            Returns: Json
          }
      mototaxista_heartbeat: {
        Args: { _lat?: number; _lng?: number }
        Returns: undefined
      }
      mototaxista_marcar_entregue_food: {
        Args: { _pedido_id: string }
        Returns: {
          acerto_id: string | null
          bairro_entrega: string | null
          cancelado_em: string | null
          cidade_id: string | null
          cliente_user_id: string
          complemento: string | null
          confirmado_em: string | null
          created_at: string
          cupom_id: string | null
          desconto: number
          em_entrega_em: string | null
          em_preparo_em: string | null
          endereco_entrega: string
          entregador_user_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["food_forma_pagamento"]
          id: string
          latitude_entrega: number | null
          loja_id: string
          longitude_entrega: number | null
          motivo_cancelamento: string | null
          numero_pedido: number
          observacao: string | null
          pronto_em: string | null
          status: Database["public"]["Enums"]["food_status_pedido"]
          subtotal: number
          taxa_entrega: number
          tempo_estimado_min: number | null
          total: number
          troco_para: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "food_pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mototaxista_marcar_entregue_mercado: {
        Args: { _pedido_id: string }
        Returns: {
          acerto_id: string | null
          bairro_entrega: string | null
          cancelado_em: string | null
          cidade_id: string | null
          cliente_user_id: string
          complemento: string | null
          confirmado_em: string | null
          created_at: string
          cupom_id: string | null
          desconto: number
          em_entrega_em: string | null
          em_preparo_em: string | null
          endereco_entrega: string
          entregador_user_id: string | null
          entregue_em: string | null
          forma_pagamento: Database["public"]["Enums"]["mercado_forma_pagamento"]
          id: string
          latitude_entrega: number | null
          loja_id: string
          longitude_entrega: number | null
          motivo_cancelamento: string | null
          numero_pedido: number
          observacao: string | null
          pronto_em: string | null
          status: Database["public"]["Enums"]["mercado_status_pedido"]
          subtotal: number
          taxa_entrega: number
          tempo_estimado_min: number | null
          total: number
          troco_para: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mercado_pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mototaxista_meus_documentos: {
        Args: never
        Returns: {
          analisado_em: string
          enviado_em: string
          motivo_rejeicao: string
          status: Database["public"]["Enums"]["status_documento_moto"]
          storage_path: string
          tipo_documento: string
          versao: number
        }[]
      }
      mototaxista_registrar_documento: {
        Args: {
          _content_type?: string
          _storage_path: string
          _tamanho_bytes?: number
          _tipo: string
        }
        Returns: Json
      }
      mun_ids_permitidos: {
        Args: { _data: string; _user: string }
        Returns: string[]
      }
      mun_meu_municipio: {
        Args: never
        Returns: {
          bounding_box: Json
          centroid_lat: number
          centroid_lng: number
          geojson: Json
          ibge_code: string
          id: string
          name: string
          uf: string
          vizinhos: Json
        }[]
      }
      mun_municipio_do_ponto: {
        Args: { _ids: string[]; _lat: number; _lng: number }
        Returns: string
      }
      mun_perto_da_fronteira: {
        Args: { _lat: number; _lng: number; _municipio: string }
        Returns: boolean
      }
      mun_ponto_permitido: {
        Args: { _data: string; _lat: number; _lng: number; _user: string }
        Returns: boolean
      }
      nivel_admin_atual: {
        Args: { _uid?: string }
        Returns: Database["public"]["Enums"]["nivel_admin_enum"]
      }
      norm_bairro: { Args: { _t: string }; Returns: string }
      norm_cidade: { Args: { _txt: string }; Returns: string }
      pode_acessar_cidade: {
        Args: { _cidade_id: string; _uid?: string }
        Returns: boolean
      }
      registrar_auditoria: {
        Args: {
          _acao: string
          _cidade_id?: string
          _dados_anteriores?: Json
          _dados_novos?: Json
          _entidade?: string
          _entidade_id?: string
        }
        Returns: undefined
      }
      resolver_bairro_id: {
        Args: { _cidade_id: string; _nome: string }
        Returns: string
      }
      resolver_cidade_id: {
        Args: { _cidade: string; _estado: string }
        Returns: string
      }
      solicitar_reset_pin: { Args: { _telefone: string }; Returns: Json }
      sortear_premios_mes: { Args: never; Returns: undefined }
      tarifa_atual: {
        Args: { _cidade_id: string }
        Returns: {
          ativo: boolean
          cidade_id: string
          criado_em: string
          hora_fim: string
          hora_inicio: string
          id: string
          nome: string
          valor: number
        }
        SetofOptions: {
          from: "*"
          to: "tarifas_horario"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tarifa_vigente: {
        Args: { _cidade_id: string }
        Returns: {
          ativo: boolean
          cidade_id: string | null
          created_at: string
          criado_por: string | null
          fim_vigencia: string | null
          id: string
          inicio_vigencia: string
          justificativa: string
          taxa_bora_ze: number
          updated_at: string
          valor_base: number | null
          versao: number
        }
        SetofOptions: {
          from: "*"
          to: "configuracoes_tarifarias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tem_corrida_ativa_entre: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
      tem_permissao: {
        Args: {
          _cidade_id?: string
          _codigo: Database["public"]["Enums"]["permissao_admin_enum"]
          _uid?: string
        }
        Returns: boolean
      }
      uf_sigla: { Args: { _estado: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      usuario_gestor_da_cidade: {
        Args: { _cidade: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      food_forma_pagamento:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "carteira"
      food_status_pedido:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "pronto"
        | "em_entrega"
        | "entregue"
        | "cancelado"
      mercado_forma_pagamento:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "carteira"
      mercado_status_pedido:
        | "novo"
        | "confirmado"
        | "em_preparo"
        | "pronto"
        | "em_entrega"
        | "entregue"
        | "cancelado"
      nivel_admin_enum: "admin_principal" | "subadmin" | "embaixador"
      permissao_admin_enum:
        | "visualizar_passageiros"
        | "administrar_passageiros"
        | "visualizar_mototaxistas"
        | "administrar_mototaxistas"
        | "visualizar_empresas"
        | "administrar_empresas"
        | "visualizar_corridas"
        | "administrar_corridas"
        | "visualizar_entregas"
        | "administrar_entregas"
        | "visualizar_pagamentos"
        | "administrar_suporte"
        | "cadastrar_cidades"
        | "administrar_embaixadores"
        | "alterar_configuracoes"
        | "visualizar_relatorios"
        | "aprovar_mototaxistas"
        | "administrar_pagamentos"
        | "visualizar_precos"
        | "alterar_precos"
        | "administrar_food"
        | "administrar_mercado"
      plano_mototaxista: "mensal" | "prata" | "ouro"
      remetente_tipo_msg: "passageiro" | "mototaxista" | "sistema"
      status_cadastro_mototaxista:
        | "aguardando_foto"
        | "aguardando_aprovacao"
        | "aprovado"
        | "rejeitado"
      status_corrida:
        | "aguardando"
        | "aceita"
        | "em_andamento"
        | "concluida"
        | "cancelada"
      status_disponibilidade_moto:
        | "offline"
        | "online"
        | "recebendo_solicitacao"
        | "a_caminho_embarque"
        | "aguardando_passageiro"
        | "em_corrida"
        | "bloqueado"
      status_documento_moto:
        | "nao_enviado"
        | "enviado"
        | "em_analise"
        | "aprovado"
        | "rejeitado"
      status_entrega:
        | "aguardando"
        | "aceita"
        | "coletado"
        | "entregue"
        | "cancelada"
      status_mensalidade: "pendente" | "pago" | "vencido"
      status_mototaxista: "offline" | "disponivel" | "em_corrida"
      status_solicitacao_saque: "pendente" | "aprovado" | "rejeitado"
      status_sorteio: "aberto" | "sorteado" | "entregue" | "cancelado"
      status_transacao_carteira: "pendente" | "aprovado" | "rejeitado"
      tipo_aplicacao_regra: "origem" | "destino" | "origem_ou_destino" | "rota"
      tipo_pagamento_corrida: "dinheiro" | "carteira"
      tipo_parceiro: "posto" | "pecas" | "outro"
      tipo_premio_sorteio: "combustivel" | "pecas" | "oleo" | "outros"
      tipo_solicitacao_saque: "pix" | "abate_mensalidade"
      tipo_transacao_carteira:
        | "credito_corrida_gratuita"
        | "abate_mensalidade"
        | "saque_pix"
        | "estorno"
        | "credito_entrega_food"
      tipo_transacao_passageiro:
        | "recarga_pix"
        | "recarga_cartao"
        | "pagamento_corrida"
        | "corrida_gratuita"
        | "corrida_aniversario"
        | "estorno"
      tipo_usuario: "passageiro" | "mototaxista" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      food_forma_pagamento: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "carteira",
      ],
      food_status_pedido: [
        "novo",
        "confirmado",
        "em_preparo",
        "pronto",
        "em_entrega",
        "entregue",
        "cancelado",
      ],
      mercado_forma_pagamento: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "carteira",
      ],
      mercado_status_pedido: [
        "novo",
        "confirmado",
        "em_preparo",
        "pronto",
        "em_entrega",
        "entregue",
        "cancelado",
      ],
      nivel_admin_enum: ["admin_principal", "subadmin", "embaixador"],
      permissao_admin_enum: [
        "visualizar_passageiros",
        "administrar_passageiros",
        "visualizar_mototaxistas",
        "administrar_mototaxistas",
        "visualizar_empresas",
        "administrar_empresas",
        "visualizar_corridas",
        "administrar_corridas",
        "visualizar_entregas",
        "administrar_entregas",
        "visualizar_pagamentos",
        "administrar_suporte",
        "cadastrar_cidades",
        "administrar_embaixadores",
        "alterar_configuracoes",
        "visualizar_relatorios",
        "aprovar_mototaxistas",
        "administrar_pagamentos",
        "visualizar_precos",
        "alterar_precos",
        "administrar_food",
        "administrar_mercado",
      ],
      plano_mototaxista: ["mensal", "prata", "ouro"],
      remetente_tipo_msg: ["passageiro", "mototaxista", "sistema"],
      status_cadastro_mototaxista: [
        "aguardando_foto",
        "aguardando_aprovacao",
        "aprovado",
        "rejeitado",
      ],
      status_corrida: [
        "aguardando",
        "aceita",
        "em_andamento",
        "concluida",
        "cancelada",
      ],
      status_disponibilidade_moto: [
        "offline",
        "online",
        "recebendo_solicitacao",
        "a_caminho_embarque",
        "aguardando_passageiro",
        "em_corrida",
        "bloqueado",
      ],
      status_documento_moto: [
        "nao_enviado",
        "enviado",
        "em_analise",
        "aprovado",
        "rejeitado",
      ],
      status_entrega: [
        "aguardando",
        "aceita",
        "coletado",
        "entregue",
        "cancelada",
      ],
      status_mensalidade: ["pendente", "pago", "vencido"],
      status_mototaxista: ["offline", "disponivel", "em_corrida"],
      status_solicitacao_saque: ["pendente", "aprovado", "rejeitado"],
      status_sorteio: ["aberto", "sorteado", "entregue", "cancelado"],
      status_transacao_carteira: ["pendente", "aprovado", "rejeitado"],
      tipo_aplicacao_regra: ["origem", "destino", "origem_ou_destino", "rota"],
      tipo_pagamento_corrida: ["dinheiro", "carteira"],
      tipo_parceiro: ["posto", "pecas", "outro"],
      tipo_premio_sorteio: ["combustivel", "pecas", "oleo", "outros"],
      tipo_solicitacao_saque: ["pix", "abate_mensalidade"],
      tipo_transacao_carteira: [
        "credito_corrida_gratuita",
        "abate_mensalidade",
        "saque_pix",
        "estorno",
        "credito_entrega_food",
      ],
      tipo_transacao_passageiro: [
        "recarga_pix",
        "recarga_cartao",
        "pagamento_corrida",
        "corrida_gratuita",
        "corrida_aniversario",
        "estorno",
      ],
      tipo_usuario: ["passageiro", "mototaxista", "admin"],
    },
  },
} as const
