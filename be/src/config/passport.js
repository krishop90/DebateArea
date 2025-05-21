const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

//google
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5173/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({
      where: { email: profile.emails[0].value }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          name: profile.displayName,
          provider: 'GOOGLE',
          providerId: profile.id
        }
      });
    } else if (!user.providerId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: 'GOOGLE',
          providerId: profile.id
        }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

//github
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:5173/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    
    // First try to find by email
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // If not found by email, create new user
      user = await prisma.user.create({
        data: {
          email,
          name: profile.username,
          provider: 'GITHUB',
          providerId: profile.id
        }
      });
    } else if (!user.providerId) {
      // If user exists but doesn't have providerId, update it
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: 'GITHUB',
          providerId: profile.id
        }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));
