const sql = require('mssql');

let loginPool = null;
const mainPools = new Map(); // 🔥 key = factory

// ===== LOGIN DB (1 pool) =====
async function getLoginPool(config) {
  if (loginPool?.connected) return loginPool;

  if (loginPool) {
    try { await loginPool.close(); } catch {}
    loginPool = null;
  }

  loginPool = await new sql.ConnectionPool(config).connect();
  console.log('✅ LOGIN DB connected');
  return loginPool;
}

// ===== MAIN DB (POOL THEO FACTORY) =====
async function getMainPool(factory, config) {
  if (!factory) throw new Error('Factory required');

  const pool = mainPools.get(factory);
  if (pool?.connected) return pool;

  if (pool) {
    try { await pool.close(); } catch {}
    mainPools.delete(factory);
  }

  const newPool = await new sql.ConnectionPool(config).connect();
  mainPools.set(factory, newPool);

  console.log(`✅ MAIN DB connected [${factory}]`);
  return newPool;
}

// ===== CLOSE ALL =====
async function closeAllPools() {
  if (loginPool) {
    try { await loginPool.close(); } catch {}
    loginPool = null;
  }

  for (const [factory, pool] of mainPools) {
    try { await pool.close(); } catch {}
    console.log(`🔒 MAIN DB closed [${factory}]`);
  }
  mainPools.clear();
}

module.exports = {
  sql,
  getLoginPool,
  getMainPool,
  closeAllPools,
};
