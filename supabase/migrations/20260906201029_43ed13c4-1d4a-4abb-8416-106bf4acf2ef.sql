REVOKE ALL ON FUNCTION public.admin_auditoria_mobilidade(DATE, DATE, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_auditoria_mobilidade(DATE, DATE, TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_auditoria_rota(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_auditoria_rota(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mob_carimbar_auditoria() FROM PUBLIC, anon, authenticated;