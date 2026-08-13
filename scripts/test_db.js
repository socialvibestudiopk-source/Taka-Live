const sql = require('../db');
sql`SELECT 1`.then(() => {
    console.log('✅ Connection Successful');
    process.exit(0);
}).catch(e => {
    console.error('❌ Connection Failed:', e.message);
    process.exit(1);
});
