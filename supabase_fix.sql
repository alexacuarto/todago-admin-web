-- ============================================================
-- TODAGO: STRICT DRIVER CREATION WITH UNIQUE VALIDATIONS (v9)
-- Run this ENTIRE script in Supabase SQL Editor.
-- Make sure to NOT highlight any lines when running this.
-- ============================================================

-- ============================================================
-- 1. TAG ADMIN ACCOUNT
-- ============================================================
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'cuartoalexa22@gmail.com';

-- ============================================================
-- 2. CREATE DRIVER ACCOUNT FUNCTION (ATOMIC TRANSACTION)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_driver_account(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_plate_number text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id uuid;
  v_type_id uuid;
BEGIN
  -- Verify caller is admin
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can create driver accounts.');
  END IF;

  -- 🔴 HARD CHECK BEFORE INSERT
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email AND id != p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Email already exists');
  END IF;

  -- Verify phone number doesn't exist on OTHER profiles (flat IF statement)
  IF p_phone IS NOT NULL AND p_phone != '' AND EXISTS (SELECT 1 FROM public.profiles WHERE phone_number = p_phone AND id != p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Phone number already exists');
  END IF;

  -- Verify plate number doesn't exist on OTHER vehicles
  IF EXISTS (
    SELECT 1 FROM public.vehicles v
    JOIN public.drivers d ON v.driver_id = d.id
    WHERE v.plate_number = p_plate_number AND d.profile_id != p_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Plate number already exists');
  END IF;

  -- PROFILE (Upsert/Insert: Use ON CONFLICT to update metadata if trigger already created it)
  INSERT INTO public.profiles (id, first_name, last_name, phone_number, role)
  VALUES (p_user_id, p_first_name, p_last_name, p_phone, 'driver')
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    role = 'driver';

  -- DRIVER
  INSERT INTO public.drivers (profile_id, license_number, status, approved_at)
  VALUES (p_user_id, 'PENDING', 'approved', now())
  ON CONFLICT (profile_id) DO NOTHING
  RETURNING id INTO v_driver_id;

  -- If driver already existed, select its id
  IF v_driver_id IS NULL THEN
    SELECT id INTO v_driver_id FROM public.drivers WHERE profile_id = p_user_id;
  END IF;

  -- VEHICLE TYPE
  SELECT id INTO v_type_id FROM public.vehicle_types WHERE is_active = true LIMIT 1;

  -- VEHICLE
  IF v_type_id IS NOT NULL AND v_driver_id IS NOT NULL THEN
    INSERT INTO public.vehicles (driver_id, vehicle_type_id, plate_number)
    VALUES (v_driver_id, v_type_id, p_plate_number)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object(
    'success', true,
    'driver_id', v_driver_id
  );
END;
$$;


-- ============================================================
-- 3. ROLLBACK/CLEANUP FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollback_user_creation(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;