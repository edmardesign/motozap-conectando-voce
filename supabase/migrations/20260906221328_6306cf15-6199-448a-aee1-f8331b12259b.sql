
DROP FUNCTION IF EXISTS public.admin_auditoria_mobilidade(date, date, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_auditoria_mobilidade(
  _inicio date DEFAULT NULL,
  _fim date DEFAULT NULL,
  _busca text DEFAULT NULL,
  _status text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0,
  _somente_excecao boolean DEFAULT false,
  _municipio_destino uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, criada_em timestamptz, aceita_em timestamptz, iniciada_em timestamptz,
  finalizada_em timestamptz, servidor text, cargo text, lotacao text, modalidade text,
  status text, origem text, origem_lat double precision, origem_lng double precision,
  destino text, destino_lat double precision, destino_lng double precision,
  distancia_km numeric, duracao_min integer, motorista text, fora_expediente boolean,
  municipio_destino text, com_excecao boolean, perto_fronteira boolean,
  total_registros bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NAO_AUTORIZADO';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.*, p.nome AS p_nome, p.cargo AS p_cargo, p.lotacao AS p_lotacao,
           m.nome AS m_nome, mu.name AS mun_nome
    FROM public.corridas c
    LEFT JOIN public.profiles p ON p.id = c.passageiro_id
    LEFT JOIN public.mototaxistas m ON m.id = c.mototaxista_id
    LEFT JOIN public.municipalities mu ON mu.id = c.municipio_destino_id
    WHERE c.tipo IN ('automovel', 'moto_taxi')
      AND (_inicio IS NULL OR c.criado_em >= _inicio::timestamptz)
      AND (_fim IS NULL OR c.criado_em < (_fim + 1)::timestamptz)
      AND (_status IS NULL OR _status = '' OR c.status::text = _status)
      AND (NOT _somente_excecao OR c.municipio_excecao_id IS NOT NULL)
      AND (_municipio_destino IS NULL OR c.municipio_destino_id = _municipio_destino)
      AND (
        _busca IS NULL OR _busca = '' OR
        p.nome ILIKE '%' || _busca || '%' OR
        p.cargo ILIKE '%' || _busca || '%' OR
        p.lotacao ILIKE '%' || _busca || '%'
      )
  ), contagem AS (SELECT count(*) AS total FROM base)
  SELECT
    b.id, b.criado_em, b.aceita_em, b.iniciada_em, b.finalizada_em,
    b.p_nome, b.p_cargo, b.p_lotacao, b.tipo::text, b.status::text,
    b.origem_endereco, b.origem_lat, b.origem_lng,
    b.destino_endereco, b.destino_lat, b.destino_lng,
    COALESCE(b.distancia_final_km, b.distancia_km), b.duracao_min, b.m_nome,
    (
      EXTRACT(HOUR FROM (b.criado_em AT TIME ZONE 'America/Sao_Paulo')) < 8
      OR EXTRACT(HOUR FROM (b.criado_em AT TIME ZONE 'America/Sao_Paulo')) >= 18
      OR EXTRACT(ISODOW FROM (b.criado_em AT TIME ZONE 'America/Sao_Paulo')) > 5
    ),
    b.mun_nome,
    (b.municipio_excecao_id IS NOT NULL),
    b.perto_fronteira,
    (SELECT total FROM contagem)
  FROM base b
  ORDER BY b.criado_em DESC
  LIMIT GREATEST(1, LEAST(_limit, 200))
  OFFSET GREATEST(0, _offset);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_auditoria_mobilidade(date, date, text, text, integer, integer, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_auditoria_mobilidade(date, date, text, text, integer, integer, boolean, uuid) TO authenticated;
