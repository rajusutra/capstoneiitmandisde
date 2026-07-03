// Builds the Express app (routes + middleware).
// Kept separate from server.js so tests can use the app without starting a server.
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const fatigueRoutes = require('./routes/fatigueRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/fatigue', fatigueRoutes);

// Must be registered last so it catches errors from all routes above
app.use(errorHandler);

module.exports = app;
