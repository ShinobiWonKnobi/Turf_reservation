import React, { useState } from 'react';

// Receive calculatedAmount, bookingType, onBookingTypeChange props
const BookingForm = ({ 
    selectedSlot, 
    onSubmit, 
    onCancel, 
    isLoading, 
    bookingType, 
    onBookingTypeChange, 
    calculatedAmount 
}) => {
  // Remove amount and bookingType from internal state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    paymentStatus: 'Pending'
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }
    
    // Phone validation - should be numbers only
    if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Use the callback for booking type changes
    if (name === 'bookingType') {
      onBookingTypeChange(value); 
    } else {
      // Handle other form fields
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }

    // Clear error when user starts typing/changing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit only the data managed by this form
      onSubmit({ 
        name: formData.name,
        phone: formData.phone,
        paymentStatus: formData.paymentStatus
      });
    }
  };

  return (
    <div className="booking-form-container">
      <h2>Book Slot(s): {selectedSlot}</h2>
      <form onSubmit={handleSubmit} className="booking-form" noValidate>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isLoading}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && <div className="error-message" id="name-error" role="alert">{errors.name}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            disabled={isLoading}
            pattern="[0-9]{10}"
            maxLength="10"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <div className="error-message" id="phone-error" role="alert">{errors.phone}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={calculatedAmount}
            required
            readOnly
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label>Booking Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="bookingType"
                value="5v5"
                checked={bookingType === '5v5'}
                onChange={handleChange}
                disabled={isLoading}
              />
              5v5 (Half Ground) - ₹{BASE_PRICE_5V5}/slot
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="bookingType"
                value="7v7"
                checked={bookingType === '7v7'}
                onChange={handleChange}
                disabled={isLoading}
              />
              7v7 (Full Ground) - ₹{BASE_PRICE_7V7}/slot
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="paymentStatus">Payment Status</label>
          <select
            id="paymentStatus"
            name="paymentStatus"
            value={formData.paymentStatus}
            onChange={handleChange}
            required
            disabled={isLoading}
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Define BASE_PRICE constants here too for display in labels
const BASE_PRICE_5V5 = parseInt(process.env.REACT_APP_PRICE_5V5 || '500', 10);
const BASE_PRICE_7V7 = parseInt(process.env.REACT_APP_PRICE_7V7 || '1000', 10);

export default BookingForm; 