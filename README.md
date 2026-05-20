# Social Media Backend

A comprehensive Node.js/Express backend for a social media platform with features including posts, stories, messaging, notifications, and more.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with bcryptjs password hashing
- **User Management**: Profile management, friend requests, and user relationships
- **Posts & Content**: Create, edit, delete, and share posts with likes and comments
- **Stories**: Time-limited stories with highlights functionality
- **Messaging**: Real-time messaging and conversation management with Socket.io
- **Notifications**: Real-time push notifications
- **Drafts**: Save and manage draft posts
- **Media Management**: Image compression and optimization with Cloudinary integration
- **Search**: Search for users and content
- **Scheduled Posts**: Publish posts at scheduled times using cron jobs
- **Real-time Updates**: Socket.io integration for live updates

## 📋 Prerequisites

- Node.js v16 or higher
- MongoDB database
- Cloudinary account (for media storage)
- Email service credentials (Nodemailer/Resend)

## 🛠️ Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email_address
EMAIL_PASSWORD=your_email_password
NODE_ENV=development
```

## 📁 Project Structure

```
backend/
├── config/              # Configuration files
│   ├── cloudinary.js    # Cloudinary setup
│   └── db.js            # MongoDB connection
├── controllers/         # Route controllers
│   ├── authController.js
│   ├── postControllers.js
│   ├── messageController.js
│   ├── Notificationcontroller.js
│   └── ...
├── models/              # MongoDB schemas
│   ├── user.js
│   ├── post.js
│   ├── Message.js
│   ├── Notification.js
│   └── ...
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── postRoutes.js
│   ├── message.js
│   └── ...
├── middlewares/         # Custom middleware
│   ├── authmiddleware.js
│   ├── upload.js
│   ├── uploadWithCompression.js
│   └── ...
├── socket/              # Socket.io handlers
│   ├── index.js
│   └── handlers/
├── utils/               # Utility functions
├── scripts/             # Database/migration scripts
│   ├── migrateToCloudinary.js
│   ├── checkAvatars.js
│   └── ...
├── uploads/             # Local file uploads (for development)
├── server.js            # Main application file
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Request password reset

### Posts
- `GET /api/posts` - Get feed posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like post
- `POST /api/posts/:id/comment` - Add comment

### Stories
- `GET /api/stories` - Get user stories
- `POST /api/stories` - Create new story
- `DELETE /api/stories/:id` - Delete story
- `POST /api/highlights` - Create highlight

### Messages
- `GET /api/messages` - Get conversations
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages` - Send message
- `POST /api/conversations` - Create conversation

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

### Drafts
- `GET /api/drafts` - Get user drafts
- `POST /api/drafts` - Create draft
- `PUT /api/drafts/:id` - Update draft
- `DELETE /api/drafts/:id` - Delete draft

### Search
- `GET /api/search?q=query` - Search users and posts

## 🚀 Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 5000)

## 📦 Dependencies

### Core
- **express** - Web framework
- **mongoose** - MongoDB ODM

### Authentication & Security
- **jsonwebtoken** - JWT token generation
- **bcryptjs** - Password hashing
- **cookie-parser** - Cookie handling

### File & Media Management
- **multer** - File upload handling
- **sharp** - Image processing and compression
- **cloudinary** - Cloud media storage
- **canvas** - Image generation
- **fluent-ffmpeg** - Video processing

### Real-time Communication
- **socket.io** - WebSocket library
- **nodemailer** - Email sending
- **resend** - Email API

### Utilities
- **dotenv** - Environment variables
- **cors** - Cross-Origin Resource Sharing
- **compression** - Response compression
- **node-cron** - Task scheduling
- **bad-words** - Content filtering

## 🔧 Scripts

Located in the `scripts/` directory:
- `migrateToCloudinary.js` - Migrate files to Cloudinary
- `checkAvatars.js` - Check avatar integrity
- `fixOldMediaPaths.js` - Fix old media paths
- `recoverMedia.js` - Recover media files
- `diagnose.js` - Diagnose system issues

Run scripts with:
```bash
node scripts/scriptName.js
```

## 🔌 Socket.io Events

The backend uses Socket.io for real-time updates. Event handlers are located in `socket/handlers/`.

Common events:
- `user-online` - User comes online
- `message` - New message sent
- `notification` - New notification
- `post-like` - Post liked
- `typing` - User typing indicator

## 📝 Models

Key database models:
- **User** - User profile and authentication
- **Post** - User posts with media
- **Comment** - Post comments
- **Like** - Post/comment likes
- **Message** - Direct messages
- **Conversation** - Message conversations
- **Story** - User stories (24-hour content)
- **Highlight** - Story highlights
- **Notification** - User notifications
- **Draft** - Unpublished post drafts
- **ScheduledPost** - Posts scheduled for future publishing

## 🎯 Key Features Implementation

### Cloudinary Integration
Images and videos are stored on Cloudinary for scalability and CDN delivery.

### Real-time Messaging
Socket.io enables real-time messaging with instant notifications.

### Scheduled Posts
Uses node-cron to publish posts at scheduled times automatically.

### Story Cleanup
Automatic cleanup job removes expired stories after 24 hours.

### Image Compression
Sharp library compresses images while maintaining quality.

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure MongoDB is running
- Verify MONGODB_URI in `.env`
- Check network connectivity

### File Upload Issues
- Verify Cloudinary credentials
- Check file size limits
- Ensure proper MIME types

### Socket.io Connection Issues
- Check CORS settings
- Verify Socket.io version compatibility
- Review server logs

## 📄 License

ISC

## 👥 Support

For issues and questions, contact the development team.
