ALTER TABLE public.runs DROP CONSTRAINT runs_status_check;
ALTER TABLE public.runs ADD CONSTRAINT runs_status_check CHECK (status IN ('started', 'complete', 'valid', 'rejected'));