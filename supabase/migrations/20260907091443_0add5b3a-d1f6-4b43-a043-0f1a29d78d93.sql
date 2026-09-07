
GRANT SELECT ON public.municipalities TO anon, authenticated;
GRANT ALL ON public.municipalities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_neighbor_cities TO authenticated;
GRANT ALL ON public.allowed_neighbor_cities TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.ride_exception_requests TO authenticated;
GRANT ALL ON public.ride_exception_requests TO service_role;
