-- Track participant exits and allow sessions to be finalized as partially completed.
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'partially_completed';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS specialist_left_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_left_at timestamptz;

CREATE INDEX IF NOT EXISTS appointments_session_end_idx
  ON public.appointments (scheduled_at, duration_minutes, status);

CREATE OR REPLACE FUNCTION public.finalize_expired_appointments()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  changed integer := 0;
BEGIN
  UPDATE public.appointments a
  SET status = CASE
      WHEN a.specialist_joined_at IS NULL AND a.customer_joined_at IS NULL THEN 'no_show'::public.appointment_status
      WHEN a.specialist_joined_at IS NOT NULL
        AND a.customer_joined_at IS NOT NULL
        AND (a.specialist_left_at IS NULL OR a.specialist_left_at >= a.scheduled_at + make_interval(mins => a.duration_minutes))
        AND (a.customer_left_at IS NULL OR a.customer_left_at >= a.scheduled_at + make_interval(mins => a.duration_minutes))
        THEN 'completed'::public.appointment_status
      ELSE 'partially_completed'::public.appointment_status
    END,
    session_ended_at = a.scheduled_at + make_interval(mins => a.duration_minutes),
    updated_at = now()
  WHERE a.status = 'confirmed'::public.appointment_status
    AND now() >= a.scheduled_at + make_interval(mins => a.duration_minutes);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_expired_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_expired_appointments() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('finalize-expired-appointments');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'finalize-expired-appointments',
  '* * * * *',
  $$SELECT public.finalize_expired_appointments();$$
);