-- Admin user deletion archive and recovery log.
-- Destructive deletion is performed by the admin-delete-user Edge Function.

CREATE TABLE IF NOT EXISTS public.user_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id uuid NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  user_email text,
  user_name text,
  user_role text,
  deletion_status text NOT NULL DEFAULT 'deleted'
    CHECK (deletion_status IN ('pending', 'deleted', 'failed')),
  deleted_data jsonb NOT NULL,
  recovery_sql text NOT NULL
);

ALTER TABLE public.user_deletion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read deletion logs" ON public.user_deletion_logs;

CREATE POLICY "Admins can read deletion logs"
ON public.user_deletion_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.user_deletion_logs FROM anon, authenticated;
GRANT SELECT ON public.user_deletion_logs TO authenticated;