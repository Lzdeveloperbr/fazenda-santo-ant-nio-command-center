CREATE TABLE public.boars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text,
  breed text,
  birth_date date,
  origin text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','descartado')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.boars TO authenticated;
GRANT ALL ON public.boars TO service_role;
ALTER TABLE public.boars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read boars" ON public.boars FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "members insert boars" ON public.boars FOR INSERT TO authenticated WITH CHECK (public.is_member());
CREATE POLICY "members update boars" ON public.boars FOR UPDATE TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

ALTER TABLE public.breedings
  ADD COLUMN breeding_time time,
  ADD COLUMN breeding_type text NOT NULL DEFAULT 'monta_natural' CHECK (breeding_type IN ('monta_natural','inseminacao','reinseminacao','complementar')),
  ADD COLUMN boar_id uuid REFERENCES public.boars(id),
  ADD COLUMN semen_code text,
  ADD COLUMN dose_number text,
  ADD COLUMN responsible text,
  ADD COLUMN services_count integer NOT NULL DEFAULT 1 CHECK (services_count >= 1),
  ADD COLUMN notes text,
  ADD COLUMN heat_check text NOT NULL DEFAULT 'pendente' CHECK (heat_check IN ('pendente','apresentou','nao_apresentou')),
  ADD COLUMN heat_check_date date,
  ADD COLUMN heat_notes text,
  ADD COLUMN cycle_status text NOT NULL DEFAULT 'ativo' CHECK (cycle_status IN ('ativo','retorno','negativo','perda','parido','encerrado')),
  ADD COLUMN closed_at date,
  ADD COLUMN prep_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN created_by uuid DEFAULT auth.uid(),
  ADD COLUMN updated_by uuid,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.breedings SET cycle_status = 'retorno' WHERE pregnancy_check = 'negativo';
UPDATE public.breedings b SET cycle_status = 'parido'
  WHERE cycle_status = 'ativo' AND EXISTS (SELECT 1 FROM public.litters l WHERE l.sow_id = b.sow_id AND l.farrowing_date >= b.breeding_date);

CREATE OR REPLACE FUNCTION public.touch_breeding()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;
CREATE TRIGGER breedings_touch BEFORE UPDATE ON public.breedings FOR EACH ROW EXECUTE FUNCTION public.touch_breeding();

CREATE TABLE public.pregnancy_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breeding_id uuid NOT NULL REFERENCES public.breedings(id) ON DELETE CASCADE,
  sow_id uuid NOT NULL REFERENCES public.sows(id) ON DELETE CASCADE,
  diagnosis_date date NOT NULL,
  result text NOT NULL CHECK (result IN ('positivo','negativo','inconclusivo','nao_realizado')),
  method text NOT NULL CHECK (method IN ('ultrassom','veterinario','retorno_cio','outro')),
  responsible text,
  next_check_date date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pregnancy_diagnoses TO authenticated;
GRANT ALL ON public.pregnancy_diagnoses TO service_role;
ALTER TABLE public.pregnancy_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read diagnoses" ON public.pregnancy_diagnoses FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "members insert diagnoses" ON public.pregnancy_diagnoses FOR INSERT TO authenticated WITH CHECK (public.is_member());

CREATE OR REPLACE FUNCTION public.apply_pregnancy_diagnosis()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.result = 'positivo' THEN
    UPDATE public.breedings SET pregnancy_check = 'positivo' WHERE id = NEW.breeding_id AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'gestante' WHERE id = NEW.sow_id AND status IN ('coberta','gestante','vazia');
  ELSIF NEW.result = 'negativo' THEN
    UPDATE public.breedings SET pregnancy_check = 'negativo', cycle_status = 'negativo', closed_at = NEW.diagnosis_date
      WHERE id = NEW.breeding_id AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'vazia' WHERE id = NEW.sow_id AND status IN ('coberta','gestante');
  ELSIF NEW.result = 'inconclusivo' THEN
    UPDATE public.breedings SET pregnancy_check = 'inconclusivo' WHERE id = NEW.breeding_id AND cycle_status = 'ativo';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_pregnancy_diagnosis AFTER INSERT ON public.pregnancy_diagnoses FOR EACH ROW EXECUTE FUNCTION public.apply_pregnancy_diagnosis();

CREATE TABLE public.gestation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breeding_id uuid REFERENCES public.breedings(id) ON DELETE CASCADE,
  sow_id uuid NOT NULL REFERENCES public.sows(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('aborto','suspeita_aborto','perda_gestacional','morte_matriz','outra')),
  confirmed boolean NOT NULL DEFAULT false,
  loss_count integer CHECK (loss_count IS NULL OR loss_count >= 0),
  signs text,
  possible_cause text,
  vet_evaluation text,
  responsible text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gestation_events TO authenticated;
GRANT ALL ON public.gestation_events TO service_role;
ALTER TABLE public.gestation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read gestation events" ON public.gestation_events FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "members insert gestation events" ON public.gestation_events FOR INSERT TO authenticated WITH CHECK (public.is_member());

CREATE OR REPLACE FUNCTION public.apply_gestation_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.event_type = 'morte_matriz' THEN
    UPDATE public.breedings SET cycle_status = 'encerrado', closed_at = NEW.event_date
      WHERE sow_id = NEW.sow_id AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'morta' WHERE id = NEW.sow_id;
  ELSIF NEW.confirmed AND NEW.event_type IN ('aborto','perda_gestacional') AND NEW.breeding_id IS NOT NULL THEN
    UPDATE public.breedings SET cycle_status = 'perda', closed_at = NEW.event_date
      WHERE id = NEW.breeding_id AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'vazia' WHERE id = NEW.sow_id AND status IN ('coberta','gestante');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_gestation_event AFTER INSERT ON public.gestation_events FOR EACH ROW EXECUTE FUNCTION public.apply_gestation_event();

ALTER TABLE public.litters
  ADD COLUMN breeding_id uuid REFERENCES public.breedings(id),
  ADD COLUMN mummified integer NOT NULL DEFAULT 0 CHECK (mummified >= 0),
  ADD COLUMN start_time time,
  ADD COLUMN end_time time,
  ADD COLUMN responsible text,
  ADD COLUMN complications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN farrowing_notes text,
  ADD COLUMN created_by uuid DEFAULT auth.uid();
CREATE UNIQUE INDEX litters_breeding_unique ON public.litters(breeding_id) WHERE breeding_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.close_cycle_on_farrowing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.breeding_id IS NOT NULL THEN
    UPDATE public.breedings SET cycle_status = 'parido', closed_at = NEW.farrowing_date WHERE id = NEW.breeding_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_litter_close_cycle AFTER INSERT ON public.litters FOR EACH ROW EXECUTE FUNCTION public.close_cycle_on_farrowing();

CREATE OR REPLACE FUNCTION public.apply_sow_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.event_type = 'retorno_cio' THEN
    UPDATE public.breedings
      SET pregnancy_check = 'negativo', cycle_status = 'retorno', heat_check = 'apresentou',
          heat_check_date = NEW.event_date, closed_at = NEW.event_date
      WHERE id = (SELECT id FROM public.breedings WHERE sow_id = NEW.sow_id ORDER BY breeding_date DESC, created_at DESC LIMIT 1)
        AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'vazia' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'descarte' THEN
    UPDATE public.breedings SET cycle_status = 'encerrado', closed_at = NEW.event_date WHERE sow_id = NEW.sow_id AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'descartada' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'morte' THEN
    UPDATE public.breedings SET cycle_status = 'encerrado', closed_at = NEW.event_date WHERE sow_id = NEW.sow_id AND cycle_status = 'ativo';
    UPDATE public.sows SET status = 'morta' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'transferencia' THEN
    UPDATE public.sows SET status = 'transferida' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'reativacao' THEN
    UPDATE public.sows SET status = 'vazia' WHERE id = NEW.sow_id;
  END IF;
  RETURN NEW;
END $$;