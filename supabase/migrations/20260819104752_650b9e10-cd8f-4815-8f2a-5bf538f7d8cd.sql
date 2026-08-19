-- Create tables for the new ride request system
CREATE TABLE IF NOT EXISTS public.drivers (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_veiculo TEXT CHECK (tipo_veiculo IN ('carro', 'moto')),
    placa TEXT,
    modelo TEXT,
    is_online BOOLEAN DEFAULT false,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passageiro_id UUID NOT NULL REFERENCES auth.users(id),
    motorista_id UUID REFERENCES auth.users(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('automovel', 'moto_taxi')),
    origem_lat DOUBLE PRECISION NOT NULL,
    origem_lng DOUBLE PRECISION NOT NULL,
    origem_endereco TEXT,
    destino_lat DOUBLE PRECISION NOT NULL,
    destino_lng DOUBLE PRECISION NOT NULL,
    destino_endereco TEXT,
    valor_estimado NUMERIC(10,2),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'chegou', 'em_andamento', 'finalizado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.ride_requests TO authenticated;
GRANT ALL ON public.ride_requests TO service_role;

-- Policies for drivers
CREATE POLICY "Drivers can see all online drivers" ON public.drivers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own driver record" ON public.drivers
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies for ride_requests
CREATE POLICY "Passageiros can see their own requests" ON public.ride_requests
    FOR SELECT TO authenticated USING (auth.uid() = passageiro_id);

CREATE POLICY "Passageiros can create requests" ON public.ride_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = passageiro_id);

CREATE POLICY "Motoristas can see pending requests" ON public.ride_requests
    FOR SELECT TO authenticated USING (status = 'pendente' OR auth.uid() = motorista_id);

CREATE POLICY "Motoristas can accept requests" ON public.ride_requests
    FOR UPDATE TO authenticated USING (status = 'pendente' OR auth.uid() = motorista_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;