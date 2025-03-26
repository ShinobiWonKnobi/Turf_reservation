import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  doc,
  runTransaction,
  limit,
  startAfter,
  onSnapshot
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA_dp3BvTURAwHOK_ySNd0FoMYtIgnhSy8",
  authDomain: "turfbook-55a7c.firebaseapp.com",
  projectId: "turfbook-55a7c",
  storageBucket: "turfbook-55a7c.firebasestorage.app",
  messagingSenderId: "37250029999",
  appId: "1:37250029999:web:15bd9b24b2d8a0cc73f75a",
  measurementId: "G-FWCVC8GWNM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Generate a booking reference number
const generateBookingRef = () => {
  const timestamp = Date.now().toString(36);
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BK-${timestamp}-${randomChars}`;
};

// Add a booking with transaction to ensure atomic operations
export const addBooking = async (bookingData) => {
  try {
    // Create a booking reference
    const bookingRef = generateBookingRef();
    
    // Use batch write for atomic operations
    const batch = writeBatch(db);
    
    // Create the booking document
    const docRef = doc(collection(db, "bookings"));
    batch.set(docRef, {
      ...bookingData,
      bookingRef,
      createdAt: serverTimestamp(),
      status: "active",
      bookingDate: new Date().toISOString(), // Keep this for compatibility
      id: docRef.id
    });
    
    // Update slot availability 
    for (const slot of bookingData.slots) {
      const slotRef = doc(db, "slots", slot.replace(/\s+/g, '_').replace(/,/g, ''));
      batch.set(slotRef, {
        slotTime: slot,
        isBooked: true,
        bookedBy: docRef.id,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    
    // Commit the batch
    await batch.commit();
    
    // Return the booking with ID
    return { 
      id: docRef.id, 
      bookingRef,
      ...bookingData
    };
  } catch (error) {
    console.error("Error adding booking: ", error);
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
};

// Get error message based on Firebase error code
const getErrorMessage = (error) => {
  switch(error.code) {
    case 'permission-denied':
      return 'You do not have permission to perform this action';
    case 'unavailable':
      return 'The service is currently unavailable. Please try again later';
    case 'not-found':
      return 'The requested resource was not found';
    case 'already-exists':
      return 'This booking already exists';
    case 'resource-exhausted':
      return 'Too many requests. Please try again later';
    default:
      return error.message || 'An unknown error occurred';
  }
};

// Get all bookings with pagination
export const getBookings = async (lastDoc = null, pageSize = 20) => {
  try {
    let bookingsQuery = query(
      collection(db, "bookings"), 
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    
    // Apply pagination if lastDoc is provided
    if (lastDoc) {
      bookingsQuery = query(
        bookingsQuery,
        startAfter(lastDoc)
      );
    }
    
    const querySnapshot = await getDocs(bookingsQuery);
    
    // Get the last visible document for pagination
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Format server timestamp if it exists
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
    }));
    
    return {
      bookings,
      lastDoc: lastVisible
    };
  } catch (error) {
    console.error("Error getting bookings: ", error);
    throw new Error(getErrorMessage(error));
  }
};

// Get bookings by phone with pagination
export const getBookingsByPhone = async (phone, lastDoc = null, pageSize = 10) => {
  try {
    if (!phone) {
      throw new Error("Phone number is required");
    }
    
    let bookingsQuery = query(
      collection(db, "bookings"),
      where("phone", "==", phone),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    
    if (lastDoc) {
      bookingsQuery = query(bookingsQuery, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(bookingsQuery);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
    }));
    
    return {
      bookings,
      lastDoc: lastVisible
    };
  } catch (error) {
    console.error("Error getting bookings by phone: ", error);
    throw new Error(getErrorMessage(error));
  }
};

// Check slot availability with retry mechanism
export const checkSlotAvailability = async (slots, retries = 3) => {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      // Run as a transaction to ensure consistency
      return await runTransaction(db, async (transaction) => {
        // Get all slot documents
        const slotRefs = slots.map(slot => 
          doc(db, "slots", slot.replace(/\s+/g, '_').replace(/,/g, ''))
        );
        
        // Get all active bookings
        const bookingsRef = collection(db, "bookings");
        const q = query(
          bookingsRef,
          where("status", "==", "active")
        );
        const querySnapshot = await getDocs(q);
        const activeBookings = querySnapshot.docs.map(doc => doc.data());
        
        // Check if any of the requested slots overlap with existing bookings
        for (const slot of slots) {
          const isBooked = activeBookings.some(booking => 
            booking.slots && booking.slots.includes(slot)
          );
          if (isBooked) {
            return false;
          }
        }
        
        // Validate maximum advance booking period (48 hours)
        const now = new Date();
        for (const slot of slots) {
          const slotDate = new Date(slot);
          const hoursDiff = (slotDate - now) / (1000 * 60 * 60);
          if (hoursDiff > 48) {
            throw new Error("Cannot book slots more than 48 hours in advance");
          }
        }
        
        // Validate maximum number of slots (4 slots per booking)
        if (slots.length > 4) {
          throw new Error("Cannot book more than 4 slots at once");
        }
        
        return true;
      });
    } catch (error) {
      console.error(`Attempt ${attempt + 1}/${retries} failed:`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === retries - 1) {
        throw new Error(getErrorMessage(error));
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      attempt++;
    }
  }
};

// Get real-time booking updates
export const getBookingsRealtime = (callback) => {
  const bookingsQuery = query(
    collection(db, "bookings"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  
  return onSnapshot(bookingsQuery, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
    }));
    
    callback(bookings);
  }, (error) => {
    console.error("Real-time booking updates error:", error);
    callback([], getErrorMessage(error));
  });
};

// Send booking notification via WhatsApp
export const sendWhatsAppNotification = (bookingData) => {
  try {
    // Format booking details
    const slots = Array.isArray(bookingData.slots) ? bookingData.slots.join(', ') : bookingData.slots;
    const message = encodeURIComponent(
      `New booking:\n` +
      `Reference: ${bookingData.bookingRef || 'N/A'}\n` +
      `Name: ${bookingData.name}\n` +
      `Phone: ${bookingData.phone}\n` +
      `Slots: ${slots}\n` +
      `Amount: ${bookingData.amount}\n` +
      `Payment: ${bookingData.paymentStatus}`
    );
    
    // Owner phone (from environment or config)
    const ownerPhone = process.env.REACT_APP_OWNER_PHONE_NUMBER || '9082910031'; 
    
    // Generate WhatsApp deep link
    const whatsappLink = `https://wa.me/${ownerPhone}?text=${message}`;
    
    // Open in new window
    window.open(whatsappLink, '_blank');
    
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return false;
  }
};

// Cancel a booking
export const cancelBooking = async (bookingId) => {
  try {
    if (!bookingId) {
      throw new Error("Booking ID is required");
    }
    
    const bookingRef = doc(db, "bookings", bookingId);
    
    await runTransaction(db, async (transaction) => {
      const bookingDoc = await transaction.get(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error("Booking not found");
      }
      
      const bookingData = bookingDoc.data();
      
      // Update booking status
      transaction.update(bookingRef, {
        status: "cancelled",
        updatedAt: serverTimestamp(),
        cancelledAt: serverTimestamp()
      });
      
      // Free up the slots
      if (bookingData.slots && Array.isArray(bookingData.slots)) {
        for (const slot of bookingData.slots) {
          const slotRef = doc(db, "slots", slot.replace(/\s+/g, '_').replace(/,/g, ''));
          transaction.update(slotRef, {
            isBooked: false,
            bookedBy: null,
            updatedAt: serverTimestamp()
          });
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw new Error(getErrorMessage(error));
  }
}; 