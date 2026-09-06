
-- ============ TABELAS ============
CREATE TABLE public.user_ride_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  "limit" integer NOT NULL DEFAULT 10,
  used integer NOT NULL DEFAULT 0,
  extra_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

GRANT SELECT ON public.user_ride_quotas TO authenticated;
GRANT ALL ON public.user_ride_quotas TO service_role;
ALTER TABLE public.user_ride_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quota_select_own" ON public.user_ride_quotas
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "quota_select_admin" ON public.user_ride_quotas
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX idx_user_ride_quotas_month ON public.user_ride_quotas (month);

CREATE TABLE public.quota_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  month date NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quota_grants TO authenticated;
GRANT ALL ON public.quota_grants TO service_role;
ALTER TABLE public.quota_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grants_select_own" ON public.quota_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "grants_select_admin" ON public.quota_grants
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============ CONFIG PADRÃO ============
INSERT INTO public.configuracoes_plataforma (chave, valor, descricao)
VALUES ('mobilidade_limite_mensal', '10', 'Limite padrao mensal de chamadas de mobilidade urbana por servidor')
ON CONFLICT (chave) DO NOTHING;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.mob_mes_atual()
RETURNS date LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))::date
$$;

CREATE OR REPLACE FUNCTION public.mob_limite_padrao()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT NULLIF(valor,'')::int FROM public.configuracoes_plataforma
                   WHERE chave = 'mobilidade_limite_mensal'), 10)
$$;

CREATE OR REPLACE FUNCTION public.mob_garantir_cota(_user_id uuid, _month date DEFAULT NULL)
RETURNS public.user_ride_quotas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m date := COALESCE(_month, public.mob_mes_atual());
  r public.user_ride_quotas;
BEGIN
  INSERT INTO public.user_ride_quotas (user_id, month, "limit")
  VALUES (_user_id, m, public.mob_limite_padrao())
  ON CONFLICT (user_id, month) DO NOTHING;
  SELECT * INTO r FROM public.user_ride_quotas WHERE user_id = _user_id AND month = m;
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.mob_minha_cota()
RETURNS TABLE (month date, limite integer, used integer, extra_granted integer, restantes integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.user_ride_quotas;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Nao autenticado'; END IF;
  r := public.mob_garantir_cota(auth.uid(), NULL);
  RETURN QUERY SELECT r.month, r."limit", r.used, r.extra_granted,
                      GREATEST(0, r."limit" + r.extra_granted - r.used);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mob_minha_cota() TO authenticated;

-- ============ TRIGGERS EM CORRIDAS ============
CREATE OR REPLACE FUNCTION public.mob_checar_cota_antes_solicitar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.user_ride_quotas;
BEGIN
  IF NEW.tipo NOT IN ('automovel','moto_taxi') THEN RETURN NEW; END IF;
  IF NEW.passageiro_id IS NULL THEN RETURN NEW; END IF;
  r := public.mob_garantir_cota(NEW.passageiro_id, NULL);
  IF r.used >= r."limit" + r.extra_granted THEN
    RAISE EXCEPTION 'LIMITE_MOBILIDADE_ATINGIDO';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mob_checar_cota
BEFORE INSERT ON public.corridas
FOR EACH ROW EXECUTE FUNCTION public.mob_checar_cota_antes_solicitar();

CREATE OR REPLACE FUNCTION public.mob_consumir_cota_ao_aceitar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date;
BEGIN
  IF NEW.tipo NOT IN ('automovel','moto_taxi') THEN RETURN NEW; END IF;
  IF NEW.passageiro_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'aceita'::status_corrida AND OLD.status IS DISTINCT FROM 'aceita'::status_corrida THEN
    m := public.mob_mes_atual();
    PERFORM public.mob_garantir_cota(NEW.passageiro_id, m);
    UPDATE public.user_ride_quotas
       SET used = used + 1, updated_at = now()
     WHERE user_id = NEW.passageiro_id AND month = m;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mob_consumir_cota
AFTER UPDATE ON public.corridas
FOR EACH ROW EXECUTE FUNCTION public.mob_consumir_cota_ao_aceitar();

-- ============ ADMIN ============
CREATE OR REPLACE FUNCTION public.admin_liberar_cota_extra(_user_id uuid, _amount integer, _reason text DEFAULT '')
RETURNS public.user_ride_quotas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date := public.mob_mes_atual(); r public.user_ride_quotas;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'Quantidade invalida'; END IF;
  PERFORM public.mob_garantir_cota(_user_id, m);
  UPDATE public.user_ride_quotas
     SET extra_granted = GREATEST(0, extra_granted + _amount), updated_at = now()
   WHERE user_id = _user_id AND month = m
  RETURNING * INTO r;
  INSERT INTO public.quota_grants (user_id, granted_by, amount, reason, month)
  VALUES (_user_id, auth.uid(), _amount, COALESCE(_reason,''), m);
  RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_liberar_cota_extra(uuid, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_definir_limite_mobilidade(_limit integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.me_is_admin_principal() THEN RAISE EXCEPTION 'Somente admin principal'; END IF;
  IF _limit IS NULL OR _limit < 0 THEN RAISE EXCEPTION 'Limite invalido'; END IF;
  INSERT INTO public.configuracoes_plataforma (chave, valor, descricao)
  VALUES ('mobilidade_limite_mensal', _limit::text, 'Limite padrao mensal de chamadas de mobilidade urbana por servidor')
  ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;
  RETURN _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_definir_limite_mobilidade(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_cotas(_month date DEFAULT NULL, _busca text DEFAULT NULL)
RETURNS TABLE (user_id uuid, nome text, cidade text, month date, limite integer, used integer, extra_granted integer, restantes integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date := COALESCE(_month, public.mob_mes_atual());
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT p.id, p.nome, p.cidade, m,
         COALESCE(q."limit", public.mob_limite_padrao()),
         COALESCE(q.used, 0), COALESCE(q.extra_granted, 0),
         GREATEST(0, COALESCE(q."limit", public.mob_limite_padrao()) + COALESCE(q.extra_granted,0) - COALESCE(q.used,0))
    FROM public.profiles p
    LEFT JOIN public.user_ride_quotas q ON q.user_id = p.id AND q.month = m
   WHERE (_busca IS NULL OR _busca = '' OR p.nome ILIKE '%' || _busca || '%')
   ORDER BY p.nome;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_cotas(date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_corridas_mobilidade(_month date DEFAULT NULL)
RETURNS TABLE (id uuid, criada_em timestamptz, passageiro text, tipo text, status text, origem text, destino text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date := COALESCE(_month, public.mob_mes_atual());
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN QUERY
  SELECT c.id, c.created_at, p.nome, c.tipo, c.status::text, c.origem_endereco, c.destino_endereco
    FROM public.corridas c
    LEFT JOIN public.profiles p ON p.id = c.passageiro_id
   WHERE c.tipo IN ('automovel','moto_taxi')
     AND c.created_at >= m AND c.created_at < (m + interval '1 month')
   ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_listar_corridas_mobilidade(date) TO authenticated;
