# Turf Booking Website

A minimalistic turf booking application that allows users to select time slots and make bookings. The application sends SMS notifications to the turf owner when a booking is made using Twilio.

## Features

- View and select available time slots
- Enter booking details (name, phone, amount, payment status)
- Send SMS notifications to turf owner via Twilio
- Simple and minimalistic design

## Prerequisites

- Node.js and npm installed
- Twilio account for SMS notifications

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   # Twilio Credentials
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   
   # Owner's phone number to receive SMS notifications
   REACT_APP_OWNER_PHONE_NUMBER=owner_phone_number
   
   # Server port
   PORT=5000
   ```
4. Replace the placeholder values with your actual Twilio credentials and phone numbers

## Running the Application

To run both the client and server concurrently:

```
npm run dev
```

To run only the client:

```
npm start
```

To run only the server:

```
npm run server
```

## How to Use

1. Open the application in your web browser
2. Select an available time slot
3. Fill in your booking details
4. Click "Confirm Booking"
5. The turf owner will receive an SMS notification with your booking details

## Configuration

You can modify the time slots in the `TimeSlots.js` component to match your turf's available hours.

## License

MIT
