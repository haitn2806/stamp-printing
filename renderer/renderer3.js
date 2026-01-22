
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
    loadPartial("mount-sidebar3", "./partials3/sidebar.html"),
    loadPartial("mount-toolbar3", "./partials3/toolbar.html"),
    loadPartial("mount-form3", "./partials3/form_main.html"),
    loadPartial("mount-modal-history3", "./partials3/modal_history.html"),
    loadPartial("mount-modal-qr3", "./partials3/modal_qr.html"),
    loadPartial("mount-modal-preview3", "./partials3/modal_preview.html"),
    loadPartial("mount-signatures3", "./partials3/signatures.html"),
  ]);

  // nạp script sau khi DOM đã có partial
  await loadScript("./js3/scripts_main.js");
  await loadScript("./js3/scripts_modal.js");

  await loadScript("./js3/scripts_modal_order.js");
   window.dispatchEvent(new Event("app:ready"));
}

boot().catch(console.error);
