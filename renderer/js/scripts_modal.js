// ===============================
// SIGNATURE MODAL (Electron-safe)
// - Không bị “already declared” khi load lại script
// - Không bị mất event vì modal load sau
// - Hỗ trợ cả onclick="onSaveSign()" trong HTML (nếu bạn đang dùng)
// ===============================
(() => {
  console.log('🔥 scripts_modal.js loaded');

  // ---- GLOBAL SAFE STATE ----
  window.currentSignTarget = window.currentSignTarget ?? null;
  window.signPad = window.signPad ?? null;

  // ---- HELPERS ----
  function ensureSignModalInBody() {
    const modal = document.getElementById("sign-modal");
    if (modal && modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
  }

  function initSignaturePad() {
    const canvas = document.getElementById("sign-canvas");
    if (!canvas) {
      console.warn("[sign] Missing #sign-canvas");
      return;
    }

    if (!window.SignaturePad) {
      console.error("[sign] SignaturePad is not defined. Check signature_pad.min.js path.");
      return;
    }

    // retina scale
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = canvas.offsetWidth || 600;
    const h = canvas.offsetHeight || 300;

    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);

    // create once
    if (!window.signPad) {
      window.signPad = new SignaturePad(canvas, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor: "black",
        minWidth: 1,
        maxWidth: 2.5,
      });
    }
  }

  // ---- PUBLIC ACTIONS (for HTML onclick) ----
  window.openSignModal = function openSignModal() {
    ensureSignModalInBody();

    const modal = document.getElementById("sign-modal");
    if (!modal) {
      console.warn("[sign] Missing #sign-modal");
      return;
    }

    modal.classList.remove("hidden");

    // init after modal visible so canvas has size
    setTimeout(() => {
      initSignaturePad();
      window.signPad?.clear();
    }, 0);
  };

  window.closeSignModal = function closeSignModal() {
    document.getElementById("sign-modal")?.classList.add("hidden");
  };

  window.onClearSign = function onClearSign() {
    console.log("[sign] clear");
    window.signPad?.clear();
  };

  window.onSaveSign = function onSaveSign() {
    console.log("[sign] save");

    if (!window.signPad) {
       showToastError("SignaturePad chưa sẵn sàng (check file signature_pad.min.js)");
      return;
    }
    if (window.signPad.isEmpty()) {
      showToastError("Chưa ký");
      return;
    }

    const base64 = window.signPad.toDataURL("image/png");

    const map = {
      manager: "sign-field-manager",
      storekeeper: "sign-field-storekeeper",
      inspector: "sign-field-inspector",
    };

    const target = window.currentSignTarget;
    if (!target || !map[target]) {
      otify.error("Không xác định người ký (currentSignTarget)");
      return;
    }

    const hidden = document.getElementById(map[target]);
    const preview = document.getElementById(`sign-preview-${target}`);

    if (hidden) hidden.value = base64;

    if (preview) {
      preview.src = base64;
      preview.style.display = "block";
    }

    window.closeSignModal();
  };

  // ---- EVENT DELEGATION (không sợ modal load sau) ----
  // 1) Click các nút ✍️ Sign
  document.addEventListener("click", (e) => {
    const btn = e.target?.closest?.(".btn-sign");
    if (!btn) return;

    window.currentSignTarget = btn.dataset.sign; // manager | storekeeper | inspector
    window.openSignModal();
  });

  // 2) Click Save/Clear/Cancel trong modal (dù bạn có/không dùng onclick)
  document.addEventListener("click", (e) => {
    const id = e.target?.id;
    if (!id) return;

    if (id === "btn-clear-sign") return window.onClearSign();
    if (id === "btn-cancel-sign") return window.closeSignModal();
    if (id === "btn-save-sign") return window.onSaveSign();
  });

  // ---- BOOT ----
  document.addEventListener("DOMContentLoaded", () => {
    ensureSignModalInBody();
  });






// ===============================
// HISTORY MODAL (Laravel-like)
// ===============================

// 1️⃣ render 10 dòng trống (Blade @for)
  function renderEmptyHistoryRows() {
    const tbody = document.getElementById('history-rows');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td class="px-3 py-2 text-center">${i}</td>

          <td><input type="number" step="0.01" name="history[${i}][origin]"  data-row="${i}" class="origin-input"></td>
          <td><input type="number" step="0.01" name="history[${i}][actual]"  data-row="${i}" class="actual-input"></td>

          <td class="diff-cell">
            <input type="number" readonly name="history[${i}][diff]" class="diff-output">
          </td>

          <td><input type="number" step="0.1" name="history[${i}][neck]"></td>
          <td><input type="number" step="0.1" name="history[${i}][back]"></td>
          <td><input type="number" step="0.1" name="history[${i}][hip]"></td>
        </tr>
      `);
    }
  }
   function calcDiff(row) {
    const origin = document.querySelector(`input[name="history[${row}][origin]"]`);
    const actual = document.querySelector(`input[name="history[${row}][actual]"]`);
    const diff   = document.querySelector(`input[name="history[${row}][diff]"]`);

    if (!origin || !actual || !diff) return;

    const o = parseFloat(origin.value) || 0;
    const a = parseFloat(actual.value) || 0;

    diff.value = (a - o).toFixed(2);
  }

  function calcTotal() {
    let sumO = 0, sumA = 0, sumD = 0;

    for (let i = 1; i <= 10; i++) {
      sumO += parseFloat(document.querySelector(`input[name="history[${i}][origin]"]`)?.value) || 0;
      sumA += parseFloat(document.querySelector(`input[name="history[${i}][actual]"]`)?.value) || 0;
      sumD += parseFloat(document.querySelector(`input[name="history[${i}][diff]"]`)?.value)   || 0;
    }

    document.getElementById('sum-origin').textContent = sumO.toFixed(2);
    document.getElementById('sum-actual').textContent = sumA.toFixed(2);
    document.getElementById('sum-diff').textContent   = sumD.toFixed(2);

    const rate = sumO ? ((sumD / sumO) * 100).toFixed(2) : 0;
    document.getElementById('shortage-rate').textContent = rate + '%';
  }

  document.addEventListener('input', e => {
    if (e.target.classList.contains('origin-input') ||
        e.target.classList.contains('actual-input')) {
      const row = e.target.dataset.row;
      calcDiff(row);
      calcTotal();
    }
  });

  // OPEN
  // window.openHistoryModal = function () {
  //   const modal = document.getElementById('history-modal');
  //   modal?.classList.remove('hidden');
  //   renderEmptyHistoryRows();
  //   calcTotal();
  // };

  // CLOSE (overlay + button)
  document.addEventListener('click', e => {
    if (e.target?.dataset?.close === 'history' ||
        e.target?.id === 'btn-close-history') {
      document.getElementById('history-modal')?.classList.add('hidden');
    }
  });


function fillHistoryRows(records = []) {
  records.forEach(r => {
    const i = r.ri_sliceNO;
    if (!i || i < 1 || i > 10) return;

    const origin = document.querySelector(`[name="history[${i}][origin]"]`);
    if (origin) origin.value = r.ri_leather_org ?? '';

    const actual = document.querySelector(`[name="history[${i}][actual]"]`);
    if (actual) actual.value = r.ri_leather_width ?? '';

    const neck = document.querySelector(`[name="history[${i}][neck]"]`);
    if (neck) neck.value = r.ri_thick_neck ?? '';

    const back = document.querySelector(`[name="history[${i}][back]"]`);
    if (back) back.value = r.ri_thick_back ?? '';

    const hip = document.querySelector(`[name="history[${i}][hip]"]`);
    if (hip) hip.value = r.ri_thick_bottom ?? '';
  });
}


async function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (!modal) return;

  const riNo = document.querySelector('[name="RI_no"]')?.value;
  if (!riNo) return;

  modal.classList.remove('hidden');

  renderEmptyHistoryRows();

  // reset hardness trước
  const hardnessInput = document.getElementById("hardness-input");
  if (hardnessInput) hardnessInput.value = "";

  const detail = await window.kbAPI.getInspectionDetail(riNo);

  if (!detail) return;

  if (detail.records?.length) {
    fillHistoryRows(detail.records);

    if (hardnessInput) {
      hardnessInput.value = detail.records[0]?.ri_hardness ?? "";
    }
  }

  for (let i = 1; i <= 10; i++) {
    calcDiff(i);
  }

  calcTotal();
}
// expose
window.openHistoryModal = openHistoryModal;

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-save-history')) {
    saveHistoryRecords();
  }
});

let isSavingHistory = false;

async function saveHistoryRecords() {
  if (isSavingHistory) return;
  isSavingHistory = true;

  try {
    const hardness = document.getElementById("hardness-input")?.value || null;  
    const ri_no = document.querySelector('[name="RI_no"]')?.value;
    if (!ri_no) throw new Error('Missing RI_no');

    const records = [];

    for (let i = 1; i <= 10; i++) {
      const origin = document.querySelector(`[name="history[${i}][origin]"]`)?.value;
      const actual = document.querySelector(`[name="history[${i}][actual]"]`)?.value;

      if (!origin && !actual) continue;

      records.push({
        ri_sliceNO: i,
        ri_type: 'A',
        ri_leather_org: origin || null,
        ri_leather_width: actual || null,
        ri_leather_diff: origin && actual ? (actual - origin).toFixed(2) : null,
        ri_thick_neck: document.querySelector(`[name="history[${i}][neck]"]`)?.value || null,
        ri_thick_back: document.querySelector(`[name="history[${i}][back]"]`)?.value || null,
        ri_thick_bottom: document.querySelector(`[name="history[${i}][hip]"]`)?.value || null,
      });
    }

    // if (!records.length) {
    //   showToastSuccess('Không có dòng nào để lưu');
    //   return;
    // }

  await window.kbAPI.saveHistory({ ri_no, records, hardness });     
    // ✅ UPDATE CACHE SAU KHI SAVE
if (window.__INSPECTION_DETAIL_CACHE__) {
  window.__INSPECTION_DETAIL_CACHE__.records = records.map(r => ({
    ri_sliceNO: r.ri_sliceNO,
    ri_leather_org: r.ri_leather_org,
    ri_leather_width: r.ri_leather_width,
    ri_thick_neck: r.ri_thick_neck,
    ri_thick_back: r.ri_thick_back,
    ri_thick_bottom: r.ri_thick_bottom,
     ri_hardness: hardness
  }));
}


    showToastSuccess('Saved history successfully');
    document.getElementById('history-modal')?.classList.add('hidden');

  } catch (err) {
    console.error(err);
    toastError(err.message || 'Save history failed');
  } finally {
    isSavingHistory = false;
  }
}

window.saveHistoryRecords = saveHistoryRecords;



document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-history');
  if (!btn) return;

  window.openHistoryModal();
});
document.getElementById('btn-export-excel')?.addEventListener('click', async () => {
  try {
    showToastSuccess?.('Exporting Excel...');

    const riNo = document.querySelector('[name="RI_no"]')?.value;
    if (!riNo) {
      showToastWarning?.('No inspection selected');
      return;
    }

    // 🔥 LẤY DATA TỪ ELECTRON
    const detail = await window.kbAPI.getInspectionDetail(riNo);

    if (!detail?.inspection) {
      showToastError?.('No data to export');
      return;
    }

    const result = await window.kbAPI.exportExcel({
      template: 'default',          // ✅ THÊM DÒNG NÀY
      inspection: detail.inspection,
      records: detail.records || [],
    });

    if (result?.success) {
      showToastSuccess?.('Excel exported successfully');
    } else if (!result?.canceled) {
      showToastError?.('Export failed');
    }

  } catch (err) {
    console.error(err);
    showToastError?.('Export error');
  }
});


  document.getElementById('btn-export-deckers')?.addEventListener('click', async () => {
  try {
    showToastSuccess?.('Exporting Deckers Excel...');

    const riNo = document.querySelector('[name="RI_no"]')?.value;
    if (!riNo) {
      showToastWarning?.('No inspection selected');
      return;
    }

    const detail = await window.kbAPI.getInspectionDetail(riNo);

    if (!detail?.inspection) {
      showToastError?.('No data to export');
      return;
    }

    const result = await window.kbAPI.exportExcel({
      template: 'deckers',          // 🔥 KHÁC DUY NHẤT
      inspection: detail.inspection,
      records: detail.records || [],
    });

    if (result?.success) {
      showToastSuccess?.('Deckers Excel exported successfully');
    } else if (!result?.canceled) {
      showToastError?.('Export failed');
    }

  } catch (err) {
    console.error(err);
    showToastError?.('Export error');
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  const input = e.target;

  if (!input.closest("#history-rows")) return;

  e.preventDefault();

  const name = input.name; 
  const match = name.match(/history\[(\d+)\]\[(.+)\]/);
  if (!match) return;

  const row = parseInt(match[1]);
  const field = match[2];

  const next = document.querySelector(
    `[name="history[${row + 1}][${field}]"]`
  );

  if (next) {
    next.focus();
    next.select?.();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "+") return;

  const input = e.target;
  if (!input.closest("#history-rows")) return;

  e.preventDefault();

  const m = input.name.match(/history\[(\d+)\]\[(.+)\]/);
  if (!m) return;

  const row = parseInt(m[1]);
  const field = m[2];

  const order = ["origin","actual","neck","back","hip"];
  const idx = order.indexOf(field);
  if (idx === -1) return;

  let next;

  // ➜ còn cột kế
  if (idx < order.length - 1) {
    const nextField = order[idx + 1];
    next = document.querySelector(
      `[name="history[${row}][${nextField}]"]`
    );
  }
  // ➜ cột cuối → xuống dòng
  else {
    const nextRow = row + 1;

    next = document.querySelector(
      `[name="history[${nextRow}][origin]"]`
    );
  }

  if (next) {
    next.focus();
    next.select?.();
  }
});

document.addEventListener("blur", (e) => {
  const input = e.target;

  if (!input.closest("#history-rows")) return;
  if (input.type !== "number") return;

  if (input.value.trim() === "") {
    input.value = 0;
  }
}, true);
})();
