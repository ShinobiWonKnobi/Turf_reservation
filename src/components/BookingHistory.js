import React, { useState, useEffect } from 'react';
// Removed getBookingsByPhone import if App.js handles data loading
// import { getBookingsByPhone } from '../services/supabase'; 

const BookingHistory = ({ 
  bookings, // Receive bookings directly from App.js
  onCancelBooking,
  loadMoreBookings, // Receive loadMore function from App.js
  hasMoreBookings,
  isLoading
}) => {
  const [searchPhone, setSearchPhone] = useState('');
  // Local state for search results if filtering client-side
  const [filteredBookings, setFilteredBookings] = useState([]); 

  // Filter bookings when searchPhone or bookings prop changes
  useEffect(() => {
    if (searchPhone) {
      setFilteredBookings(
        bookings.filter(booking => booking.phone.includes(searchPhone))
      );
    } else {
      setFilteredBookings(bookings); // Show all if no search term
    }
  }, [searchPhone, bookings]);

  const handleSearchChange = (e) => {
    setSearchPhone(e.target.value);
  };

  // Removed handleSearchSubmit as filtering is now client-side based on App.js data
  // const handleSearchSubmit = async (e) => { ... };

  // Removed pagination logic as it's handled by App.js via loadMoreBookings prop
  // const [localLastCreatedAt, setLocalLastCreatedAt] = useState(null);
  // const [localHasMore, setLocalHasMore] = useState(true);
  // const loadMore = async () => { ... }; 

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="booking-history">
      <h2>Booking History</h2>
      
      {/* Search form (client-side filtering) */}
      <form className="search-form" onSubmit={(e) => e.preventDefault()}> 
        <div className="form-group">
          <label htmlFor="searchPhone">Search by Phone</label>
          <input
            type="tel"
            id="searchPhone"
            name="searchPhone"
            value={searchPhone}
            onChange={handleSearchChange}
            placeholder="Enter 10-digit phone number"
            maxLength="10"
            disabled={isLoading} // Disable while loading more
          />
        </div>
        {/* Removed search button as filtering is live */}
        {/* <button type="submit" className="search-btn" disabled={isLoading}>Search</button> */}
      </form>

      {/* Loading state indicator */}
      {isLoading && !filteredBookings.length && (
         <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading bookings...</p>
         </div>
      )}
      
      {/* Bookings list */}
      {!isLoading && !filteredBookings.length && (
         <p>No bookings found{searchPhone ? ' for this phone number' : ''}.</p>
      )}
      
      <div className="bookings-list">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className={`booking-card ${booking.status}`}>
            <div className="booking-header">
              <div className="booking-info">
                 <span className="booking-name">{booking.name}</span>
                 <span className="booking-ref">Ref: {booking.bookingRef || 'N/A'}</span>
              </div>
              <span className="booking-date">Booked: {formatDate(booking.created_at)}</span>
            </div>
            <div className="booking-details">
              <p><strong>Phone:</strong> {booking.phone}</p>
              <p><strong>Slots:</strong> {Array.isArray(booking.slots) ? booking.slots.join(', ') : 'N/A'}</p>
              <p><strong>Type:</strong> {booking.bookingType || 'N/A'}</p> 
              <p><strong>Amount:</strong> {booking.amount ? `$${booking.amount}` : 'N/A'}</p>
              <p><strong>Payment:</strong> {booking.paymentStatus}</p>
              <div className="booking-status">
                <strong>Status:</strong> 
                <span className={`status-badge ${booking.status}`}>{booking.status}</span>
              </div>
            </div>
            {booking.status === 'active' && (
              <div className="booking-actions">
                <button 
                  onClick={() => onCancelBooking(booking.id)}
                  className="cancel-booking-btn"
                  disabled={isLoading}
                >
                  Cancel Booking
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More button - uses function from App.js */}
      {hasMoreBookings && !searchPhone && ( // Only show load more if not searching
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
    </div>
  );
};

export default BookingHistory; 