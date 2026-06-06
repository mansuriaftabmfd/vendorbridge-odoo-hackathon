const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Amf%402007@localhost/vendorbridge' });

// SIMPLE same password for ALL demo accounts — easy to type
const NEW_PASSWORD = 'Password@123';

async function run() {
  console.log(`\nSetting ALL demo accounts to: "${NEW_PASSWORD}"\n`);

  const accounts = [
    'admin@vendorbridge.com',
    'manager@vendorbridge.com',
    'procurement@vendorbridge.com',
    'vendor@vendorbridge.com',
  ];

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);

  for (const email of accounts) {
    const r = await pool.query(
      'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE email=$2 RETURNING email, role',
      [hash, email]
    );
    if (r.rows[0]) {
      const match = await bcrypt.compare(NEW_PASSWORD, hash);
      console.log(`  ✅ ${r.rows[0].email} (${r.rows[0].role}) → password: "${NEW_PASSWORD}" verified: ${match}`);
    } else {
      console.log(`  ⚠️  Not found: ${email}`);
    }
  }

  pool.end();
  console.log('\n✅ Done! All accounts now use: Password@123\n');
}

run().catch(e => { console.error(e.message); pool.end(); });
