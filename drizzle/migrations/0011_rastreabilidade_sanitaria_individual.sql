-- Rastreabilidade sanitária por matriz, leitegada e leitão individual.
-- Registros antigos permanecem como escopo "grupo" e não recebem vínculos inventados.

ALTER TABLE public.vaccination_records
  ADD COLUMN animal_scope text NOT NULL DEFAULT 'grupo'
    CHECK (animal_scope IN ('grupo','matriz','leitegada','leitao')),
  ADD COLUMN sow_id uuid REFERENCES public.sows(id) ON DELETE RESTRICT,
  ADD COLUMN litter_id uuid REFERENCES public.litters(id) ON DELETE RESTRICT,
  ADD COLUMN piglet_identifier text;

ALTER TABLE public.medication_records
  ADD COLUMN animal_scope text NOT NULL DEFAULT 'grupo'
    CHECK (animal_scope IN ('grupo','matriz','leitegada','leitao')),
  ADD COLUMN sow_id uuid REFERENCES public.sows(id) ON DELETE RESTRICT,
  ADD COLUMN litter_id uuid REFERENCES public.litters(id) ON DELETE RESTRICT,
  ADD COLUMN piglet_identifier text;

CREATE INDEX vaccination_sow_date_idx
  ON public.vaccination_records(sow_id, vaccination_date DESC)
  WHERE sow_id IS NOT NULL;
CREATE INDEX vaccination_litter_date_idx
  ON public.vaccination_records(litter_id, vaccination_date DESC)
  WHERE litter_id IS NOT NULL;
CREATE INDEX medication_sow_date_idx
  ON public.medication_records(sow_id, administration_start DESC)
  WHERE sow_id IS NOT NULL;
CREATE INDEX medication_litter_date_idx
  ON public.medication_records(litter_id, administration_start DESC)
  WHERE litter_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_animal_health_record_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  litter_sow_id uuid;
BEGIN
  IF NEW.animal_scope = 'grupo' THEN
    IF NEW.sow_id IS NOT NULL OR NEW.litter_id IS NOT NULL OR NULLIF(trim(COALESCE(NEW.piglet_identifier,'')), '') IS NOT NULL THEN
      RAISE EXCEPTION 'Registros de grupo não devem conter vínculo individual.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.sow_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a matriz responsável pelo registro sanitário.';
  END IF;

  IF NEW.animal_scope = 'matriz' THEN
    IF NEW.litter_id IS NOT NULL OR NULLIF(trim(COALESCE(NEW.piglet_identifier,'')), '') IS NOT NULL THEN
      RAISE EXCEPTION 'Registro da matriz não pode conter leitegada ou identificação de leitão.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.litter_id IS NULL THEN
    RAISE EXCEPTION 'Selecione a leitegada vinculada ao registro.';
  END IF;

  SELECT sow_id INTO litter_sow_id
  FROM public.litters
  WHERE id = NEW.litter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leitegada não encontrada.';
  END IF;

  IF litter_sow_id <> NEW.sow_id THEN
    RAISE EXCEPTION 'A leitegada selecionada não pertence à matriz informada.';
  END IF;

  IF NEW.animal_scope = 'leitao' AND NULLIF(trim(COALESCE(NEW.piglet_identifier,'')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe a identificação do leitão para um registro individual.';
  END IF;

  IF NEW.animal_scope = 'leitegada' AND NULLIF(trim(COALESCE(NEW.piglet_identifier,'')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'Registro da leitegada não deve conter identificação individual de leitão.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER vaccination_animal_link_guard
BEFORE INSERT OR UPDATE OF animal_scope, sow_id, litter_id, piglet_identifier
ON public.vaccination_records
FOR EACH ROW EXECUTE FUNCTION public.validate_animal_health_record_link();

CREATE TRIGGER medication_animal_link_guard
BEFORE INSERT OR UPDATE OF animal_scope, sow_id, litter_id, piglet_identifier
ON public.medication_records
FOR EACH ROW EXECUTE FUNCTION public.validate_animal_health_record_link();
