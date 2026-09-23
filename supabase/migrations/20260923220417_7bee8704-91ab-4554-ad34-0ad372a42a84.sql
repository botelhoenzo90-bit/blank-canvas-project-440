CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller text NOT NULL,
  supervisor text NOT NULL,
  representative text NOT NULL,
  master text NOT NULL,
  team text NOT NULL,
  value numeric(14,2) NOT NULL,
  sale_date date NOT NULL DEFAULT current_date,
  sale_time time NOT NULL DEFAULT localtime,
  status text NOT NULL DEFAULT 'Confirmada',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sales TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view sales" ON public.sales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can register sales" ON public.sales FOR INSERT TO anon, authenticated WITH CHECK (
  length(seller) BETWEEN 1 AND 120
  AND length(supervisor) BETWEEN 1 AND 120
  AND length(team) BETWEEN 1 AND 120
  AND value > 0
  AND status IN ('Confirmada', 'Pendente')
);

CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  device_label text NOT NULL DEFAULT 'Navegador',
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_devices TO service_role;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_push_devices_updated_at
BEFORE UPDATE ON public.push_devices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;