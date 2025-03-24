import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Header from './components/Header';
import TimeSlots from './components/TimeSlots';
import BookingForm from './components/BookingForm';

// API endpoint URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
// Owner's phone number from environment variables
const OWNER_PHONE = process.env.REACT_APP_OWNER_PHONE_NUMBER || '';

function App() {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleBookingSubmit = async (bookingData) => {
    setIsLoading(true);
    
    const newBooking = {
      ...bookingData,
      slot: selectedSlot,
      id: Date.now()
    };
    
    try {
      // Send SMS via Twilio
      const response = await fetch(`${API_URL}/api/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: OWNER_PHONE,
          message: `New Booking: Name: ${bookingData.name}, Phone: ${bookingData.phone}, Slot: ${selectedSlot}, Amount: ${bookingData.amount}, Payment Status: ${bookingData.paymentStatus}`
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send SMS notification');
      }
      
      // Add to local state
      setBookings([...bookings, newBooking]);
      setSelectedSlot(null);
      setNotification({
        show: true,
        message: 'Booking confirmed! SMS notification sent to the owner.',
        type: 'success'
      });
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 5000);
      
    } catch (error) {
      console.error('Error sending SMS:', error);
      setNotification({
        show: true,
        message: error.message || 'Failed to send SMS notification. Please try again.',
        type: 'error'
      });
      
      // Hide error notification after 5 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <Navbar />
      <Header />
      <main className="container">
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        <TimeSlots 
          onSlotSelect={handleSlotSelect} 
          selectedSlot={selectedSlot}
          bookings={bookings}
        />
        {selectedSlot && (
          <BookingForm 
            selectedSlot={selectedSlot} 
            onSubmit={handleBookingSubmit}
            onCancel={() => setSelectedSlot(null)}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}

export default App;
