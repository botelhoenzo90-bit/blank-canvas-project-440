ALTER TABLE public.sales
  ADD COLUMN sale_type text NOT NULL DEFAULT 'Outro',
  ADD COLUMN group_number text NOT NULL DEFAULT '',
  ADD COLUMN quota_number text NOT NULL DEFAULT '',
  ADD COLUMN administrator text NOT NULL DEFAULT '',
  ADD COLUMN credit_value numeric,
  ADD COLUMN payment_method text NOT NULL DEFAULT '',
  ADD COLUMN lead_source text NOT NULL DEFAULT '',
  ADD COLUMN notes text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.sales.sale_type IS 'Tipo: Veículos, Imóveis, Pesados ou Outro';
COMMENT ON COLUMN public.sales.group_number IS 'Grupo do consórcio';
COMMENT ON COLUMN public.sales.quota_number IS 'Cota do consórcio';
COMMENT ON COLUMN public.sales.administrator IS 'Administradora do consórcio';
COMMENT ON COLUMN public.sales.credit_value IS 'Valor do crédito contratado';
COMMENT ON COLUMN public.sales.payment_method IS 'Forma de pagamento';
COMMENT ON COLUMN public.sales.lead_source IS 'Origem do cliente';
COMMENT ON COLUMN public.sales.notes IS 'Observações da venda';