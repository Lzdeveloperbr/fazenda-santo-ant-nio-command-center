CREATE TABLE public.inventory_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id uuid REFERENCES public.sows(id) ON DELETE CASCADE,
  pen_code text,
  observed_status text NOT NULL DEFAULT 'desconhecida' CHECK (observed_status IN ('gestante','lactante','vazia','coberta','desconhecida')),
  confidence text NOT NULL DEFAULT 'nao_confirmada' CHECK (confidence IN ('comprovada','nao_confirmada')),
  piglets_counted integer CHECK (piglets_counted IS NULL OR piglets_counted >= 0),
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_checks TO authenticated;
GRANT ALL ON public.inventory_checks TO service_role;
ALTER TABLE public.inventory_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all inventory" ON public.inventory_checks FOR ALL TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN ('receita','despesa')),
  category text NOT NULL,
  description text,
  counterpart text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente')),
  batch_id uuid REFERENCES public.production_batches(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated;
GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all finance" ON public.finance_entries FOR ALL TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());