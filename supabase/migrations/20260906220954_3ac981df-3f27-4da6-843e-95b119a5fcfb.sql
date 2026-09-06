
REVOKE EXECUTE ON FUNCTION public.municipalities_geom_sync() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_bloquear_troca_municipio() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.corridas_validar_territorio() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.corridas_consumir_excecao() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.mun_ids_permitidos(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mun_municipio_do_ponto(uuid[], double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mun_ponto_permitido(uuid, double precision, double precision, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mun_perto_da_fronteira(uuid, double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mun_meu_municipio() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_excecoes_listar(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_excecao_decidir(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_municipio_vizinho(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_definir_municipio_servidor(uuid, uuid) FROM PUBLIC, anon;
