const sql = require('mssql');

let loginPool = null;
let mainPool = null;

async function getLoginPool(config) {
  if (loginPool) return loginPool;

  loginPool = await new sql.ConnectionPool(config).connect();
  console.log('✅ LOGIN DB connected');
  return loginPool;
}

async function getMainPool(config) {
  if (mainPool) return mainPool;

  mainPool = await new sql.ConnectionPool(config).connect();
  console.log('✅ MAIN DB connected');
  return mainPool;
}

async function closeAllPools() {
  if (loginPool) await loginPool.close();
  if (mainPool) await mainPool.close();
}

module.exports = {
  sql,
  getLoginPool,
  getMainPool,
  closeAllPools,
};
