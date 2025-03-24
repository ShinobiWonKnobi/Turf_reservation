import React from 'react';

const TimeSlots = ({ onSlotSelect, selectedSlot, bookings }) => {
  // First row: Morning slots
  const firstRowSlots = [
    '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM'
  ];

  // Second row: Afternoon and evening slots
  const secondRowSlots = [
    '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM',
    '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
    '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
    '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  // Third row: Late night slots (shown in 24-hour format)
  const thirdRowSlots = [
    '23:30 PM', '24:00 AM', '24:30 AM', '25:00 AM', '25:30 AM', '26:00 AM', '26:30 AM'
  ];

  const isSlotBooked = (slot) => {
    return bookings.some(booking => booking.slot === slot);
  };

  const handleSlotClick = (slot) => {
    if (!isSlotBooked(slot)) {
      onSlotSelect(slot);
    }
  };

  const renderTimeSlot = (slot) => {
    const isBooked = isSlotBooked(slot);
    const isSelected = selectedSlot === slot;
    
    const slotClass = `time-slot ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`;
    
    return (
      <button
        key={slot}
        className={slotClass}
        onClick={() => handleSlotClick(slot)}
        disabled={isBooked}
      >
        {slot}
      </button>
    );
  };

  return (
    <div className="time-slots-container">
      <h2>Select a Time Slot</h2>
      <div className="time-slots-grid">
        {firstRowSlots.map(renderTimeSlot)}
      </div>
      <div className="time-slots-grid">
        {secondRowSlots.map(renderTimeSlot)}
      </div>
      <div className="time-slots-grid">
        {thirdRowSlots.map(renderTimeSlot)}
      </div>
    </div>
  );
};

export default TimeSlots; 