require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./config/passport');

const authRoutes = require('./routes/authRoutes');
const debateRoutes = require('./routes/debateRoutes');
const commentRoutes = require('./routes/commentRoutes');

const app = express();
app.use(express.json());

// Improved CORS configuration
app.use(require('cors')({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'some-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api', commentRoutes);

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
