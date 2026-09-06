
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ============ MUNICIPALITIES ============
CREATE TABLE public.municipalities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ibge_code text NOT NULL UNIQUE,
  name text NOT NULL,
  uf text NOT NULL,
  geojson jsonb NOT NULL,
  geom extensions.geometry(MultiPolygon, 4326),
  centroid_lat double precision,
  centroid_lng double precision,
  bounding_box jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.municipalities TO anon, authenticated;
GRANT ALL ON public.municipalities TO service_role;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipios_leitura_publica" ON public.municipalities
  FOR SELECT USING (true);
CREATE POLICY "municipios_admin_gerencia" ON public.municipalities
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.municipalities_geom_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE g extensions.geometry; e extensions.geometry;
BEGIN
  g := extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(NEW.geojson::text), 4326);
  g := extensions.ST_Multi(extensions.ST_MakeValid(g));
  NEW.geom := g;
  NEW.centroid_lat := extensions.ST_Y(extensions.ST_PointOnSurface(g));
  NEW.centroid_lng := extensions.ST_X(extensions.ST_PointOnSurface(g));
  e := extensions.ST_Envelope(g);
  NEW.bounding_box := jsonb_build_object(
    'minLng', extensions.ST_XMin(e), 'minLat', extensions.ST_YMin(e),
    'maxLng', extensions.ST_XMax(e), 'maxLat', extensions.ST_YMax(e));
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER municipalities_geom_sync_trg
  BEFORE INSERT OR UPDATE OF geojson ON public.municipalities
  FOR EACH ROW EXECUTE FUNCTION public.municipalities_geom_sync();

CREATE INDEX idx_municipalities_geom ON public.municipalities USING gist (geom);

-- ============ PERFIL: MUNICÍPIO DE EXERCÍCIO ============
ALTER TABLE public.profiles
  ADD COLUMN municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL;
CREATE INDEX idx_profiles_municipality ON public.profiles(municipality_id);

CREATE OR REPLACE FUNCTION public.profiles_bloquear_troca_municipio()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.municipality_id IS DISTINCT FROM OLD.municipality_id
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'MUNICIPIO_NAO_EDITAVEL';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_bloquear_troca_municipio_trg
  BEFORE UPDATE OF municipality_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_bloquear_troca_municipio();

-- ============ VIZINHOS PERMITIDOS ============
CREATE TABLE public.allowed_neighbor_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_city_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  neighbor_city_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_city_id, neighbor_city_id)
);

GRANT SELECT ON public.allowed_neighbor_cities TO authenticated;
GRANT ALL ON public.allowed_neighbor_cities TO service_role;
ALTER TABLE public.allowed_neighbor_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vizinhos_leitura_autenticados" ON public.allowed_neighbor_cities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vizinhos_admin_gerencia" ON public.allowed_neighbor_cities
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============ EXCEÇÕES INTERMUNICIPAIS ============
CREATE TABLE public.ride_exception_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_city_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  reason text NOT NULL,
  requested_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ride_exception_requests TO authenticated;
GRANT UPDATE ON public.ride_exception_requests TO authenticated;
GRANT ALL ON public.ride_exception_requests TO service_role;
ALTER TABLE public.ride_exception_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "excecoes_servidor_le_proprias" ON public.ride_exception_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "excecoes_servidor_cria" ON public.ride_exception_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "excecoes_admin_atualiza" ON public.ride_exception_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_excecoes_user ON public.ride_exception_requests(user_id, requested_date);
CREATE INDEX idx_excecoes_status ON public.ride_exception_requests(status, created_at DESC);

-- ============ CORRIDAS: METADADOS TERRITORIAIS ============
ALTER TABLE public.corridas
  ADD COLUMN municipio_excecao_id uuid REFERENCES public.ride_exception_requests(id) ON DELETE SET NULL,
  ADD COLUMN municipio_destino_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  ADD COLUMN perto_fronteira boolean NOT NULL DEFAULT false;

-- ============ FUNÇÕES DE VALIDAÇÃO ============
CREATE OR REPLACE FUNCTION public.mun_ids_permitidos(_user uuid, _data date)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT municipality_id AS id FROM public.profiles WHERE id = _user
  )
  SELECT COALESCE(array_agg(DISTINCT x), ARRAY[]::uuid[]) FROM (
    SELECT id AS x FROM base WHERE id IS NOT NULL
    UNION
    SELECT a.neighbor_city_id FROM public.allowed_neighbor_cities a
      JOIN base b ON b.id = a.primary_city_id
    UNION
    SELECT r.requested_city_id FROM public.ride_exception_requests r
     WHERE r.user_id = _user
       AND r.status = 'approved'
       AND r.consumed_at IS NULL
       AND r.requested_date = _data
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.mun_municipio_do_ponto(_ids uuid[], _lat double precision, _lng double precision)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT m.id FROM public.municipalities m
   WHERE m.id = ANY(_ids)
     AND m.geom IS NOT NULL
     AND extensions.ST_Contains(m.geom, extensions.ST_SetSRID(extensions.ST_MakePoint(_lng, _lat), 4326))
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mun_ponto_permitido(_user uuid, _lat double precision, _lng double precision, _data date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _lat IS NULL OR _lng IS NULL
      OR (SELECT municipality_id FROM public.profiles WHERE id = _user) IS NULL
      OR public.mun_municipio_do_ponto(public.mun_ids_permitidos(_user, _data), _lat, _lng) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.mun_perto_da_fronteira(_municipio uuid, _lat double precision, _lng double precision)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT COALESCE((
    SELECT extensions.ST_DWithin(
             extensions.ST_Boundary(m.geom)::extensions.geography,
             extensions.ST_SetSRID(extensions.ST_MakePoint(_lng, _lat), 4326)::extensions.geography,
             100)
      FROM public.municipalities m WHERE m.id = _municipio
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.mun_ids_permitidos(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mun_municipio_do_ponto(uuid[], double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mun_ponto_permitido(uuid, double precision, double precision, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mun_perto_da_fronteira(uuid, double precision, double precision) TO authenticated;

-- Municipio de exercicio do usuario autenticado (com poligono para o mapa)
CREATE OR REPLACE FUNCTION public.mun_meu_municipio()
RETURNS TABLE (
  id uuid, ibge_code text, name text, uf text, geojson jsonb,
  centroid_lat double precision, centroid_lng double precision, bounding_box jsonb,
  vizinhos jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.ibge_code, m.name, m.uf, m.geojson, m.centroid_lat, m.centroid_lng, m.bounding_box,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('id', n.id, 'name', n.name, 'uf', n.uf, 'geojson', n.geojson))
             FROM public.allowed_neighbor_cities a
             JOIN public.municipalities n ON n.id = a.neighbor_city_id
            WHERE a.primary_city_id = m.id
         ), '[]'::jsonb) AS vizinhos
    FROM public.profiles p
    JOIN public.municipalities m ON m.id = p.municipality_id
   WHERE p.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.mun_meu_municipio() TO authenticated;

-- ============ TRIGGER DE VALIDAÇÃO NAS CORRIDAS ============
CREATE OR REPLACE FUNCTION public.corridas_validar_territorio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base uuid;
  permitidos uuid[];
  dia date;
  mun_origem uuid;
  mun_destino uuid;
  nome_base text;
  exc uuid;
BEGIN
  SELECT municipality_id INTO base FROM public.profiles WHERE id = NEW.passageiro_id;
  IF base IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO nome_base FROM public.municipalities WHERE id = base;
  dia := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  permitidos := public.mun_ids_permitidos(NEW.passageiro_id, dia);

  IF NEW.origem_lat IS NOT NULL AND NEW.origem_lng IS NOT NULL THEN
    mun_origem := public.mun_municipio_do_ponto(permitidos, NEW.origem_lat, NEW.origem_lng);
    IF mun_origem IS NULL THEN
      RAISE EXCEPTION 'FORA_DO_MUNICIPIO_ORIGEM|%', nome_base;
    END IF;
  END IF;

  IF NEW.destino_lat IS NOT NULL AND NEW.destino_lng IS NOT NULL THEN
    mun_destino := public.mun_municipio_do_ponto(permitidos, NEW.destino_lat, NEW.destino_lng);
    IF mun_destino IS NULL THEN
      RAISE EXCEPTION 'FORA_DO_MUNICIPIO_DESTINO|%', nome_base;
    END IF;
    NEW.municipio_destino_id := mun_destino;
  END IF;

  -- Autorizacao especial: destino/origem fora do municipio-sede e dos vizinhos
  IF (mun_destino IS NOT NULL AND mun_destino <> base
        AND NOT EXISTS (SELECT 1 FROM public.allowed_neighbor_cities a
                         WHERE a.primary_city_id = base AND a.neighbor_city_id = mun_destino))
     OR (mun_origem IS NOT NULL AND mun_origem <> base
        AND NOT EXISTS (SELECT 1 FROM public.allowed_neighbor_cities a
                         WHERE a.primary_city_id = base AND a.neighbor_city_id = mun_origem)) THEN
    SELECT r.id INTO exc FROM public.ride_exception_requests r
     WHERE r.user_id = NEW.passageiro_id
       AND r.status = 'approved'
       AND r.consumed_at IS NULL
       AND r.requested_date = dia
       AND r.requested_city_id IN (COALESCE(mun_destino, base), COALESCE(mun_origem, base))
     ORDER BY r.created_at LIMIT 1;
    NEW.municipio_excecao_id := exc;
  END IF;

  NEW.perto_fronteira :=
       public.mun_perto_da_fronteira(COALESCE(mun_origem, base), NEW.origem_lat, NEW.origem_lng)
    OR public.mun_perto_da_fronteira(COALESCE(mun_destino, base), NEW.destino_lat, NEW.destino_lng);

  RETURN NEW;
END $$;

CREATE TRIGGER corridas_validar_territorio_trg
  BEFORE INSERT ON public.corridas
  FOR EACH ROW EXECUTE FUNCTION public.corridas_validar_territorio();

CREATE OR REPLACE FUNCTION public.corridas_consumir_excecao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.municipio_excecao_id IS NOT NULL THEN
    UPDATE public.ride_exception_requests
       SET consumed_at = now(), updated_at = now()
     WHERE id = NEW.municipio_excecao_id AND consumed_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER corridas_consumir_excecao_trg
  AFTER INSERT ON public.corridas
  FOR EACH ROW EXECUTE FUNCTION public.corridas_consumir_excecao();

-- ============ ADMIN: EXCECOES ============
CREATE OR REPLACE FUNCTION public.admin_excecoes_listar(_status text DEFAULT NULL)
RETURNS TABLE (
  id uuid, criada_em timestamptz, servidor text, cargo text, lotacao text,
  cidade text, uf text, reason text, requested_date date, status text,
  reviewed_at timestamptz, notes text, consumed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.created_at, p.nome, p.cargo, p.lotacao, m.name, m.uf,
         r.reason, r.requested_date, r.status, r.reviewed_at, r.notes, r.consumed_at
    FROM public.ride_exception_requests r
    JOIN public.municipalities m ON m.id = r.requested_city_id
    LEFT JOIN public.profiles p ON p.id = r.user_id
   WHERE public.is_admin(auth.uid())
     AND (_status IS NULL OR r.status = _status)
   ORDER BY r.created_at DESC
   LIMIT 300;
$$;
GRANT EXECUTE ON FUNCTION public.admin_excecoes_listar(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_excecao_decidir(_id uuid, _aprovar boolean, _notas text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO';
  END IF;
  UPDATE public.ride_exception_requests
     SET status = CASE WHEN _aprovar THEN 'approved' ELSE 'rejected' END,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         notes = COALESCE(_notas, notes),
         updated_at = now()
   WHERE id = _id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_excecao_decidir(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_municipio_vizinho(_primary uuid, _neighbor uuid, _remover boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO';
  END IF;
  IF _remover THEN
    DELETE FROM public.allowed_neighbor_cities
     WHERE primary_city_id = _primary AND neighbor_city_id = _neighbor;
  ELSE
    INSERT INTO public.allowed_neighbor_cities (primary_city_id, neighbor_city_id, added_by)
    VALUES (_primary, _neighbor, auth.uid())
    ON CONFLICT (primary_city_id, neighbor_city_id) DO NOTHING;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_municipio_vizinho(uuid, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_definir_municipio_servidor(_user uuid, _municipio uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'SEM_PERMISSAO';
  END IF;
  UPDATE public.profiles SET municipality_id = _municipio WHERE id = _user;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_definir_municipio_servidor(uuid, uuid) TO authenticated;
