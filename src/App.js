import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Header from './components/Header';
import TimeSlots from './components/TimeSlots';
import BookingForm from './components/BookingForm';
import BookingHistory from './components/BookingHistory';
import ConfirmationDialog from './components/ConfirmationDialog';
import { 
  addBooking, 
  getBookings, 
  getBookingsRealtime,
  checkSlotAvailability, 
  sendWhatsAppNotification,
  cancelBooking,
  getSlotStatesRealtime
} from './services/supabase';

// API endpoint URL - No longer needed for direct DB access?
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// Owner's phone number from environment variables
const OWNER_PHONE = process.env.REACT_APP_OWNER_PHONE_NUMBER || '';

// Read base prices from env with defaults
const BASE_PRICE_5V5 = parseInt(process.env.REACT_APP_PRICE_5V5 || '500', 10);
const BASE_PRICE_7V7 = parseInt(process.env.REACT_APP_PRICE_7V7 || '1000', 10);

function App() {
  // Initialize dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const [bookings, setBookings] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookingFormData, setBookingFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Pagination state adjusted for Supabase (using last item's timestamp)
  const [lastCreatedAt, setLastCreatedAt] = useState(null);
  const [hasMoreBookings, setHasMoreBookings] = useState(true);
  const [slotStates, setSlotStates] = useState({}); // New state for { slotId: state }
  const [isLoadingSlots, setIsLoadingSlots] = useState(true); // Loading state for slots
  const [bookingType, setBookingType] = useState('5v5'); // Lift state up
  const [calculatedAmount, setCalculatedAmount] = useState(0); // New state for amount
  
  // Fetch existing bookings on component mount
  useEffect(() => {
    // Flag to indicate initial loading complete for both sources
    let bookingsLoaded = false;
    let slotsLoaded = false;

    const checkLoadingComplete = () => {
        if (bookingsLoaded && slotsLoaded) {
            setIsLoadingBookings(false); // Reuse this state for overall initial load
            setIsLoadingSlots(false); // Explicitly track slot loading too
        }
    };

    // 1. Realtime Bookings Subscription
    const bookingsUnsubscribe = getBookingsRealtime((updatedBookings, error) => {
      if (error) {
        console.error('Realtime Bookings Error:', error);
        showNotification(`Realtime Bookings Error: ${error}`, 'error'); 
        bookingsLoaded = true; // Mark as loaded even on error to potentially unblock UI
      } else {
        setBookings(updatedBookings);
        bookingsLoaded = true;
      }
      checkLoadingComplete();
    });

    // 2. Realtime Slot States Subscription
    const slotsUnsubscribe = getSlotStatesRealtime((updatedSlotStates, error) => {
       if (error) {
         console.error('Realtime Slots Error:', error);
         showNotification(`Realtime Slots Error: ${error}`, 'error');
         slotsLoaded = true; // Mark as loaded on error
       } else {
         setSlotStates(updatedSlotStates);
         slotsLoaded = true;
       }
       checkLoadingComplete();
    });
    
    // Cleanup function
    return () => {
      console.log("Cleaning up realtime subscriptions.");
      if (bookingsUnsubscribe) bookingsUnsubscribe();
      if (slotsUnsubscribe) slotsUnsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // showNotification removed previously
  
  // useEffect to calculate amount when slots or type change
  useEffect(() => {
    const numberOfSlots = selectedSlots.length;
    if (numberOfSlots === 0) {
      setCalculatedAmount(0);
      return;
    }
    const basePrice = bookingType === '5v5' ? BASE_PRICE_5V5 : BASE_PRICE_7V7;
    setCalculatedAmount(basePrice * numberOfSlots);
  }, [selectedSlots, bookingType]);
  
  // Load more bookings using Supabase pagination
  const loadMoreBookings = async () => {
    if (!lastCreatedAt || !hasMoreBookings) return; // Use lastCreatedAt
    
    setIsLoading(true);
    try {
      // Pass the lastCreatedAt timestamp for pagination
      const result = await getBookings(20, lastCreatedAt); 
      setBookings(prev => [...prev, ...result.bookings]);
      setLastCreatedAt(result.lastCreatedAt);
      setHasMoreBookings(!!result.lastCreatedAt);
    } catch (error) {
      console.error('Error loading more bookings:', error);
      showNotification(error.message || 'Failed to load more bookings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  // Wrap handleSlotSelect in useCallback to stabilize its reference
  const handleSlotSelect = useCallback((slots) => {
    setSelectedSlots(slots);
  }, []); // Empty dependency array means the function reference never changes
  
  // Show notification helper
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  }, []);
  
  // Handle form submission - step 1: receives formData WITHOUT amount/bookingType
  const handleBookingFormSubmit = (formData) => {
    // Combine form data with state data before showing confirmation
    setBookingFormData({
        ...formData, // name, phone, paymentStatus
        bookingType: bookingType, // Add from state
        amount: calculatedAmount // Add from state
    }); 
    setShowConfirmation(true);
  };
  
  // Handle booking confirmation - step 2: uses bookingFormData which now includes type/amount
  const handleBookingConfirm = async () => {
    if (!bookingFormData) return;
    
    setIsLoading(true);
    // Destructure needed data from bookingFormData
    const { name, phone, paymentStatus, bookingType: typeFromData, amount: amountFromData, ...rest } = bookingFormData; 
    
    try {
      // Check availability with typeFromData
      const isAvailable = await checkSlotAvailability(selectedSlots, typeFromData);
      if (!isAvailable) {
         // ... (error handling as before) ...
         throw new Error('Slots no longer available...'); // Simplified
      }

      // Create payload using data from bookingFormData
      const newBookingPayload = {
        name: name,
        phone: phone,
        amount: amountFromData,
        paymentStatus: paymentStatus,
        slots: selectedSlots,
        bookingType: typeFromData, 
      };

      // Call RPC
      const newBooking = await addBooking(newBookingPayload);
      
      // Send notification 
      sendWhatsAppNotification(newBooking); 
      
      // Update UI
      setBookings(prev => [newBooking, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setSelectedSlots([]);
      setBookingFormData(null);
      setBookingType('5v5'); // Reset booking type selection
      setShowConfirmation(false); 
      
      showNotification('Booking confirmed...', 'success'); // Simplified
      
    } catch (error) { 
      console.error('Error processing booking:', error);
      showNotification(error.message || 'Failed to process booking.', 'error');
    } finally {
       setIsLoading(false); 
    }
  };
  
  // Handle booking cancellation using Supabase (NON-ATOMIC)
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Call the non-atomic Supabase cancelBooking function
      await cancelBooking(bookingId);
      
      // Update the local state - Realtime should handle this eventually too
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        )
      );
      
      showNotification('Booking cancelled successfully (Note: Client-side update, may take a moment to fully sync)', 'success');
    } catch (error) { // Catch errors from cancelBooking
      console.error('Error cancelling booking:', error);
      showNotification(error.message || 'Failed to cancel booking', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <Navbar onToggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      <Header />
      <main className="container">
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        <div className="view-toggle">
          <button 
            className={!showHistory ? 'active' : ''} 
            onClick={() => setShowHistory(false)}
          >
            Book Slots
          </button>
          <button 
            className={showHistory ? 'active' : ''} 
            onClick={() => setShowHistory(true)}
          >
            View History
          </button>
        </div>

        {showHistory ? (
          // Pass bookings and potentially loadMore function to BookingHistory if needed
          <BookingHistory 
             bookings={bookings} 
             onCancelBooking={handleCancelBooking} 
             loadMoreBookings={loadMoreBookings}
             hasMoreBookings={hasMoreBookings}
             isLoading={isLoading}
          />
        ) : (
          <>
            {isLoadingBookings || isLoadingSlots ? ( // Check both loading states
              <div className="loading-spinner">
                <div className="spinner"></div>
                {/* More generic loading message */}
                <p>Loading schedule...</p> 
              </div>
            ) : (
              <TimeSlots 
                onSlotSelect={handleSlotSelect} 
                // Remove bookings prop if not needed by TimeSlots directly anymore
                // bookings={bookings} 
                slotStates={slotStates} // Pass the slot states down
              />
            )}
            {selectedSlots.length > 0 && (
              <BookingForm 
                selectedSlot={selectedSlots.join(', ')} 
                onSubmit={handleBookingFormSubmit}
                onCancel={() => {
                    setSelectedSlots([]);
                    setBookingType('5v5'); // Reset type on cancel too
                }}
                isLoading={isLoading}
                // Pass state and handler down
                bookingType={bookingType}
                onBookingTypeChange={setBookingType}
                calculatedAmount={calculatedAmount}
              />
            )}
          </>
        )}
        
        {/* Confirmation Dialog */}
        {showConfirmation && bookingFormData && (
          <ConfirmationDialog 
            bookingData={{ ...bookingFormData, slots: selectedSlots }}
            onConfirm={handleBookingConfirm}
            onCancel={() => setShowConfirmation(false)}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}

export default App;
