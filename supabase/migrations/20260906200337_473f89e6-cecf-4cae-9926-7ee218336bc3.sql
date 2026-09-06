-- 1) Perfil: cargo e lotação
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cargo TEXT,
  ADD COLUMN IF NOT EXISTS lotacao TEXT;

-- 2) Corridas: carimbos de auditoria
ALTER TABLE public.corridas
  ADD COLUMN IF NOT EXISTS aceita_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS iniciada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalizada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duracao_min INTEGER,
  ADD COLUMN IF NOT EXISTS distancia_final_km NUMERIC;

CREATE OR REPLACE FUNCTION public.mob_carimbar_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'aceita' AND NEW.aceita_em IS NULL THEN
      NEW.aceita_em := now();
    ELSIF NEW.status = 'em_andamento' AND NEW.iniciada_em IS NULL THEN
      NEW.iniciada_em := now();
    ELSIF NEW.status IN ('concluida', 'cancelada') AND NEW.finalizada_em IS NULL THEN
      NEW.finalizada_em := now();
      IF NEW.iniciada_em IS NOT NULL THEN
        NEW.duracao_min := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (now() - NEW.iniciada_em)) / 60.0))::int;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mob_carimbar_auditoria ON public.corridas;
CREATE TRIGGER trg_mob_carimbar_auditoria
  BEFORE UPDATE ON public.corridas
  FOR EACH ROW EXECUTE FUNCTION public.mob_carimbar_auditoria();

-- 3) Aceite do aviso de uso profissional
CREATE TABLE IF NOT EXISTS public.ride_acknowledgements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ride_request_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ride_acknowledgements TO authenticated;
GRANT ALL ON public.ride_acknowledgements TO service_role;
ALTER TABLE public.ride_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ack_insert_own" ON public.ride_acknowledgements;
CREATE POLICY "ack_insert_own" ON public.ride_acknowledgements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ack_select_own_or_admin" ON public.ride_acknowledgements;
CREATE POLICY "ack_select_own_or_admin" ON public.ride_acknowledgements
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ride_ack_user_date ON public.ride_acknowledgements (user_id, acknowledged_at DESC);

-- 4) Rota efetivamente percorrida
CREATE TABLE IF NOT EXISTS public.ride_route_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corrida_id UUID NOT NULL REFERENCES public.corridas(id) ON DELETE CASCADE,
  motorista_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ride_route_points TO authenticated;
GRANT ALL ON public.ride_route_points TO service_role;
ALTER TABLE public.ride_route_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "route_insert_driver" ON public.ride_route_points;
CREATE POLICY "route_insert_driver" ON public.ride_route_points
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = motorista_id
    AND EXISTS (SELECT 1 FROM public.corridas c WHERE c.id = corrida_id AND c.mototaxista_id = auth.uid())
  );

DROP POLICY IF EXISTS "route_select_involved_or_admin" ON public.ride_route_points;
CREATE POLICY "route_select_involved_or_admin" ON public.ride_route_points
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.corridas c
      WHERE c.id = corrida_id AND (c.passageiro_id = auth.uid() OR c.mototaxista_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_route_points_corrida ON public.ride_route_points (corrida_id, recorded_at);

-- 5) Auditoria administrativa de mobilidade
CREATE OR REPLACE FUNCTION public.admin_auditoria_mobilidade(
  _inicio DATE DEFAULT NULL,
  _fim DATE DEFAULT NULL,
  _busca TEXT DEFAULT NULL,
  _status TEXT DEFAULT NULL,
  _limit INTEGER DEFAULT 50,
  _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  criada_em TIMESTAMPTZ,
  aceita_em TIMESTAMPTZ,
  iniciada_em TIMESTAMPTZ,
  finalizada_em TIMESTAMPTZ,
  servidor TEXT,
  cargo TEXT,
  lotacao TEXT,
  modalidade TEXT,
  status TEXT,
  origem TEXT,
  origem_lat DOUBLE PRECISION,
  origem_lng DOUBLE PRECISION,
  destino TEXT,
  destino_lat DOUBLE PRECISION,
  destino_lng DOUBLE PRECISION,
  distancia_km NUMERIC,
  duracao_min INTEGER,
  motorista TEXT,
  fora_expediente BOOLEAN,
  total_registros BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NAO_AUTORIZADO';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.*, p.nome AS p_nome, p.cargo AS p_cargo, p.lotacao AS p_lotacao, m.nome AS m_nome
    FROM public.corridas c
    LEFT JOIN public.profiles p ON p.id = c.passageiro_id
    LEFT JOIN public.mototaxistas m ON m.id = c.mototaxista_id
    WHERE c.tipo IN ('automovel', 'moto_taxi')
      AND (_inicio IS NULL OR c.criado_em >= _inicio::timestamptz)
      AND (_fim IS NULL OR c.criado_em < (_fim + 1)::timestamptz)
      AND (_status IS NULL OR _status = '' OR c.status::text = _status)
      AND (
        _busca IS NULL OR _busca = '' OR
        p.nome ILIKE '%' || _busca || '%' OR
        p.cargo ILIKE '%' || _busca || '%' OR
        p.lotacao ILIKE '%' || _busca || '%'
      )
  ), contagem AS (SELECT count(*) AS total FROM base)
  SELECT
    b.id,
    b.criado_em,
    b.aceita_em,
    b.iniciada_em,
    b.finalizada_em,
    b.p_nome,
    b.p_cargo,
    b.p_lotacao,
    b.tipo::text,
    b.status::text,
    b.origem_endereco,
    b.origem_lat,
    b.origem_lng,
    b.destino_endereco,
    b.destino_lat,
    b.destino_lng,
    COALESCE(b.distancia_final_km, b.distancia_km),
    b.duracao_min,
    b.m_nome,
    (
      EXTRACT(HOUR FROM (b.criado_em AT TIME ZONE 'America/Sao_Paulo')) < 8
      OR EXTRACT(HOUR FROM (b.criado_em AT TIME ZONE 'America/Sao_Paulo')) >= 18
      OR EXTRACT(ISODOW FROM (b.criado_em AT TIME ZONE 'America/Sao_Paulo')) > 5
    ),
    (SELECT total FROM contagem)
  FROM base b
  ORDER BY b.criado_em DESC
  LIMIT GREATEST(1, LEAST(_limit, 200))
  OFFSET GREATEST(0, _offset);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_auditoria_rota(_corrida_id UUID)
RETURNS TABLE (lat DOUBLE PRECISION, lng DOUBLE PRECISION, recorded_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NAO_AUTORIZADO';
  END IF;
  RETURN QUERY
  SELECT r.lat, r.lng, r.recorded_at
  FROM public.ride_route_points r
  WHERE r.corrida_id = _corrida_id
  ORDER BY r.recorded_at;
END;
$$;