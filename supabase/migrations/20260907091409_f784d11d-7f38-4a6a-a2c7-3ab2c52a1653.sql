
CREATE OR REPLACE FUNCTION public.profiles_bloquear_troca_municipio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Definição inicial (perfil ainda sem município) é permitida ao próprio usuário.
  IF OLD.municipium_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.municipium_id IS DISTINCT FROM OLD.municipium_id
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'MUNICIPIO_NAO_EDITAVEL';
  END IF;
  RETURN NEW;
END;
$function$;
