(() => {
  if (window.__QC_PRINT_INIT__) return; // ✅ CHỐNG CHẠY LẶP
  window.__QC_PRINT_INIT__ = true;

  // ===== QC PREVIEW - Electron version =====
  window.__CREATING_NEW_RID__ = false;

  let __PRINT_LOADING_DEPTH__ = 0;

function beginPrintLoading() {
  __PRINT_LOADING_DEPTH__++;
  showFormLoading();          // dùng overlay hiện có
}

function endPrintLoading() {
  __PRINT_LOADING_DEPTH__ = Math.max(0, __PRINT_LOADING_DEPTH__ - 1);
  if (__PRINT_LOADING_DEPTH__ === 0) hideFormLoading();
}

  function isActiveLastRID() {
  const btns = Array.from(
    document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
  );
  if (!btns.length) return false;

  const active = document.querySelector('#rid-items button.rid-active');
  return active === btns[btns.length - 1];
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

function formatRankColor(rank, color, failtype) {
  const r = (rank || "").toUpperCase();
  const label = RANK_MAP[r] || r;
  return label + (color ? String(color) : "") + (failtype ? String(failtype) : "");
}


// input có thể là: "A(A/I)23", "A23", "A(A/I) 23", "R 6 log"
// input: "F(C/V)23IT", "F23IT", "F(D/VI) 23IT", "R 6 log"...
function parseRankColor(input) {
  const s = String(input || "").trim();

  const rank = (s.match(/^[A-FR]/i)?.[0] || "").toUpperCase();

  const closeParenIdx = s.lastIndexOf(")");
  let tail = "";
  if (closeParenIdx !== -1) tail = s.slice(closeParenIdx + 1);
  else if (rank) tail = s.slice(1);
  else tail = s;

  tail = tail.trim().replace(/\s+/g, ""); // "3log", "6log", "23IT"...

  const m = tail.match(/^(\d+)(.*)$/);    // digits + rest
  const color = m ? m[1] : "";
  const failtype = m ? (m[2] || "") : tail;

  return { rank, color, failtype };
}



async function silentPrintCurrentRID() {
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));

  const html = buildPrintableHtmlSnapshot();
  if (!html) throw new Error("Printable HTML empty");

  const deviceName = getSavedPrinterName?.();

  await window.kbAPI.printHtml({
    html,
    silent: true,
    title: "QC - Silent Print",
    ...(deviceName ? { deviceName } : {})
  });
}



  let currentRINo = null;
  let hasUnsavedRID = false; // nếu bạn có dùng
  let isCreatingRID = false; // bạn có dùng ở openPreviewModal
  window.__FAST_MODE__ = false; // bạn có dùng trong saveRID

function syncRidIndexes() {
  const buttons = Array.from(
    document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
  );

  buttons.forEach((btn, idx) => {
    const displayIndex = String(idx + 1);

    // index hiển thị (thay đổi theo list)
    btn.textContent = displayIndex;
    btn.dataset.index = displayIndex;

    // remarkIndex: chỉ set lần đầu (đóng băng)
    if (!btn.dataset.remarkIndex) {
      btn.dataset.remarkIndex = displayIndex;
    }
  });
}


  function toYMD(v) {
  if (!v) return "";
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // nếu là string kiểu "2025-11-12 00:00:00.000" hoặc "2025-11-12T..."
  const s = String(v);
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];

  // fallback cuối: thử parse Date
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return toYMD(dt);
  return "";
}


  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest("#btn-qc-tool");
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation(); // chặn không cho bubble
      e.stopImmediatePropagation?.(); // chặn các listener khác cùng phase

      console.log("[QC] btn-qc-tool clicked");
      window.openPreviewModal?.();
    },
    true
  ); // 👈 capture = true
function buildPrintableHtmlSnapshot() {
  const source = document.getElementById('preview-content');
  if (!source) return null;

  const clone = source.cloneNode(true);

  // ❌ XÓA ID – CỰC KỲ QUAN TRỌNG
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

  // remove edit state
clone.classList.remove('editing-mode');
clone.querySelectorAll('.editing-mode').forEach(el =>
  el.classList.remove('editing-mode')
);

  // input, textarea, select → span
  clone.querySelectorAll('input, textarea, select').forEach(el => {
    const span = document.createElement('span');
    span.textContent = el.value || el.textContent || '—';
    span.style.display = 'inline-block';
    span.style.width = '100%';
    span.style.textAlign = 'center';
    el.replaceWith(span);
  });

  const css = document.getElementById('qc-print-style')?.textContent || '';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>QC Silent Print</title>
<style>${css}</style>
</head>
<body>
  <div class="print-root">
   <div class="preview-content">
      ${clone.innerHTML}
    </div>
  </div>
</body>
</html>`;
}



  // close buttons (cái này để bubble cũng được)
  document.addEventListener("click", (e) => {
    if (
      e.target.closest("#btn-close-preview") ||
      e.target.closest("#btn-close2")
    ) {
      e.preventDefault();
      hidePreviewModal();
    }
  });
  function showFormLoading() {
    const el = document.getElementById("modal-loading");
    if (!el) return;
    el.classList.remove("hidden");
    lockAllInputs(true);
  }

  function hasDraftRID() {
  return !!document.querySelector('#rid-items button[data-draft="1"]');
}

function getSavedPrinterName() {
  return localStorage.getItem("QC_PRINTER_NAME") || null;
}

  function showPrintProgress(text) {
    const el = document.getElementById("print-progress");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
  }

  function hidePrintProgress(delay = 1500) {
    const el = document.getElementById("print-progress");
    if (!el) return;
    setTimeout(() => el.classList.add("hidden"), delay);
  }

  function hideFormLoading() {
    const el = document.getElementById("modal-loading");
    if (!el) return;
    el.classList.add("hidden");
    lockAllInputs(false);
  }

function lockAllInputs(lock) {
  const inputs = document.querySelectorAll("#preview-content input:not(#RID_LabDate)");
  inputs.forEach((i) => {
    i.disabled = lock;
    i.classList.toggle("input-disabled", !!lock);
  });
}

  function focusFirstQty() {
    const first = document.getElementById("RID_qty1");
    if (!first) return;
    first.focus();
    first.select?.();
  }

  async function focusFirstQtyLater() {
    await new Promise((r) => requestAnimationFrame(r));
    focusFirstQty();
  }

  function clearBarcode(selector = "#preview-barcode") {
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = "";
    delete el.dataset.rid; // 🔥 clear đúng cách
  }
  function ensurePreviewModalOpen() {
    const modal = document.getElementById("modal-preview");
    if (!modal) return;

    if (modal.classList.contains("hidden")) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  }

  function setActiveRidButton(btn) {
    if (!btn) return;

    // remove active cũ
    document
      .querySelectorAll("#rid-items button.rid-active")
      .forEach((b) => b.classList.remove("rid-active"));

    // set active mới
    btn.classList.add("rid-active");

    // update index
    const idx = btn.dataset.index || btn.textContent.trim();

   const footer = document.getElementById("preview-label-index");
if (footer) {
  footer.textContent =
    __EMPLOYEE_NAME__
      ? `${idx} – ${__EMPLOYEE_NAME__}`
      : idx;
}

    document
      .querySelectorAll("[data-live-index]")
      .forEach((el) => (el.textContent = idx));
  }

  function getCurrentRID() {
    return document.querySelector("#preview-barcode")?.dataset?.rid || "";
  }

  function scrollRidToView(btn) {
    const container = document.getElementById("rid-items");
    if (!container || !btn) return;

    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const offset =
      bRect.top - cRect.top - container.clientHeight / 2 + bRect.height / 2;
    container.scrollTop += offset;
  }

  function enableEditMode() {
    document.getElementById("preview-content")?.classList.add("editing-mode");
  }

  function disableEditMode() {
    document
      .getElementById("preview-content")
      ?.classList.remove("editing-mode");
  }

function getMonthForStamp(){
  const lab = document.getElementById('RID_LabDate')?.value?.trim();
  const ri  = document.querySelector('[name="RI_date"]')?.value?.trim();
  const s = lab || ri;
  if(!s) return new Date().getMonth()+1;
  const m = String(s).match(/^\d{4}-(\d{2})-\d{2}/);
  return m ? parseInt(m[1],10) : (new Date(s).getMonth()+1);
}

function renderMonthStamp(){
  const root = document.getElementById('preview-content') || document.querySelector('.preview-content');
  if(!root) return;

  const seal = root.querySelector('.seal-box');
  if(!seal) return;

  const month = getMonthForStamp();
  seal.innerHTML = `<div class="month-seal month-${month}">${month}</div>`;
}

function bindMonthStamp(){
  const lab = document.getElementById('RID_LabDate');
  const rer = () => renderMonthStamp();
  lab?.addEventListener('input', rer);
  lab?.addEventListener('change', rer);
  rer();
}



  function getRidIndex(btn) {
    return btn?.dataset?.index || btn?.textContent?.trim() || "";
  }

function setActiveRidIndex(btn) {
  if (!btn) return;

  const idx = getRidIndex(btn);

  // footer
  const footer = document.getElementById("preview-label-index");
if (footer) {
  footer.textContent =
    __EMPLOYEE_NAME__
      ? `${idx} – ${__EMPLOYEE_NAME__}`
      : idx;
}

  // header
  const headerIdx = document.getElementById("preview-header-index");
  if (headerIdx) headerIdx.textContent = `#${idx}`;

  // các chỗ live khác (nếu có)
  document
    .querySelectorAll("[data-live-index]")
    .forEach((el) => (el.textContent = idx));
}


  function debounce(func, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function updateTotalQty() {
    let total = 0;
    for (let i = 1; i <= 14; i++) {
      const v = parseFloat(document.getElementById(`RID_qty${i}`)?.value || 0);
      if (!isNaN(v)) total += v;
    }
    const elTotal = document.getElementById("preview-total");
    if (elTotal) elTotal.textContent = total.toFixed(1);

    const rank = document
      .getElementById("RID_rankcolor")
      ?.value?.charAt(0)
      ?.toUpperCase();
    if (rank && elTotal) elTotal.textContent = `${total.toFixed(1)} (${rank})`;
  }

  // ===== Electron: openPreviewModal (thay fetch color + loadRIDList vẫn giữ) =====
  window.openPreviewModal = async function openPreviewModal() {
    const riNo = document.querySelector('[name="RI_no"]')?.value?.trim() || "";
    if (!riNo) {
      showToastWarning("Chưa có RI_no, vui lòng nhập mã RI.");
      return;
    }
    // Chạy hàm mở modal nếu có giá trị RI_no hợp lệ.
    const matCode = document.getElementById("mat_codeone")?.value?.trim() || "";

    const matCN = document.querySelector("#RI_mat_name")?.value?.trim() || "";
    const matEN = document.querySelector("#RI_mat_ename")?.value?.trim() || "";
    const vendName =
      document.querySelector('[name="RI_vend_name"]')?.value?.trim() || "";
    const poNo =
      document.querySelector('[name="ERP_po_no"]')?.value?.trim() || "";
    const brandName =
      document.querySelector('[name="RI_brand_name"]')?.value?.trim() || "";
    const brandCode =
      document.querySelector('[name="RI_brand_code"]')?.value?.trim() || "";
    const oldMatCode =
      document.querySelector('[name="RI_mat_oldcode"]')?.value?.trim() || "";
    const shipWay =
      document.querySelector('[name="RI_shippingway"]')?.value?.trim() || "";
    const tcCode = (document.querySelector('[name="ERP_tc_code"]')?.value || "")
      .trim()
      .toUpperCase();
    const spec =
      document.querySelector('[name="RI_thickness_spec"]')?.value?.trim() || "";
    const date =
      document.getElementById('RI_date')?.value?.trim() || "";
 

    // sync sign inspector preview
    const srcImg = document.getElementById("sign-preview-inspector");
    const destImg = document.getElementById("preview-sign-inspector");
    if (srcImg && destImg) {
      destImg.src = srcImg.src;
      if (window.signObserver) window.signObserver.disconnect();
      window.signObserver = new MutationObserver(() => {
        destImg.src = srcImg.src;
      });
      window.signObserver.observe(srcImg, {
        attributes: true,
        attributeFilter: ["src"],
      });
    }

    if (!riNo) {
      window.Swal?.fire
        ? showToastWarning(
            "⚠️ Chưa có RI_no — không thể mở tem QC!",
            "",
            "warning"
          )
        : showToastWarning("Chưa có RI_no");
      return;
    }

    // bật loading
    const loading = document.getElementById("modal-loading");
    loading?.classList.remove("hidden");
    await new Promise((r) => requestAnimationFrame(r));

    // nếu cùng RI_no => chỉ mở lại modal
    if (currentRINo === riNo && !window.__FORCE_RELOAD_PREVIEW__) {
      loading?.classList.add("hidden");
      showPreviewModal();
      return;
    }

    currentRINo = riNo;

    try {
      // reset inputs
      for (let i = 1; i <= 14; i++) {
        const input = document.getElementById(`RID_qty${i}`);
        if (input) input.value = "";
      }
      const rankEl = document.getElementById("RID_rankcolor");
      const labEl = document.getElementById("RID_LabDate");
      if (rankEl) rankEl.value = "";
      if (labEl) labEl.value = "";
      document.getElementById("preview-color") &&
        (document.getElementById("preview-color").textContent = "—");
      clearBarcode();

      const isOk = document.querySelector(
        'input[name="RI_ischanged"]'
      )?.checked;
      const okText = isOk ? "(FIX)" : "";

      const formattedDate = date
        ? date.replace(
            /^(\d{4})-(\d{2})-(\d{2})$/,
            (_, y, m, d) => `${y}-${parseInt(m)}-${parseInt(d)}`
          )
        : "";

      const dateDisplay = `${tcCode || ""} - ${shipWay || ""}${
        formattedDate ? ` 入 ${formattedDate} ${okText}` : ""
      } `;
      document.getElementById("preview-date") &&
        (document.getElementById("preview-date").textContent =
          dateDisplay || "—");

      const matFullName = `${matCN}`; // hoặc `${matCN}${matEN ? ' / ' + matEN : ''}`
      document.getElementById("preview-matname") &&
        (document.getElementById("preview-matname").textContent =
          matFullName || "—");
      document.getElementById("preview-spec") &&
        (document.getElementById("preview-spec").textContent = spec || "—");
      document.getElementById("preview-vendor") &&
        (document.getElementById("preview-vendor").textContent =
          vendName || "—");
      document.getElementById("preview-pono") &&
        (document.getElementById("preview-pono").textContent = matCode || "—");
      document.getElementById("preview-color-label") &&
        (document.getElementById("preview-color-label").textContent =
          `顏色: ( ${oldMatCode} ) ` || "Màu sắc");

          

      if (brandCode) {
        document.getElementById("preview-brand") &&
          (document.getElementById(
            "preview-brand"
          ).textContent = `(${brandCode})`);
      }

      // ===== Electron: lấy màu (thay fetch /color) =====
      if (matCode && riNo) {
        try {
          if (!window.kbAPI?.getColor)
            throw new Error("kbAPI.getColor chưa có");
          const dataColor = await window.kbAPI.getColor({
            ri_no: riNo,
            mat_code: matCode,
          });

          console.log(dataColor, "dataColor");
          document.getElementById("preview-color") &&
            (document.getElementById("preview-color").textContent =
              dataColor?.color_name ?? "—");
        } catch (err) {
          console.warn("Không lấy được màu vật liệu:", err);
        }
      }

      // reset list RID và load list (hàm loadRIDList của bạn giữ nguyên)
      isCreatingRID = false;
      const listContainer = document.getElementById("rid-items");
      if (listContainer) listContainer.innerHTML = "";

      // Nếu bạn có loadRIDList(riNo, autoPickFirst)

      const ridCount = await window.loadRIDList?.(riNo, false);

      // ================================
      // 🔥 AUTO CREATE / AUTO ACTIVE RID
      showPreviewModal(); // 👈 đảm bảo UI đã mở
      // ================================
      if (ridCount === 0) {
        // ✅ CASE 1: CHƯA CÓ RID → TẠO LUÔN
        console.log("[QC] No RID → auto create first RID");

        await window.createNewRID?.(); // 👈 tạo RID
        return; // createNewRID đã focus + active rồi
      }

      // ================================
      // ✅ CASE 2: ĐÃ CÓ RID → ACTIVE RID CUỐI
      // ================================
      const ridButtons = Array.from(
        document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
      );

      if (ridButtons.length) {
        const lastBtn = ridButtons[ridButtons.length - 1];

        setActiveRidButton(lastBtn);
        setActiveRidIndex(lastBtn); // 🔥 THÊM DÒNG NÀY
        scrollRidToView(lastBtn);

        const ridNo = lastBtn.id.replace("rid-btn-", "");
        await loadRIDDetail(ridNo, riNo);

        await focusFirstQtyLater();
      }

      await new Promise((r) => requestAnimationFrame(r));
      showPreviewModal();
    } catch (e) {
      console.log("lỗi không tải đc danh sách tem");
    } finally {
      loading?.classList.add("hidden");
    }
  };

  function closePreviewModal() {
    hidePreviewModal();
  }
  window.closePreviewModal = closePreviewModal;

  // ===== Electron: saveRID (thay fetch generate + save + reload detail) =====
  async function saveRID(event) {
    const autoPrint = document.getElementById("mode-print")?.checked;

    // chặn khi đang loading
    if (
      document.getElementById("modal-loading")?.classList.contains("hidden") ===
      false
    )
      return;

    const fastChk = document.getElementById("mode-fast");
    window.__FAST_MODE__ = !!fastChk?.checked;

    const riNo = document.querySelector('[name="RI_no"]')?.value?.trim() || "";
    const ridNo = getCurrentRID();
    const isNewRID = !ridNo;

    if (!riNo) {
      window.Swal?.fire
        ? Swal.fire(
            "❌ Chưa có RI_no — vui lòng tạo phiếu trước khi lưu tem QC!",
            "",
            "error"
          )
        : showToastWarning("Chưa có RI_no");
      return;
    }

    // check qty
    let hasQty = false;
    for (let i = 1; i <= 14; i++) {
      const v = parseFloat(document.getElementById(`RID_qty${i}`)?.value || 0);
      if (!isNaN(v) && v !== 0) {
        hasQty = true;
        break;
      }
    }
    if (!hasQty) {
      window.Swal?.fire
        ? showToastWarning("⚠️ Tem QC chưa có số lượng nào!", "", "warning")
        : showToastWarning("Tem QC chưa có số lượng");
      return;
    }

    // Nếu chưa có RID_no -> generate mới (Electron)
  let finalRID = ridNo;

if (!finalRID) {
  if (!window.kbAPI?.generateRid) {
    showToastWarning("kbAPI.generateRid chưa có");
    return;
  }

  // ✅ TRUYỀN RI_NO ĐỂ KHÔNG BỊ TRÙNG / SAI NGỮ CẢNH
  const gen = await window.kbAPI.generateRid({ ri_no: riNo });
  finalRID = gen?.rid_no || gen?.RID_no || "";

  if (!finalRID) {
    showToastWarning("Không generate được RID");
    return;
  }


    }

    const saveBtn = event?.target || document.getElementById("btn-save-rid");
if (saveBtn) {
  saveBtn.disabled = true;
  saveBtn.classList.add("opacity-50", "cursor-not-allowed");
}
    try {
      const rankColorVal =
        document.getElementById("RID_rankcolor")?.value?.trim() || "";
      const riDate =
  document.querySelector('[name="RI_date"]')?.value?.trim() || '';

const labDateInput =
  document.getElementById('RID_LabDate')?.value?.trim() || '';

// 🔥 LOGIC CHUẨN
const finalLabDate = labDateInput || riDate || null;


// ✅ parse đúng như Laravel: rank = chữ đầu, color = số cuối
const { rank: rid_rank, color: rid_color, failtype: rid_failtype } =
  parseRankColor(rankColorVal);// (optional) nếu bạn muốn chặn case nhập rank mà không có số color:
if (rid_rank && !rid_color && rid_rank !== "R") {
  // tùy rule của bạn, nếu A-F bắt buộc có color
  // showToastWarning("Thiếu số color (vd: A(A/I)23)");
  // return;
}


      document
        .querySelector("#preview-barcode")
        ?.setAttribute("data-rid", finalRID);
  const activeBtn = document.querySelector("#rid-items button.rid-active");
const remarkIndex = activeBtn?.dataset?.remarkIndex || activeBtn?.dataset?.index || "";

      const records = [];

      for (let i = 1; i <= 14; i++) {
        const raw = document.getElementById(`RID_qty${i}`)?.value;
        const val = parseFloat(raw);

        // ❌ bỏ qua nếu rỗng, NaN hoặc <= 0
        if (!val || isNaN(val) || val <= 0) continue;

        records.push({
          RI_no: riNo,
          RID_no: finalRID,
          RID_seqno: i,
          RID_qty: val,
          RID_date: new Date().toISOString(),
          RID_rank: rid_rank,
          RID_color: rid_color,
            RID_Failtype: rid_failtype,   // NEW
         RID_LabDate: finalLabDate || null,
          RID_remark: String(remarkIndex  || ""),
        });
      }

      showFormLoading();

      // ===== Electron: saveRID =====
      if (!window.kbAPI?.saveRid) throw new Error("kbAPI.saveRid chưa có");
      const result = await window.kbAPI.saveRid({ records });

      if (!result?.success) {
        showToastError("Lưu thất bại");
        return;
      }


      if (result?.totals) {
        Object.entries(result.totals).forEach(([k, v]) => {
          const input = document.querySelector(`[name="${k}"]`);
          if (input) input.value = Number(v).toFixed(2);
        });
      }

      hasUnsavedRID = false;
      const btn = document.getElementById(`rid-btn-${finalRID}`);
if (btn) delete btn.dataset.draft; 

      // ===== Electron: reload RI detail (thay fetch /detail) =====
      if (window.kbAPI?.getInspectionDetail) {
        try {
          const detail = await window.kbAPI.getInspectionDetail(riNo);
          if (detail?.inspection) {
            const levels = ["A", "B", "C", "D", "E", "F", "R"];
            levels.forEach((lv) => {
              const input = document.querySelector(`[name="RI_${lv}_qty"]`);
              if (input) input.value = detail.inspection[`RI_${lv}_qty`] ?? "";
            });
            window.updateTotalsAndPercent?.();
            window.calcWeightedTotal?.();

            // nếu bạn muốn fill toàn bộ input name=...
            Object.keys(detail.inspection).forEach((key) => {
              const input = document.querySelector(`[name="${key}"]`);
              if (!input) return;
              let v = detail.inspection[key];
              if (input.type === "date" && v) v = String(v).slice(0, 10);
              input.value = v ?? "";
            });

            document.querySelectorAll('input[type="number"]').forEach((inp) => {
              if (!inp.value) return;
              const v = parseFloat(inp.value);
              if (!isNaN(v)) inp.value = v.toFixed(2);
            });
          }
        } catch (e) {
          console.warn("Reload inspection detail failed:", e);
        }
      }

      // backend có sumQty/levelCol thì update
      if (result?.sumQty && result?.levelCol) {
        const field = document.querySelector(`[name="${result.levelCol}"]`);
        if (field) field.value = Number(result.sumQty).toFixed(2);
      }

     const isFast = !!document.getElementById("mode-fast")?.checked;
const shouldFastCreate = isFast && hasQty && isActiveLastRID();

      // reload list RID nếu là RID mới (giữ logic bạn)
      if (isNewRID) {
        await window.loadRIDList?.(riNo, false);
// if (hasDraftRID()) {
//   showToastWarning("⚠️ Còn tem chưa lưu – FAST MODE bị chặn");
//   return;
// }
        if (!shouldFastCreate) {
          const btn = document.getElementById(`rid-btn-${finalRID}`);
          if (btn) {
            btn.click();
            scrollRidToView(btn);
          }
        }
      } else {
        updateTotalQty();
      }

if (autoPrint) {
  try {
    if (isSilentPrint()) await silentPrintCurrentRID();
    else await window.printCurrentLabelDirect?.();
  } catch (e) {
    console.error("Print failed:", e);
    showToastError("In thất bại (đã lưu thành công)");
  }
}
// ===== FAST MODE =====
if (shouldFastCreate) {
  await createNewRID();
}

// ===== NORMAL MODE =====



      window.__FAST_MODE__ = false;
      showToastSuccess("Success !");
    } catch (err) {
      // console.error("Lỗi lưu RID:", err);
      showToastError("Lỗi khi lưu");
    } finally {
      hideFormLoading();
  if (saveBtn) {
  saveBtn.disabled = false;
  saveBtn.classList.remove("opacity-50", "cursor-not-allowed");

  // 🔥 BẮT BUỘC
window.applyLanguage?.(localStorage.getItem("app_lang") || "en");
}
    }
  }

  window.saveRID = saveRID;

  // =========================
  // 1) Helper build printable html
  // =========================
function clonePreviewToPrintable(btn, i, isLast = false) {
  const source = document.getElementById("preview-content");
  if (!source) return "";
  const clone = source.cloneNode(true);

  // ❌ XÓA TOÀN BỘ ID (CỰC KỲ QUAN TRỌNG)


  // set footer index
  const idxSpan = clone.querySelector(".label-index");
  if (idxSpan) {
    idxSpan.textContent = btn?.textContent?.trim() || "";
  }

  // input -> span
  clone.querySelectorAll("input").forEach((input) => {
    const span = document.createElement("span");
    span.textContent = input.value || "—";
    span.style.display = "inline-block";
    span.style.width = "100%";
    span.style.textAlign = "center";
    input.replaceWith(span);
  });

  return `
  <div class="print-root">
    <div class="preview-content">
      ${clone.innerHTML}
    </div>
  </div>
  ${isLast ? "" : `<div class="page-break"></div>`}
`;
}


  function buildPrintHtml({ title, qcStyle, bodyHtml, extraScript = "" }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title || ""}</title>
<style>${qcStyle || ""}</style>
</head>
<body>
${bodyHtml || ""}
${extraScript ? `<script>${extraScript}<\/script>` : ""}
</body>
</html>`;
  }
  function isSilentPrint() {
    return !!document.getElementById("mode-silent-print")?.checked;
  }
  // =========================
  // 2) Electron PRINT: send html to main
  // =========================
async function printHtmlViaElectron(html, options = {}) {
  const silent =
    typeof options.silent === "boolean"
      ? options.silent
      : isSilentPrint();
  beginPrintLoading();
  // 🔥 CHỈ SHOW PROGRESS KHI silent
  if (silent) {
    showPrintProgress("🖨 Đang gửi lệnh in...");
  }

  try {
    await window.kbAPI.printHtml({
      html,
      silent,
      title: options.title || ""
    });

    if (silent) {
      showPrintProgress("✅ Máy in đã nhận lệnh");
      hidePrintProgress(1500);
    }
  } catch (e) {
    hidePrintProgress(0);
    throw e;
  } finally {
    endPrintLoading();
  }
}


  // =========================
  // 3) PRINT ALL (Electron)
  // =========================
  async function printAllLabels() {
    const ok = await confirmBox({
      title: "Print all labels",
      message: "Do you want to print ALL labels?",
      okText: "Print",
      danger: false,
    });

    if (!ok) return;

    const riNo = document.querySelector('[name="RI_no"]')?.value?.trim() || "";
    if (!riNo)
      return Swal.fire("⚠️ Chưa có RI_no — không in được!", "", "warning");

    const ridButtons = Array.from(
      document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
    );
    if (!ridButtons.length)
      return Swal.fire("⚠️ Chưa có tem RID nào để in!", "", "warning");

    const qcStyle =
      document.getElementById("qc-print-style")?.textContent || "";

    const nextFrame = (n = 1) =>
      new Promise((res) => {
        const step = () => (n-- <= 1 ? res() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      });

    let pagesHtml = "";
    for (let i = 0; i < ridButtons.length; i++) {
      const btn = ridButtons[i];
      const ridNo = btn.id.replace("rid-btn-", "");

      // ✅ HIỂN THỊ TIẾN TRÌNH
      showPrintProgress(`🖨 Đang in ${i + 1} / ${ridButtons.length} — ${ridNo}`);

      await loadRIDDetail(ridNo, riNo);
      await nextFrame(2);

     pagesHtml += clonePreviewToPrintable(
  btn,
  i,
  i === ridButtons.length - 1 // 👈 TEM CUỐI
);
    }

    const html = buildPrintHtml({
      title: "In tất cả tem QC",
      qcStyle,
      bodyHtml: pagesHtml,
    });

    await printHtmlViaElectron(html, { title: "QC - Print All" });

    showPrintProgress(`✅ Đã gửi ${ridButtons.length} tem vào máy in`);
    hidePrintProgress(2000);

    setTimeout(enableEditMode, 300);
  }

  window.printAllLabels = printAllLabels;

  // =========================
  // 4) PRINT PREVIEW (Electron)
  // =========================
  async function printPreview() {
    console.count("printPreview called");
    const source = document.getElementById("preview-content");
    if (!source) return;

    const qcStyle =
      document.getElementById("qc-print-style")?.textContent || "";
    const clone = source.cloneNode(true);

    clone.querySelectorAll("input").forEach((input) => {
      const span = document.createElement("span");
      span.textContent = input.value || "—";
      span.style.display = "inline-block";
      span.style.width = "100%";
      span.style.textAlign = "center";
      input.parentNode.replaceChild(span, input);
    });

    const extraScript = `
    function fitMatName(){
      const el = document.getElementById('preview-matname');
      if(!el) return;
      const cell = el.closest('.cell');
      if(!cell) return;
      let style    = window.getComputedStyle(el);
      let fontSize = parseFloat(style.fontSize) || 14;
      const maxHeight = cell.clientHeight || cell.offsetHeight;
      if (!maxHeight) return;
      const oldAlign = cell.style.alignItems;
      cell.style.alignItems = 'flex-start';
      while (el.scrollHeight > maxHeight && fontSize > 6){
        fontSize -= 0.5;
        el.style.fontSize = fontSize + 'px';
      }
      cell.style.alignItems = oldAlign || '';
    }
   
  `;

    const html = buildPrintHtml({
      title: "In tem QC",
      qcStyle,
      bodyHtml: `<div id="preview-content">${clone.innerHTML}</div>`,
      extraScript,
    });

    await printHtmlViaElectron(html, { title: "QC - Print Current" });
    setTimeout(enableEditMode, 300);
  }
  window.printPreview = printPreview;

  // =========================
  // 5) CREATE NEW RID (Electron: fetch generate-rid -> kbAPI.generateRid())
  // =========================

  function bindQtyLiveUpdate() {
  const qtyInputs = document.querySelectorAll(
    '#preview-content input[id^="RID_qty"]'
  );

  const debouncedUpdate = debounce(updateTotalQty, 80);

  qtyInputs.forEach((input) => {
    input.addEventListener("input", () => {
      hasUnsavedRID = true;     // 🔥 đánh dấu dirty
      debouncedUpdate();        // 🔥 update tổng realtime
    });

    input.addEventListener("change", () => {
      updateTotalQty();         // đảm bảo blur vẫn chuẩn
    });
  });
}


  async function createNewRID(event) {
    const riNo = document.querySelector('[name="RI_no"]')?.value?.trim() || "";
    if (!riNo) {
      window.__CREATING_NEW_RID__ = false;
      console.log("lỗi ko có RID");
      return;
    }

if (hasDraftRID()) {
  showToastWarning("⚠️ Còn tem chưa lưu – vui lòng lưu trước khi tạo tem mới");
  window.__CREATING_NEW_RID__ = false;
  return;
}

    if (isCreatingRID) {
      Swal.fire(`⚠️ Đang tạo tem, vui lòng đợi!`, "", "warning");
      return;
    }

    isCreatingRID = true;
    window.__CREATING_NEW_RID__ = true;

    const btn = event?.target || document.getElementById("btn-create-rid");
    if (btn && !btn.dataset._oldHtml) {
  btn.dataset._oldHtml = btn.innerHTML;
}
    if (btn) {
      btn.dataset._oldHtml = btn.innerHTML; // ⭐ lưu icon
      btn.innerHTML = "⏳ Đang tạo...";
      btn.disabled = true;
    }

    try {
      for (let i = 1; i <= 14; i++) {
        const input = document.getElementById(`RID_qty${i}`);
        if (input) input.value = "";
      }
      document.getElementById("RID_rankcolor") &&
        (document.getElementById("RID_rankcolor").value = "");
      clearBarcode();

      const previewTotalEl = document.getElementById("preview-total");
      if (previewTotalEl) previewTotalEl.textContent = "0.00";

      // ===== Electron generate =====
      if (!window.kbAPI?.generateRid)
        throw new Error("kbAPI.generateRid chưa có");
      const data = await window.kbAPI.generateRid({ ri_no: riNo });
      const newRID = data?.rid_no || data?.RID_no || "";
      if (!newRID) {
        Swal.fire(`❌ Không thể tạo RID_no mới!`, "", "warning");
        return;
      }
      const existed = document.getElementById(`rid-btn-${newRID}`);
if (existed) {
  // chỉ active lại, tuyệt đối không append thêm
  setActiveRidButton(existed);
  setActiveRidIndex(existed);
  scrollRidToView(existed);

  clearBarcode();
  renderBarcode?.("#preview-barcode", newRID);

  window.__CREATING_NEW_RID__ = false;
  isCreatingRID = false;

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset._oldHtml;
    delete btn.dataset._oldHtml;
  }
  return;
}

      const listContainer = document.getElementById("rid-items");
      if (!listContainer) return;

      listContainer
        .querySelectorAll("button")
        .forEach((b) =>
          b.classList.remove("bg-blue-300", "font-bold", "text-white")
        );

      // set lab date = RI_date
      const date = (document.querySelector('[name="RI_date"]')?.value || "")
        .trim()
        .slice(0, 10);
  const labEl = document.getElementById("RID_LabDate");
if (labEl && date) {
  console.log(labEl,'labEl')
  console.log(date,'date')
  labEl.value = date;
  labEl.dispatchEvent(new Event("change", { bubbles: true }));
}

      const newBtn = document.createElement("button");
      newBtn.id = `rid-btn-${newRID}`;
      newBtn.className = "block w-full border-b p-2 transition-colors";
      newBtn.dataset.draft = "1";  

      newBtn.onclick = (e) => onRidButtonClick(e, newRID, riNo);
      document
        .querySelectorAll("#rid-items button.rid-active")
        .forEach((b) => b.classList.remove("rid-active"));
      // ✅ APPEND 1 LẦN DUY NHẤT
      listContainer.appendChild(newBtn);

      // ✅ CHỈ SAU KHI APPEND → SYNC
      syncRidIndexes();
newBtn.dataset.remarkIndex ||= newBtn.dataset.index;
      newBtn.scrollIntoView({ behavior: "smooth", block: "center" });

      setActiveRidButton(newBtn);
      setActiveRidIndex(newBtn);

      // ✅ set STT (index)

      // ✅ LOAD RID DETAIL → đây là bước QUAN TRỌNG NHẤT
      await loadRIDDetail(newRID, riNo);

      // ✅ focus vào ô đầu tiên
      await focusFirstQtyLater();

      clearBarcode();
      renderBarcode?.("#preview-barcode", newRID);

      hasUnsavedRID = true;
      lockAllInputs(false);

      await focusFirstQtyLater();
      window.__CREATING_NEW_RID__ = false;
      ensurePreviewModalOpen();

      if (!window.__FAST_CREATING__) {
        showToastSuccess("Đã tạo Tem RID mới !");
      }
    } catch (err) {
      console.error(err);
      showToastError(`💥 Lỗi khi tạo RID_no mới!`);
    } finally {
      
      isCreatingRID = false;
      if (btn) {
        btn.disabled = false;
    btn.innerHTML = btn.dataset._oldHtml;
    delete btn.dataset._oldHtml;

    // 🔥 BẮT BUỘC
    
      }
    }

    enableEditMode();
  }
  window.createNewRID = createNewRID;

  // =========================
  // 6) LOAD RID LIST (Electron: fetch get-rid-list -> kbAPI.getRidList())
  // =========================
  async function loadRIDList(riNo, autoSelect = false) {
    const listContainer = document.getElementById("rid-items");
    if (!listContainer) return;

    listContainer.innerHTML =
      '<div class="p-2 text-gray-400 italic">Đang tải...</div>';

    try {
      if (!window.kbAPI?.getRidList)
        throw new Error("kbAPI.getRidList chưa có");

      const data = await window.kbAPI.getRidList({ ri_no: riNo });
      if (!data?.success || !data?.records?.length) {
        listContainer.innerHTML =
          '<div class="p-2 text-gray-400 italic">Chưa có tem nào</div>';
        return 0; // 🔥 TRẢ 0 RID
      }

      listContainer.innerHTML = data.records
        .map(
          (r) => `
    <button
      id="rid-btn-${r.RID_no}"
      class="block w-full border-b p-2 hover:bg-blue-100">
    </button>
  `
        )
        .join("");
      syncRidIndexes();
      // bind click bằng addEventListener (tránh inline onclick trong Electron)
      data.records.forEach((r, idx) => {
        const btn = document.getElementById(`rid-btn-${r.RID_no}`);
        btn?.addEventListener("click", (e) =>
          onRidButtonClick(e, r.RID_no, riNo)
        );
      });
      return data.records.length;
    } catch (err) {
      console.error(err);
      listContainer.innerHTML =
        '<div class="p-2 text-red-500">Lỗi tải danh sách!</div>';
    }
  }
  window.loadRIDList = loadRIDList;

  // =========================
  // 7) doPrintByIndexes -> dùng IPC print tương tự
  // =========================
  async function doPrintByIndexes(riNo, ridButtons, indexList) {
    indexList = Array.from(new Set(indexList))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < ridButtons.length)
      .sort((a, b) => a - b);

    const qcStyle =
      document.getElementById("qc-print-style")?.textContent || "";
    let pagesHtml = "";

    const nextFrame = (n = 1) =>
      new Promise((res) => {
        const step = () => (n-- <= 1 ? res() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      });

    for (let k = 0; k < indexList.length; k++) {
      const idx = indexList[k];
      const btn = ridButtons[idx];
      if (!btn) continue;

      const ridNo = btn.id.replace("rid-btn-", "");

      showPrintProgress(`🖨 Đang in ${k + 1} / ${indexList.length} — ${ridNo}`);

      await loadRIDDetail(ridNo, riNo);
      await nextFrame(2); // ✅ chờ DOM render xong

pagesHtml += clonePreviewToPrintable(
  btn,
  idx,
  k === indexList.length - 1 // 👈 TEM CUỐI
);
    }

    const html = buildPrintHtml({
      title: "In tem QC đã chọn",
      qcStyle,
      bodyHtml: pagesHtml,
    });

    await printHtmlViaElectron(html, { title: "QC - Print Picked" });
    showPrintProgress(`✅ Đã gửi ${indexList.length} tem đã chọn`);
    hidePrintProgress(2000);
  }

  window.doPrintByIndexes = doPrintByIndexes;

  // =========================

  // RID click
  // =========================
  function onRidButtonClick(e, ridNo, riNo) {
    const btn = e.currentTarget || e.target.closest("button");
    if (!btn) return;

    // ✅ SET ACTIVE NGAY
    setActiveRidButton(btn);
  setActiveRidIndex(btn); // 🔥 BẮT BUỘC PHẢI CÓ
    // ✅ SCROLL VÀO VIEW
    scrollRidToView?.(btn);

    // ✅ LOAD DATA SAU
    loadRIDDetail(ridNo, riNo);
  }

  window.onRidButtonClick = onRidButtonClick;

  // =========================
  // parse "1,2,5-10" => [0,1,4,5,6,7,8,9]
  // =========================
  function parseRidRangeInput(str, maxIndex) {
    if (!str) return [];

    const out = new Set();
    const parts = String(str).split(",");

    for (let p of parts) {
      p = p.trim();
      if (!p) continue;

      if (p.includes("-")) {
        let [a, b] = p.split("-").map((x) => parseInt(x.trim(), 10));
        if (!isNaN(a) && !isNaN(b)) {
          const start = Math.min(a, b);
          const end = Math.max(a, b);
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= maxIndex) out.add(i - 1);
          }
        }
      } else {
        const v = parseInt(p, 10);
        if (!isNaN(v) && v >= 1 && v <= maxIndex) out.add(v - 1);
      }
    }

    return Array.from(out).sort((a, b) => a - b);
  }
  window.parseRidRangeInput = parseRidRangeInput;

  // =========================
  // LOAD RID DETAIL (Electron IPC)
  // kbAPI.getRidDetail({ rid_no }) -> { success, records, RID_rank, RID_color, RID_LabDate }
  // =========================
async function loadRIDDetail(ridNo, riNo) {
  if (window.__CREATING_NEW_RID__) return;

  let pendingLabDate = "";

  // lấy RI_date ngay từ đầu (fallback)
  const riDate = toYMD(document.querySelector('[name="RI_date"]')?.value);

  try {
    // fetch trước
    const data = await window.kbAPI.getRidDetail({ rid_no: ridNo, ri_no: riNo });

    // disable tabs while loading
    document.querySelectorAll("#rid-items button").forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("disabled");
    });
    lockAllInputs(true);

    // reset qty + rank
    for (let i = 1; i <= 14; i++) {
      const input = document.getElementById(`RID_qty${i}`);
      if (input) input.value = "";
    }
    const rankEl = document.getElementById("RID_rankcolor");
    if (rankEl) rankEl.value = "";

    // barcode
    if (ridNo) {
      clearBarcode();
      renderBarcode?.("#preview-barcode", ridNo);
    }

    // reset total
    const previewTotalEl = document.getElementById("preview-total");
    if (previewTotalEl) previewTotalEl.textContent = "0.0";

    // ✅ lấy LabDate từ nhiều khả năng (top-level hoặc record[0])
    const labFromApi =
      data?.RID_LabDate ??
      data?.records?.[0]?.RID_LabDate ??
      "";

    pendingLabDate = toYMD(labFromApi) || riDate;

    // CASE: chưa có dữ liệu
    if (!data?.success || !Array.isArray(data.records) || data.records.length === 0) {
     const activeBtn = document.querySelector("#rid-items button.rid-active");

if (!activeBtn?.dataset?.draft) {
  hasUnsavedRID = false;
}
      return;
    }

    // fill records
    data.records.forEach((r) => {
      const seq = parseInt(r.RID_seqno, 10);
      const input = document.getElementById(`RID_qty${seq}`);
      if (input) input.value = Number(r.RID_qty) ? Number(r.RID_qty) : "";
    });

    updateTotalQty?.();

    // rankcolor
    console.log(data,'data');
if (rankEl) {
rankEl.value = formatRankColor(data?.RID_rank, data?.RID_color, data?.RID_Failtype);}

    hasUnsavedRID = false;
  } catch (err) {
    console.error("Lỗi khi load RID:", err);
  } finally {
    // enable tabs
    document.querySelectorAll("#rid-items button").forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("disabled");
    });
    lockAllInputs(false);

    // ✅ set date sau khi unlock - MUST là YYYY-MM-DD
    requestAnimationFrame(() => {
      const labEl = document.getElementById("RID_LabDate");
      const finalDate = pendingLabDate || riDate;

      if (labEl) {
        labEl.value = finalDate; // đã là YYYY-MM-DD
        labEl.dispatchEvent(new Event("input", { bubbles: true }));
        labEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    enableEditMode?.();
  }
}



  window.loadRIDDetail = loadRIDDetail;

  // =========================
  // Sync inspector sign into preview
  // =========================

  // =========================
  // Enter / '-' nav inside RID qty inputs
  // =========================
  document.addEventListener("DOMContentLoaded", function () {
    const qtyInputs = Array.from(
      document.querySelectorAll('#preview-content input[id^="RID_qty"]')
    );
    const dateInput = document.getElementById("RID_rankcolor");
    const inputEnd = document.getElementById("RID_qty14");

    qtyInputs.forEach((el, idx) => {
      el.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== "-") return;
        e.preventDefault();

        const curVal = (el.value || "").trim();

        if (e.key === "-") {
          const prevIdx = (idx - 1 + qtyInputs.length) % qtyInputs.length;
          qtyInputs[prevIdx].focus();
          qtyInputs[prevIdx].select?.();
          return;
        }

        // Enter
        if (el === inputEnd || curVal === "") {
          dateInput?.focus();
          dateInput?.select?.();
          return;
        }

        const dir = e.shiftKey ? -1 : 1;
        const next = (idx + dir + qtyInputs.length) % qtyInputs.length;
        qtyInputs[next].focus();
        qtyInputs[next].select?.();
      });
    });
  });

  // =========================
  // DELETE RID (Electron IPC)
  // kbAPI.deleteRid({ RI_no, RID_no }) -> { success, message, totals }
  // =========================
  async function deleteCurrentRID() {
    if (hasUnsavedRID) {
  showToastWarning("⚠️ Tem mới chưa lưu – không thể xóa");
  return;
}
    const riNo = document.querySelector('[name="RI_no"]')?.value?.trim() || "";
    if (!riNo) {
      // Swal.fire("⚠️ Chưa có RI_no — không thể xóa tem!", "", "warning");
      return;
    }

    const activeBtn = document.querySelector("#rid-items button.rid-active");

    if (activeBtn?.dataset?.draft === "1") {
  showToastWarning("⚠️ Tem mới chưa lưu – không thể xóa");
  return;
}

    if (!activeBtn) {
      // Swal.fire("⚠️ Chưa chọn tem nào để xóa!", "", "warning");
      return;
    }

    const ridNo = activeBtn.id.replace("rid-btn-", "");

    const buttons = Array.from(document.querySelectorAll("#rid-items button"));
    const idxBefore = buttons.findIndex((b) => b === activeBtn);

    const ok = confirm(`Bạn có chắc muốn xóa RID ${ridNo}?`);
    if (!ok) return;

    try {
      if (!window.kbAPI?.deleteRid) throw new Error("kbAPI.deleteRid chưa có");

      const data = await window.kbAPI.deleteRid({ RI_no: riNo, RID_no: ridNo });

      if (!data?.success) {
        Swal.fire("❌ Xóa thất bại!", data?.message || "", "error");
        return;
      }

      Swal.fire("✅ Đã xóa tem!", "", "success");

      // reload list
      await loadRIDList?.(riNo, false);

      // update totals A..F..R ngoài form
      if (data.totals) {
        Object.entries(data.totals).forEach(([col, val]) => {
          const input = document.querySelector(`[name="${col}"]`);
          if (!input) return;
          const num = Number(val ?? 0);
          input.value = Number.isFinite(num) ? num.toFixed(2) : "";
        });
        window.updateTotalsAndPercent?.();
      }

      // chọn tem kế bên nếu còn
      const newButtons = Array.from(
        document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
      );

      if (newButtons.length) {
        const nextIdx = Math.min(idxBefore, newButtons.length - 1);
        const btn = newButtons[nextIdx];
        btn?.click();
        scrollRidToView?.(btn);
      } else {
        // clear modal form
        for (let i = 1; i <= 14; i++) {
          const input = document.getElementById(`RID_qty${i}`);
          if (input) input.value = "";
        }
        document.getElementById("RID_rankcolor") &&
          (document.getElementById("RID_rankcolor").value = "");
        document.getElementById("RID_LabDate") &&
          (document.getElementById("RID_LabDate").value = "");
        document.getElementById("preview-total") &&
          (document.getElementById("preview-total").textContent = "0.0");
        clearBarcode?.();

        document.getElementById("preview-label-index") &&
          (document.getElementById("preview-label-index").textContent = "");
        document
          .querySelectorAll("[data-live-index]")
          .forEach((el) => (el.textContent = ""));
        hasUnsavedRID = false;
      }
    } catch (err) {
      console.error("Lỗi xóa RID:", err);
      Swal.fire("💥 Lỗi trong quá trình xóa tem!", "", "error");
    }
  }
  window.deleteCurrentRID = deleteCurrentRID;

  // =========================
  // Barcode render (giữ nguyên)
  // =========================
  function renderBarcode(selector, text) {
    if (!text) return;
    const img = document.querySelector(selector);
    if (!img) return;
    img.dataset.rid = text;
    JsBarcode(img, text, {
      format: "CODE128",
      displayValue: true,
      fontSize: 25,
      textMargin: 4,
      margin: 0,
      width: 3,
      height: 100,
    });
  }
  window.renderBarcode = renderBarcode;

  // =========================
  // PRINT CURRENT LABEL (Electron IPC printHtml)
  // =========================
  function buildPrintHtml2({ title, css, body, extraScript = "" }) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title || ""}</title>
<style>${css || ""}</style>
</head>
<body>
${body || ""}
${extraScript ? `<script>${extraScript}<\/script>` : ""}
</body>
</html>`;
  }

  async function printCurrentLabelDirect() {
    const source = document.getElementById("preview-content");
    if (!source) return;
   const silent = isSilentPrint();

const deviceName = silent ? getSavedPrinterName() : null;

    const clone = source.cloneNode(true);

    clone.querySelectorAll("input").forEach((input) => {
      const span = document.createElement("span");
      span.textContent = input.value || "—";
      span.style.display = "inline-block";
      span.style.width = "100%";
      span.style.textAlign = "center";
      input.parentNode.replaceChild(span, input);
    });

    const css = document.getElementById("qc-print-style")?.textContent || "";
    const extraScript = `
    function fitMatName(){
      const el = document.getElementById('preview-matname');
      if(!el) return;
      const cell = el.closest('.cell');
      if(!cell) return;
      let style = window.getComputedStyle(el);
      let fontSize = parseFloat(style.fontSize) || 14;
      const maxHeight = cell.clientHeight || cell.offsetHeight;
      if (!maxHeight) return;
      const oldAlign = cell.style.alignItems;
      cell.style.alignItems = 'flex-start';
      while (el.scrollHeight > maxHeight && fontSize > 6){
        fontSize -= 0.5;
        el.style.fontSize = fontSize + 'px';
      }
      cell.style.alignItems = oldAlign || '';
    }
    
  `;

    const html = buildPrintHtml2({
      title: "In tem QC",
      css,
      body: `<div id="preview-content">${clone.innerHTML}</div>`,
      extraScript,
    });

    if (!window.kbAPI?.printHtml) {
      // fallback dev
      const win = window.open("", "_blank", "width=900,height=800");
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.onload = () => {
        win.focus();
        win.print();
      };
      setTimeout(enableEditMode, 300);
      return;
    }


await new Promise(r => requestAnimationFrame(r));
await new Promise(r => requestAnimationFrame(r));

await window.kbAPI.printHtml({
  html,
  silent,
  title: "QC - Print Current",
  ...(silent && deviceName ? { deviceName } : {})
});
    setTimeout(enableEditMode, 300);
  }
  window.printCurrentLabelDirect = printCurrentLabelDirect;
  function openPickModal() {
    document.getElementById("pick-input").value = "";
    document.getElementById("pick-modal").classList.remove("hidden");
  }

  function closePickModal() {
    document.getElementById("pick-modal").classList.add("hidden");
  }

  window.confirmDeleteRID = async function ({ ri_no, rid_no }) {
    const ok = await confirmBox({
      title: "Delete QC label",
      message: `Do you want to delete RID: ${rid_no}?`,
      okText: "Delete",
      danger: true,
    });

    if (!ok) return;

    try {
      if (!window.kbAPI?.deleteRid) {
        throw new Error("deleteRid API not found");
      }

      const result = await window.kbAPI.deleteRid({
        RI_no: ri_no,
        RID_no: rid_no,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Delete failed");
      }

      showToastSuccess("Deleted successfully!");

      // reload list RID
      await loadRIDList?.(ri_no, false);

      const firstBtn = document.querySelector("#rid-items button");
      if (firstBtn) {
        firstBtn.click();
      } else {
        clearBarcode();
      }
    } catch (err) {
      console.error(err);
      showToastError(err?.message || "Delete failed");
    }
  };

  function renderPickChips(ridButtons) {
    const wrap = document.getElementById("pick-chip-wrap");
    wrap.innerHTML = "";

    ridButtons.forEach((btn, idx) => {
      const label = btn.textContent?.trim() || idx + 1;

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className =
        "pick-chip m-1 px-3 py-1 rounded border text-sm bg-slate-50";
      chip.dataset.idx = idx;
      chip.textContent = label;

      chip.addEventListener("click", () => {
        chip.classList.toggle("picked");
        if (chip.classList.contains("picked")) {
          chip.style.background = "#0ea5e9";
          chip.style.color = "#fff";
          chip.style.borderColor = "#0ea5e9";
        } else {
          chip.style.background = "#f8fafc";
          chip.style.color = "#0f172a";
          chip.style.borderColor = "#cbd5e1";
        }
      });

      wrap.appendChild(chip);
    });
  }

  function bindPickPrintButton() {
    const btn = document.getElementById("btn-print-picked");
    if (!btn) return;

    // 🔥 xoá sạch mọi listener cũ
    const cleanBtn = btn.cloneNode(true);
    btn.replaceWith(cleanBtn);

    // ✅ bind 1 lần duy nhất
    cleanBtn.addEventListener("click", () => {
      const riNo = document.querySelector('[name="RI_no"]')?.value?.trim();
      if (!riNo) {
        showToastWarning("⚠️ Chưa có RI_no");
        return;
      }

      const ridButtons = Array.from(
        document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
      );

      if (!ridButtons.length) {
        showToastWarning("⚠️ Chưa có RID");
        return;
      }

      renderPickChips(ridButtons);
      openPickModal();
    });
  }

  document
    .getElementById("pick-confirm")
    ?.addEventListener("click", async () => {
      const ridButtons = Array.from(
        document.querySelectorAll('#rid-items button[id^="rid-btn-"]')
      );

      const riNo = document.querySelector('[name="RI_no"]')?.value?.trim();

      // chip picked
      const chipIdx = Array.from(
        document.querySelectorAll(".pick-chip.picked")
      ).map((c) => parseInt(c.dataset.idx, 10));

      // input range
      const raw = document.getElementById("pick-input").value.trim();
      const parsedIdx = window.parseRidRangeInput(raw, ridButtons.length);

      const finalIdx = Array.from(new Set([...chipIdx, ...parsedIdx]))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < ridButtons.length)
        .sort((a, b) => a - b);

      if (!finalIdx.length) {
        showToastWarning("⚠️ Chưa chọn tem nào");
        return;
      }

      closePickModal();
      try {
        await doPrintByIndexes(riNo, ridButtons, finalIdx);
        showToastSuccess("🖨 Đã gửi lệnh in");
      } catch (e) {
        console.error(e);
        showToastError("❌ In thất bại");
      }
    });

  document
    .getElementById("pick-cancel")
    ?.addEventListener("click", closePickModal);

  function showPreviewModal() {
    const modal = document.getElementById("modal-preview");
    console.log("[QC] showPreviewModal modal=", modal);
    if (!modal) return;

    requestAnimationFrame(() => {
      bindDeleteRidButton();
    });

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function hidePreviewModal() {
    const modal = document.getElementById("modal-preview");
    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");

    currentRINo = null;
    hasUnsavedRID = false;
    window.__CREATING_NEW_RID__ = false;

    clearBarcode?.(); // 👈 thêm dòng này
  }

  function bindQcToolButtons() {
    // bắt click toàn trang, nút xuất hiện sau cũng vẫn ăn
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#btn-qc-tool");
      if (!btn) return;

      e.preventDefault();
      console.log("[QC] btn-qc-tool clicked");
      window.openPreviewModal?.();
    });

    // close buttons (nếu nút nằm trong modal load sau cũng ok)
    document.addEventListener("click", (e) => {
      if (
        e.target.closest("#btn-close-preview") ||
        e.target.closest("#btn-close2")
      ) {
        e.preventDefault();
        hidePreviewModal();
      }
    });

    // // click nền đen để đóng
    // document.addEventListener("click", (e) => {
    //   if (e.target?.id === "modal-preview") hidePreviewModal();
    // });
  }

  // window.toggleRidColumn = function toggleRidColumn() {
  //   document.getElementById("modal-wrap")?.classList.toggle("hide-rid");
  // };
  // document.addEventListener("click", (e) => { 
  //   const btn = e.target.closest("#btn-toggle-rid");
  //   if (!btn) return;

  //   e.preventDefault();
  //   toggleRidColumn();
  // });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#btn-create-rid");
    if (!btn) return;

    e.preventDefault();
    createNewRID(e);
  });

  // =========================
  // SAVE RID – GLOBAL DELEGATION (🔥 BẮT CLICK CHUẨN)
  // =========================
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('#btn-save-rid, [data-action="save-rid"]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    console.log("[QC] btn-save-rid clicked");

    if (typeof window.saveRID !== "function") {
      console.error("❌ saveRID chưa tồn tại");
      return;
    }

    if (btn.disabled) {
      console.warn("⚠️ btn-save-rid đang disabled");
      return;
    }

    window.saveRID(e);
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#btn-print-preview");
    if (!btn) return;

    e.preventDefault();
    window.printPreview?.();
  });

  document
    .getElementById("btn-print-all")
    ?.addEventListener("click", async () => {
      try {
        await printAllLabels?.();
        showToastSuccess("🖨 Printed all labels");
      } catch (e) {
        console.error(e);
        showToastError("❌ Print failed");
      }
    });

  function bindDeleteRidButton() {
    const btn = document.getElementById("btn-delete-rid");
    if (!btn) return;

    const cleanBtn = btn.cloneNode(true);
    btn.replaceWith(cleanBtn);

    cleanBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("[QC] btn-delete-rid clicked");

      const riNo =
        document.querySelector('[name="RI_no"]')?.value?.trim() || "";
      const activeBtn = document.querySelector("#rid-items button.rid-active");

      if (!riNo || !activeBtn) {
        showToastWarning("No RID selected");
        return;
      }

      const ridNo = getCurrentRID();

      if (!riNo) {
        showToastWarning("No RID selected");
        return;
      }

      await window.confirmDeleteRID({
        ri_no: riNo,
        rid_no: ridNo,
      });
    });
  }

  

  window.addEventListener("app:ready", async() => {

    const QC_HOTKEY_STORE = "QC_RANK_HOTKEYS_V1";
const QC_HOTKEY_DEFAULT = { "1":"A","2":"B","3":"C","4":"D","5":"E","6":"F","7":"R" };

function loadQcHotkeys(){
  try{
    const raw = localStorage.getItem(QC_HOTKEY_STORE);
    const obj = raw ? JSON.parse(raw) : null;
    const out = { ...QC_HOTKEY_DEFAULT };
    if (obj && typeof obj === "object"){
      Object.keys(out).forEach(k=>{
        const v = String(obj[k]||"").toUpperCase();
        if (["A","B","C","D","E","F","R",""].includes(v)) out[k]=v;
      });
    }
    return out;
  }catch{
    return { ...QC_HOTKEY_DEFAULT };
  }
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

    const info = await window.kbAPI.getUserInfo();
window.__EMPLOYEE_NAME__ = info?.employee_name || '';
     bindQtyLiveUpdate();
    bindDeleteRidButton();
    const el = document.getElementById("RID_rankcolor");
    if (!el) return;

    
    let popup = null;
    let activeDisplayMap = null;

    const closePopup = () => {
      popup?.remove();
      popup = null;
      activeDisplayMap = null;
    };

    const createPopup = (displayMap) => {
      closePopup();
      activeDisplayMap = displayMap;

      popup = document.createElement("div");
      const r = el.getBoundingClientRect();

      Object.assign(popup.style, {
        position: "absolute",
        zIndex: 1000,
        top: `${r.bottom + window.scrollY + 5}px`,
        left: `${r.right + 5}px`,
        width: "200px",
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "5px",
        padding: "8px",
      });

      Object.keys(displayMap).forEach((k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = `${k}: ${displayMap[k]}`;
        b.style.width = "100%";
        b.onclick = () => {
el.value += String(displayMap[k] || "");   // ✅ không space
          closePopup();
        };
        popup.appendChild(b);
      });

      document.body.appendChild(popup);
    };

    el.addEventListener("keydown", (e) => {
      if (e.key === "-") {
        e.preventDefault();
        const qtyInputs = Array.from(
          document.querySelectorAll('#preview-content input[id^="RID_qty"]')
        );
        const prev = qtyInputs[qtyInputs.length - 1];
        prev?.focus();
        prev?.select?.();
        return;
      }

if (e.key === "+") {
  e.preventDefault();
  const { rank } = parseRankColor(el.value);     // ✅ lấy rank thật
  const m = loadFailtypeMap();
  const displayMap = m?.[rank];
  if (displayMap) createPopup(displayMap);
  return;
}


      if (popup && activeDisplayMap?.[e.key]) {
        e.preventDefault();
el.value += String(activeDisplayMap[e.key] || ""); // ✅ không space
        closePopup();
        return;
      }

     if (/^[1-7]$/.test(e.key)) {
  const hk = loadQcHotkeys();      // luôn đọc mới => đổi trong modal là ăn liền
  const rank = hk[e.key];          // "A".."R" hoặc ""
  if (rank) {
    const v = el.value;
    const allSelected = el.selectionStart === 0 && el.selectionEnd === v.length;
    if (!v || allSelected) {
      e.preventDefault();
      el.value = RANK_MAP[rank] || rank; // set "A(A/I)"...
      requestAnimationFrame(() =>
        el.setSelectionRange(el.value.length, el.value.length)
      );
    }
  }
}
    });

    document.addEventListener("click", (e) => {
      if (popup && !popup.contains(e.target) && e.target !== el) closePopup();
    });
    // ===== QC SCRIPT INIT – 1 LẦN DUY NHẤT =====

    // đảm bảo modal đúng vị trí

    // bind các nút cần DOM sẵn
    bindQcToolButtons?.();
    bindPickPrintButton?.();
bindMonthStamp();
    // sync sign preview (lúc partial đã gắn)
    const srcImg = document.getElementById("sign-preview-inspector");
    const destImg = document.getElementById("preview-sign-inspector");
    if (srcImg && destImg && srcImg.src) {
      destImg.src = srcImg.src;
      destImg.style.display = "block";
    }

    // Enter / '-' nav cho RID qty
    const qtyInputs = Array.from(
      document.querySelectorAll('#preview-content input[id^="RID_qty"]')
    );
    const dateInput = document.getElementById("RID_rankcolor");
    const inputEnd = document.getElementById("RID_qty14");

    qtyInputs.forEach((el, idx) => {
      el.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== "-") return;
        e.preventDefault();

        const curVal = (el.value || "").trim();

        if (e.key === "-") {
          const prevIdx = (idx - 1 + qtyInputs.length) % qtyInputs.length;
          qtyInputs[prevIdx].focus();
          qtyInputs[prevIdx].select?.();
          return;
        }

        // Enter
        if (el === inputEnd || curVal === "") {
          dateInput?.focus();
          dateInput?.select?.();
          return;
        }

        const dir = e.shiftKey ? -1 : 1;
        const next = (idx + dir + qtyInputs.length) % qtyInputs.length;
        qtyInputs[next].focus();
        qtyInputs[next].select?.();
      });
    });
    const rankInput = document.getElementById("RID_rankcolor");
    // rank input Enter => save
    rankInput?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const btn =
        document.getElementById("btn-save-rid") ||
        document.querySelector('[data-action="save-rid"]');
      if (!btn || btn.disabled) return;
      btn.click();
    });

    const fastChk = document.getElementById("mode-fast");
    if (!rankInput) return;

    rankInput.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();

      const saveBtn =
        document.getElementById("btn-save-rid") ||
        document.querySelector('[data-action="save-rid"]');
      if (!saveBtn || saveBtn.disabled) return;

      window.__FAST_MODE__ = !!fastChk?.checked;
    });
  });
})();
