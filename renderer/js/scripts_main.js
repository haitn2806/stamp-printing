
(() => {

   const FACTORY_NAME = {
  GL1: 'LianYing',
  GL2: 'LianShun 1',
  GL3: 'LianShun 2',
  GL4: 'KHRU'
};

async function renderUserFactory() {
  try {
    const ctx = await window.kbAPI.getAppContext(); // { lang, factory }
    const f = ctx?.factory || '';
    const el = document.getElementById('user-factory');
    const el2 = document.getElementById('user-factory2');
    if (!el) return;
    if (!el2) return;

    const name = FACTORY_NAME[f] || f || '—';


    el.innerHTML = `<span>Factory ${name}</span>`;
    el2.innerHTML = `<span>${name}</span>`;
  } catch (e) {
    console.error('[renderUserFactory]', e);
  }
}




function lockTC_PO() {
  const tcInput  = document.getElementById('tc-code-input');
  const poInput  = document.getElementById('bill-code-input');
  const poSelect = document.getElementById('bill-code-select');

  [tcInput, poInput].forEach(el => {
    if (!el) return;
    el.readOnly = true;
    el.disabled = true;
    el.classList.add('bg-gray-100','cursor-not-allowed');
  });

  if (poSelect) {
    poSelect.disabled = true;
    poSelect.classList.add('opacity-60','pointer-events-none');
  }
}

let materialData = [];
let lastFetchKey = "";   // ✅ PHẢI CÓ

  if (window.__INSPECTION_MAIN_INIT__) return;
  window.__INSPECTION_MAIN_INIT__ = true;
  // cache serial theo từng phút
let riSerialCache = {
  minute: '',
  serial: 0
};

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

function formatNowMinute() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yy}${MM}${dd}${HH}${mm}`; // YYMMDDHHmm
}

function generateRIbillCode() {
  const minute = formatNowMinute();

  // sang phút mới → reset serial
  if (riSerialCache.minute !== minute) {
    riSerialCache.minute = minute;
    riSerialCache.serial = 1;
  } else {
    riSerialCache.serial += 1;
  }

  if (riSerialCache.serial > 99) {
    throw new Error('Đã vượt quá 99 mã trong cùng một phút');
  }

  return `RI${minute}${pad(riSerialCache.serial)}`;
}
function autoUpdateRI() {
  if (DETAIL_MODE) return;

  const riInput = document.getElementById('RI_no');
  if (!riInput ) return; // 🔒 CHỐT

  try {
    riInput.value = generateRIbillCode();
  } catch (e) {
    console.error(e.message);
  }
}

if (window.__RI_AUTO_TIMER__) clearInterval(window.__RI_AUTO_TIMER__);
window.__RI_AUTO_TIMER__ = setInterval(autoUpdateRI, 3000);
  // ========= Helpers =========
window.dragEvent = window.dragEvent || function dragEvent(e) {
  // stub để không crash
  // console.log('dragEvent stub', e?.type);
};
  let DETAIL_MODE = false;


  const $id = (id) => document.getElementById(id);
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setLoading(on) {
    const loading = $id("modal-loading");
    if (!loading) return;
    loading.classList.toggle("hidden", !on);
  }

  function setVal(root, selector, value) {
  const el = root.querySelector(selector);
  if (el) el.value = value ?? "";
}

  function toastError(msg) {
    // Nếu bạn chưa tích hợp Swal trong Electron thì dùng alert cho chắc
    alert(msg);
  }
const RI_ACTION_BUTTON_IDS = [
  '#btn-history',
  '#btn-qc-tool',
  '#btn-export-excel',
  '#btn-export-deckers'
];

document
  .getElementById('container-qty-display')
  ?.addEventListener('input', function () {
    const hidden = document.getElementById('container-qty');
    if (hidden) hidden.value = this.value;
  });
  // ========= 1) Enter -> next field =========
  function initEnterNextField() {
    const form = $id("item-check-form");
    if (!form) return;

    let backspaceDown = false;
    document.addEventListener("keydown", (e) => { if (e.key === "Backspace") backspaceDown = true; });
    document.addEventListener("keyup", (e) => { if (e.key === "Backspace") backspaceDown = false; });

    const fields = Array.from(form.querySelectorAll("input, select"))
      .filter((el) => {
        if (["hidden", "submit", "button", "reset"].includes(el.type)) return false;
        if (el.readOnly || el.disabled) return false;
        return true;
      });

    fields.forEach((el, idx) => {
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        const dir = e.shiftKey ? -1 : 1;
        const next = (idx + dir + fields.length) % fields.length;
        fields[next]?.focus();
        fields[next]?.select?.();
      });
    });
  }

  function renderMaterialGradeTable() {
  const tbody = document.getElementById('grade-tbody');
  if (!tbody) return;

  const coefMap = { A:97, B:93, C:88, D:83, E:78, F:73 };
  const useMap = {
    A: '96~100%',
    B: '91~95%',
    C: '86~90%',
    D: '81~85%',
    E: '76~80%',
    F: '71~75%',
  };
  const labelMap = {
    A: 'A_A1',
    B: 'B_A2',
    C: 'C_B3',
    D: 'D_B4',
    E: 'E_C5',
    F: 'F_D6',
  };

  tbody.innerHTML = Object.keys(coefMap).map(r => `
    <tr class="odd:bg-white even:bg-gray-50 border-b border-gray-200">
      <td class="px-4 py-2 font-medium text-gray-900 text-base">
        ${labelMap[r]}
      </td>
      <td class="px-4 py-2 text-gray-700 text-base" data-row="${r}">
        ${coefMap[r]}%
      </td>
      <td class="px-4 py-2 text-gray-700 text-base">
        ${useMap[r]}
      </td>
      <td class="px-4 py-2 text-base">
        <input
          type="number"
          min="0"
          step="0.01"
          name="RI_${r}_qty"
          data-row="${r}"
          class="qty-input block w-40 h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right"
          value="0"
        />
      </td>
      <td class="px-4 py-2 text-base">
        <span class="percent-output" data-row="${r}">0%</span>
      </td>
      <td class="px-4 py-2 text-base">
        <span class="weighted-output" data-row="${r}">0</span>
      </td>
    </tr>
  `).join('');
}



function updateTotalsAndPercent() {
  const sumQtyEl = document.getElementById('sum-qty');
  const sumWeightedEl = document.getElementById('sum-weighted');
  const totalShipmentEl = document.getElementById('sum-total-shipment');

  if (!sumQtyEl || !sumWeightedEl) return;

  const rows = ['A','B','C','D','E','F'];
  const coefMap = { A:97, B:93, C:88, D:83, E:78, F:73 };

  let usableSum = 0;
  let weightedSum = 0;

  // 1️⃣ Tính tổng usable (A → F)
  rows.forEach(r => {
    const qty =
      parseFloat(document.querySelector(`input[data-row="${r}"]`)?.value) || 0;
    usableSum += qty;
  });

  sumQtyEl.textContent = usableSum.toFixed(2);

  // 2️⃣ Tính % và weighted cho A → F
  rows.forEach(r => {
    const qty =
      parseFloat(document.querySelector(`input[data-row="${r}"]`)?.value) || 0;

    // % theo usableSum
    const percent = usableSum > 0 ? (qty * 100 / usableSum) : 0;
    const percentEl = document.querySelector(`.percent-output[data-row="${r}"]`);
    if (percentEl) {
      percentEl.textContent = percent.toFixed(2) + '%';
    }

    // weighted
    const weighted = qty * (coefMap[r] / 100);
    const weightedEl = document.querySelector(`.weighted-output[data-row="${r}"]`);
    if (weightedEl) {
      weightedEl.textContent = weighted.toFixed(2);
    }

    weightedSum += weighted;
  });

  sumWeightedEl.textContent = weightedSum.toFixed(2);

  // 3️⃣ Reject (R) – KHÔNG tính %, KHÔNG weighted
  const rQty = Number(
    document.querySelector(`input[name="RI_R_qty"]`)?.value || 0
  );

  // 4️⃣ Total shipment = usable + reject
  if (totalShipmentEl) {
    totalShipmentEl.textContent = (usableSum + rQty).toFixed(2);
  }
}





// quan trọng: expose ra global cho inline handler / chỗ khác gọi được
window.updateTotalsAndPercent = updateTotalsAndPercent;



  // ========= 2) Multi-language label =========

  const LABELS = {
    matname: { zh: "材料名稱", vi: "Tên nguyên liệu", km: "ឈ្មោះសម្ភារះ", en: "Material Name" },
    color:   { zh: "顏色", vi: "Màu sắc", km: "ពណ៌", en: "Color" },
    qty:     { zh: "數量", vi: "Số lượng", km: "ចំនួន", en: "Quantity" },
    vendor:  { zh: "廠商", vi: "Nhà cung cấp", km: "រោងចក្រ", en: "Supplier Name" },
    po:      { zh: "采購訂單", vi: "P.Số đặt mua", km: "លេខប័ណកម្មង", en: "Purchasing No" },
    check:   { zh: "要完成試驗貨才放在合格區", vi: "kiểm tra trước khi nhập kho", km: "ពិនិត្យមុនពេលដាក់ចូលឃ្លាំង", en: "check before warehousing" },
    send:    { zh: "送测日期", vi: "Ngày gửi", km: "កាលបរិច្ឆេទផ្ញើ", en: "Send Date" },
    received:{ zh: "收貨日期", vi: "Ngày nhập", km: "ថ្ងៃខែទទួល", en: "Date Received" },
    month:   { zh: "月份", vi: "tem tháng", km: "ខែផលិត", en: "Production Month" },
    qualified:{ zh: "合格", vi: "Đạt", km: "របស់ល្អ", en: "Qualified" },
    unqualified:{ zh: "不合格", vi: "Không đạt", km: "មិនល្អ", en: "Unqualified" },
    lab:     { zh: "試驗結果", vi: "Kết quả thử nghiệm", km: "លទ្ធិផលតេស្ត", en: "Lab test results" },
    visual:  { zh: "目視結果", vi: "Kết quả kiểm", km: "លទ្ធិផលពិនិត្យ", en: "Visual result" },
    dim:     { zh: "尺寸面積", vi: "Quy cách", km: "កម្រិតទំហំ", en: "Dimensional result" },
    defect:  { zh: "不良&等級", vi: "Lỗi & phân cấp", km: "ចំណាត់ថ្នាក់មិនល្អ", en: "Defect & Grading" },
    pack:    { zh: "包裝", vi: "Đóng gói", km: "វេចខ្ចប់", en: "Packing" },
    checker: { zh: "查驗員", vi: "Chữ ký QC", km: "អ្នកពិនិត្យ", en: "Checker / QC Signature" }
  };

  function updateLabels() {
    const langEl = $id("label-lang");
    if (!langEl) return;

    const lang = langEl.value;
    $$("[data-label]").forEach((el) => {
      const key = el.getAttribute("data-label");
      const pack = LABELS[key];
      if (!pack) return;
const oldMatCode = document.querySelector('[name="RI_mat_oldcode"]')?.value.trim() || '';
      const zh = pack.zh;
      const other = pack[lang] ?? pack.vi;

      if (key === "check") {
        el.innerHTML = `<div><span class="zh">${zh}</span><br><span class="vn">${other}</span></div>`;
        return;
      }
        if (key === "color") {
            // Cập nhật phần màu sắc với giá trị oldMatCode vẫn giữ lại
            const colorLabel = document.getElementById('preview-color-label');
            if (colorLabel) {
                colorLabel.textContent = `${(lang === 'vi' ? 'Màu sắc' : (lang === 'km' ? 'ពណ៌' : '顏色'))}: (${oldMatCode})`;
            }
            return;
        }
      if (key === "matname") {
        el.innerHTML = `<div><span class="zhb">${zh}</span><span class="vnb">${other}</span></div>`;
        return;
      }
      if (key === "po") {
        el.innerHTML = `<div><span class="zhbx">${zh}</span><span class="vnbx">${other}</span></div>`;
        return;
      }
      if (key === "qualified" || key === "unqualified") {
        el.innerHTML = `<div><span class="zh">${zh}</span><span class="vn">${other}</span></div>`;
        return;
      }

      el.innerHTML = `<div><span class="zhbs">${zh}</span><span class="vnbs">${other}</span></div>`;
    });
  }

  function initLabelLang() {
    const langEl = $id("label-lang");
    if (!langEl) return;
    langEl.addEventListener("change", updateLabels);
    updateLabels();
  }

  // ========= 3) Enable/disable buttons =========
function setRIButtonsEnabled(enabled) {
  RI_ACTION_BUTTON_IDS.forEach(id => {
    const btn = document.querySelector(id);
    if (!btn) return;

    btn.disabled = !enabled;
    btn.classList.toggle('opacity-50', !enabled);
    btn.classList.toggle('cursor-not-allowed', !enabled);
    btn.classList.toggle('pointer-events-none', !enabled);
  });
}



function convertDateString(dateString) {
  // Tạo đối tượng Date từ chuỗi ngày
  const date = new Date(dateString);
  
  // Kiểm tra nếu ngày không hợp lệ
  if (isNaN(date)) {
    console.error("Invalid date string");
    return "";
  }
  
  // Lấy năm, tháng và ngày với định dạng "yyyy-MM-dd"
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');  // Tháng từ 0 đến 11, phải cộng thêm 1
  const dd = String(date.getDate()).padStart(2, '0');  // Đảm bảo ngày có 2 chữ số
  
  // Trả về giá trị theo định dạng "yyyy-MM-dd"
  return `${yyyy}-${mm}-${dd}`;
}


async function loadInspectionDetail(ri_no) {
  clearInterval(window.__RI_AUTO_TIMER__);
  DETAIL_MODE = true;
  lockTC_PO();
  setLoading(true);

  try {
    if (!window.kbAPI?.getInspectionDetail) {
      throw new Error("kbAPI.getInspectionDetail chưa được expose trong preload.js");
    }

    const data = await window.kbAPI.getInspectionDetail(ri_no);
    window.__INSPECTION_DETAIL_CACHE__ = data;
    DETAIL_MODE = true;
setRIButtonsEnabled(true);
    setLoading(false);
const cbFix = document.querySelector('input[type="checkbox"][name="RI_ischanged"]');
if (cbFix) {
  cbFix.checked = Number(data.inspection.RI_ischanged) === 1;
}
    if (!data?.inspection) {
      toastError("Không tìm thấy dữ liệu");
      return;
    }
  const riDate = convertDateString(data?.inspection?.RI_date) || '';
  const riii = document.getElementById("RI_date");
  if (riii) riii.value = riDate;

    // Fill inputs theo name=""
    Object.keys(data.inspection).forEach((key) => {
      const input = document.querySelector(`[name="${key}"]`);
      if (!input) return;

      let val = data.inspection[key] ?? "";

      // ✅ 1) Checkbox: chỉ xử lý nếu input hiện tại là checkbox
      // ✅ 2) Date input: convert format DB -> YYYY-MM-DD
      if (input.type === "date") {
        input.value = convertDateString(val);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }

      // ✅ 3) Select
      if (input.tagName === "SELECT") {
        if (val && !Array.from(input.options).some((opt) => opt.value == val)) {
          const opt = document.createElement("option");
          opt.value = val;
          opt.text = val;
          input.appendChild(opt);
        }
        input.value = val;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }

      // ✅ 4) Default input/textarea
      input.value = val;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

   // 🔧 FIX RI material name
if (data.inspection?.RI_mat_fullname) {
  const cn = document.getElementById("mat_fullname");
  if (cn) cn.value = data.inspection.RI_mat_fullname;
}

if (data.inspection?.RI_mat_oldcode) {
  const oldcode1 = document.getElementById("mat_oldcode");
  if (oldcode1) oldcode1.value = data.inspection.RI_mat_oldcode;
}

if (data.inspection?.RI_mat_fullename) {
  const en = document.getElementById("mat_fullename");
  if (en) en.value = data.inspection.RI_mat_fullename;
}

const vendSelect = document.getElementById('vend_code_select');
const vendNameInput = document.getElementById('vend_name_input');

const vendCode = data.inspection.RI_vend_code;
const vendName = data.inspection.RI_vend_name;

if (vendSelect && vendCode) {
  let opt = [...vendSelect.options].find(o => o.value === vendCode);
  if (!opt) {
    opt = document.createElement('option');
    opt.value = vendCode;
    opt.text = vendName || vendCode;
    opt.setAttribute('data-vend_name', vendName || '');
    vendSelect.appendChild(opt);
  }
  vendSelect.value = vendCode;
  if (vendNameInput) vendNameInput.value = vendName || '';
}




    // ✅ SYNC SIGNATURE PREVIEW
    const signMap = [
      { key: 'RI_manager_sign',     imgId: 'sign-preview-manager',     hiddenId: 'sign-field-manager' },
      { key: 'RI_storekeeper_sign', imgId: 'sign-preview-storekeeper', hiddenId: 'sign-field-storekeeper' },
      { key: 'RI_inspector_sign',   imgId: 'sign-preview-inspector',   hiddenId: 'sign-field-inspector' },
    ];

    signMap.forEach(({ key, imgId, hiddenId }) => {
      const base64 = data.inspection?.[key];

      // hidden
      const hidden = document.getElementById(hiddenId);
      if (hidden) hidden.value = base64 || '';

      // preview
      const img = document.getElementById(imgId);
      if (!img) return;

      if (base64 && String(base64).startsWith('data:image')) {
        img.src = base64;
        img.style.display = 'block';
      } else {
        img.src = '';
        img.style.display = 'none';
      }
    });

    // ✅ SYNC QTY FROM BACKEND
    const poQty = Number(data.inspection?.RM_po_qty ?? 0);
    const contQty = Number(data.inspection?.RM_container_qty ?? 0);

    const poHidden  = document.getElementById('po-purchase-qty');
    const poDisplay = document.getElementById('po-purchase-qty-display');
    if (poHidden)  poHidden.value  = poQty;
    if (poDisplay) poDisplay.value = poQty;

    const cHidden  = document.getElementById('container-qty');
    const cDisplay = document.getElementById('container-qty-display');
    if (cHidden)  cHidden.value  = contQty;
    if (cDisplay) cDisplay.value = contQty;

    setTimeout(() => {
      updateTotalsAndPercent();
    }, 0);

  } catch (err) {
    console.error(err);
    setLoading(false);
    toastError(err.message || "Load detail failed");
  }
}


  // expose function nếu bạn cần gọi từ nơi khác
  window.loadInspectionDetail = loadInspectionDetail;




// ===== FORCE PO READONLY VIEW =====
const poInput   = document.getElementById('bill-code-input');
const poSelect  = document.getElementById('bill-code-select');
const poDisplay = document.getElementById('po-selected-display');
const tcInput   = document.getElementById('tc-code-input');


if (poSelect) {
  poSelect.classList.add('hidden');
}

if (poInput) {
  poInput.classList.remove('hidden');
  poInput.readOnly = false;   // ✅ LUÔN CHO GÕ KHI MỚI VÀO
  poInput.disabled = false;
}

renderMaterialGradeTable();    // đảm bảo A–F tồn tại
bindMaterialGradeEvents();     // bind lại input
updateTotalsAndPercent();      // tính lại



let sidebarInspectionData = [];

async function loadSidebarInspections(rmType = 'A') {
  const tbody = document.getElementById('sidebar-inspection-table');
  if (!tbody) return;

  const data = await window.kbAPI.getSidebarInspections(rmType, 500);
  sidebarInspectionData = data || [];

  renderSidebarTable(sidebarInspectionData);
}


function renderSidebarTable(data) {
  const tbody = document.getElementById('sidebar-inspection-table');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center p-2 text-gray-500">
          Không có dữ liệu
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = data.map(row => {
    const created = row.created
      ? String(row.created).substring(0, 10)
      : '';

    const riDate = row.RI_date
      ? String(row.RI_date).substring(0, 10)
      : '';

    return `
      <tr class="hover:bg-blue-50 cursor-pointer">
        <td class="px-2 py-1">${created}</td>
        <td class="px-2 py-1 font-medium">${String(row.RI_no || '').toUpperCase()}</td>
        <td class="px-2 py-1">${String(row.ERP_po_no || '').toUpperCase()}</td>
        <td class="px-2 py-1">${row.RI_vend_name || ''}</td>
        <td class="px-2 py-1">${row.RI_mat_code || ''}</td>
        <td class="px-2 py-1">${riDate}</td>

        <!-- ✅ ACTION: DELETE ICON -->
        <td class="px-2 py-1 text-center">
          <button
            type="button"
            class="btn-delete-row"
            data-del="${row.RI_no}"
            title="Xóa biên bản"
          >
            <svg xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4">
              <path d="M3 6h18"/>
              <path d="M8 6V4h8v2"/>
              <path d="M6 6l1 14h10l1-14"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // 🔥 bind lại delete event (rất quan trọng)
  tbody.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); // không trigger click row
      const ri = btn.getAttribute('data-del');
      confirmDelete?.(ri);
    });
  });
}



function applySidebarFilter() {
  const f = id => document.getElementById(id)?.value.trim().toLowerCase() || '';

  const filters = {
    created:  f('filter-created'),
    ri:       f('filter-ri-no'),
    po:       f('filter-po'),
    vendor:   f('filter-vendor'),
    material: f('filter-material'),
    date:     f('filter-date'),
  };

  const filtered = sidebarInspectionData.filter(row => {
    return (
      (!filters.created ||
  String(row.created || '').toLowerCase().includes(filters.created)) &&
      (!filters.ri       || row.RI_no?.toLowerCase().includes(filters.ri)) &&
      (!filters.po       || row.ERP_po_no?.toLowerCase().includes(filters.po)) &&
      (!filters.vendor   || row.RI_vend_name?.toLowerCase().includes(filters.vendor)) &&
      (!filters.material || row.RI_mat_code?.toLowerCase().includes(filters.material)) &&
      (!filters.date     || row.RI_date?.includes(filters.date))
    );
  });

  renderSidebarTable(filtered);
}


window.loadSidebarInspections = loadSidebarInspections;

// setting
const modalSetting = document.getElementById('settings-modal');
const btn = document.getElementById('settings-btn');
const close = document.getElementById('settings-close');

if (btn && modalSetting) {
  btn.onclick = async () => {
    modalSetting.classList.remove('hidden');

    // 🔥 LOAD PRINTER LIST TẠI ĐÂY
    await loadPrinterList();
  };
}


if (close && modalSetting) {
  close.onclick = () => modalSetting.classList.add('hidden');
}

// click backdrop để đóng
modalSetting?.addEventListener('click', e => {
  if (e.target === modalSetting) {
    modalSetting.classList.add('hidden');
  }
});
window.confirmDelete = async function (ri_no) {
  const ok = await confirmBox({
    title: 'Delete inspection',
    message: `Do you want to delete RI: ${ri_no}?`,
    okText: 'Delete',
    danger: true
  });

  if (!ok) return;

  try {
    await window.kbAPI.deleteInspection(ri_no);

    showToastSuccess('Deleted successfully !');

    // reload sidebar@
    await loadSidebarInspections?.();

  } catch (err) {
    console.error(err);
    showToastError(err?.message || 'Delete failed');
  }
};

window.confirmDeleteRID = async function ({ ri_no, rid_no }) {
  const ok = await confirmBox({
    title: 'Delete QC label',
    message: `Do you want to delete RID: ${rid_no}?`,
    okText: 'Delete',
    danger: true
  });

  if (!ok) return;

  try {
    if (!window.kbAPI?.deleteRid) {
      throw new Error('deleteRid API not found');
    }

    const result = await window.kbAPI.deleteRid({
      RI_no: ri_no,
      RID_no: rid_no
    });

    if (!result?.success) {
      throw new Error(result?.message || 'Delete failed');
    }

    showToastSuccess('Deleted successfully!');

    // reload list RID
    await loadRIDList?.(ri_no, false);

  } catch (err) {
    console.error(err);
    showToastError(err?.message || 'Delete failed');
  }
};



const sidebar  = document.getElementById('inspection-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
const closeBtn  = document.getElementById('sidebar-close');

function openSidebar(rmType = 'A') {
      if (!sidebar) return; // 👈 CHỐT CHẶN
  // reset filter (nếu có)
  const ids = ['filter-ri-no','filter-po','filter-vendor','filter-material','filter-date','filter-created'];
  ids.forEach(id => document.getElementById(id) && (document.getElementById(id).value = ''));

  // hiện sidebar
  sidebar.classList.remove('-translate-x-full');
  sidebar.classList.add('translate-x-0');

  // load data
  loadSidebarInspections?.(rmType);
}

function closeSidebar() {
  // reset filter (nếu có)
    if (!sidebar) return; // 👈 CHỐT CHẶN
  const ids = ['filter-ri-no','filter-po','filter-vendor','filter-material','filter-date','filter-created'];
  ids.forEach(id => document.getElementById(id) && (document.getElementById(id).value = ''));

  // ẩn sidebar
  sidebar.classList.add('-translate-x-full');
  sidebar.classList.remove('translate-x-0');
}

// gắn click
// document.addEventListener('DOMContentLoaded', () => {
//   if (toggleBtn) toggleBtn.addEventListener('click', () => openSidebar('A'));
//   if (closeBtn)  closeBtn.addEventListener('click', closeSidebar);
// });


// bind sau khi DOM đã có
// bind sau khi DOM đã có
function bindSidebarEvents() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const closeBtn  = document.getElementById('sidebar-close');
  const tbody     = document.getElementById('sidebar-inspection-table');

  if (toggleBtn) toggleBtn.addEventListener('click', () => openSidebar('A'));
  if (closeBtn)  closeBtn.addEventListener('click', closeSidebar);

  if (!tbody) return;

  // Thêm sự kiện dblclick vào tbody
  tbody.addEventListener('dblclick', function(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    const ri_no = row.cells?.[1]?.innerText?.trim();  // Lấy giá trị ri_no từ cột thứ 2
    if (!ri_no) return;

    // Gọi hàm lấy chi tiết bản kiểm tra
    loadInspectionDetail?.(ri_no); 
    closeSidebar();  // Đóng sidebar
  });
[
  'filter-created',
  'filter-ri-no',
  'filter-po',
  'filter-vendor',
  'filter-material',
  'filter-date'
].forEach(id => {
  document.getElementById(id)
    ?.addEventListener('input', applySidebarFilter);
});


  // Touch hold (giữ ngón tay trên thiết bị di động)
  let pressTimer = null;
  tbody.addEventListener('touchstart', function(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    pressTimer = setTimeout(() => {
      const ri_no = row.cells?.[1]?.innerText?.trim(); // Lấy giá trị ri_no từ cột thứ 2
      if (!ri_no) return;

  setRIButtonsEnabled(true); // ✅
      loadInspectionDetail?.(ri_no); // Gọi hàm lấy chi tiết bản kiểm tra
      closeSidebar(); // Đóng sidebar
    }, 500);
  });

  tbody.addEventListener('touchend', () => clearTimeout(pressTimer));
  tbody.addEventListener('touchmove', () => clearTimeout(pressTimer));
}

window.bindSidebarEvents = bindSidebarEvents;


// window.addEventListener('DOMContentLoaded', function() {
//   bindSidebarEvents();
// });





async function submitInspectionForm(e) {
  clearInterval(window.__RI_AUTO_TIMER__);
  e.preventDefault();

  const form = document.getElementById('item-check-form');
  if (!form) return;

  // 1️⃣ mở khóa select bị disabled
  const lockedIds = ['brand_name_select', 'mat_codeone', 'vend_code_select'];
  lockedIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.disabled) {
      el.dataset.wasDisabled = '1';
      el.disabled = false;
    }
  });

  // 2️⃣ collect payload
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  // 🔥 FIX RI_ischanged → 0 / 1
  const cb = form.querySelector('input[name="RI_ischanged"]');
  payload.RI_ischanged = cb?.checked ? 1 : 0;

  // 🔥 FORCE RI_no
  payload.RI_no = document.getElementById('RI_no')?.value || null;


  // 3️⃣ khóa lại select
  lockedIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.dataset.wasDisabled === '1') {
      el.disabled = true;
      delete el.dataset.wasDisabled;
    }
  });

  // 4️⃣ disable button
  const btn = form.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Waiting...';
  }

  try {
    console.log('SUBMIT PAYLOAD:', payload);
    // 👉 CHECK Ở ĐÂY:
    // RI_ischanged: 0 | 1

await window.kbAPI.saveInspection(payload);

DETAIL_MODE = true;
setRIButtonsEnabled(true);

showToastSuccess('✅ Saved successfully');

const ri_no = payload.RI_no;



if (ri_no) {
  await loadInspectionDetail(ri_no);
}
  } catch (err) {
    console.error(err);
    showToastError(err?.message || '❌ Save failed');
  } finally {
    applyLanguage?.(localStorage.getItem('app_lang') || 'en');
    if (btn) {
      btn.disabled = false;
   btn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg"
    class="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor">
    <path stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M17 16v5H7v-5M12 12v9M4 7h16l-2-3H6L4 7z" />
  </svg>
  <span data-i18n="btn.save"></span>
`;
    }
  }
}


// document.addEventListener('DOMContentLoaded', () => {
//   document
//     .getElementById('item-check-form')
//     ?.addEventListener('submit', submitInspectionForm);
// });

// window.addEventListener('DOMContentLoaded', async () => {
//   const lastRI = localStorage.getItem('last_ri_no');
//   if (!lastRI) return;

//   localStorage.removeItem('last_ri_no');

//   enableRIButtons?.();
//   await loadSidebarInspections?.();
//   loadInspectionDetail?.(lastRI);
// });

// async function saveHistoryRecords() {
//   const records = [];

//   // lấy ri_no
//   const riNoEl = document.querySelector('[name="RI_no"]');
//   const ri_no = riNoEl ? riNoEl.value : "";

//   const rows = document.querySelectorAll('#history-modal tbody tr');
//   rows.forEach((row, idx) => {
//     const sliceNO = idx + 1;

//     const originEl = row.querySelector('input[name^="history"][name$="[origin]"]');
//     const actualEl = row.querySelector('input[name^="history"][name$="[actual]"]');

//     const origin = originEl ? originEl.value : "";
//     const actual = actualEl ? actualEl.value : "";

//     // bỏ qua nếu cả 2 rỗng
//     if (!origin && !actual) return;

//     let diff = null;
//     if (origin && actual) {
//       diff = (parseFloat(actual) - parseFloat(origin)).toFixed(2);
//     }

//     const neckEl = row.querySelector('input[name^="history"][name$="[neck]"]');
//     const backEl = row.querySelector('input[name^="history"][name$="[back]"]');
//     const hipEl  = row.querySelector('input[name^="history"][name$="[hip]"]');

//     records.push({
//       ri_no,
//       ri_type: 'A',
//       ri_sliceNO: sliceNO,
//       ri_leather_org: origin || null,
//       ri_leather_width: actual || null,
//       ri_leather_diff: diff,
//       ri_thick_neck: neckEl ? (neckEl.value || null) : null,
//       ri_thick_back: backEl ? (backEl.value || null) : null,
//       ri_thick_bottom: hipEl ? (hipEl.value || null) : null,
//     });
//   });

//   if (!records.length) {
//     showToastSuccess("Không có dòng nào để lưu!");
//     return;
//   }

//   try {
//     // IPC (fake)
//     await window.kbAPI.saveHistory(records);
//     showToastSuccess("✅ Saved history (fake)!");
//     closeHistoryModal?.();
//   } catch (err) {
//     console.error(err);
//     showToastError("❌ Lưu thất bại (fake)");
//   }
// }
// window.saveHistoryRecords = saveHistoryRecords;


let remarkSignaturePad = null;

function toggleRemarkInput() {
  const selectedRadio = document.querySelector('input[name="remark_type"]:checked');
  if (!selectedRadio) return;

  const type = selectedRadio.value;
  const textarea = document.getElementById('RI_remark');
  const textareaBlock = document.getElementById('remark-textarea-block');
  const signBlock = document.getElementById('remark-sign-block');

  if (type === 'text') {
    if (textareaBlock) textareaBlock.style.display = 'block';
    if (signBlock) signBlock.style.display = 'none';
    if (textarea) textarea.disabled = false;
  } else {
    if (textareaBlock) textareaBlock.style.display = 'none';
    if (signBlock) signBlock.style.display = 'block';
    if (textarea) textarea.disabled = true;
  }

  const remarkTypeInput = document.querySelector('input[name="remark_type_hidden"]');
  if (remarkTypeInput) remarkTypeInput.value = type;
}
window.toggleRemarkInput = toggleRemarkInput;

function clearRemarkSign() {
  if (remarkSignaturePad) remarkSignaturePad.clear();
  const hidden = document.getElementById('RI_remark_sign');
  if (hidden) hidden.value = '';
}
window.clearRemarkSign = clearRemarkSign;

function bindRemarkSignature() {
  toggleRemarkInput();

  const canvas = document.getElementById('remark-sign-canvas');
  if (!canvas || !window.SignaturePad) return;

  remarkSignaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgba(255,255,255,0)',
    penColor: 'black'
  });

  const form = document.getElementById('item-check-form');
  if (!form) return;

  form.addEventListener('submit', function () {
    const selectedType = document.querySelector('input[name="remark_type"]:checked')?.value;
    const hidden = document.getElementById('RI_remark_sign');
    if (!hidden) return;

    if (selectedType === 'sign') {
      hidden.value = remarkSignaturePad && !remarkSignaturePad.isEmpty()
        ? remarkSignaturePad.toDataURL()
        : '';
    } else {
      hidden.value = '';
    }
  });
}
window.bindRemarkSignature = bindRemarkSignature;



function resetFullMaterialFields() {
  const poSelect  = document.getElementById('bill-code-select');
  const poInput   = document.getElementById('bill-code-input');
  const poDisplay = document.getElementById('po-selected-display');

  if (poSelect) {
    poSelect.innerHTML = "";
    poSelect.classList.add('hidden');
  }
  if (poInput) {
    poInput.classList.remove('hidden');
    poInput.readOnly = false;
    poInput.value = "";
  }
  if (poDisplay) poDisplay.textContent = "";

  const mat = document.getElementById('mat_codeone');
  if (mat) {
    mat.innerHTML = '<option value="">--</option>';
    mat.value = "";
  }

  const brand = document.getElementById('brand_name_select');
  if (brand) {
    brand.innerHTML = '<option value="">--</option>';
    brand.value = "";
  }

  const matFull = document.getElementById('mat_fullname');
  const matE = document.getElementById('mat_fullename');
  if (matFull) matFull.value = "";
  if (matE) matE.value = "";

  const oldCodeEl = document.getElementById('mat_oldcode');
  if (oldCodeEl) oldCodeEl.value = "";

  const custBrand = document.getElementById('RI_custbrand_id');
  const brandCode = document.getElementById('RI_brand_code');
  if (custBrand) custBrand.value = "";
  if (brandCode) brandCode.value = "";

  const vend = document.getElementById('vend_code_select');
  const vendName = document.getElementById('vend_name_input');
  if (vend) {
    vend.innerHTML = '<option value="">--</option>';
    vend.value = "";
  }
  if (vendName) vendName.value = "";

  const ship = document.getElementById('shippingway_input');
  if (ship) ship.value = "";
}
window.resetFullMaterialFields = resetFullMaterialFields;



function renderMaterialData(data) {
  materialData = Array.isArray(data) ? data : [];

  const brandSelect = document.getElementById('brand_name_select');
  const matSelect   = document.getElementById('mat_codeone');
const vendorSelect = document.getElementById('vend_code_select');

  if (!brandSelect || !matSelect || !vendorSelect) return;

  // ===== BRAND =====
  const brands = [...new Set(
    materialData.map(x => x.brand_name).filter(Boolean)
  )];

  brandSelect.innerHTML =
    '<option value="">-- Brand --</option>' +
    brands.map(b => `<option value="${b}">${b}</option>`).join('');

  // ===== MATERIAL =====
  const materials = [...new Set(
    materialData.map(x => x.mat_codeone).filter(Boolean)
  )];

  matSelect.innerHTML =
    '<option value="">-- Material --</option>' +
    materials.map(m => `<option value="${m}">${m}</option>`).join('');


     const vendors = [...new Set(
    materialData.map(x => x.vend_name).filter(Boolean)
  )];

  vendorSelect.innerHTML =
    '<option value="">-- Manufacturer --</option>' +
    vendors.map(v => `<option value="${v}">${v}</option>`).join('');

  // 👉 AUTO select nếu chỉ có 1 material
 if (materials.length === 1 && brands.length === 1 && vendors.length === 1) {
    matSelect.value = materials[0];
    brandSelect.value = brands[0];
    vendorSelect.value = vendors[0]; // Cập nhật giá trị Manufacturer tự động
    updateMaterialNamesAndVendor(); // gọi tay 1 lần
  } else {
    if (materials.length === 1) matSelect.dispatchEvent(new Event('change'));
    if (brands.length === 1) brandSelect.dispatchEvent(new Event('change'));
    if (vendors.length === 1) vendorSelect.dispatchEvent(new Event('change')); // Nếu chỉ có 1 vendor thì chọn luôn
  }

}

window.renderMaterialData = renderMaterialData;

poSelect.addEventListener('mousedown', function (e) {
  if (e.target.tagName !== 'OPTION') return;

  e.preventDefault();
  e.target.selected = !e.target.selected;

  // 🔥 FORCE REPAINT
  poSelect.blur();
  poSelect.focus();

  poSelect.dispatchEvent(new Event('change'));
});


async function fetchTCInfo() {
    lastFetchKey = "";  
  const tcInput = document.getElementById('tc-code-input');
  const poInput = document.getElementById('bill-code-input');
  const poSelect = document.getElementById('bill-code-select');
  const poDisplay = document.getElementById('po-selected-display');
  const loader = document.querySelector(".loader");

  if (!tcInput) return;
  const tcCode = tcInput.value.trim();

  loader?.classList.remove("hidden");

  // reset PO mỗi lần TC đổi
  if (poSelect) {
    poSelect.innerHTML = "";
    poSelect.classList.add('hidden');
  }
if (poInput) {
  poInput.classList.remove('hidden');
  poInput.readOnly = true;    // ✅ KHÓA PO KHI CÓ TC
  poInput.value = "";
}
  if (poDisplay) poDisplay.textContent = "";

  // TC rỗng
  if (tcCode === "") {
    resetFullMaterialFields();
    loader?.classList.add("hidden");
    poInput?.classList.remove('bg-gray-100', 'cursor-not-allowed');
    return;
  }
  // TC quá ngắn
  if (tcCode.length < 2) {
    renderMaterialData([]);
    resetFullMaterialFields();
    loader?.classList.add("hidden");
    return;
  }

  try {
    // IPC fake search
    const data = await window.kbAPI.searchTC(tcCode);
    renderMaterialData(data);

    // ===== AUTO FILL QTY AFTER TC SEARCH =====

    

    // khóa PO input nếu bạn muốn
    poInput?.classList.add('bg-gray-100', 'cursor-not-allowed');
  } catch (err) {
    console.error(err);
  } finally {
    loader?.classList.add("hidden");
  }
}
window.fetchTCInfo = fetchTCInfo;

function bindTCEvents() {
  const tcInput = document.getElementById('tc-code-input');
  if (!tcInput) return;

  tcInput.addEventListener('input', function() {
    if (this.value.trim().length === 0) resetFullMaterialFields();
  });

  tcInput.addEventListener('blur', fetchTCInfo);
  tcInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') fetchTCInfo();
  });
}
window.bindTCEvents = bindTCEvents;

// window.addEventListener('DOMContentLoaded', () => {
//   bindRemarkSignature?.();
//   bindTCEvents?.();
// });

async function updateMaterialNamesAndVendor() {
   if (DETAIL_MODE) return; // 🔥 CHỐT CHẶN
  const matSelect = document.getElementById('mat_codeone');
  const brandSelect = document.getElementById('brand_name_select');
  const vendSelect = document.getElementById('vend_code_select');

  if (!matSelect || !brandSelect || !vendSelect) return;

  const mat_codeone = matSelect.value || "";
  const brand_name = brandSelect.value || "";

  // ưu tiên trùng cả mat + brand
  const item =
    materialData.find(x => x.mat_codeone === mat_codeone && x.brand_name === brand_name) ||
    materialData.find(x => x.mat_codeone === mat_codeone) ||
    {};

  // gọi qty (fake IPC)
  try { await fetchPoQtyForRow(item); } catch (e) { console.warn(e); }

  // fill material fields
  const matFull = document.getElementById('RI_mat_name');
  const matE = document.getElementById('RI_mat_ename');
  const custBrand = document.getElementById('RI_custbrand_id');
  const brandCode = document.getElementById('RI_brand_code');
  const oldCode = document.getElementById('mat_oldcode');

  if (matFull) matFull.value = item.mat_fullname || '';
  if (matE) matE.value = item.mat_fullename || '';
  if (custBrand) custBrand.value = item.custbrand_id || '';
  if (brandCode) brandCode.value = item.brand_code || '';
  if (oldCode) oldCode.value = item.mat_oldcode || '';

  // ===== FILL PO THEO MATERIAL ĐÚNG =====
  const poSelect = document.getElementById('bill-code-select');
  const poInput  = document.getElementById('bill-code-input');
  const poDisplay = document.getElementById('po-selected-display');

  if (poSelect && poInput && poDisplay) {
    poSelect.classList.add('hidden');
    poInput.classList.remove('hidden');
    poDisplay.textContent = "";
    poSelect.innerHTML = "";

    if (item.polist) {
      const poList = [...new Set(
        String(item.polist).split(',')
          .map(p => p.trim())
          .filter(Boolean)
      )];

      if (poList.length > 1) {
        poInput.classList.add('hidden');
        poSelect.classList.remove('hidden');

        // multiple select: default selected all (giống bạn)
        poSelect.innerHTML = poList.map(p => `<option value="${p}" selected>${p}</option>`).join('');
        poSelect.dispatchEvent(new Event('change'));
      }

      if (poList.length === 1) {
        poInput.value = poList[0];
        poDisplay.textContent = poList[0]; // bạn muốn "Selected:" thì tự thêm
      }
    }
  }

  // ===== render vendor list theo mat + brand =====
  let vendors = materialData.filter(x => x.mat_codeone === mat_codeone && x.brand_name === brand_name);
  if (!brand_name) vendors = materialData.filter(x => x.mat_codeone === mat_codeone);

  const vendorMap = {};
  const distinctVendor = [];
  vendors.forEach(v => {
    if (v.vend_code && !vendorMap[v.vend_code]) {
      vendorMap[v.vend_code] = true;
      distinctVendor.push(v);
    }
  });

  vendSelect.innerHTML =
    '<option value="">-- Manufacturer --</option>' +
    distinctVendor.map(v =>
      `<option value="${v.vend_code}" data-vend_name="${v.vend_name || ''}">${v.vend_name || v.vend_code}</option>`
    ).join('');

  const vendNameInput = document.getElementById('vend_name_input');
  if (distinctVendor.length === 1) {
    vendSelect.value = distinctVendor[0].vend_code;
    if (vendNameInput) vendNameInput.value = distinctVendor[0].vend_name || '';
  } else {
    if (vendNameInput) vendNameInput.value = '';
  }

  // shippingway
  const shipSel = document.getElementById('shippingway_select');
  if (item.shippingway && shipSel) {
    shipSel.value = item.shippingway;
  }
}
window.updateMaterialNamesAndVendor = updateMaterialNamesAndVendor;

// bind event an toàn
document.getElementById('mat_codeone')
  ?.addEventListener('change', () => {
    if (DETAIL_MODE) return;
    updateMaterialNamesAndVendor();
  });
document.getElementById('brand_name_select')?.addEventListener('change', updateMaterialNamesAndVendor);


function fillMaterialFields() {
  const brandSel = document.getElementById('brand_name_select');
  const matSel = document.getElementById('mat_codeone');
  if (!brandSel || !matSel) return;

  let brand_name = brandSel.value || "";
  let mat_codeone = matSel.value || "";

  // lọc vendor theo mat + brand
  let filtered = materialData.filter(x =>
    x.mat_codeone === mat_codeone && (brand_name ? x.brand_name === brand_name : true)
  );

  // nếu chưa chọn brand -> thử auto chọn nếu chỉ có 1 brand
  if (!brand_name) {
    const brands = Array.from(new Set(filtered.map(x => x.brand_name))).filter(Boolean);
    if (brands.length === 1) {
      brandSel.value = brands[0];
      brand_name = brands[0];
      filtered = materialData.filter(x => x.mat_codeone === mat_codeone && x.brand_name === brand_name);
    }
  }

  const item = filtered[0] || {};

  document.getElementById('mat_fullname') && (document.getElementById('mat_fullname').value = item.mat_fullname || '');
  document.getElementById('mat_fullename') && (document.getElementById('mat_fullename').value = item.mat_fullename || '');
  document.getElementById('RI_custbrand_id') && (document.getElementById('RI_custbrand_id').value = item.custbrand_id || '');
  document.getElementById('mat_oldcode') && (document.getElementById('mat_oldcode').value = item.mat_oldcode || '');

  const vendSelect = document.getElementById('vend_code_select');
  if (!vendSelect) return;

  const vendorMap = {};
  const distinctVendor = [];
  filtered.forEach(it => {
    if (it.vend_code && !vendorMap[it.vend_code]) {
      vendorMap[it.vend_code] = true;
      distinctVendor.push(it);
    }
  });

  vendSelect.innerHTML =
    '<option value="">-- Manufacturer --</option>' +
    distinctVendor.map(it =>
      `<option value="${it.vend_code}" data-vend_name="${it.vend_name || ''}">${it.vend_name || it.vend_code}</option>`
    ).join('');

  const vendName = document.getElementById('vend_name_input');
  if (distinctVendor.length === 1) {
    vendSelect.value = distinctVendor[0].vend_code;
    if (vendName) vendName.value = distinctVendor[0].vend_name || '';
  } else {
    if (vendName) vendName.value = '';
  }

  const shipInput = document.getElementById('shippingway_input');
  if (item.shippingway && shipInput) shipInput.value = item.shippingway;
}
window.fillMaterialFields = fillMaterialFields;

document.getElementById('mat_codeone')?.addEventListener('change', fillMaterialFields);
document.getElementById('brand_name_select')?.addEventListener('change', fillMaterialFields);

// vendor change -> fill vend_name_input
document.getElementById('vend_code_select')?.addEventListener('change', function () {
  const opt = this.selectedOptions?.[0];
  const vendName = opt?.getAttribute('data-vend_name') || '';
  const input = document.getElementById('vend_name_input');
  if (input) input.value = vendName;
});
function formatAllNumberInputs() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    if (!input.value) return;
    const val = parseFloat(input.value);
    if (!isNaN(val)) input.value = val.toFixed(2);
  });
}
window.formatAllNumberInputs = formatAllNumberInputs;


function isRID(code) {
  return String(code || "").startsWith("RID");
}
window.isRID = isRID;

async function getPoByRID(ridCode) {
  try {
    // IPC fake
    return await window.kbAPI.getPoByRID(ridCode);
  } catch (e) {
    console.error('getPoByRID error:', e);
    return null;
  }
}
window.getPoByRID = getPoByRID;
async function fetchPOInfo() {

  const poInput = document.getElementById('bill-code-input');
  const tcInput = document.getElementById('tc-code-input');
  if (!poInput || !tcInput) return;

  const poCode = poInput.value.trim();
  const tcVal  = tcInput.value.trim();

  // ❌ KHÔNG chặn PO chỉ vì TC có giá trị
  if (tcVal.length > 0) return;

  // 🔑 key để tránh fetch trùng NGỮ CẢNH
  const fetchKey = `${poCode}|${tcVal}`;
  if (fetchKey === lastFetchKey) return;
  lastFetchKey = fetchKey;

  const loader = document.querySelector(".loader-po");

  // PO quá ngắn → KHÔNG fetch, KHÔNG wipe form
  if (poCode.length < 2) {
    loader?.classList.add("hidden");
    return;
  }

  loader?.classList.remove("hidden");

  try {
    const data = await window.kbAPI.searchPO(poCode);
    materialData = Array.isArray(data) ? data : [];
renderMaterialData(materialData);
    // ===== render BRAND =====
    const selectBrand = document.getElementById('brand_name_select');
    const brands = [...new Set(
      materialData.map(item => item.brand_name).filter(Boolean)
    )];

    if (selectBrand) {
      selectBrand.innerHTML =
        '<option value="">-- Brand --</option>' +
        brands.map(b => `<option value="${b}">${b}</option>`).join('');
    }

    document.getElementById('mat_fullname') && (document.getElementById('mat_fullname').value = '');
    document.getElementById('mat_fullename') && (document.getElementById('mat_fullename').value = '');
    document.getElementById('vend_name_input') && (document.getElementById('vend_name_input').value = '');
    document.getElementById('shippingway_input') && (document.getElementById('shippingway_input').value = '');

    // auto chọn brand nếu chỉ có 1
    if (brands.length === 1 && selectBrand) {
      selectBrand.value = brands[0];
      selectBrand.dispatchEvent(new Event('change'));
    }

  } catch (err) {
    console.error('fetchPOInfo error:', err);
  } finally {
    loader?.classList.add("hidden");
  }
}

window.fetchPOInfo = fetchPOInfo;

// (function () {
//   const sfKeywords = ['sf', 'ri_sf', 'sf_qty', 'ri_sf_qty'];
//   const candidates = Array.from(document.querySelectorAll('input.qty-input, input[name^="RI_"][name$="_qty"]'));

//   const gradeInputs = candidates.filter(input => {
//     const name = (input.name || '').toLowerCase().trim();
//     return /^ri_[a-f]_qty$/i.test(name);
//   });

//   gradeInputs.forEach(input => {
//     const name = (input.name || '').toLowerCase();
//     const isSF = sfKeywords.some(k => k && name.includes(k.toLowerCase()));
//     if (isSF) {
//       input.readOnly = false;
//       input.classList.remove('qty-readonly', 'bg-gray-50', 'text-gray-600', 'cursor-not-allowed');
//       return;
//     }
//     input.readOnly = true;
//     input.classList.add('qty-readonly', 'bg-gray-50', 'text-gray-600', 'cursor-not-allowed');
//   });
// })();
// document.getElementById('RID_LabDate')?.addEventListener('change', function () {
//   if (!this.value) return;
//   const parts = this.value.split('-');
//   this.setAttribute('data-display', `${parts[0]}/${parts[1]}/${parts[2]}`);
// });


function renderPOList(allPO) {
  if (!poSelect || !poInput || !poDisplay) return;

  poSelect.innerHTML = "";
  poSelect.classList.add('hidden');

  poInput.classList.remove('hidden');
  poInput.readOnly = false;
  poInput.value = "";
  poDisplay.textContent = "";

  if (!allPO || !allPO.length) return;

  poInput.classList.add('hidden');
  poSelect.classList.remove('hidden');
  poSelect.innerHTML = allPO.map(p => `<option value="${p}">${p}</option>`).join('');

  if (allPO.length === 1) {
    poSelect.value = allPO[0];
    poInput.value = allPO[0];
    poDisplay.textContent = allPO[0];
  }
}
window.renderPOList = renderPOList;

function syncTC_PO() {
  const tcInput = document.getElementById('tc-code-input');
  const poInput = document.getElementById('bill-code-input');
  const poSelect = document.getElementById('bill-code-select');

  if (!tcInput || !poInput) return;

  const tcVal = tcInput.value.trim();
  const poVal = poInput.value.trim();

  // ===== CASE 1: có TC → khóa PO =====
  if (tcVal.length > 0) {
    poInput.readOnly = true;
    poInput.classList.add('bg-gray-100', 'cursor-not-allowed');
    poSelect?.classList.add('hidden');
    return;
  }

  // ===== CASE 2: có PO → khóa TC =====
  if (poVal.length > 0) {
    tcInput.readOnly = true;
    tcInput.classList.add('bg-gray-100', 'cursor-not-allowed');
    return;
  }

  // ===== CASE 3: cả 2 rỗng → mở cả 2 =====
  poInput.readOnly = false;
  poInput.classList.remove('bg-gray-100', 'cursor-not-allowed');

  tcInput.readOnly = false;
  tcInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
}

window.syncTC_PO = syncTC_PO;

tcInput?.addEventListener('input', syncTC_PO);
// window.addEventListener('DOMContentLoaded', syncTC_PO);

// update hidden input khi select thay đổi
poSelect?.addEventListener('change', function () {
  const arr = [...poSelect.selectedOptions].map(o => o.value);
  if (poInput) poInput.value = arr.join(',');
  if (poDisplay) poDisplay.textContent = arr.length ? arr.join(', ') : "";

  if (poInput) poInput.readOnly = false;
  fetchPoQtyCurrentSelection();
});

// multi-select click như bạn


const poTooltip = document.getElementById('po-tooltip');

poInput?.addEventListener('click', () => {
  const fullPO = poInput.value?.trim();
  if (!fullPO || !poTooltip) return;

  poTooltip.textContent = fullPO;

  const rect = poInput.getBoundingClientRect();
  poTooltip.style.left = rect.left + 'px';
  poTooltip.style.top = (rect.bottom + 4) + 'px';
  poTooltip.style.display = 'block';

  if (DETAIL_MODE) return;
  fetchPoQtyCurrentSelection();
});

document.addEventListener('click', (e) => {
  if (!poTooltip) return;
  if (e.target?.id !== 'bill-code-input') {
    poTooltip.style.display = 'none';
  }
});

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVh();
window.addEventListener('resize', setVh);

function saveSelectedPrinter(name) {
  if (!name) {
    localStorage.removeItem("QC_PRINTER_NAME");
    console.log("🖨️ Printer cleared");
    return;
  }

  localStorage.setItem("QC_PRINTER_NAME", name);
  console.log("🖨️ Printer saved:", name);
}

async function loadPrinterList() {
  if (!window.kbAPI?.getPrinters) return;

  const printers = await window.kbAPI.getPrinters();
  const select = document.getElementById("printer-select");
  const badge  = document.getElementById("printer-default-badge");

  if (!select) return;

  const savedPrinter = localStorage.getItem("QC_PRINTER_NAME");

  select.innerHTML = `<option value="">-- Select Printer --</option>`;
  badge?.classList.add("hidden");

  printers.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.innerHTML = p.isDefault
  ? `<span class="inline-flex items-center gap-1 text-amber-600 font-medium">
       ⭐ ${p.displayName}
     </span>`
  : p.displayName;

    select.appendChild(opt);
  });

  // 🔥 ƯU TIÊN PRINTER ĐÃ SAVE
  if (savedPrinter && printers.some(p => p.name === savedPrinter)) {
    select.value = savedPrinter;
    console.log("🖨️ Restore saved printer:", savedPrinter);
    return;
  }

  // fallback default system printer
  const def = printers.find(p => p.isDefault);
  if (def) {
    select.value = def.name;
    badge?.classList.remove("hidden");
  }
}
document
  .getElementById("printer-select")
  ?.addEventListener("change", function () {
    saveSelectedPrinter(this.value);
  });


async function fetchPoQtyCurrentSelection() {
  if (DETAIL_MODE) return;

  const poList = document.getElementById('bill-code-input')?.value?.trim() || "";
  const matCode = document.getElementById('mat_codeone')?.value?.trim() || "";
  const tcCode  = document.getElementById('tc-code-input')?.value?.trim() || "";

  if (!poList || !matCode) return;

  try {
    const json = await window.kbAPI.getPoQtyCombined({ po_list: poList, mat_code: matCode, tc: tcCode });

    const purchaseQty  = Number(json?.original?.purchase_qty ?? 0);
    const containerQty = Number(json?.original?.container_qty ?? 0);

    const pHidden  = document.getElementById('po-purchase-qty');
    const pDisplay = document.getElementById('po-purchase-qty-display');
    if (pHidden)  pHidden.value  = purchaseQty;
    if (pDisplay) pDisplay.value = purchaseQty;

    const cHidden  = document.getElementById('container-qty');
    const cDisplay = document.getElementById('container-qty-display');
    if (cHidden)  cHidden.value  = containerQty;
    if (cDisplay) cDisplay.value = containerQty;
  } catch (err) {
    console.error("fetchPoQtyCurrentSelection error:", err);
  }
}
window.fetchPoQtyCurrentSelection = fetchPoQtyCurrentSelection;
async function fetchPoQtyForRow(row) {
  if (DETAIL_MODE) return;

  const poList = row?.polist || document.getElementById('bill-code-input')?.value?.trim() || "";
  const matCode = row?.mat_code || row?.mat_codeone || "";
  const tcCode  = document.getElementById('tc-code-input')?.value?.trim() || "";

  if (!poList || !matCode) return;

  try {
    const json = await window.kbAPI.getPoQtyCombined({ po_list: poList, mat_code: matCode, tc: tcCode });

    const purchaseQty  = Number(json?.original?.purchase_qty ?? 0);
    const containerQty = Number(json?.original?.container_qty ?? 0);

    const pHidden  = document.getElementById('po-purchase-qty');
    const pDisplay = document.getElementById('po-purchase-qty-display');
    if (pHidden)  pHidden.value  = purchaseQty;
    if (pDisplay) pDisplay.value = purchaseQty;

    const cHidden  = document.getElementById('container-qty');
    const cDisplay = document.getElementById('container-qty-display');
    if (cHidden)  cHidden.value  = containerQty;
    if (cDisplay) cDisplay.value = containerQty;
  } catch (e) {
    console.error("fetchPoQtyForRow error:", e);
  }
}
window.fetchPoQtyForRow = fetchPoQtyForRow;




document.getElementById('btn-new')?.addEventListener('click', () => {
  lastFetchKey = "";
  location.reload();
});

async function initUserInfo() {
  console.log('===================')
  try {
    // if (!window.kbAPI?.getRememberedLogin) return;

     const info = await window.kbAPI.getUserInfo();
     console.log(info,'infoooo')
document.querySelector('.user-name').textContent =
  info?.employee_name || info?.user || '';
  } catch (err) {
    console.error('Cannot load user', err);
  }
}



function bindMaterialGradeEvents() {
  document
    .querySelectorAll('#grade-tbody .qty-input, input[name="RI_R_qty"]')
    .forEach(input => {
      input.addEventListener('input', updateTotalsAndPercent);
    });
}


function ensureModalInBody() {
  const modal = document.getElementById('modal-preview');
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
}

  window.logout =  async function logout() {
  const ok = await confirmBox({
    title: 'Logout',
    message: 'Do you want to logout?',
    okText: 'Logout',
    danger: false
  });

  if (!ok) return;

  window.kbAPI.logout();
}

async function applyLanguage(lang) {
  if (!window.i18n) return;

  await window.i18n.loadLang(lang);

  // text thường
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = window.i18n.t(key);
  });

  // label song ngữ (A4/QC)
  updateLabels?.();

  console.log('🌐 Language applied:', lang);
}

function initLanguageSelect() {
  const select = document.getElementById('lang-select');
  if (!select) return;

  // 1️⃣ load từ localStorage
  const savedLang = localStorage.getItem('app_lang') || 'en';
  select.value = savedLang;

  // 2️⃣ apply ngay khi app mở
  applyLanguage(savedLang);

  // 3️⃣ nghe change
  select.addEventListener('change', async () => {
    const lang = select.value;

    localStorage.setItem('app_lang', lang);
    await applyLanguage(lang);
  });
}

const RANK_MAP = {
  A: "A(A/I)",
  B: "B(A/II)",
  C: "C(B/III)",
  D: "D(B/IV)",
  E: "E(C/V)",
  F: "F(D/VI)",
  R: "R",
};

const QC_HOTKEY_STORE = "QC_RANK_HOTKEYS_V1";
const QC_KEYS = ["1","2","3","4","5","6","7"];
const QC_HOTKEY_DEFAULT = { "1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"R" };

function loadQcHotkeys() {
  try {
    const raw = localStorage.getItem(QC_HOTKEY_STORE);
    const obj = raw ? JSON.parse(raw) : null;
    const out = { ...QC_HOTKEY_DEFAULT };
    if (obj && typeof obj === "object") {
      QC_KEYS.forEach(k => {
        const v = String(obj[k] || "").toUpperCase();
        if (["A","B","C","D","E","F","R",""].includes(v)) out[k] = v;
      });
    }
    return out;
  } catch {
    return { ...QC_HOTKEY_DEFAULT };
  }
}
function saveQcHotkeys(map) {
  localStorage.setItem(QC_HOTKEY_STORE, JSON.stringify(map));
}

function openQcHotkeysModal() {
  const m = document.getElementById("qc-hotkeys-modal");
  if (!m) return;

  renderQcHotkeyGrid();

  bindFailtypeUI(); // <-- THÊM
  const sel = document.getElementById("qc-failtype-rank");
  if (sel) renderFailtypeUI(sel.value || "F");

  m.classList.remove("hidden");
  m.classList.add("flex");
}

function closeQcHotkeysModal() {
  const m = document.getElementById("qc-hotkeys-modal");
  if (!m) return;
  m.classList.add("hidden");
  m.classList.remove("flex");
}

function renderQcHotkeyGrid() {
  const grid = document.getElementById("qc-hotkey-grid");
  if (!grid) return;

  const hk = loadQcHotkeys();
  const ranks = ["A","B","C","D","E","F","R"];

  grid.innerHTML = "";
  QC_KEYS.forEach((key) => {
    const card = document.createElement("div");
    card.className = "rounded-xl border border-slate-200 bg-white p-3";

    const title = document.createElement("div");
    title.className = "text-sm font-semibold text-slate-700 mb-2";
    title.textContent = `Key ${key}`;

    const sel = document.createElement("select");
    sel.className = "select-ui w-full";
    sel.dataset.key = key;

    const off = document.createElement("option");
    off.value = "";
   off.textContent = t("qc.hotkeys.off");  
    sel.appendChild(off);

    ranks.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = RANK_MAP[r] || r;
      sel.appendChild(opt);
    });

    sel.value = hk[key] || "";

    sel.addEventListener("change", () => {
      const cur = loadQcHotkeys();
      cur[key] = (sel.value || "").toUpperCase();
      saveQcHotkeys(cur);
    });

    card.appendChild(title);
    card.appendChild(sel);
    grid.appendChild(card);
  });
}

function bindQcHotkeysModal() {
  if (window.__QC_HOTKEY_MODAL_INIT__) return;
  window.__QC_HOTKEY_MODAL_INIT__ = true;

  document.getElementById("btn-open-qc-hotkeys")
    ?.addEventListener("click", openQcHotkeysModal);

  // document.getElementById("btn-close-qc-hotkeys")
  //   ?.addEventListener("click", closeQcHotkeysModal);

  document.getElementById("qc-hotkeys-close")
    ?.addEventListener("click", closeQcHotkeysModal);

  document.getElementById("btn-reset-qc-hotkeys")
    ?.addEventListener("click", () => {
      saveQcHotkeys({ ...QC_HOTKEY_DEFAULT });
      renderQcHotkeyGrid();
    });

  // click backdrop to close
  // document.getElementById("qc-hotkeys-modal")
  //   ?.addEventListener("click", (e) => {
  //     if (e.target?.id === "qc-hotkeys-modal") closeQcHotkeysModal();
  //   });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const m = document.getElementById("qc-hotkeys-modal");
      if (m && !m.classList.contains("hidden")) closeQcHotkeysModal();
    }
  });
}
function renderQcHotkeySettings() {
  const grid = document.getElementById("qc-hotkey-grid");
  if (!grid) return;

  const hk = loadQcHotkeys();
  grid.innerHTML = "";

  const ranks = ["A","B","C","D","E","F","R"];

  for (let i = 1; i <= 7; i++) {
    const key = String(i);

    const wrap = document.createElement("div");
    wrap.className = "rounded-xl border border-slate-200 bg-white p-3";

    const label = document.createElement("div");
    label.className = "text-sm font-semibold text-slate-700 mb-2";
    label.textContent = `Key ${key}`;

    const sel = document.createElement("select");
    sel.className = "select-ui w-full qc-hotkey-select";
    sel.dataset.key = key;

    const optOff = document.createElement("option");
    optOff.value = "";
    optOff.textContent = "— Off —";
    sel.appendChild(optOff);

    ranks.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = RANK_MAP[r] || r; // show A(A/I)...
      sel.appendChild(opt);
    });

    sel.value = hk[key] || "";

    sel.addEventListener("change", () => {
      const cur = loadQcHotkeys();
      cur[key] = (sel.value || "").toUpperCase();
      saveQcHotkeys(cur);
    });

    wrap.appendChild(label);
    wrap.appendChild(sel);
    grid.appendChild(wrap);
  }

  const btnReset = document.getElementById("btn-reset-qc-hotkeys");
  btnReset?.addEventListener("click", () => {
    saveQcHotkeys({ ...QC_HOTKEY_DEFAULT });
    renderQcHotkeySettings();
  }, { once: true });
}
const QC_FAILTYPE_STORE = "QC_FAILTYPE_MAP_V1";
const QC_FAILTYPE_DEFAULT = {
  F: { 1:"VET", 2:"VO", 3:"NHIEU", 4:"NHAN", 5:"LD", 6:"log" },
  R: { 1:"VET", 2:"VO", 3:"NHIEU", 4:"NHAN", 5:"LD", 6:"log" },
};

function loadFailtypeMap(){
  try{
    const raw = localStorage.getItem(QC_FAILTYPE_STORE);
    const obj = raw ? JSON.parse(raw) : null;
    return (obj && typeof obj==="object") ? obj : structuredClone(QC_FAILTYPE_DEFAULT);
  }catch{
    return structuredClone(QC_FAILTYPE_DEFAULT);
  }
}
function saveFailtypeMap(map){
  localStorage.setItem(QC_FAILTYPE_STORE, JSON.stringify(map));
}

function renderFailtypeUI(rank){
  const grid = document.getElementById("qc-failtype-grid");
  if(!grid) return;

  const m = loadFailtypeMap();
  const r = (rank||"F").toUpperCase();
  const cur = m[r] || {};

  grid.innerHTML = "";
  for(let k=1;k<=6;k++){
    const wrap = document.createElement("div");
    wrap.style.border = "1px solid rgba(226,232,240,.95)";
    wrap.style.borderRadius = "14px";
    wrap.style.background = "#fff";
    wrap.style.padding = "10px";

    const label = document.createElement("div");
    label.textContent = `Key ${k}`;
    label.style.fontSize = "12px";
    label.style.fontWeight = "800";
    label.style.color = "#0f172a";
    label.style.marginBottom = "6px";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = cur[k] || "";
    inp.placeholder = "VD: log";
    inp.className = "input-ui";         // reuse style
    inp.style.height = "44px";
    inp.style.width = "100%";
    inp.style.padding = "0 14px";

    inp.addEventListener("input", () => {
      const all = loadFailtypeMap();
      all[r] = all[r] || {};
      all[r][k] = String(inp.value||"").trim();
      saveFailtypeMap(all);
    });

    wrap.appendChild(label);
    wrap.appendChild(inp);
    grid.appendChild(wrap);
  }
}

function bindFailtypeUI(){
  const sel = document.getElementById("qc-failtype-rank");
  if(!sel) return;

  sel.addEventListener("change", ()=> renderFailtypeUI(sel.value));
  renderFailtypeUI(sel.value || "F");

  document.getElementById("btn-reset-qc-failtype")?.addEventListener("click", ()=>{
    localStorage.setItem(QC_FAILTYPE_STORE, JSON.stringify(QC_FAILTYPE_DEFAULT));
    renderFailtypeUI(sel.value || "F");
  });
}


window.addEventListener("app:ready", async() => {
  renderUserFactory();
 bindQcHotkeysModal(); 
  renderQcHotkeySettings();

  // 🚫 Form mới → disable toàn bộ nút phụ
setRIButtonsEnabled(false);

initLanguageSelect();
      const lang = localStorage.getItem('app_lang') || 'en';

  await applyLanguage(lang);


    const form = document.getElementById('item-check-form');
  if (form) {
    form.addEventListener('submit', submitInspectionForm);
  }

const themeToggle = document.getElementById('theme-toggle-input');

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);
themeToggle.checked = savedTheme === 'dark';

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked ? 'dark' : 'light');
});

  document
  .querySelector('input[name="RI_R_qty"]')
  ?.addEventListener('input', updateTotalsAndPercent);
  // ===== INIT 1 LẦN DUY NHẤT =====

  initEnterNextField();
  initLabelLang();
  ensureModalInBody();

  initUserInfo();
  renderMaterialGradeTable();
  bindMaterialGradeEvents();
  updateTotalsAndPercent();

  bindSidebarEvents();
  bindTCEvents?.();
  bindRemarkSignature?.();

  

  autoUpdateRI(); // sinh RI ngay lần đầu

  // session info
  const session = window.kbAPI.getSession?.();
  if (session) {
    const el = document.getElementById('user-info');
    if (el) el.textContent = `${session.user} @ ${session.factory}`;
  }
});


if (poInput) {
  poInput.addEventListener('blur', fetchPOInfo);
  poInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchPOInfo();
  });
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#btn-open-printer-settings');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  try {
    if (!window.kbAPI?.openPrinterSettings) {
      showToastWarning?.('Printer settings API not found');
      return;
    }
    await window.kbAPI.openPrinterSettings();
  } catch (err) {
    console.error(err);
    showToastError?.('Cannot open printer settings');
  }
});




function showLoading(text = "Loading...", percent = 0, hint = "") {
  const modal = document.getElementById("modal-loading");
  const t = document.getElementById("qc-loading-text");
  const bar = document.getElementById("qc-progress-bar");
  const p = document.getElementById("qc-progress-percent");
  const h = document.getElementById("qc-progress-hint");

  if (!modal) return;
  modal.classList.remove("hidden");

  if (t) t.textContent = text;
  setLoadingProgress(percent, hint);
}

function hideLoading() {
  const modal = document.getElementById("modal-loading");
  if (!modal) return;
  modal.classList.add("hidden");
}

function setLoadingProgress(percent = 0, hint = "") {
  const bar = document.getElementById("qc-progress-bar");
  const p = document.getElementById("qc-progress-percent");
  const h = document.getElementById("qc-progress-hint");

  const v = Math.max(0, Math.min(100, Number(percent) || 0));
  if (bar) bar.style.width = `${v}%`;
  if (p) p.textContent = `${Math.round(v)}%`;
  if (h) h.textContent = hint || "";
}




})();
