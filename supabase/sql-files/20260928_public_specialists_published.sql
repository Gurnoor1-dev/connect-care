-- Make all existing specialist profiles publicly visible and remove the retired online/offline requirement.
-- Booking remains restricted by validate_appointment_booking_window(), which requires
-- published specialists and an active specialist_availability range.

UPDATE public.specialist_profiles
SET is_published = true
WHERE is_published IS DISTINCT FROM true;

DROP POLICY IF EXISTS "Public can view online published specialists"
ON public.specialist_profiles;

DROP POLICY IF EXISTS "Public can view published specialists"
ON public.specialist_profiles;

CREATE POLICY "Public can view published specialists"
ON public.specialist_profiles
FOR SELECT
TO public
USING (is_published = true);
