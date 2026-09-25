ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_master' AFTER 'director';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS super_master text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_company text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.sales.seller_company IS 'Empresa ou unidade responsável pela venda';
COMMENT ON COLUMN public.sales.buyer_name IS 'Empresa ou pessoa cliente da venda';