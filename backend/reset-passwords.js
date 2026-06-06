const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Amf%402007@localhost/vendorbridge' });

async function run() {
  // Check what's currently in DB
  const res = await pool.query('SELECT email, role, LEFT(password_hash,30) as hash_start FROM users ORDER BY role');
  console.log('\nCurrent users in DB:');
  res.rows.forEach(r => console.log(`  ${r.email} (${r.role}): ${r.hash_start}...`));

  // Verify all passwords
  const pairs = [
    { email: 'admin@vendorbridge.com', pwd: 'Admin@123!' },
    { email: 'manager@vendorbridge.com', pwd: 'Manager@123!' },
    { email: 'procurement@vendorbridge.com', pwd: 'Officer@123!' },
    { email: 'vendor@vendorbridge.com', pwd: 'Vendor@123!' },
  ];

  console.log('\nVerifying passwords:');
  for (const p of pairs) {
    const row = res.rows.find(r => r.email === p.email);
    if (!row) { console.log(`  ❌ ${p.email} NOT FOUND in DB`); continue; }
    const fullHash = await pool.query('SELECT password_hash FROM users WHERE email=$1', [p.email]);
    const ok = await bcrypt.compare(p.pwd, fullHash.rows[0].password_hash);
    console.log(`  ${ok ? '✅' : '❌'} ${p.email}: "${p.pwd}" → ${ok ? 'MATCH' : 'FAIL'}`);
  }

  // If any fail, reset them all
  console.log('\nResetting all passwords...');
  for (const p of pairs) {
    const hash = await bcrypt.hash(p.pwd, 10);
    const r = await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE email=$2 RETURNING email, role', [hash, p.email]);
    if (r.rows[0]) console.log(`  ✅ Reset: ${r.rows[0].email} (${r.rows[0].role})`);
    else console.log(`  ⚠️  Not found: ${p.email}`);
  }

  pool.end();
  console.log('\nDone! Please restart backend server.');
}

run().catch(e => { console.error(e.message); pool.end(); });
