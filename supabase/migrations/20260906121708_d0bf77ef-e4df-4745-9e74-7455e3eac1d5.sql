
CREATE TABLE public.quota_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL DEFAULT public.mob_mes_atual(),
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendido','recusado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.quota_requests TO authenticated;
GRANT ALL ON public.quota_requests TO service_role;
ALTER TABLE public.quota_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qreq_select_own" ON public.quota_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "qreq_insert_own" ON public.quota_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "qreq_select_admin" ON public.quota_requests
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "qreq_update_admin" ON public.quota_requests
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_quota_requests_month ON public.quota_requests (month, status);
