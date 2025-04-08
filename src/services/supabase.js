import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase URL and Anon Key
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://sfblocmzxezqromoriwn.supabase.co';
// IMPORTANT: Use the ANON key, not the service_role key in the frontend!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYmxvY216eGV6cXJvbW9yaXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzAzODIsImV4cCI6MjA1OTcwNjM4Mn0.Plez1EUSov1SEHZut4sG1YmyNMDnv4_uePEWaCwI5w8';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Supabase URL or Anon Key is missing. Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your environment.");
  // Optionally throw an error or handle this case appropriately
  // throw new Error("Supabase configuration is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Helper Functions ---

// Generate a booking reference number (same logic as before)
const generateBookingRef = () => {
  const timestamp = Date.now().toString(36);
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BK-${timestamp}-${randomChars}`;
};

// Simple error handling helper
const handleSupabaseError = (error, context) => {
  console.error(`Supabase error (${context}):`, error);
  // Basic error mapping (can be expanded)
  let message = error.message;
  if (error.code === '23505') { // Unique constraint violation
    if (context.includes('bookingRef')) message = 'Booking reference number conflict. Please try again.';
    else message = 'A similar record already exists.';
  }
  // Add more specific error handling based on Supabase error codes as needed
  return message || 'An unknown database error occurred.';
};

// --- Service Functions --- //

/**
 * Checks slot availability based on the desired booking type.
 * Reads directly from the 'slots' table.
 * Assumes RLS allows read access.
 */
export const checkSlotAvailability = async (slots, bookingType) => {
  if (!bookingType || !['5v5', '7v7'].includes(bookingType)) {
    throw new Error("Invalid booking type provided for availability check.");
  }
  if (!slots || slots.length === 0) {
    return true; // No slots to check
  }

  // --- Validation for booking rules (same as before) ---
  const now = new Date();
  for (const slot of slots) {
      try {
          const parts = slot.split(' ');
          const timeParts = parts[0].split(':');
          let hour = parseInt(timeParts[0]);
          const minute = parseInt(timeParts[1]);
          const period = parts[1]; // AM/PM
          const monthDay = parts[3] + ' ' + parts[4].replace(',', '');
          const year = now.getFullYear();
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          const dateString = `${monthDay} ${year} ${hour}:${minute}:00`;
          const slotDate = new Date(dateString);
          if (slotDate < now && monthDay.startsWith('Jan') && now.getMonth() === 11) {
              slotDate.setFullYear(year + 1);
          }
          const hoursDiff = (slotDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (isNaN(hoursDiff)) {
             console.warn(`Could not parse date for slot: ${slot}. Skipping advance booking check.`);
             continue;
          }
          if (hoursDiff > 48) {
              throw new Error("Cannot book slots more than 48 hours in advance");
          }
          if (hoursDiff < 0) {
             throw new Error("Cannot book slots in the past");
          }
      } catch (parseError) {
          console.warn(`Error parsing slot date '${slot}': ${parseError}. Skipping check.`);
      }
  }
  if (slots.length > 4) {
    throw new Error("Cannot book more than 4 slots at once");
  }
  // --- End validation ---

  try {
    const slotIds = slots.map(slot => slot.replace(/\s+/g, '_').replace(/,/g, ''));
    
    // Fetch the state of all requested slots at once
    const { data: slotData, error } = await supabase
      .from('slots')
      .select('id, state') // Select only id and state
      .in('id', slotIds);

    if (error) {
      throw new Error(handleSupabaseError(error, 'checking slot availability'));
    }

    // Create a map for quick lookup
    const slotStateMap = new Map(slotData.map(s => [s.id, s.state]));

    // Check each requested slot
    for (const slotId of slotIds) {
      const currentState = slotStateMap.get(slotId) || 'empty'; // Default to empty if not in DB

      if (bookingType === '7v7' && currentState !== 'empty') {
        console.log(`Slot check failed: ${slotId} is not empty for a 7v7 booking.`);
        return false; // Not available
      }
      if (bookingType === '5v5' && currentState === 'full') {
        console.log(`Slot check failed: ${slotId} is full for a 5v5 booking.`);
        return false; // Not available
      }
    }
    
    // If all slots pass the check
    return true;

  } catch (error) {
    console.error("Error checking slot availability:", error);
    // Re-throw application-specific errors or formatted Supabase errors
    throw error instanceof Error ? error : new Error('Failed to check slot availability.'); 
  }
};

/**
 * Adds a booking by calling the 'create_booking' database function.
 * This ensures atomicity (booking + slot updates succeed or fail together).
 */
export const addBooking = async (bookingData) => {
  // Input validation (can still be useful client-side)
  if (!bookingData.bookingType || !['5v5', '7v7'].includes(bookingData.bookingType)) {
    throw new Error("Invalid booking type specified.");
  }
  if (!bookingData.slots || bookingData.slots.length === 0) {
      throw new Error("No slots selected for booking.");
  }
  // Add other basic checks if needed (name, phone format etc.)

  try {
    console.log("Calling create_booking RPC with:", bookingData);
    const { data, error } = await supabase.rpc('create_booking', {
      p_name: bookingData.name,
      p_phone: bookingData.phone,
      p_amount: bookingData.amount,
      p_payment_status: bookingData.paymentStatus,
      p_booking_type: bookingData.bookingType,
      p_slots: bookingData.slots
    });

    if (error) {
      console.error("Supabase RPC error (create_booking):", error);
      // Handle specific database function errors (e.g., RAISE EXCEPTION messages)
      throw new Error(handleSupabaseError(error, 'create_booking RPC'));
    }
    
    console.log("create_booking RPC success:", data);
    // The function returns the newly created booking record
    return data; 

  } catch (error) {
    // Catch errors from the RPC call or client-side validation
    console.error("Error in addBooking service function:", error);
    // Re-throw the error message
    throw new Error(error.message || 'Failed to add booking via RPC.');
  }
};

/**
 * Gets bookings, optionally paginated.
 * Assumes RLS allows read access to 'bookings' table.
 */
export const getBookings = async (pageSize = 20, lastCreatedAt = null) => {
  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (lastCreatedAt) {
      // Supabase pagination typically uses range or filters, not startAfter like Firestore.
      // We can filter by created_at < lastCreatedAt for descending order.
      query = query.lt('created_at', lastCreatedAt);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(handleSupabaseError(error, 'getting bookings'));
    }
    
    // Determine the `created_at` of the last item for the next page query
    const nextLastCreatedAt = data && data.length === pageSize ? data[data.length - 1].created_at : null;

    return {
      bookings: data || [],
      lastCreatedAt: nextLastCreatedAt // Used for pagination in next call
    };
  } catch (error) {
    console.error("Error getting bookings:", error);
    throw new Error(error.message || 'Failed to get bookings.');
  }
};

/**
 * Gets bookings by phone number, optionally paginated.
 * Assumes RLS allows read access based on phone or is public.
 */
export const getBookingsByPhone = async (phone, pageSize = 10, lastCreatedAt = null) => {
  try {
    if (!phone) {
      throw new Error("Phone number is required");
    }

    let query = supabase
      .from('bookings')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (lastCreatedAt) {
      query = query.lt('created_at', lastCreatedAt);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(handleSupabaseError(error, 'getting bookings by phone'));
    }
    
    const nextLastCreatedAt = data && data.length === pageSize ? data[data.length - 1].created_at : null;

    return {
      bookings: data || [],
      lastCreatedAt: nextLastCreatedAt
    };
  } catch (error) {
    console.error("Error getting bookings by phone:", error);
    throw new Error(error.message || 'Failed to get bookings by phone.');
  }
};

/**
 * Listens for real-time booking updates.
 * Requires RLS to be configured for SELECT and Supabase Realtime enabled for the table.
 */
export const getBookingsRealtime = (callback) => {
  try {
    const channel = supabase.channel('public:bookings') // Use a channel name
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        (payload) => {
          console.log('Realtime booking change received!', payload);
          // Refetch the latest bookings to ensure consistency after any change
          // This is simpler than trying to merge payload.new/old
          getBookings(20) // Fetch initial page size
            .then(result => callback(result.bookings))
            .catch(error => {
              console.error("Realtime update: Error refetching bookings:", error);
              callback([], error.message || 'Failed to refetch bookings after update.');
            });
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
           console.log('Realtime channel subscribed successfully!');
           // Fetch initial data once subscribed
           getBookings(20) // Fetch initial page size
             .then(result => callback(result.bookings))
             .catch(error => {
               console.error("Realtime initial fetch error:", error);
               callback([], error.message || 'Failed initial fetch.');
             });
         } else if (status === 'CHANNEL_ERROR') {
            console.error('Realtime channel error:', err);
            callback([], `Realtime Error: Channel error occurred. ${err?.message || 'See console for details.'}`);
         } else if (status === 'TIMED_OUT') {
            console.warn('Realtime connection timed out.');
            callback([], 'Realtime Error: Connection timed out. Manual refresh might be needed.');
         } else if (status === 'CLOSED') {
            console.warn('Realtime connection closed. Was this intentional (e.g., page navigation)?', err);
            // Avoid showing error if the closure seems intentional (e.g., no error object)
            if (err) {
                callback([], `Realtime Error: Connection closed unexpectedly. ${err?.message || 'Check console.'}`);
            } else {
                 // Optionally inform the user that realtime is disconnected, but less alarming
                 // callback([], 'Realtime updates disconnected.'); 
            }
         } else {
             console.log(`Realtime channel status: ${status}`, err || '');
         }
      });

    // Return an unsubscribe function
    return () => {
      console.log('Unsubscribing from realtime channel');
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error("Failed to subscribe to realtime bookings:", error);
    callback([], error.message || 'Failed to subscribe.');
    // Return a no-op unsubscribe function
    return () => {};
  }
};

/**
 * Cancels a booking by calling the 'cancel_booking_atomic' database function.
 * This ensures atomicity.
 */
export const cancelBooking = async (bookingId) => {
  if (!bookingId) {
    throw new Error("Booking ID is required for cancellation.");
  }

  try {
    console.log(`Calling cancel_booking_atomic RPC for booking ID: ${bookingId}`);
    const { data, error } = await supabase.rpc('cancel_booking_atomic', {
      p_booking_id: bookingId
    });

    if (error) {
      console.error("Supabase RPC error (cancel_booking_atomic):", error);
      throw new Error(handleSupabaseError(error, 'cancel_booking_atomic RPC'));
    }
    
    console.log("cancel_booking_atomic RPC success, result:", data);
    // The function returns true on success
    if (data !== true) {
        // This case might indicate the booking was already cancelled or another issue occurred
        console.warn('cancel_booking_atomic RPC did not return true, might have already been cancelled or other issue.');
        // Decide if this should be an error or just a warning - let's treat it as success for now
    }
    return true; // Return true to indicate the operation was attempted/completed

  } catch (error) {
    console.error("Error in cancelBooking service function:", error);
    throw new Error(error.message || 'Failed to cancel booking via RPC.');
  }
};

// Send WhatsApp Notification (no change needed, it's client-side)
export const sendWhatsAppNotification = (bookingData) => {
  try {
    const slots = Array.isArray(bookingData.slots) ? bookingData.slots.join(', ') : bookingData.slots;
    const message = encodeURIComponent(
      `New booking:\n` +
      `Reference: ${bookingData.bookingRef || 'N/A'}\n` +
      `Name: ${bookingData.name}\n` +
      `Phone: ${bookingData.phone}\n` +
      `Slots: ${slots}\n` +
      // Add booking type to notification
      `Type: ${bookingData.bookingType || 'N/A'}\n` + 
      `Amount: ${bookingData.amount}\n` +
      `Payment: ${bookingData.paymentStatus}`
    );
    
    const ownerPhone = process.env.REACT_APP_OWNER_PHONE_NUMBER || '9082910031'; 
    const whatsappLink = `https://wa.me/${ownerPhone}?text=${message}`;
    window.open(whatsappLink, '_blank');
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return false;
  }
};

/**
 * Listens for real-time updates to the 'slots' table.
 * Requires RLS SELECT and Realtime enabled for the table.
 * Provides a map of { slotId: state } to the callback.
 */
export const getSlotStatesRealtime = (callback) => {
  let slotStates = {}; // Keep track of states locally

  try {
    const channel = supabase.channel('public:slots') // Channel for slots table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        (payload) => {
          console.log('Realtime slot change received!', payload);
          let changed = false;
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             const { id, state } = payload.new;
             if (id && state && slotStates[id] !== state) {
                 slotStates[id] = state;
                 changed = true;
             }
          } else if (payload.eventType === 'DELETE') {
             const { id } = payload.old;
             if (id && slotStates[id]) {
                 // If a slot document is deleted, treat it as 'empty'
                 delete slotStates[id]; 
                 // Or explicitly set state to empty if preferred:
                 // slotStates[id] = 'empty'; 
                 changed = true;
             }
          }
          
          // Only call callback if something relevant changed
          if (changed) {
              callback({ ...slotStates }); // Send a copy of the state map
          }
        }
      )
      .subscribe(async (status, err) => { // Made async to handle initial fetch
        if (status === 'SUBSCRIBED') {
          console.log('Realtime slots channel subscribed successfully!');
          // Fetch initial state of ALL slots on successful subscribe
          try {
              const { data: initialSlots, error: initialError } = await supabase
                  .from('slots')
                  .select('id, state');
              
              if (initialError) {
                  throw initialError;
              }
              
              // Build the initial state map
              slotStates = initialSlots.reduce((acc, slot) => {
                  acc[slot.id] = slot.state;
                  return acc;
              }, {});
              console.log('Fetched initial slot states:', Object.keys(slotStates).length);
              callback({ ...slotStates }); // Send initial states

          } catch (error) {
              console.error("Realtime slots: Error fetching initial states:", error);
              callback({}, handleSupabaseError(error, 'initial slot fetch')); // Send empty state on error
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime slots channel error:', err);
          callback({}, `Realtime Slots Error: Channel error. ${err?.message || 'See console.'}`);
        } else if (status === 'TIMED_OUT') {
          console.warn('Realtime slots connection timed out.');
          callback({}, 'Realtime Slots Error: Connection timed out.');
        } else if (status === 'CLOSED') {
          console.warn('Realtime slots connection closed.', err);
          if (err) {
            callback({}, `Realtime Slots Error: Connection closed unexpectedly. ${err?.message || 'Check console.'}`);
          }
        } else {
           console.log(`Realtime slots channel status: ${status}`, err || '');
        }
      });

    // Return an unsubscribe function
    return () => {
      console.log('Unsubscribing from realtime slots channel');
      supabase.removeChannel(channel);
    };

  } catch (error) {
    console.error("Failed to subscribe to realtime slots:", error);
    callback({}, error.message || 'Failed to subscribe to slots.');
    return () => {};
  }
}; 