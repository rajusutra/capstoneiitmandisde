// Seed script: fills the database with one demo tenant so you can log in and demo
// immediately. Run with: npm run seed
// Demo login -> email: admin@demo.com  password: password123
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Shift = require('./models/Shift');
const Availability = require('./models/Availability');
const FatigueRule = require('./models/FatigueRule');
const FatigueAssessment = require('./models/FatigueAssessment');

// Helper: a Date at day offset from today, at a given hour (UTC)
function at(dayOffset, hour) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding demo data...');

  // Remove any previous demo tenant so the script can be run repeatedly
  const old = await Tenant.findOne({ slug: 'demo-hospital' });
  if (old) {
    await Promise.all([
      User.deleteMany({ tenantId: old._id }),
      Employee.deleteMany({ tenantId: old._id }),
      Shift.deleteMany({ tenantId: old._id }),
      Availability.deleteMany({ tenantId: old._id }),
      FatigueRule.deleteMany({ tenantId: old._id }),
      FatigueAssessment.deleteMany({ tenantId: old._id }),
      Tenant.deleteOne({ _id: old._id }),
    ]);
  }

  const tenant = await Tenant.create({ name: 'Demo Hospital', slug: 'demo-hospital', plan: 'free' });

  await User.create({
    tenantId: tenant._id,
    name: 'Demo Admin',
    email: 'admin@demo.com',
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'admin',
  });

  await FatigueRule.create({ tenantId: tenant._id }); // default safety rules

  const [asha, bikram, chandra] = await Employee.create([
    { tenantId: tenant._id, name: 'Asha Nurse', employeeCode: 'EMP-001', department: 'Nursing', maxWeeklyHours: 40 },
    { tenantId: tenant._id, name: 'Bikram Guard', employeeCode: 'EMP-002', department: 'Security', maxWeeklyHours: 48 },
    { tenantId: tenant._id, name: 'Chandra Tech', employeeCode: 'EMP-003', department: 'Lab', maxWeeklyHours: 40 },
  ]);

  // Availability: weekdays 09:00-17:00 for Asha
  for (let day = 1; day <= 5; day++) {
    await Availability.create({
      tenantId: tenant._id,
      employeeId: asha._id,
      dayOfWeek: day,
      availableFrom: '09:00',
      availableTo: '17:00',
    });
  }

  // Shifts. Asha's schedule is intentionally risky:
  // - shifts on 5 days in a row
  // - a late shift followed by an early shift (short rest) -> assess it in the demo!
  await Shift.create([
    { tenantId: tenant._id, employeeId: asha._id, startTime: at(1, 8), endTime: at(1, 18), shiftType: 'morning' },
    { tenantId: tenant._id, employeeId: asha._id, startTime: at(2, 8), endTime: at(2, 18), shiftType: 'morning' },
    { tenantId: tenant._id, employeeId: asha._id, startTime: at(3, 8), endTime: at(3, 18), shiftType: 'morning' },
    { tenantId: tenant._id, employeeId: asha._id, startTime: at(4, 14), endTime: at(4, 23), shiftType: 'evening' },
    { tenantId: tenant._id, employeeId: asha._id, startTime: at(5, 5), endTime: at(5, 13), shiftType: 'morning' }, // only 6h rest!

    { tenantId: tenant._id, employeeId: bikram._id, startTime: at(1, 22), endTime: at(2, 6), shiftType: 'night' },
    { tenantId: tenant._id, employeeId: bikram._id, startTime: at(3, 22), endTime: at(4, 6), shiftType: 'night' },

    { tenantId: tenant._id, employeeId: chandra._id, startTime: at(2, 9), endTime: at(2, 17), shiftType: 'morning' },
  ]);

  console.log('Done! Demo login -> email: admin@demo.com  password: password123');
  console.log("Tip: open the Shift Calendar and click 'Assess' on Asha's early-morning shift.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
