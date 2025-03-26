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
  cancelBooking
} from './services/firebase';

// API endpoint URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// Owner's phone number from environment variables
const OWNER_PHONE = process.env.REACT_APP_OWNER_PHONE_NUMBER || '';

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
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMoreBookings, setHasMoreBookings] = useState(true);
  
  // Fetch existing bookings on component mount
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoadingBookings(true);
      try {
        const result = await getBookings();
        setBookings(result.bookings);
        setLastDoc(result.lastDoc);
        setHasMoreBookings(result.bookings.length === 20); // If we got a full page, there are probably more
      } catch (error) {
        console.error('Error fetching bookings:', error);
        showNotification('Failed to load bookings. Please refresh the page.', 'error');
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchBookings();
    
    // Set up real-time updates
    const unsubscribe = getBookingsRealtime((updatedBookings, error) => {
      if (error) {
        console.error('Realtime update error:', error);
        return;
      }
      setBookings(updatedBookings);
    });
    
    return () => {
      // Cleanup real-time listener
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  // Load more bookings
  const loadMoreBookings = async () => {
    if (!lastDoc || !hasMoreBookings) return;
    
    setIsLoading(true);
    try {
      const result = await getBookings(lastDoc);
      setBookings(prev => [...prev, ...result.bookings]);
      setLastDoc(result.lastDoc);
      setHasMoreBookings(result.bookings.length === 20);
    } catch (error) {
      console.error('Error loading more bookings:', error);
      showNotification('Failed to load more bookings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  const handleSlotSelect = (slots) => {
    setSelectedSlots(slots);
  };
  
  // Show notification helper
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  }, []);
  
  // Handle form submission - step 1: validate and show confirmation
  const handleBookingFormSubmit = (formData) => {
    setBookingFormData(formData);
    setShowConfirmation(true);
  };
  
  // Handle booking confirmation - step 2: process the booking
  const handleBookingConfirm = async () => {
    if (!bookingFormData) return;
    
    setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 3;
    
    const processBooking = async () => {
      try {
        // Check slot availability
        const isAvailable = await checkSlotAvailability(selectedSlots);
        if (!isAvailable) {
          throw new Error('One or more selected slots are no longer available');
        }

        // Create booking
        const newBooking = await addBooking({
          ...bookingFormData,
          slots: selectedSlots,
          bookingDate: new Date().toISOString()
        });
        
        // Send notification via WhatsApp
        sendWhatsAppNotification(newBooking);
        
        // Update UI
        setBookings(prev => [newBooking, ...prev]);
        setSelectedSlots([]);
        setBookingFormData(null);
        
        showNotification('Booking confirmed successfully! Opening WhatsApp to notify the owner.', 'success');
        
        return true;
      } catch (error) {
        console.error('Error processing booking:', error);
        retryCount++;
        
        if (retryCount < maxRetries && 
            (error.message.includes('unavailable') || error.message.includes('network'))) {
          console.log(`Retrying booking (${retryCount}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
          return processBooking();
        }
        
        showNotification(error.message || 'Failed to process booking. Please try again.', 'error');
        return false;
      }
    };
    
    const success = await processBooking();
    
    if (success) {
      setShowConfirmation(false);
    }
    
    setIsLoading(false);
  };
  
  // Handle booking cancellation
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await cancelBooking(bookingId);
      
      // Update the local state
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' } 
            : booking
        )
      );
      
      showNotification('Booking cancelled successfully', 'success');
    } catch (error) {
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
          <BookingHistory onCancelBooking={handleCancelBooking} />
        ) : (
          <>
            {isLoadingBookings ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading available slots...</p>
              </div>
            ) : (
              <TimeSlots 
                onSlotSelect={handleSlotSelect} 
                bookings={bookings}
              />
            )}
            {selectedSlots.length > 0 && (
              <BookingForm 
                selectedSlot={selectedSlots.join(', ')} 
                onSubmit={handleBookingFormSubmit}
                onCancel={() => setSelectedSlots([])}
                isLoading={isLoading}
              />
            )}
          </>
        )}
        
        {/* Confirmation Dialog */}
        {showConfirmation && bookingFormData && (
          <ConfirmationDialog 
            bookingData={{
              ...bookingFormData,
              slots: selectedSlots
            }}
            onConfirm={handleBookingConfirm}
            onCancel={() => setShowConfirmation(false)}
            isLoading={isLoading}
          />
        )}
        
        {/* "Load More" button for booking history */}
        {showHistory && hasMoreBookings && (
          <div className="load-more-container">
            <button 
              onClick={loadMoreBookings} 
              disabled={isLoading}
              className="load-more-btn"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
