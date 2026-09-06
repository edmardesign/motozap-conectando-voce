
REVOKE ALL ON FUNCTION public.mob_minha_cota() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mob_limite_padrao() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mob_garantir_cota(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_liberar_cota_extra(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_definir_limite_mobilidade(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_listar_cotas(date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_listar_corridas_mobilidade(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mob_minha_cota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mob_limite_padrao() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_liberar_cota_extra(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_definir_limite_mobilidade(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_cotas(date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_listar_corridas_mobilidade(date) TO authenticated;
