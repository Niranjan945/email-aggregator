 
# OneBox Email Aggregator

A real-time email aggregation system built with React and Node.js featuring WebSocket integration, AI categorization, and Slack notifications.

## 🚀 Features

- **Real-time Email Sync** - WebSocket-based live updates
- **AI Categorization** - Automatic email classification
- **Search Integration** - Fast email search capabilities
- **Slack Notifications** - Important email alerts
- **Professional UI** - Gmail-inspired interface
- **Mobile Responsive** - Works on all devices

## 📁 Project Structure

email-aggregator/
├── backend/ # Node.js + Express server
├── frontend/ # React application
└── README.md


## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Backend Setup
cd backend
npm install
copy .env.example .env
npm run setup
npm start


### Frontend Setup

## 🔧 Environment Variables

Create `.env` file in backend directory:
MONGODB_URI=your_mongodb_connection_string
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password
SLACK_WEBHOOK_URL=your_slack_webhook_url


## 🌟 Tech Stack

**Backend:**
- Node.js & Express
- MongoDB & Mongoose
- Socket.IO (WebSocket)

**Frontend:**
- React 18
- Socket.IO Client
- Axios
- SCSS Styling

## 📧 Features Overview

- 📨 Real-time Email Fetching
- 🤖 AI-powered Categorization
- 🔍 Advanced Search
- 📱 Responsive Design
- 🔔 Live Notifications
- ⚡ WebSocket Integration

## 👨‍💻 Author

Developed by Niranjan for showcasing full-stack development skills.

## 📝 License

MIT License
