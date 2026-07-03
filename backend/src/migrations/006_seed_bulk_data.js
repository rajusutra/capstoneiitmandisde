// Bulk demo/load-test data: 1000 tenants, one admin user per tenant, and
// ~10,000 employees spread across them (8-12 per tenant).
//
// ⚠️ This is NOT meant to run silently. This project auto-runs pending
// migrations on every `npm run dev` / `npm start` (see server.js). Applying
// this migration to a real/shared database (e.g. the Atlas cluster referenced
// in backend/.env) will inject 1000 fake organizations and ~10,000 fake
// employees into it. Run it deliberately with `npm run migrate:run` against
// a database you intend to seed, not by accident via `npm run dev`.
// Roll back cleanly with `npm run migrate:rollback 006_seed_bulk_data`.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TENANT_COUNT = 1000;
const BATCH_SIZE = 1000;

// Every document this migration creates carries this marker so `down()` can
// remove exactly (and only) what this migration added — see the rollback
// comment below for why this is safer than a createdAt time-window.
const SEED_MARKER = '006_seed_bulk_data';

const DEPARTMENTS = ['Nursing', 'Engineering', 'Security', 'Lab', 'Sales', 'HR', 'Operations', 'Finance', 'Support'];

// Company name building blocks (sector-varied stems + optional region/suffix)
const BASE_NAMES = [
  // Healthcare
  'MedCore', 'HealthFirst', 'CarePlus', 'Vitality Health', 'Meridian Health', 'Sunrise Medical', 'Apex Clinical', 'Wellspring Care',
  // Technology
  'ByteWorks', 'Nimbus Systems', 'Quantum Softworks', 'Vertex Technologies', 'Northbridge Labs', 'Datastream', 'CloudPeak', 'Circuit Systems',
  // Retail
  'Urban Mart', 'Bright Basket', 'Metro Retail', 'Everyday Goods', 'Prime Outlets', 'Highstreet Traders', 'Marketplace Central',
  // Manufacturing
  'Ironclad Manufacturing', 'Precision Works', 'Titan Fabricators', 'Summit Industries', 'Forgeline', 'Alloy Works',
  // Logistics
  'Swift Freight', 'Cargo Bridge', 'Transit Point', 'Anchor Logistics', 'Railway Depot Services',
  // Finance
  'Ledger Partners', 'Crestview Capital', 'Meridian Finance', 'Silver Oak Advisors', 'Northstar Financial',
  // Education
  'Brightpath Academy', 'Scholars Union', 'Horizon Learning', 'Keystone Institute',
  // Hospitality
  'Golden Gate Hospitality', 'Harborview Hotels', 'Oakwood Inns', 'Cascade Resorts',
  // Energy
  'Solaris Energy', 'Greenline Power', 'Ridgeline Utilities', 'Voltage Grid',
  // Agriculture
  'Harvest Fields', 'Greenacre Farms', 'Cropline Cooperative', 'Fertile Ground Co',
];
const REGION_MODIFIERS = [
  'North', 'South', 'East', 'West', 'Central', 'Metro', 'Bay', 'Lake', 'River', 'Mountain',
  'Coastal', 'Valley', 'Summit', 'Harbor', 'Pine', 'Cedar', 'Union', 'Liberty', 'Heritage', 'Pacific', 'Atlantic', 'Highland',
];
const SUFFIXES = ['Inc.', 'LLC', 'Group', 'Corp.', 'Co.', 'Partners', 'Holdings', 'Solutions', 'Enterprises', '& Sons'];

// Diverse first/last name pools for generated employees
const FIRST_NAMES = [
  'Aisha', 'Wei', 'Carlos', 'Fatima', 'Liam', 'Noah', 'Priya', 'Kenji', 'Amara', 'Sofia',
  'Mohammed', 'Ingrid', 'Chidi', 'Elena', 'Hiro', 'Zara', 'Diego', 'Mei', 'Omar', 'Grace',
  'Ava', 'Ethan', 'Layla', 'Yusuf', 'Ananya', 'Lucas', 'Nadia', 'Kwame', 'Isabella', 'Arjun',
  'Freya', 'Tariq', 'Mia', 'Sven', 'Rina', 'Malik', 'Camille', 'Rahul', 'Bashir', 'Olivia',
  'Marco', 'Yuki', 'Zainab', 'Felix', 'Nia', 'Andres', 'Sana', 'Oliver', 'Adaeze', 'Hassan',
];
const LAST_NAMES = [
  'Khan', 'Nguyen', 'Silva', 'Kowalski', 'Osei', 'Patel', 'Garcia', 'Muller', 'Tanaka', 'Ibrahim',
  "O'Brien", 'Kim', 'Rossi', 'Andersson', 'Dubois', 'Hernandez', 'Kobayashi', 'Van Der Berg', 'Okafor', 'Petrov',
  'Johansson', 'Alvarez', 'Haddad', 'Nakamura', 'Singh', 'Fernandez', 'Boateng', 'Novak', 'Costa', 'Yilmaz',
  'Larsen', 'Mensah', 'Delgado', 'Wong', 'Abdullah', 'Moreau', 'Schmidt', 'Reyes', 'Adeyemi', 'Sato',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function randomDateWithinLastDays(days) {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Combination space (stems x regions x suffixes) is ~14,000, far more than the
// 1000 names needed, so the retry loop below resolves in one or two tries.
// The fallback after 50 attempts exists only to guarantee termination.
function generateUniqueCompanyName(usedNames) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const parts = [];
    if (Math.random() < 0.5) parts.push(randomChoice(REGION_MODIFIERS));
    parts.push(randomChoice(BASE_NAMES));
    if (Math.random() < 0.7) parts.push(randomChoice(SUFFIXES));
    const name = parts.join(' ');
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const fallback = `${randomChoice(BASE_NAMES)} ${usedNames.size + 1}`;
  usedNames.add(fallback);
  return fallback;
}

function generateUniqueSlug(name, usedSlugs) {
  const base = slugify(name);
  let candidate = base;
  let counter = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  usedSlugs.add(candidate);
  return candidate;
}

function generatePersonName() {
  return `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
}

// Inserts an array of documents in fixed-size chunks, logging progress after
// each chunk (satisfies the "log every 500-1000 inserts" requirement).
async function insertInBatches(collection, docs, label) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await collection.insertMany(batch);
    inserted += batch.length;
    console.log(`  ${label}: ${inserted}/${docs.length} inserted`);
  }
  return inserted;
}

module.exports = {
  name: '006_seed_bulk_data',
  description: 'Seed 1000 organizations, 1000 admin users, and ~10,000 employees',

  async up(db) {
    const startedAt = Date.now();

    // Defensive, idempotent indexes — a no-op if 001/002 already created them
    // with the same spec, but keeps this migration self-sufficient if it's
    // ever run against a fresh database out of order.
    await db.collection('tenants').createIndex({ slug: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('employees').createIndex({ tenantId: 1, employeeCode: 1 }, { unique: true });

    // ---------- Phase 1: 1000 tenant organizations ----------
    console.log('Phase 1: generating 1000 tenants...');
    const usedNames = new Set();
    const usedSlugs = new Set();
    const tenants = [];

    for (let i = 0; i < TENANT_COUNT; i++) {
      const name = generateUniqueCompanyName(usedNames);
      const slug = generateUniqueSlug(name, usedSlugs);
      const plan = Math.random() < 0.8 ? 'free' : 'premium';

      const statusRoll = Math.random();
      const status = statusRoll < 0.6 ? 'trial' : statusRoll < 0.95 ? 'active' : 'suspended';

      const tenant = {
        _id: new mongoose.Types.ObjectId(),
        name,
        slug,
        plan,
        status,
        // Trial/subscription end dates are relative to "now" (script run
        // time) as specified, not relative to each tenant's own createdAt.
        createdAt: randomDateWithinLastDays(90),
        seedBatch: SEED_MARKER,
      };
      if (status === 'trial') tenant.trialEndsAt = daysFromNow(10);
      if (status === 'active') tenant.subscriptionEndsAt = daysFromNow(30);

      tenants.push(tenant);
    }

    const tenantsInserted = await insertInBatches(db.collection('tenants'), tenants, 'tenants');

    // ---------- Phase 2: one admin user per tenant ----------
    console.log('Phase 2: generating one admin user per tenant...');

    // Hash the shared demo password ONCE. bcrypt is deliberately slow
    // (~50-100ms per call at cost factor 10) — hashing it 1000 separate times
    // would add 50-100+ seconds for no benefit, since every seeded admin
    // intentionally shares the same demo password.
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = tenants.map((tenant, i) => ({
      _id: new mongoose.Types.ObjectId(),
      tenantId: tenant._id,
      name: `${tenant.name} Admin`,
      email: `admin+${i}@${tenant.slug}.example.com`,
      passwordHash,
      role: 'admin',
      createdAt: tenant.createdAt,
      seedBatch: SEED_MARKER,
    }));

    const usersInserted = await insertInBatches(db.collection('users'), users, 'users');

    // ---------- Phase 3: ~10 employees per tenant (~10,000 total) ----------
    console.log('Phase 3: generating employees...');
    const employees = [];

    for (const tenant of tenants) {
      const employeeCount = randomInt(8, 12); // averages ~10/tenant, varied for realism
      for (let n = 1; n <= employeeCount; n++) {
        employees.push({
          _id: new mongoose.Types.ObjectId(),
          tenantId: tenant._id,
          name: generatePersonName(),
          employeeCode: `EMP-${String(n).padStart(4, '0')}`, // unique per tenant, not globally
          department: randomChoice(DEPARTMENTS),
          maxWeeklyHours: randomInt(30, 48),
          contactInfo: '',
          createdAt: randomDateWithinLastDays(60),
          seedBatch: SEED_MARKER,
        });
      }
    }

    const employeesInserted = await insertInBatches(db.collection('employees'), employees, 'employees');

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `Created ${tenantsInserted} tenants, ${usersInserted} users, ${employeesInserted} employees in ${seconds}s.`
    );
  },

  async down(db) {
    // Marker-based rollback (not a createdAt time-window) so this can never
    // accidentally delete real data that happens to fall in the same window —
    // e.g. a genuine signup, or this project's own `npm run seed` demo data.
    const tenantsResult = await db.collection('tenants').deleteMany({ seedBatch: SEED_MARKER });
    const usersResult = await db.collection('users').deleteMany({ seedBatch: SEED_MARKER });
    const employeesResult = await db.collection('employees').deleteMany({ seedBatch: SEED_MARKER });

    console.log(
      `Rolled back 006_seed_bulk_data: removed ${tenantsResult.deletedCount} tenants, ` +
      `${usersResult.deletedCount} users, ${employeesResult.deletedCount} employees.`
    );
  },
};
