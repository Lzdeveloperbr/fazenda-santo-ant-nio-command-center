CREATE TABLE public.sow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sow_id uuid NOT NULL REFERENCES public.sows(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('retorno_cio','descarte','morte','transferencia','reativacao','observacao')),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sow_events TO authenticated;
GRANT ALL ON public.sow_events TO service_role;
ALTER TABLE public.sow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read sow events" ON public.sow_events
  FOR SELECT TO authenticated USING (public.is_member());
CREATE POLICY "members insert sow events" ON public.sow_events
  FOR INSERT TO authenticated WITH CHECK (public.is_member());

CREATE INDEX sow_events_sow_date_idx ON public.sow_events(sow_id, event_date DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_sow_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'retorno_cio' THEN
    UPDATE public.breedings
      SET pregnancy_check = 'negativo'
      WHERE id = (
        SELECT id FROM public.breedings
        WHERE sow_id = NEW.sow_id
        ORDER BY breeding_date DESC, created_at DESC
        LIMIT 1
      );
    UPDATE public.sows SET status = 'vazia' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'descarte' THEN
    UPDATE public.sows SET status = 'descartada' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'morte' THEN
    UPDATE public.sows SET status = 'morta' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'transferencia' THEN
    UPDATE public.sows SET status = 'transferida' WHERE id = NEW.sow_id;
  ELSIF NEW.event_type = 'reativacao' THEN
    UPDATE public.sows SET status = 'vazia' WHERE id = NEW.sow_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sow_event
AFTER INSERT ON public.sow_events
FOR EACH ROW EXECUTE FUNCTION public.apply_sow_event();

CREATE OR REPLACE FUNCTION public.validate_litter_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_live integer;
BEGIN
  IF NEW.event_type IN ('morte','transferencia_entrada','transferencia_saida','desmame') AND NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade de leitões maior que zero.';
  END IF;

  IF NEW.event_type IN ('morte','transferencia_saida','desmame') THEN
    SELECT born_alive - deaths + transfers_in - transfers_out
      INTO current_live
      FROM public.litters
      WHERE id = NEW.litter_id
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Leitegada não encontrada.';
    END IF;
    IF NEW.quantity > current_live THEN
      RAISE EXCEPTION 'A quantidade informada ultrapassa os % leitões vivos da leitegada.', current_live;
    END IF;
    IF NEW.event_type = 'desmame' AND NEW.quantity <> current_live THEN
      RAISE EXCEPTION 'O desmame precisa registrar todos os % leitões vivos da leitegada.', current_live;
    END IF;
  END IF;

  IF NEW.event_type = 'pesagem' AND (NEW.value IS NULL OR NEW.value <= 0) THEN
    RAISE EXCEPTION 'Informe um peso médio maior que zero.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_litter_event_before_insert
BEFORE INSERT ON public.litter_events
FOR EACH ROW EXECUTE FUNCTION public.validate_litter_event();