import React, { useState } from 'react';

const TimeSlots = ({ onSlotSelect, bookings }) => {
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // Generate time slots with dates for next 48 hours
  const generateTimeSlots = () => {
    const slotsByDate = {};
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Generate slots for today and tomorrow
    [today, tomorrow].forEach((date) => {
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      slotsByDate[dateStr] = [];
      
      // Morning to evening slots (3:00 AM to 11:30 PM)
      for (let hour = 3; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const period = hour < 12 ? 'AM' : 'PM';
          const displayHour = hour % 12 === 0 ? 12 : hour % 12;
          const displayMin = min === 0 ? '00' : min;
          const timeStr = `${displayHour}:${displayMin} ${period}`;
          slotsByDate[dateStr].push({
            time: timeStr,
            date: dateStr,
            fullText: `${timeStr} ${dateStr}`
          });
        }
      }
    });
    
    return slotsByDate;
  };
  
  const timeSlotsByDate = generateTimeSlots();
  
  // Check if slot is booked
  const isSlotBooked = (slot) => {
    return bookings.some(booking => 
      booking.status === 'active' && 
      booking.slots.includes(slot.fullText)
    );
  };

  // Handle slot selection
  const handleSlotClick = (slot) => {
    if (isSlotBooked(slot)) return;
    
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.fullText === slot.fullText);
      if (isSelected) {
        return prev.filter(s => s.fullText !== slot.fullText);
      } else {
        if (prev.length >= 4) {
          alert('You can only select up to 4 slots at once');
          return prev;
        }
        return [...prev, slot];
      }
    });
  };

  // Render individual time slot
  const renderTimeSlot = (slot) => {
    const isSelected = selectedSlots.some(s => s.fullText === slot.fullText);
    const booked = isSlotBooked(slot);
    
    return (
      <button
        key={slot.fullText}
        className={`time-slot ${booked ? 'booked' : isSelected ? 'selected' : 'available'}`}
        onClick={() => handleSlotClick(slot)}
        disabled={booked}
        aria-pressed={isSelected}
        aria-label={`${slot.time} ${slot.date} ${booked ? 'Booked' : isSelected ? 'Selected' : 'Available'}`}
        role="checkbox"
      >
        <div className="time-slot-time">{slot.time}</div>
      </button>
    );
  };

  // Render slots for a specific date
  const renderDateSlots = (date, slots) => {
    return (
      <div key={date} className="date-slots-section">
        <h3 className="date-header">{date}</h3>
        <div className="time-slots-grid">
          {slots.map(slot => renderTimeSlot(slot))}
        </div>
      </div>
    );
  };

  // Update parent component when selections change
  React.useEffect(() => {
    onSlotSelect(selectedSlots.map(slot => slot.fullText));
  }, [selectedSlots, onSlotSelect]);

  return (
    <div className="time-slots-container">
      <div className="time-slots-header">
        <h2>Available Slots</h2>
      </div>
      {Object.entries(timeSlotsByDate).map(([date, slots]) => 
        renderDateSlots(date, slots)
      )}
      <div className="time-slots-footer">
        <h2>Taken Slots</h2>
      </div>
    </div>
  );
};

export default TimeSlots; 