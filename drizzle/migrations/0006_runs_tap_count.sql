ALTER TABLE public.runs ADD COLUMN tap_count integer NOT NULL DEFAULT 0;
UPDATE public.runs SET tap_count = coalesce(array_length(tap_ticks, 1), 0);