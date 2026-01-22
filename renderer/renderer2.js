
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
    loadPartial("mount-sidebar2", "./partials2/sidebar.html"),
    loadPartial("mount-toolbar2", "./partials2/toolbar.html"),
    loadPartial("mount-form2", "./partials2/form_main.html"),
    loadPartial("mount-modal-history2", "./partials2/modal_history.html"),
    loadPartial("mount-modal-qr2", "./partials2/modal_qr.html"),
    loadPartial("mount-modal-preview2", "./partials2/modal_preview.html"),
    loadPartial("mount-signatures2", "./partials2/signatures.html"),
  ]);

  // nạp script sau khi DOM đã có partial
  await loadScript("./js2/scripts_main.js");
  await loadScript("./js2/scripts_modal.js");

  await loadScript("./js2/scripts_modal_order.js");
   window.dispatchEvent(new Event("app:ready"));
}

boot().catch(console.error);
