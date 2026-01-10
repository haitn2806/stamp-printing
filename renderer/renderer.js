
async function loadPartial(mountId, partialPath) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const res = await fetch(partialPath);
  if (!res.ok) throw new Error(`Failed to load ${partialPath}: ${res.status}`);
  mount.innerHTML = await res.text();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;     
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

async function boot() {
  await Promise.all([
    loadPartial("mount-sidebar", "./partials/sidebar.html"),
    loadPartial("mount-toolbar", "./partials/toolbar.html"),
    loadPartial("mount-form", "./partials/form_main.html"),
    loadPartial("mount-modal-history", "./partials/modal_history.html"),
    loadPartial("mount-modal-qr", "./partials/modal_qr.html"),
    loadPartial("mount-modal-preview", "./partials/modal_preview.html"),
    loadPartial("mount-signatures", "./partials/signatures.html"),
  ]);

  // nạp script sau khi DOM đã có partial
  await loadScript("./js/scripts_main.js");
  await loadScript("./js/scripts_modal.js");
  await loadScript("./js/scripts_modal_order.js");
   window.dispatchEvent(new Event("app:ready"));
}

boot().catch(console.error);
