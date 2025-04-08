import React, { useState, useEffect } from 'react';

const TimeSlots = ({ onSlotSelect, slotStates }) => {
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // Generate time slots with dates for next 48 hours
  const generateTimeSlots = () => {
    const slotsByDate = {};
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    [today, tomorrow].forEach((date) => {
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      slotsByDate[dateStr] = [];
      
      for (let hour = 3; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 30) {
          const period = hour < 12 ? 'AM' : 'PM';
          const displayHour = hour % 12 === 0 ? 12 : hour % 12;
          const displayMin = min === 0 ? '00' : min;
          const timeStr = `${displayHour}:${displayMin} ${period}`;
          // Generate the slot ID consistent with backend format
          const slotId = `${timeStr} ${dateStr}`.replace(/\s+/g, '_').replace(/,/g, ''); 
          slotsByDate[dateStr].push({
            id: slotId, // Store the ID
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
  
  // Get slot state based on the passed-in slotStates map
  const getSlotState = (slot) => {
    return slotStates[slot.id] || 'empty'; // Default to 'empty' if not found
  };

  // Handle slot selection
  const handleSlotClick = (slot) => {
    const state = getSlotState(slot);
    if (state === 'full') return; // Cannot select full slots
    
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.id === slot.id);
      if (isSelected) {
        return prev.filter(s => s.id !== slot.id);
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
    const isSelected = selectedSlots.some(s => s.id === slot.id);
    const state = getSlotState(slot);
    if (state !== 'empty') { // Log only non-empty states to reduce noise
        console.log(`Rendering Slot ID: ${slot.id}, State: ${state}`);
    }
    const isDisabled = state === 'full';
    
    // Determine CSS class based on state
    let className = 'time-slot ';
    if (isDisabled) {
      className += 'full-booked'; // Use a distinct class for full
    } else if (state === 'half') {
      className += 'half-booked'; // New class for half state
    } else {
      className += 'available'; // Default is available (empty state)
    }
    if (isSelected) {
        className += ' selected';
    }

    return (
      <button
        key={slot.id}
        className={className}
        onClick={() => handleSlotClick(slot)}
        disabled={isDisabled}
        aria-pressed={isSelected}
        aria-label={`${slot.time} ${slot.date} ${isDisabled ? 'Fully Booked' : state === 'half' ? 'Partially Booked' : isSelected ? 'Selected' : 'Available'}`}
        // Removed role="checkbox" as it's more complex now
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
  useEffect(() => {
    // Pass the fullText representation for compatibility with booking logic
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