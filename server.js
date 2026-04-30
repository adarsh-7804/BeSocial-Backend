const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const draftRoutes = require('./routes/draftRoutes');
const jobScheduleRoutes = require("./routes/scheduledPostRoutes");
const notificationRoutes = require('./routes/Notificationroutes')
const savedPostRoutes = require("./routes/savedPostRoutes");
const notInterested = require("./routes/notInterested")
const storyRoutes = require('./routes/storyRoutes');
const highlightRoutes = require('./routes/highlightRoutes');
const Post = require('./models/post');
const path = require('path')

const connectDB = require('./config/db');
const dotenv = require('dotenv');
const multer = require('multer'); // Added missing import

// Import the cron job initializers
const { initScheduledPostJob } = require("./utils/schedulePublisher");
const { initStoryCleanupJob } = require("./utils/storyCleanup");

dotenv.config();
// connectDB();

const express = require('express');
const http  = require('http') 
const { Server } = require("socket.io");
const socketHandler = require('./socket')
const cors = require('cors');
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app)




app.set("etag", false);

const allowedOrigins = [
  "http://localhost:5173",
  "https://be-social-frontend-five.vercel.app"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options(/.*/, cors());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use((req,res, next) => {
  req.io = io;
  next();
})

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/draft', draftRoutes);
app.use("/api/scheduled-posts", jobScheduleRoutes);
app.use('/api/notifications', notificationRoutes)
app.use("/api/save", savedPostRoutes);
app.use('/api/not-interested', notInterested)
app.use('/api/stories', storyRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/messages' ,require("./routes/message"))
app.use('/api/conversation', require("./routes/conversation"))

// Debug endpoint to check post media paths
app.get('/api/debug/recent-post', async (req, res) => {
  try {
    const post = await Post.findOne({ media: { $exists: true, $ne: [] } })
      .select('media')
      .lean();
    res.json({ 
      post: post,
      mediaStructure: post?.media?.[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Static files for uploads
app.use('/uploads', express.static('uploads'));
app.use('/uploads/stories', express.static('uploads/stories'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum size is 150MB.",
      });
    }
  }
  res.status(500).json({ message: error.message });
});

socketHandler(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      initScheduledPostJob();
      console.log("[Scheduler] Started");

      initStoryCleanupJob();
      console.log("[Stories] Cleanup started");
    });

  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

startServer();