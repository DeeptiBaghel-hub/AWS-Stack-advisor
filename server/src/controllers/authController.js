const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt };
}

async function register(req, res) {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  const token = signToken(user);
  res.status(201).json({ token, user: toPublicUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
}

async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'Account no longer exists.' });
  }
  res.json({ user: toPublicUser(user) });
}

async function updateProfile(req, res) {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: 'Account no longer exists.' });
  }

  const { name, currentPassword, newPassword } = req.body;

  if (name) {
    user.name = name;
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ message: 'Enter your current password to set a new one.' });
    }
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }
    user.passwordHash = await User.hashPassword(newPassword);
  }

  await user.save();
  res.json({ user: toPublicUser(user) });
}

module.exports = { register, login, me, updateProfile };
