-- Reset all existing consultant availability so every consultant can enter fresh date-specific availability.
-- This is intentionally data-destructive and should only be applied when resetting availability is desired.
delete from public.specialist_availability;
