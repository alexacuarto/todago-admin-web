import { supabase } from './supabase';

export interface CreateDriverParams {
  fullName: string;
  email: string;
  password: string;
  contactNumber: string;
  plateNumber: string;
  todaAssociation: string;
  // Optional document uploads during creation
  licenseFrontImage?: File | null;
  licenseBackImage?: File | null;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  franchiseImage?: File | null;
  franchiseBackImage?: File | null;
  franchiseNumber?: string;
  franchiseExpiryDate?: string;
}

export interface CreateDriverResult {
  success: boolean;
  error?: string;
  driverName?: string;
}

/**
 * Helper: upload a file to Supabase storage and return its public URL.
 */
async function uploadDriverDoc(
  userId: string,
  file: File,
  label: string
): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${userId}-${label}-${Date.now()}.${fileExt}`;
  const bucketName = 'driver-documents';

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, { upsert: true });

  if (error) {
    throw new Error(`Failed to upload ${label}: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Idempotent driver creation:
 *  1. signUp() → create auth user (safe if already exists)
 *  2. Restore admin session
 *  3. RPC → create profile + driver + vehicle (all use ON CONFLICT)
 *  4. Upload document images if provided
 *  5. Update driver record with document URLs & metadata
 */
export async function createDriverAccount(
  params: CreateDriverParams
): Promise<CreateDriverResult> {
  const {
    fullName, email, password, contactNumber, plateNumber, todaAssociation,
    licenseFrontImage, licenseBackImage, licenseNumber, licenseExpiryDate,
    franchiseImage, franchiseBackImage, franchiseNumber, franchiseExpiryDate,
  } = params;

  console.log("createDriverAccount starting with params:", {
    fullName, email, contactNumber, plateNumber, todaAssociation,
    hasLicenseFront: !!licenseFrontImage,
    hasLicenseBack: !!licenseBackImage,
    hasLicenseNumber: !!licenseNumber,
    hasFranchiseImage: !!franchiseImage,
    hasFranchiseBackImage: !!franchiseBackImage,
  });

  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  try {
    // 1. Save admin session
    console.log("Fetching admin session...");
    const { data: { session: adminSession }, error: adminSessionError } = await supabase.auth.getSession();
    if (adminSessionError) {
      console.error("Failed to get admin session:", adminSessionError);
      return { success: false, error: `Admin session retrieval failed: ${adminSessionError.message}` };
    }
    if (!adminSession) {
      console.error("No active admin session found.");
      return { success: false, error: 'Admin is not logged in.' };
    }

    let userId: string | undefined;

    // 1b. Pre-validate uniqueness
    console.log("Pre-validating uniqueness...");
    if (email) {
      const { data: emailProfile } = await supabase.from('profiles').select('id, role').eq('email', email).maybeSingle();
      if (emailProfile) {
        const { data: driverCheck } = await supabase.from('drivers').select('id, document_status').eq('profile_id', emailProfile.id).maybeSingle();
        if (driverCheck) {
          if (driverCheck.document_status === 'VERIFIED') {
            console.error("Validation failed: Email already exists as a verified driver.");
            return { success: false, error: 'Driver account already exists.' };
          }
          console.log("Found incomplete driver record for email. Reusing existing user.");
          userId = emailProfile.id;
        } else if (emailProfile.role === 'passenger') {
          console.error("Validation failed: Email registered to passenger.");
          return { success: false, error: 'This email is already registered as a passenger account. Please use different credentials.' };
        } else {
          console.log("Found incomplete driver profile for email. Reusing existing profile.");
          userId = emailProfile.id;
        }
      }
    }

    if (contactNumber && !userId) {
      const { data: phoneProfile } = await supabase.from('profiles').select('id, role').eq('phone_number', contactNumber).maybeSingle();
      if (phoneProfile) {
        const { data: driverCheck } = await supabase.from('drivers').select('id, document_status').eq('profile_id', phoneProfile.id).maybeSingle();
        if (driverCheck) {
          if (driverCheck.document_status === 'VERIFIED') {
            console.error("Validation failed: Phone number already exists as a verified driver.");
            return { success: false, error: 'Driver account already exists.' };
          }
          console.log("Found incomplete driver record for phone number. Reusing existing user.");
          userId = phoneProfile.id;
        } else if (phoneProfile.role === 'passenger') {
          console.error("Validation failed: Phone number registered to passenger.");
          return { success: false, error: 'This phone number is already registered as a passenger account. Please use different credentials.' };
        } else {
          console.log("Found incomplete driver profile for phone number. Reusing existing profile.");
          userId = phoneProfile.id;
        }
      }
    }

    const { data: plateCheck } = await supabase
      .from('vehicles')
      .select(`
        id,
        driver_id,
        drivers (
          id,
          profile_id,
          profiles (
            id
          )
        )
      `)
      .eq('plate_number', plateNumber)
      .maybeSingle();

    if (plateCheck && plateCheck.driver_id && plateCheck.drivers) {
      const driverRec = plateCheck.drivers as any;
      const profileRec = driverRec?.profiles;
      const vehicleDriverProfileId = driverRec?.profile_id;

      if (profileRec && vehicleDriverProfileId && vehicleDriverProfileId !== userId) {
        console.error("Validation failed: Plate number already registered to another driver.");
        return { success: false, error: 'Plate number already registered to another driver.' };
      }
    }

    // 2. Call direct RPC to create auth user, profile, driver, and vehicle in one transaction
    console.log("Calling create_driver_account RPC (with auth bypass)...");
    const { data, error: rpcError } = await supabase.rpc('create_driver_account', {
      p_email: email,
      p_password: password,
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: contactNumber,
      p_plate_number: plateNumber,
      p_toda_association: todaAssociation,
    });

    console.log("create_driver_account RPC Response Data:", data);
    if (rpcError) {
      console.error("create_driver_account RPC failed with error:", rpcError);
      return { success: false, error: rpcError.message || JSON.stringify(rpcError) };
    }

    if (!data?.success) {
      console.error("create_driver_account RPC returned success=false:", data);
      return { success: false, error: data?.error || 'Database RPC reported failure.' };
    }

    userId = data?.user_id || userId;
    if (!userId) {
      console.error("RPC response lacks user_id:", data);
      return { success: false, error: 'User ID was not generated or retrieved.' };
    }

    const finalToda = todaAssociation?.trim() || 'LHITC-TODA';

    // 4. Guarantee toda_association is set directly on drivers table
    console.log("Ensuring toda_association is saved on drivers table:", finalToda);
    await supabase
      .from('drivers')
      .update({ toda_association: finalToda })
      .eq('profile_id', userId);

    // 5. Upload document files if provided and update driver record
    const driverUpdates: Record<string, string | null> = {};

    try {
      if (licenseFrontImage) {
        console.log("Uploading license front image...");
        const frontUrl = await uploadDriverDoc(userId, licenseFrontImage, 'front');
        driverUpdates.license_front_url = frontUrl;
        driverUpdates.license_photo_url = frontUrl; // backward compat
      }

      if (licenseBackImage) {
        console.log("Uploading license back image...");
        const backUrl = await uploadDriverDoc(userId, licenseBackImage, 'back');
        driverUpdates.license_back_url = backUrl;
      }

      if (franchiseImage) {
        console.log("Uploading franchise permit / front image...");
        const franchiseUrl = await uploadDriverDoc(userId, franchiseImage, 'franchise_front');
        driverUpdates.franchise_url = franchiseUrl;
      }

      if (franchiseBackImage) {
        console.log("Uploading franchise back image...");
        const franchiseBackUrl = await uploadDriverDoc(userId, franchiseBackImage, 'franchise_back');
        driverUpdates.franchise_back_url = franchiseBackUrl;
      }

      if (licenseNumber) driverUpdates.license_number = licenseNumber;
      if (licenseExpiryDate) driverUpdates.license_expiry_date = licenseExpiryDate;
      if (franchiseNumber) driverUpdates.franchise_number = franchiseNumber;
      if (franchiseExpiryDate) driverUpdates.franchise_expiry_date = franchiseExpiryDate;

      // Apply all document updates in one query
      if (Object.keys(driverUpdates).length > 0) {
        console.log("Updating driver record with document data...", driverUpdates);
        let { error: updateError } = await supabase
          .from('drivers')
          .update(driverUpdates)
          .eq('profile_id', userId);

        if (updateError && (updateError.message?.includes("franchise_back_url") || String(updateError).includes("franchise_back_url"))) {
          console.warn("Retrying driver document update without franchise_back_url...");
          delete driverUpdates.franchise_back_url;
          const retry = await supabase
            .from('drivers')
            .update(driverUpdates)
            .eq('profile_id', userId);
          updateError = retry.error;
        }

        if (updateError) throw updateError;
      }
    } catch (docError: any) {
      console.error("Error during document uploads/saving...", docError);
      const docErrMsg = docError.message || JSON.stringify(docError) || String(docError);
      return { success: false, error: docErrMsg };
    }

    console.log("Driver account creation completed successfully.");
    return { success: true, driverName: fullName };
  } catch (err: any) {
    console.error("Unexpected JavaScript exception in createDriverAccount:", err);
    return { success: false, error: err.message || JSON.stringify(err) || String(err) };
  }
}

/**
 * Updates a driver's assigned TODA Association in Supabase.
 */
export async function updateDriverTodaAssociation(
  driverId: string,
  todaAssociation: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanToda = todaAssociation.trim();
    if (!['LHITC-TODA', 'BYPASS ILAYANG BAGUIO-TODA', 'CHOT-TODA'].includes(cleanToda)) {
      return { success: false, error: 'Invalid TODA association.' };
    }

    const { error } = await supabase
      .from('drivers')
      .update({ toda_association: cleanToda, updated_at: new Date().toISOString() })
      .eq('id', driverId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating driver TODA association:', err);
    return { success: false, error: err.message || String(err) };
  }
}
