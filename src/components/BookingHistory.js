import React, { useState } from 'react';
import { getBookingsByPhone } from '../services/firebase';

const BookingHistory = ({ onCancelBooking }) => {
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    setError(null);
    setBookings([]);
    setLastDoc(null);
    
    try {
      const result = await getBookingsByPhone(phone);
      setBookings(result.bookings);
      setLastDoc(result.lastDoc);
      setHasMore(result.bookings.length === 10);
      
      if (result.bookings.length === 0) {
        setError('No bookings found for this phone number');
      }
    } catch (error) {
      setError('Failed to fetch booking history');
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMoreBookings = async () => {
    if (!phone || !lastDoc || loading) return;
    
    setLoading(true);
    try {
      const result = await getBookingsByPhone(phone, lastDoc);
      setBookings(prev => [...prev, ...result.bookings]);
      setLastDoc(result.lastDoc);
      setHasMore(result.bookings.length === 10);
    } catch (error) {
      console.error('Error loading more bookings:', error);
      setError('Failed to load more bookings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return as is if invalid date
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const canCancelBooking = (booking) => {
    if (!booking || booking.status === 'cancelled') return false;
    
    // Can only cancel active bookings
    return booking.status === 'active';
  };

  return (
    <div className="booking-history">
      <h2>Check Booking History</h2>
      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label htmlFor="phone">Enter Phone Number</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            pattern="[0-9]{10}"
            maxLength="10"
            placeholder="10-digit phone number"
            required
          />
        </div>
        <button type="submit" className="search-btn" disabled={loading}>
          {loading && !bookings.length ? (
            <>
              <span className="spinner-small"></span>
              Searching...
            </>
          ) : 'Search'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {bookings.length > 0 && (
        <div className="bookings-list">
          <h3>Booking History</h3>
          {bookings.map((booking) => (
            <div key={booking.id} className={`booking-card ${booking.status === 'cancelled' ? 'cancelled' : ''}`}>
              <div className="booking-header">
                <div className="booking-info">
                  <span className="booking-name">{booking.name}</span>
                  <span className="booking-ref">{booking.bookingRef || ''}</span>
                </div>
                <span className="booking-date">{formatDate(booking.createdAt)}</span>
              </div>
              <div className="booking-details">
                <div>Slots: {Array.isArray(booking.slots) ? booking.slots.join(', ') : booking.slots}</div>
                <div>Amount: ₹{booking.amount}</div>
                <div className="booking-status">
                  Status: 
                  <span className={`status-badge ${booking.status || 'active'}`}>
                    {booking.status || 'Active'}
                  </span>
                </div>
              </div>
              {canCancelBooking(booking) && (
                <div className="booking-actions">
                  <button 
                    className="cancel-booking-btn" 
                    onClick={() => onCancelBooking(booking.id)}
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {hasMore && (
            <button 
              className="load-more-btn" 
              onClick={loadMoreBookings} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Loading...
                </>
              ) : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingHistory; 