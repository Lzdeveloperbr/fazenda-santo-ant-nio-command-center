CREATE OR REPLACE FUNCTION public.delete_sow(p_sow_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l_ids uuid[];
BEGIN
  IF NOT public.is_member() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT coalesce(array_agg(id), '{}') INTO l_ids FROM public.litters WHERE sow_id = p_sow_id;
  DELETE FROM public.tasks WHERE sow_id = p_sow_id OR litter_id = ANY(l_ids);
  DELETE FROM public.medication_records WHERE sow_id = p_sow_id OR litter_id = ANY(l_ids);
  DELETE FROM public.vaccination_records WHERE sow_id = p_sow_id OR litter_id = ANY(l_ids);
  DELETE FROM public.health_records WHERE sow_id = p_sow_id OR litter_id = ANY(l_ids);
  DELETE FROM public.inventory_checks WHERE sow_id = p_sow_id;
  DELETE FROM public.piglet_identifications WHERE litter_id = ANY(l_ids);
  DELETE FROM public.weaning_feed_schedules WHERE litter_id = ANY(l_ids);
  DELETE FROM public.litter_events WHERE litter_id = ANY(l_ids);
  DELETE FROM public.litters WHERE id = ANY(l_ids);
  DELETE FROM public.gestation_events WHERE sow_id = p_sow_id;
  DELETE FROM public.pregnancy_diagnoses WHERE sow_id = p_sow_id;
  DELETE FROM public.sow_events WHERE sow_id = p_sow_id;
  DELETE FROM public.breedings WHERE sow_id = p_sow_id;
  DELETE FROM public.sows WHERE id = p_sow_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_sow(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_sow(uuid) TO authenticated;