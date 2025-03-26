import React from 'react';

function ConfirmationDialog({ bookingData, onConfirm, onCancel, isLoading }) {
  if (!bookingData) return null;

  // Format the date and time for display
  const formatSlots = (slots) => {
    return Array.isArray(slots) ? slots.join(', ') : slots;
  };

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        <h3>Confirm Booking</h3>
        
        <div className="booking-details">
          <p><strong>Name:</strong> {bookingData.name}</p>
          <p><strong>Phone:</strong> {bookingData.phone}</p>
          <p><strong>Time Slots:</strong> {formatSlots(bookingData.slots)}</p>
          {bookingData.notes && <p><strong>Notes:</strong> {bookingData.notes}</p>}
        </div>
        
        <p>Are you sure you want to confirm this booking?</p>
        
        <div className="confirmation-buttons">
          <button 
            className="cancel-button" 
            onClick={onCancel} 
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="confirm-button" 
            onClick={onConfirm} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog; 