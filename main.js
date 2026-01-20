const { app, BrowserWindow, ipcMain, dialog,shell   } = require("electron");
const path = require("path");
const fs = require("fs");
const { saveSession, loadSession, clearSession } = require('./session');
const {
  sql,
  getLoginPool,
  getMainPool,
  closeAllPools
} = require('./db');

const ExcelJS = require('exceljs');


let rememberedUser = null;
let rememberedEmployeeName = null;
ipcMain.handle('get-app-context', () => global.__APP_CONTEXT__);
function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}


require("dotenv").config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, ".env")
    : path.join(__dirname, ".env"),
});
// Lấy thông tin cấu hình từ biến môi trường
function getMainDbConfigByFactory(factory) {
  const base = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: true,
    },
  };

  switch (factory) {
    case 'GL1':
      return { ...base, server: process.env.DB_GL1_SERVER, database: process.env.DB_GL1_DATABASE };
    case 'GL2':
      return { ...base, server: process.env.DB_GL2_SERVER, database: process.env.DB_GL2_DATABASE };
    case 'GL3':
      return { ...base, server: process.env.DB_GL3_SERVER, database: process.env.DB_GL3_DATABASE };
    case 'GL4':
      return { ...base, server: process.env.DB_GL4_SERVER, database: process.env.DB_GL4_DATABASE };
    default:
      throw new Error('Invalid factory');
  }
}

function mustFactory() {
  const f = global.__APP_CONTEXT__?.factory;
  if (!f) throw new Error('Missing factory (prelogin not done?)');
  return f;
}

async function getMainDb() {
  const factory = mustFactory();
  const cfg = getMainDbConfigByFactory(factory);
  return await getMainPool(factory, cfg); // ✅ theo db.js mới
}




function getLoginDbConfigByFactory(factory) {
  const base = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: true,
    },
  };

  switch (factory) {
    case 'GL1':
      return { ...base, server: process.env.DB_GL1_SERVER, database: process.env.DB_DATABASE_LOGIN };
    case 'GL2':
      return { ...base, server: process.env.DB_GL2_SERVER, database: process.env.DB_DATABASE_LOGIN };
    case 'GL3':
      return { ...base, server: process.env.DB_GL3_SERVER, database: process.env.DB_DATABASE_LOGIN };
    case 'GL4':
      return { ...base, server: process.env.DB_GL4_SERVER, database: process.env.DB_DATABASE_LOGIN };
    default:
      throw new Error('Invalid factory');
  }
}

// Nếu bạn muốn lưu SQLite: dùng better-sqlite3 hoặc sqlite3.
// Demo này lưu JSON cho dễ.


function bindInput(req, key, value) {
  // null / undefined
  if (value === undefined || value === null || value === '') {
    if (key.endsWith('_qty')) {
      req.input(key, sql.Decimal(18, 2), 0);
    } else {
      req.input(key, sql.NVarChar, null);
    }
    return;
  }

  // datetime
  if (key === 'created' || key === 'updated') {
    req.input(key, sql.DateTime, value);
    return;
  }

  // qty fields
  if (key.endsWith('_qty')) {
    const num = Number(value);
    req.input(key, sql.Decimal(18, 2), isNaN(num) ? 0 : num);
    return;
  }

  // checkbox boolean
  if (key === 'RI_ischanged') {
    req.input(key, sql.Bit, value === 1 || value === '1' || value === true);
    return;
  }

  // default
  req.input(key, sql.NVarChar, value);
}


// Hàm lấy dữ liệu cho sidebar từ SQL Server
async function getSidebarInspections(rmType = 'A', limit = 500) {
  try {
    const pool = await getMainDb();


    // Kiểm tra rmType và xử lý giá trị hợp lệ
    if (rmType && typeof rmType !== 'string') {
      throw new Error('Invalid rmType: must be a string');
    }

    let query = `
      SELECT TOP (@limit) RI_no, ERP_po_no, RI_vend_name, RI_mat_code, RI_date, created
      FROM dv_RM_inspection
      WHERE isactive = 'Y'`;

    // Nếu rmType có giá trị, thêm điều kiện lọc vào truy vấn
    if (rmType) {
      query += ` AND RM_type = @rmType`;
    }

    query += ` ORDER BY created DESC`; // Giữ ORDER BY để đảm bảo kết quả theo thứ tự mong muốn

    const result = await pool.request()
      .input('rmType', sql.NVarChar, rmType)  // Truyền tham số rmType vào truy vấn
      .input('limit', sql.Int, limit)       // Truyền tham số limit vào truy vấn
      .query(query);

    return result.recordset;  // Trả lại dữ liệu

  } catch (err) {
    console.error('Error fetching sidebar inspections:', err);
    throw err;
  }
}




let splashWin=null;
let preLoginWin=null;
let loginWin=null;
let mainWin=null;



function createPreLoginWindow() {
  preLoginWin = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  });

  preLoginWin.loadFile(
    path.join(__dirname, "renderer", "prelogin.html")
  );
}

function createSplashWindow() {
  splashWin = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
     sandbox: false,  
  });

  splashWin.loadFile(path.join(__dirname, "renderer", "splash.html"));
}

function createLoginWindow() {
  loginWin = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    webPreferences: {
       preload: path.join(__dirname, 'preload.js'), // 🔥 BẮT BUỘC
      contextIsolation: true,
       sandbox: false,  
    },
  });

  loginWin.loadFile(path.join(__dirname, 'renderer', 'login.html'));

  loginWin.on('closed', () => {
    loginWin = null;
  });
}



function createMainWindow(payload) {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  const layout = payload?.layout || 'leather';

  const map = {
    leather: 'index.html',
    fabric: 'index_fabric.html',
    accessory: 'index_accessory.html',
  };

  mainWin.loadFile(
    path.join(__dirname, 'renderer', map[layout] || 'index.html')
  );
}


app.whenReady().then(() => {
  createSplashWindow();

  setTimeout(() => {
    splashWin?.close();
    splashWin = null;

    const session = loadSession();
    console.log(session,'ssssssss');

if (session?.remember && session.factory) {
  global.__APP_CONTEXT__ = {
    lang: session.lang || 'en',   // 🔥 FIX
    factory: session.factory
  };

  rememberedUser = session.user;
  rememberedEmployeeName =
    session.employee_name || session.user;

  createMainWindow(session);
} else {
  createPreLoginWindow();
}
  }, 2000);
});


ipcMain.handle('prelogin:done', (e, data) => {
  console.log('[PRELOGIN]', data); // { lang, factory }
  global.__APP_CONTEXT__ = data; // { lang, factory }

  preLoginWin?.close();
  preLoginWin = null;

  const session = loadSession();

  if (session?.remember) {
    rememberedUser = session.user;
    rememberedEmployeeName =
      session.employee_name || session.user;

    createMainWindow(session);
  } else {
    createLoginWindow();
  }
});




app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


app.on('before-quit', async () => {
  await closeAllPools();
});

ipcMain.on('kb:login-success', (e, payload) => {
  const { user, factory, remember, employee_name, layout } = payload;

  rememberedUser = user;
  rememberedEmployeeName = employee_name;

  if (remember) {
    saveSession({
      user,
      factory,
      layout,           // 🔥 LƯU LUÔN
      employee_name,
      remember: true
    });
  }

  createMainWindow({ user, factory, employee_name, layout });
  loginWin?.close();
});


ipcMain.handle('kb:get-remember', async () => {
  if (!rememberedUser) return null;
  return { user: rememberedUser };
});


ipcMain.on('kb:logout', async () => {
  rememberedUser = null;
  clearSession();

  if (mainWin) { mainWin.close(); mainWin = null; }
  if (loginWin) { loginWin.close(); loginWin = null; } // optional

  // reset context nếu muốn user chọn lại
  global.__APP_CONTEXT__ = null;

  createPreLoginWindow(); // ✅ logout quay về prelogin
});


  ipcMain.handle('get-sidebar-inspections', async (event,rmType, limit ) => {

    try {
      const data = await getSidebarInspections(rmType,limit );
      return data;  // Trả dữ liệu cho renderer process
    } catch (error) {
      console.error('Error fetching sidebar inspections:', error);
      return [];
    }
  });

// lấy màu sắc
ipcMain.handle('kb:getColor', async (e, { ri_no, mat_code }) => {
  try {
    if (!ri_no || !mat_code) {
      throw new Error('Missing ri_no or mat_code');
    }

    const pool = await getMainDb();

    const query = `
      SELECT TOP 1
        b.mat_color + ' / ' + b.mat_ecolor AS color_name
      FROM DV_DATA_LAKE.dbo.dv_RM_inspection a
      LEFT JOIN DV_SERVER_ERP.wuerp_vnrd.dbo.ta_materialmast b
        ON b.isactive = 'Y'
       AND b.mat_codeone = a.RI_mat_code
      WHERE a.RI_no = @ri_no
        AND a.RI_mat_code = @mat_code
    `;

    const result = await pool.request()
      .input('ri_no', sql.NVarChar, ri_no)
      .input('mat_code', sql.NVarChar, mat_code)
      .query(query);

    return {
      color_name: result.recordset?.[0]?.color_name ?? null
    };

  } catch (err) {
    console.error('[kb:getColor] error:', err);
    throw err;
  }
});

ipcMain.handle('kb:login', async (e, { user, password }) => {

  try {
    if (!user || !password) {
      return { success: false, code: 'VALIDATION', message: 'Thiếu user/password' };
    }

const factory = mustFactory();
const pool = await getLoginPool(getLoginDbConfigByFactory(factory));


    const rs = await pool.request()
      .input('user', sql.NVarChar, user)
      .input('password', sql.NVarChar, password)
      .query(`
        SELECT
          ts_user.user_code,
          e.employee_name,
          d.dept_code,
          d.dept_name,
          f.factory_code,
          f.factory_extcode
        FROM ts_user
        INNER JOIN ts_employee e ON ts_user.employee_code = e.employee_code
        INNER JOIN ts_employeedept ed ON e.employee_code = ed.employee_code
        INNER JOIN ts_dept d ON ed.dept_code = d.dept_code
        INNER JOIN ts_factory f ON d.company_code = f.factory_code
        WHERE ts_user.user_code = @user
          AND ts_user.user_password = @password
          AND f.factory_extcode IN ('GL1','GL2','GL3','GL4')
        ORDER BY f.factory_extcode ASC
      `);

    if (!rs.recordset.length) return { success: false };

    const { user_code, employee_name, dept_code, dept_name } = rs.recordset[0];

    const factories = [
      ...new Map(
        rs.recordset.map(r => [
          r.factory_extcode,
          { factory_code: r.factory_code, factory_extcode: r.factory_extcode }
        ])
      ).values()
    ];

    const factoriCheck = [
  ...new Set(rs.recordset.map(r => r.factory_extcode))
];

    
    console.log(factory,'factoryfactoryfactory')
    console.log(factoriCheck,'factoriesfactories')

    
    if (!factoriCheck.includes(factory)) {
  return {
    success: false,
    code: 'NO_PERMISSION',
    message: 'Bạn không có quyền truy cập nhà máy này'
  };
}

    return {
      success: true,
      user: user_code,
      employee_name,
      dept: { dept_code, dept_name },
      factories
    };

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return { success: false, code: err?.code || 'DB_ERROR', message: err?.message };
  }
});




ipcMain.handle('kb:saveInspection', async (e, input) => {
  try {

    const pool = await getMainDb();

    // ===== 1️⃣ xử lý remarkType =====
    if (input.remark_type === 'sign') {
      delete input.RI_remark;
    } else {
      delete input.RI_remark_sign;
    }

    // ===== 2️⃣ allowed fields =====
    const allowedFields = [
      'isactive','RM_po_qty','RM_container_qty',
      'created','user_code_created','user_name_created',
      'updated','user_code_updated','user_name_updated','RI_ischanged',
      'RI_no','RI_shippingway','RI_note',
      'RI_mat_code','RI_mat_name','RI_mat_ename',
      'RI_vend_code','RI_vend_name','RI_custbrand_id','RI_brand_name','RI_date',
      'RI_thickness_spec','RI_thickness_actual','RI_hardness_spec','RI_hardness_actual',
      'RI_A_qty','RI_B_qty','RI_C_qty','RI_D_qty','RI_E_qty','RI_F_qty','RI_R_qty',
      'RI_rejectcolor_qty','RI_rejectcolor_reason',
      'RI_rejectcharacter_qty','RI_rejectcharacter_reason',
      'RI_rejectother_qty','RI_rejectother_reason','RI_mat_oldcode',
      'ERP_po_no','ERP_tc_code',
      'RI_remark','RI_remark_sign',
      'RI_manager_sign','RI_storekeeper_sign','RI_inspector_sign',
      'RI_brand_code','RM_type'
    ];

const data = {};
allowedFields.forEach(k => {
  if (k in input) data[k] = input[k];
});

// 🔥 FIX RI_ischanged
if ('RI_ischanged' in data) {
  data.RI_ischanged = data.RI_ischanged ? 1 : 0;
}

    // ===== 3️⃣ check exists =====
    const exists = await pool.request()
      .input('RI_no', sql.NVarChar, data.RI_no)
      .query(`
        SELECT keyid
        FROM DV_DATA_LAKE.dbo.dv_RM_inspection
        WHERE RI_no = @RI_no
      `);

    const userName = 'SYSTEM'; // 👉 bạn có thể lấy từ login Electron

    if (exists.recordset.length) {
      // ===== UPDATE =====
      data.updated = new Date();
      data.user_code_updated = userName;
      data.user_name_updated = userName;

      const sets = Object.keys(data)
        .filter(k => k !== 'RI_no')
        .map(k => `${k}=@${k}`)
        .join(',');

      const req = pool.request();
Object.entries(data).forEach(([k, v]) => {
  bindInput(req, k, v);
});

      await req.query(`
        UPDATE DV_DATA_LAKE.dbo.dv_RM_inspection
        SET ${sets}
        WHERE RI_no = @RI_no
      `);

      return { keyid: exists.recordset[0].keyid, updated: true };

    } else {
      // ===== INSERT =====
      data.created = new Date();
      data.isactive = 'Y';
      data.RM_type = data.RM_type || 'A';
      data.user_code_created = userName;
      data.user_name_created = userName;

      const cols = Object.keys(data).join(',');
      const vals = Object.keys(data).map(k => `@${k}`).join(',');

      const req = pool.request();

      
Object.entries(data).forEach(([k, v]) => {
  bindInput(req, k, v);
});

      const rs = await req.query(`
        INSERT INTO DV_DATA_LAKE.dbo.dv_RM_inspection (${cols})
        OUTPUT INSERTED.keyid
        VALUES (${vals})
      `);

      return { keyid: rs.recordset[0].keyid, inserted: true };
    }

  } catch (err) {
    console.error('[kb:saveInspection]', err);
    throw err;
  }
});



ipcMain.handle('kb:getRidList', async (e, { ri_no }) => {
  try {
    if (!ri_no) {
      throw new Error('Missing ri_no');
    }

    const pool = await getMainDb();

    const query = `
      SELECT DISTINCT RID_no
      FROM dv_RM_inspectiondet
      WHERE RI_no = @ri_no AND isactive = 'Y'
      ORDER BY RID_no
    `;

    const result = await pool.request()
      .input('ri_no', sql.NVarChar, ri_no)
      .query(query);

    return {
      success: true,
      records: result.recordset
    };

  } catch (err) {
    console.error('[kb:getRidList] error:', err);
    return {
      success: false,
      records: []
    };
  }
});



// lấy data detail theo RI_no
ipcMain.handle('get-inspection-detail', async (event, riNo) => {
  try {
    // Kiểm tra riNo
    if (!riNo || typeof riNo !== 'string') {
      throw new Error('Invalid RI_no');
    }

    const pool = await getMainDb();

    // Lấy thông tin bản kiểm tra từ bảng dv_RM_inspection
    const inspectionQuery = `
      SELECT * FROM dv_RM_inspection
      WHERE RI_no = @riNo AND isactive = 'Y'
    `;
    const inspectionResult = await pool.request()
      .input('riNo', sql.NVarChar, riNo)
      .query(inspectionQuery);

    const inspection = inspectionResult.recordset[0]; // Chỉ lấy bản ghi đầu tiên (nếu có)

    // Lấy các bản ghi liên quan từ bảng dv_RM_InspectionRecord
    const recordsQuery = `
      SELECT * FROM dv_RM_InspectionRecord
      WHERE ri_no = @riNo
      ORDER BY ri_sliceNO
    `;
    const recordsResult = await pool.request()
      .input('riNo', sql.NVarChar, riNo)
      .query(recordsQuery);

    const records = recordsResult.recordset;

    // Trả về dữ liệu cho renderer
    return {
      inspection,
      records
    };

  } catch (err) {
    console.error('Error fetching inspection detail:', err);
    throw err;
  }
});



// ===== IPC: Export Excel (gợi ý dùng exceljs) =====

ipcMain.handle("kb:exportExcel", async (event, payload) => {
  const templateType = String(payload?.template || "default").toLowerCase();
  const data = payload?.inspection || {};
  const records = Array.isArray(payload?.records) ? payload.records : [];

  try {
    // =============================
    // 1) CHỌN FILE SAVE
    // =============================
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Export Inspection Excel",
      defaultPath: `Inspection_${data.RI_no || Date.now()}_${templateType}.xlsx`,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    // =============================
    // 2) LOAD TEMPLATE
    // =============================
    const templatePath =
      templateType === "deckers"
        ? path.join(__dirname, "./renderer/assets/templates/Deckers_Template.xlsx")
        : path.join(__dirname, "./renderer/assets/templates/excel-export.xlsx");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new Error("Worksheet(1) not found");

    // helpers
    const pick = (...vals) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== "") ?? "";
    const numOrBlank = (v) => {
      if (v === undefined || v === null) return "";
      const s = String(v).trim();
      if (s === "") return "";
      const n = Number(s);
      return Number.isFinite(n) ? n : s;
    };

    // =============================
    // 3) FILL DATA
    // =============================
    if (templateType === "deckers") {
      // ===== DECKERS TEMPLATE (1:1 PHP InspectionTemplateExport) =====
      sheet.getCell("C10").value = pick(data.RI_vend_name);
      sheet.getCell("K9").value  = pick(data.ERP_po_no_hidden, data.ERP_po_no);
      sheet.getCell("F11").value = pick(data.RI_brand_name);
      sheet.getCell("L13").value = pick(data.RI_date);
      sheet.getCell("G12").value = pick(data.RI_mat_ename);

      sheet.getCell("D18").value = numOrBlank(data.RI_A_qty ?? 0);
      sheet.getCell("D19").value = numOrBlank(data.RI_B_qty ?? 0);
      sheet.getCell("D20").value = numOrBlank(data.RI_C_qty ?? 0);
      sheet.getCell("D21").value = numOrBlank(data.RI_D_qty ?? 0);
      sheet.getCell("D22").value = numOrBlank(data.RI_E_qty ?? 0);
      sheet.getCell("D23").value = numOrBlank(data.RI_F_qty ?? 0);
      sheet.getCell("D25").value = numOrBlank(data.RI_R_qty ?? 0);

      // K11 = D26 (nếu D26 là formula cell thì lấy result)
      const d26 = sheet.getCell("D26").value;
      sheet.getCell("K11").value =
        d26 && typeof d26 === "object" && "result" in d26 ? d26.result : d26;

      sheet.getCell("D31").value = numOrBlank(data.RI_rejectcolor_qty ?? 0);
      sheet.getCell("H31").value = pick(data.RI_rejectcolor_reason);

      sheet.getCell("D33").value = numOrBlank(data.RI_rejectcharacter_qty ?? 0);
      sheet.getCell("H33").value = pick(data.RI_rejectcharacter_reason);

      sheet.getCell("D34").value = numOrBlank(data.RI_rejectother_qty ?? 0);
      sheet.getCell("H34").value = pick(data.RI_rejectother_reason);
      // sau khi read template
workbook.calcProperties.fullCalcOnLoad = true;

/// ===== Rejects summary (Deckers) =====
const color     = Number(data.RI_rejectcolor_qty || 0);
const character = Number(data.RI_rejectcharacter_qty || 0);
const other     = Number(data.RI_rejectother_qty || 0);

// IMPORTANT: phải đúng cột mà template đang dùng cho "Footage (sf)"
// Theo ảnh bạn gửi: Footage nằm ở cột F, Percentage ở cột G
sheet.getCell("F31").value = color;
sheet.getCell("F33").value = character;
sheet.getCell("F34").value = other;



// Nếu template có ô G35 cho total % (tuỳ file), có thể set luôn:


    } else {
      // ===== TEMPLATE CŨ (excel-export.xlsx) =====
      sheet.getCell("C2").value = pick(data.RI_mat_name);
      sheet.getCell("C3").value = pick(data.RI_mat_ename);
      sheet.getCell("K3").value = pick(data.ERP_po_no_hidden, data.ERP_po_no);
      sheet.getCell("K2").value = pick(data.RI_mat_code);

      const containerQty = Number(data.RM_container_qty);
      sheet.getCell("K4").value =
        Number.isFinite(containerQty) && containerQty > 0
          ? containerQty
          : numOrBlank(data.RM_po_qty);

      sheet.getCell("C4").value = pick(data.RI_brand_name);
      sheet.getCell("C5").value = pick(data.RI_vend_name);
      sheet.getCell("F5").value = pick(data.ERP_tc_code_hidden, data.ERP_tc_code);
      sheet.getCell("K5").value = pick(data.RI_thickness_spec);
      sheet.getCell("M5").value = pick(data.RI_thickness_actual);
      sheet.getCell("K6").value = pick(data.RI_hardness_spec);
      sheet.getCell("M6").value = pick(data.RI_hardness_actual);

      sheet.getCell("F4").value = `${pick(data.RI_shippingway)}入${pick(data.RI_date)}`;

      // Grade
      sheet.getCell("E8").value  = numOrBlank(data.RI_A_qty ?? 0);
      sheet.getCell("E9").value  = numOrBlank(data.RI_B_qty ?? 0);
      sheet.getCell("E10").value = numOrBlank(data.RI_C_qty ?? 0);
      sheet.getCell("E11").value = numOrBlank(data.RI_D_qty ?? 0);
      sheet.getCell("E12").value = numOrBlank(data.RI_E_qty ?? 0);
      sheet.getCell("E13").value = numOrBlank(data.RI_F_qty ?? 0);
      sheet.getCell("E14").value = numOrBlank(data.RI_R_qty ?? 0);

      sheet.getCell("H23").value = pick(data.RI_remark);
      sheet.getCell("H23").alignment = { wrapText: true };

      // G6 = E15
      sheet.getCell("G6").value = sheet.getCell("E15").value;

      // ===== HISTORY TABLE: ĐỔ THEO ri_sliceNO (đúng UI) =====
// ✅ bắt Excel recalc khi mở file (nếu template có formula)
workbook.calcProperties.fullCalcOnLoad = true;

// ===== HISTORY TABLE: tính diff + percent =====
const START_ROW = 18;
const MAX_SLICE = 10;
const TOTAL_ROW = START_ROW + MAX_SLICE; // 28

// gom records theo sliceNo
const sliceMap = new Map();
for (const r of records) {
  const raw = r?.ri_sliceNO;
  if (raw === undefined || raw === null) continue;

  const m = String(raw).match(/\d+/);
  if (!m) continue;

  const sliceNo = parseInt(m[0], 10);
  if (!Number.isFinite(sliceNo)) continue;

  sliceMap.set(sliceNo, r);
}

// helper parse number (blank => 0)
const toNum = (v) => {
  if (v === undefined || v === null) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

let sumOrigin = 0;
let sumActual = 0;
let sumDiff = 0;

for (let sliceNo = 1; sliceNo <= MAX_SLICE; sliceNo++) {
  const row = START_ROW + sliceNo - 1;
  const rec = sliceMap.get(sliceNo);
  if (!rec) continue;

  // origin / actual
  const origin = toNum(rec.origin ?? rec.ri_leather_org);
  const actual = toNum(rec.actual ?? rec.ri_leather_width);

  // ✅ diff = actual - origin (giống UI của bạn)
  const diff = actual - origin;

  // thickness
  const neck = toNum(rec.neck ?? rec.ri_thick_neck);
  const back = toNum(rec.back ?? rec.ri_thick_back);
  const hip  = toNum(rec.hip  ?? rec.ri_thick_bottom);

  // B..G giống PHP
  sheet.getCell(`B${row}`).value = origin || ""; // nếu muốn blank khi =0
  sheet.getCell(`C${row}`).value = actual || "";
  sheet.getCell(`D${row}`).value = diff || "";   // ✅ tính ra luôn
  sheet.getCell(`E${row}`).value = neck || "";
  sheet.getCell(`F${row}`).value = back || "";
  sheet.getCell(`G${row}`).value = hip  || "";

  sumOrigin += origin;
  sumActual += actual;
  sumDiff += diff;
}

// ✅ Totals row (thường là row 28)
sheet.getCell(`B${TOTAL_ROW}`).value = sumOrigin;
sheet.getCell(`C${TOTAL_ROW}`).value = sumActual;
sheet.getCell(`D${TOTAL_ROW}`).value = sumDiff;

// ✅ % thiếu hụt: totalDiff / totalOrigin  (1/12 = 0.08333 => 8.33%)
const shortageRate = sumOrigin ? (sumDiff / sumOrigin) : 0;

// Template của bạn đang hiển thị % ở ô F28 (theo ảnh).
// Set trực tiếp để không phụ thuộc formula:
const percentCell = sheet.getCell(`F${TOTAL_ROW}`);
percentCell.value = shortageRate;
percentCell.numFmt = "0.00%";
    }

    // =============================
    // 4) INSERT SIGNATURE
    // =============================
    const insertSignature = (base64, cell, opts = {}) => {
      if (!base64) return;

      const buffer = Buffer.from(
        String(base64).replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const imageId = workbook.addImage({ buffer, extension: "png" });
      const c = sheet.getCell(cell);

      sheet.addImage(imageId, {
        tl: {
          col: c.col - 1 + (opts.offsetCol || 0),
          row: c.row - 1 + (opts.offsetRow || 0),
        },
        ext: { width: opts.width || 120, height: opts.height || 60 },
      });
    };

    if (templateType === "deckers") {
      // PHP deckers: Inspector → F41
      insertSignature(data.RI_inspector_sign, "F41", { width: 120, height: 60 });
    } else {
      // PHP excel-export: 3 người
      insertSignature(data.RI_manager_sign, "F30", { width: 120, height: 60 });
      insertSignature(data.RI_storekeeper_sign, "I30", { width: 120, height: 60 });
      insertSignature(data.RI_inspector_sign, "L30", { width: 120, height: 60 });
    }

    // =============================
    // 5) SAVE FILE
    // =============================
    await workbook.xlsx.writeFile(filePath);
    return { success: true, filePath };

  } catch (err) {
    console.error("❌ [EXPORT EXCEL ERROR]", err);
    return { success: false, message: err?.message || "Unknown error", stack: err?.stack || null };
  }
});




ipcMain.handle('kb:searchTC', async (e, tcCode) => {
  try {
    if (!tcCode || typeof tcCode !== 'string') {
      return [];
    }

    const companyCode = process.env.COMPANY_CODE; // 👈 giống getCompanyCode()

const pool = await getMainDb();
    // ⚠️ OPENQUERY không bind param được → phải escape
    const tc = tcCode.replace(/'/g, "''");
    const cc = companyCode.replace(/'/g, "''");

    const query = `
SELECT *
FROM OPENQUERY([DV_SERVER_ERP], '
    SELECT
        e.mat_codeone,
        e.mat_fullname,
        e.mat_fullename,
        f.custbrand_id,
        g.brand_code,
        g.brand_name,
        i.vend_code,
        ISNULL(j.vend_simplename, '''') AS vend_name,
        REPLACE(k.referdetails_name, ''by '', '''') AS shippingway,
        MAX(m.mat_oldcode) AS mat_oldcode,
        STRING_AGG(hp.po_no, '','') AS polist
    FROM wuerp_vnrd.dbo.ta_transctnrmst d
    INNER JOIN wuerp_vnrd.dbo.ta_transpkmst b
        ON b.tc_no = d.tc_no AND b.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_transpkdet a
        ON a.tp_no = b.tp_no AND a.isactive = ''Y''
    LEFT JOIN wuerp_vnrd.dbo.ta_materialmast e
        ON e.mat_code = a.mat_code AND e.isactive = ''Y''
    LEFT JOIN wuerp_vnrd.dbo.ta_materialbrand f
        ON f.mat_code = e.mat_code AND f.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_brand g
        ON g.custbrand_id = f.custbrand_id AND g.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_vendacceptdet h
        ON h.ved_templink = a.ved_templink AND h.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_purchasedet hp
        ON hp.pod_templink = h.pod_templink AND hp.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_vendacceptmst i
        ON h.ve_no = i.ve_no AND i.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_vendmast j
        ON i.vend_code = j.vend_code AND j.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_fieldreference k
        ON k.referdetails_code = b.type_transport
       AND k.field_code = ''type_transport''
       AND k.language_code = ''EN''
       AND k.software_code = ''''
    LEFT JOIN wuerp_vnrd.dbo.ta_materialoldcode m
        ON m.isactive = ''Y''
       AND m.cofactory_code = ''${cc}''
       AND RIGHT(m.mat_code, LEN(m.mat_code) - 1) = e.mat_codeone
    WHERE d.isactive = ''Y''
      AND (d.tc_no = ''${tc}'' OR d.tc_code = ''${tc}'')
      AND LEFT(d.tc_delivery_code, 3) = ''${cc}''
    GROUP BY
        e.mat_codeone,
        e.mat_fullname,
        e.mat_fullename,
        f.custbrand_id,
        g.brand_code,
        g.brand_name,
        i.vend_code,
        j.vend_simplename,
        k.referdetails_name
')
`;

    const result = await pool.request().query(query);
    return result.recordset;

  } catch (err) {
    console.error('[kb:searchTC] error:', err);
    return [];
  }
});

ipcMain.handle('kb:deleteRid', async (e, { RI_no, RID_no }) => {
  if (!RI_no || !RID_no) {
    return {
      success: false,
      message: 'Missing RI_no or RID_no'
    };
  }

  const pool = await getMainDb();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    const userName =
      rememberedUser ||
      e.sender?.session?.user ||
      'SYSTEM';

    // =========================
    // 1️⃣ SOFT DELETE RID DETAIL
    // =========================
    await new sql.Request(tx)
      .input('RI_no', sql.NVarChar, RI_no)
      .input('RID_no', sql.NVarChar, RID_no)
      .input('user', sql.NVarChar, userName)
      .query(`
        UPDATE DV_DATA_LAKE.dbo.dv_RM_inspectiondet
        SET
          isactive = 'N',
          updated = GETDATE(),
          user_name_updated = @user
        WHERE RI_no = @RI_no
          AND RID_no = @RID_no
          AND isactive = 'Y'
      `);

    // =========================
    // 2️⃣ RECALC TOTAL BY RANK
    // =========================
    const rows = await new sql.Request(tx)
      .input('RI_no', sql.NVarChar, RI_no)
      .query(`
        SELECT RID_rank, SUM(RID_qty) AS qty
        FROM DV_DATA_LAKE.dbo.dv_RM_inspectiondet
        WHERE RI_no = @RI_no
          AND isactive = 'Y'
        GROUP BY RID_rank
      `);

    const totals = {
      RI_A_qty: 0,
      RI_B_qty: 0,
      RI_C_qty: 0,
      RI_D_qty: 0,
      RI_E_qty: 0,
      RI_F_qty: 0,
      RI_R_qty: 0,
    };

    rows.recordset.forEach(r => {
      if (!r.RID_rank) return;
      const prefix = String(r.RID_rank).charAt(0).toUpperCase();
      const col = `RI_${prefix}_qty`;
      if (col in totals) totals[col] = Number(r.qty) || 0;
    });

    // =========================
    // 3️⃣ UPDATE MASTER
    // =========================
    const upd = new sql.Request(tx)
      .input('RI_no', sql.NVarChar, RI_no)
      .input('user', sql.NVarChar, userName);

    Object.entries(totals).forEach(([k, v]) => {
      upd.input(k, sql.Decimal(18, 2), v);
    });

    await upd.query(`
      UPDATE DV_DATA_LAKE.dbo.dv_RM_inspection
      SET
        RI_A_qty = @RI_A_qty,
        RI_B_qty = @RI_B_qty,
        RI_C_qty = @RI_C_qty,
        RI_D_qty = @RI_D_qty,
        RI_E_qty = @RI_E_qty,
        RI_F_qty = @RI_F_qty,
        RI_R_qty = @RI_R_qty,
        updated = GETDATE(),
        user_name_updated = @user
      WHERE RI_no = @RI_no
        AND isactive = 'Y'
    `);

    await tx.commit();

    return {
      success: true,
      message: 'Deleted successfully',
      ri_no: RI_no,
      rid_no: RID_no,
      totals
    };

  } catch (err) {
    await tx.rollback();
    console.error('[kb:deleteRid]', err);

    return {
      success: false,
      message: 'Delete RID failed',
      error: err.message || String(err)
    };
  }
});



ipcMain.handle('kb:saveRid', async (e, { records }) => {
  if (!Array.isArray(records) || !records.length) {
    return { success: true };
  }

  const pool = await getMainDb();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    const userName = 'SYSTEM'; // 🔥 sau này lấy từ session login

    // ===============================
    // 1️⃣ UPSERT DETAIL
    // ===============================
    for (const r of records) {
      const keyReq = new sql.Request(tx);
      keyReq
        .input('RI_no', sql.NVarChar, r.RI_no)
        .input('RID_no', sql.NVarChar, r.RID_no)
        .input('RID_seqno', sql.Int, r.RID_seqno);
        

      const old = await keyReq.query(`
        SELECT *
        FROM DV_DATA_LAKE.dbo.dv_RM_inspectiondet
        WHERE RI_no=@RI_no
          AND RID_no=@RID_no
          AND RID_seqno=@RID_seqno
          AND isactive='Y'
      `);

      const req = new sql.Request(tx);
      req
        .input('RI_no', sql.NVarChar, r.RI_no)
        .input('RID_no', sql.NVarChar, r.RID_no)
        .input('RID_seqno', sql.Int, r.RID_seqno)
        .input('RID_qty', sql.Decimal(18, 2), r.RID_qty || 0)
        .input('RID_rank', sql.NVarChar, r.RID_rank || null)
        .input('RID_color', sql.NVarChar, r.RID_color || null)
        .input('RID_Failtype', sql.NVarChar, r.RID_Failtype || null)
        .input('RID_LabDate', sql.Date, r.RID_LabDate || null)
        .input('RID_remark', sql.NVarChar, r.RID_remark || null)
        .input('user', sql.NVarChar, userName);

      if (old.recordset.length) {
        await req.query(`
          UPDATE DV_DATA_LAKE.dbo.dv_RM_inspectiondet
          SET
            RID_qty=@RID_qty,
            RID_rank=@RID_rank,
            RID_color=@RID_color,
            RID_LabDate=@RID_LabDate,
            RID_remark=@RID_remark,
            updated=GETDATE(),
            user_name_updated=@user
          WHERE RI_no=@RI_no
            AND RID_no=@RID_no
            AND RID_seqno=@RID_seqno
            AND isactive='Y'
        `);
      } else {
        await req.query(`
          INSERT INTO DV_DATA_LAKE.dbo.dv_RM_inspectiondet (
            RI_no, RID_no, RID_seqno,
            RID_qty, RID_rank, RID_color, RID_Failtype, RID_LabDate, RID_remark,
            isactive, created, user_name_created
          )
          VALUES (
            @RI_no, @RID_no, @RID_seqno,
            @RID_qty, @RID_rank, @RID_color,@RID_Failtype, @RID_LabDate, @RID_remark,
            'Y', GETDATE(), @user
          )
        `);
      }
    }

    // ===============================
    // 2️⃣ TÍNH TỔNG THEO RANK
    // ===============================
    const riNo = records[0].RI_no;

    const sumReq = new sql.Request(tx);
    sumReq.input('RI_no', sql.NVarChar, riNo);

    const rows = await sumReq.query(`
      SELECT RID_rank, SUM(RID_qty) AS qty
      FROM DV_DATA_LAKE.dbo.dv_RM_inspectiondet
      WHERE RI_no=@RI_no
        AND isactive='Y'
      GROUP BY RID_rank
    `);

    const totals = {
      RI_A_qty: 0,
      RI_B_qty: 0,
      RI_C_qty: 0,
      RI_D_qty: 0,
      RI_E_qty: 0,
      RI_F_qty: 0,
      RI_R_qty: 0,
    };

    rows.recordset.forEach(r => {
      if (!r.RID_rank) return;
      const p = String(r.RID_rank).charAt(0).toUpperCase();
      const col = `RI_${p}_qty`;
      if (col in totals) totals[col] = r.qty || 0;
    });

    // ===============================
    // 3️⃣ UPDATE MASTER
    // ===============================
    const updReq = new sql.Request(tx);
    updReq
      .input('RI_no', sql.NVarChar, riNo)
      .input('user', sql.NVarChar, userName);

    Object.entries(totals).forEach(([k, v]) => {
      updReq.input(k, sql.Decimal(18, 2), v);
    });

    await updReq.query(`
      UPDATE DV_DATA_LAKE.dbo.dv_RM_inspection
      SET
        RI_A_qty=@RI_A_qty,
        RI_B_qty=@RI_B_qty,
        RI_C_qty=@RI_C_qty,
        RI_D_qty=@RI_D_qty,
        RI_E_qty=@RI_E_qty,
        RI_F_qty=@RI_F_qty,
        RI_R_qty=@RI_R_qty,
        updated=GETDATE(),
        user_name_updated=@user
      WHERE RI_no=@RI_no
        AND isactive='Y'
    `);

    await tx.commit();
    return { success: true, totals };

  } catch (err) {
    await tx.rollback();
    console.error('[kb:saveRid]', err);
    return {
      success: false,
      error: err.message || String(err),
    };
  }
});




ipcMain.handle('kb:generateRid', async (e, { ri_no }) => {
  return { rid_no: 'RID' + Date.now() }; // fake
});


ipcMain.handle('kb:getRidDetail', async (e, { rid_no, ri_no }) => {
  try {
const pool = await getMainDb();
    const query = `
      SELECT *
      FROM dv_RM_inspectiondet
      WHERE RID_no = @rid_no AND RI_no = @ri_no AND isactive = 'Y'
      ORDER BY RID_seqno
    `;

    const result = await pool.request()
      .input('rid_no', sql.NVarChar, rid_no)
      .input('ri_no', sql.NVarChar, ri_no)
      .query(query);

    return {
      success: true,
      records: result.recordset,
      RID_rank: result.recordset[0]?.RID_rank || '',
      RID_color: result.recordset[0]?.RID_color || '',
      RID_LabDate: result.recordset[0]?.RID_LabDate || '',
      RID_Failtype: result.recordset[0]?.RID_Failtype || ''
    };

  } catch (err) {
    console.error('[kb:getRidDetail] error:', err);
    return { success: false, records: [] };
  }
});


ipcMain.handle("print-html", async (event, payload) => {
  const { html, silent = false, deviceName = null } = payload || {};

  const win = new BrowserWindow({
    show: !silent,
    width: 900,
    height: 800,
    webPreferences: { sandbox: false },
  });

  const url = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  await win.loadURL(url);

  await new Promise(r => setTimeout(r, 300));

  const printOptions = {
    silent: !!silent,
    printBackground: true,
     margins: {
    marginType: "none"   // 🔥 QUAN TRỌNG
  },
pageSize: {
 width: 101000,
height: 101000
},
  scaleFactor: 100,  // Đảm bảo không thu nhỏ kích thước khi in
  dpi: { horizontal: 300, vertical: 300 },  // DPI của máy in (thường là 203 cho máy in tem)s
  };

  if (silent && deviceName) {
    printOptions.deviceName = deviceName;
  }

  if (!silent) {
    win.show();
    win.focus();
  }

  return new Promise((resolve, reject) => {
    win.webContents.print(printOptions, (success, errorType) => {
      win.close();

      if (!success) {
        reject(new Error(errorType || "Print failed"));
      } else {
        resolve({ success: true });
      }
    });
  });
});


ipcMain.handle("kb:get-printers", async () => {
  // ⚠️ Phải có BrowserWindow tồn tại
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return [];

  const printers = await win.webContents.getPrintersAsync();

  return printers.map(p => ({
    name: p.name,
    displayName: p.displayName || p.name,
    isDefault: p.isDefault,
    status: p.status
  }));
});




ipcMain.handle('kb:open-printer-settings', async () => {
  // Windows 10/11
  if (process.platform === 'win32') {
    await shell.openExternal('ms-settings:printers');
    return { success: true };
  }

  // macOS
  if (process.platform === 'darwin') {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.printers');
    return { success: true };
  }

  // Linux (best effort)
  // có thể mở settings URL hoặc thông báo không hỗ trợ
  return { success: false, message: 'Not supported on this OS' };
});

ipcMain.handle('kb:saveHistory', async (e, { ri_no, records }) => {
  if (!ri_no || !Array.isArray(records)) {
    throw new Error('Invalid history payload');
  }

  const pool = await getMainDb();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    const userName = rememberedUser || 'SYSTEM';

    for (const r of records) {
      if (!r.ri_sliceNO) continue;

      const check = await new sql.Request(tx)
        .input('ri_no', sql.NVarChar, ri_no)
        .input('ri_sliceNO', sql.Int, r.ri_sliceNO)
        .query(`
          SELECT 1
          FROM DV_DATA_LAKE.dbo.dv_RM_InspectionRecord
          WHERE ri_no=@ri_no
            AND ri_sliceNO=@ri_sliceNO
            AND isactive='Y'
        `);

      const req = new sql.Request(tx)
        .input('ri_no', sql.NVarChar, ri_no)
        .input('ri_sliceNO', sql.Int, r.ri_sliceNO)
        .input('ri_type', sql.NVarChar, r.ri_type || 'A')
        .input('ri_leather_org', sql.Decimal(18,2), r.ri_leather_org || null)
        .input('ri_leather_width', sql.Decimal(18,2), r.ri_leather_width || null)
        .input('ri_leather_diff', sql.Decimal(18,2), r.ri_leather_diff || null)
        .input('ri_thick_neck', sql.Decimal(18,2), r.ri_thick_neck || null)
        .input('ri_thick_back', sql.Decimal(18,2), r.ri_thick_back || null)
        .input('ri_thick_bottom', sql.Decimal(18,2), r.ri_thick_bottom || null)
        .input('user', sql.NVarChar, userName);

      if (check.recordset.length) {
        // UPDATE
        await req.query(`
          UPDATE DV_DATA_LAKE.dbo.dv_RM_InspectionRecord
          SET
            ri_type=@ri_type,
            ri_leather_org=@ri_leather_org,
            ri_leather_width=@ri_leather_width,
            ri_leather_diff=@ri_leather_diff,
            ri_thick_neck=@ri_thick_neck,
            ri_thick_back=@ri_thick_back,
            ri_thick_bottom=@ri_thick_bottom,
            updated=GETDATE()
          WHERE ri_no=@ri_no
            AND ri_sliceNO=@ri_sliceNO
            AND isactive='Y'
        `);
      } else {
        // INSERT
        await req.query(`
          INSERT INTO DV_DATA_LAKE.dbo.dv_RM_InspectionRecord (
            ri_no, ri_sliceNO, ri_type,
            ri_leather_org, ri_leather_width, ri_leather_diff,
            ri_thick_neck, ri_thick_back, ri_thick_bottom,
            isactive, created, user_name_created
          )
          VALUES (
            @ri_no, @ri_sliceNO, @ri_type,
            @ri_leather_org, @ri_leather_width, @ri_leather_diff,
            @ri_thick_neck, @ri_thick_back, @ri_thick_bottom,
            'Y', GETDATE(), @user
          )
        `);
      }
    }

    await tx.commit();
    return { success: true };

  } catch (err) {
    await tx.rollback();
    console.error('[kb:saveHistory]', err);
    throw err;
  }
});
ipcMain.handle('kb:search-po', async (event, poNo) => {
  if (!poNo) return [];
  const pool = await getMainDb();
  const companyCode = process.env.COMPANY_CODE; // 👈 giống getCompanyCode()
  const cc = companyCode.replace(/'/g, "''");
  const po = poNo.replace(/'/g, "''");

  const query  = `
SELECT *
FROM OPENQUERY([DV_SERVER_ERP], '
    SELECT 
        e.mat_codeone,
        e.mat_fullname,
        e.mat_fullename,
        f.custbrand_id,
        g.brand_code,
        g.brand_name,
        j.vend_code,
        ISNULL(j.vend_simplename, '''') AS vend_name,
        REPLACE(k.referdetails_name, ''by '', '''') AS shippingway,
        MAX(m.mat_oldcode) AS mat_oldcode
    FROM wuerp_vnrd.dbo.ta_purchasedet a
    LEFT JOIN wuerp_vnrd.dbo.ta_purchasemst b
        ON b.po_no = a.po_no AND b.isactive = ''Y''
    LEFT JOIN wuerp_vnrd.dbo.ta_materialmast e
        ON e.mat_code = a.mat_code AND e.isactive = ''Y''
    LEFT JOIN wuerp_vnrd.dbo.ta_materialbrand f
        ON f.mat_code = e.mat_code AND f.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_brand g
        ON g.custbrand_id = f.custbrand_id AND g.isactive = ''Y''
    INNER JOIN wuerp_vnrd.dbo.ta_vendmast j
        ON b.vend_code = j.vend_code AND j.isactive = ''Y''
    LEFT JOIN wuerp_vnrd.dbo.ta_fieldreference k
        ON k.referdetails_code = b.po_transport_type
       AND k.field_code = ''transport_type''
       AND k.language_code = ''EN''
       AND k.software_code = ''''
    LEFT JOIN wuerp_vnrd.dbo.ta_materialoldcode m
        ON m.isactive = ''Y''
       AND m.cofactory_code = ''${cc}''
       AND RIGHT(m.mat_code, LEN(m.mat_code) - 1) = e.mat_codeone
    WHERE a.isactive = ''Y''
      AND a.po_no = ''${po}''
    GROUP BY
        e.mat_codeone,
        e.mat_fullname,
        e.mat_fullename,
        f.custbrand_id,
        g.brand_code,
        g.brand_name,
        j.vend_code,
        j.vend_simplename,
        k.referdetails_name
')
`;

  const result = await pool.request().query(query);
  console.log(result)
    return result.recordset;
});



async function deactivateInspection(ri_no, userName) {
  const pool = await getMainDb();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // 🔒 0️⃣ CHECK QC SIGNATURE
    const check = await new sql.Request(tx)
      .input('RI_no', sql.NVarChar, ri_no)
      .query(`
        SELECT RI_inspector_sign
        FROM DV_DATA_LAKE.dbo.dv_RM_inspection
        WHERE RI_no = @RI_no
          AND isactive = 'Y'
      `);

    if (!check.recordset.length) {
      throw new Error(`RI not found: ${ri_no}`);
    }

    // if (check.recordset[0].RI_inspector_sign) {
    //   throw new Error('Đã ký QC – không được phép xóa');
    // }

    // 1️⃣ SOFT DELETE DETAIL
    await new sql.Request(tx)
      .input('RI_no', sql.NVarChar, ri_no)
      .input('user', sql.NVarChar, userName)
      .query(`
        UPDATE DV_DATA_LAKE.dbo.dv_RM_inspectiondet
        SET
          isactive = 'N',
          updated = GETDATE()
        WHERE RI_no = @RI_no
          AND isactive = 'Y'
      `);

    // 2️⃣ SOFT DELETE RECORD
    await new sql.Request(tx)
      .input('RI_no', sql.NVarChar, ri_no)
      .input('user', sql.NVarChar, userName)
      .query(`
        UPDATE DV_DATA_LAKE.dbo.dv_RM_InspectionRecord
        SET
          isactive = 'N',
          updated = GETDATE()
        WHERE RI_no = @RI_no
          AND isactive = 'Y'
      `);

    // 3️⃣ DEACTIVATE MASTER
    const result = await new sql.Request(tx)
      .input('RI_no', sql.NVarChar, ri_no)
      .input('user', sql.NVarChar, userName)
      .query(`
        UPDATE DV_DATA_LAKE.dbo.dv_RM_inspection
        SET
          isactive = 'N',
          updated = GETDATE(),
          user_name_updated = @user
        WHERE RI_no = @RI_no
          AND isactive = 'Y'
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error(`RI not found: ${ri_no}`);
    }

    await tx.commit();

    return { success: true, ri_no };

  } catch (err) {
    await tx.rollback();
    console.error('[deactivateInspection]', err);
    throw err;
  }
}



ipcMain.handle('inspection:delete', async (e, ri_no) => {
  const user = rememberedUser || 'SYSTEM';
  return await deactivateInspection(ri_no, user);
});


ipcMain.handle('get-po-qty-combined', async (event, params) => {
  const { po_list, mat_code, tc } = params || {};

  if (!po_list || !mat_code) {
    return {
      original: {
        purchase_qty: 0,
        container_qty: 0,
      },
    };
  }

  // ===== TÁCH PO =====
  const pos = po_list
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (!pos.length) {
    return {
      original: {
        purchase_qty: 0,
        container_qty: 0,
      },
    };
  }

  // ===== BUILD PO IN =====
  const poIn = pos
    .map(po => `''${po.replace(/'/g, "''")}''`)
    .join(',');

  // ===== BUILD MAT LIKE =====
  let pattern = `_${mat_code}`.replace(/'/g, "''");
  pattern = `''${pattern}''`;

const pool = await getMainDb();
  // ======================
  // 1) PURCHASE QTY
  // ======================
  const sqlPurchase = `
    SELECT *
    FROM OPENQUERY([DV_SERVER_ERP], '
      SELECT 
        SUM(a.PO_purchase_qty) AS qty
      FROM wuerp_vnrd.dbo.ta_purchasedet a
      WHERE a.isactive = ''Y''
        AND a.PO_no IN (${poIn})
        AND a.mat_code LIKE ${pattern}
    ')
  `;

  const pResult = await pool.request().query(sqlPurchase);
  const purchaseQty = pResult.recordset?.[0]?.qty || 0;

  // ======================
  // 2) CONTAINER QTY
  // ======================
  if (!tc) {
    return {
      original: {
        purchase_qty: Number(purchaseQty),
        container_qty: 0,
      },
    };
  }

  const tcEsc = tc.replace(/'/g, "''");

  // ⚠️ companyCode giống Laravel
  const companyCode = process.env.COMPANY_CODE; 

  const sqlContainer = `
    SELECT *
    FROM OPENQUERY([DV_SERVER_ERP], '
      SELECT 
        SUM(a.tp_qty) AS qty
      FROM wuerp_vnrd.dbo.ta_transctnrmst d
      INNER JOIN wuerp_vnrd.dbo.ta_transpkmst b
        ON b.tc_no = d.tc_no AND b.isactive = ''Y''
      INNER JOIN wuerp_vnrd.dbo.ta_transpkdet a
        ON a.tp_no = b.tp_no AND a.isactive = ''Y''
      INNER JOIN wuerp_vnrd.dbo.ta_vendacceptdet h
        ON h.ved_templink = a.ved_templink AND h.isactive = ''Y''
      INNER JOIN wuerp_vnrd.dbo.ta_purchasedet hp
        ON hp.pod_templink = h.pod_templink AND hp.isactive = ''Y''
      WHERE d.isactive = ''Y''
        AND (d.tc_no = ''${tcEsc}'' OR d.tc_code = ''${tcEsc}'')
        AND LEFT(d.tc_delivery_code, 3) = ''${companyCode}''
        AND a.mat_code LIKE ${pattern}
        AND hp.po_no IN (${poIn})
    ')
  `;

  const cResult = await pool.request().query(sqlContainer);
  const containerQty = cResult.recordset?.[0]?.qty || 0;

  return {
    original: {
      purchase_qty: Number(purchaseQty),
      container_qty: Number(containerQty),
    },
  };
});

ipcMain.handle('kb:get-user-info', async () => {
  return {
    user: rememberedUser,
    employee_name: rememberedEmployeeName
  };
});