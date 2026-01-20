const { contextBridge, ipcRenderer } = require("electron");

let __RID_LAST_PREFIX__ = '';
let __RID_LAST_SERIAL__ = 0;
let __RID_LAST_TIME__ = 0;

function pad(n, w = 2) {
  return String(n).padStart(w, '0');
}

function getRidPrefix() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
return `RID${yy}${MM}${DD}${hh}${mm}${ss}`;

}

function generateRidOffline() {
  const prefix = getRidPrefix();

  if (prefix !== __RID_LAST_PREFIX__) {
    __RID_LAST_PREFIX__ = prefix;
    __RID_LAST_SERIAL__ = 1;
  } else {
    __RID_LAST_SERIAL__++;
  }

  if (__RID_LAST_SERIAL__ > 99) {
    throw new Error("RID vượt quá 99 trong cùng thời gian");
  }

  return `${prefix}${pad(__RID_LAST_SERIAL__)}`;
}


contextBridge.exposeInMainWorld('APP', {
  asset: (p) => `file:///assets/${p}`
});
// Expose a safe API to renderer process
contextBridge.exposeInMainWorld("kbAPI", {

preloginDone: (data) =>
  ipcRenderer.invoke('prelogin:done', data),

  getAppContext: () =>
    ipcRenderer.invoke('get-app-context'),

  //login  
    generateRid: () => {
    const rid_no = generateRidOffline();
    return { rid_no };
  },
  saveHistory: (payload) => ipcRenderer.invoke('kb:saveHistory', payload),
   getPrinters: () => ipcRenderer.invoke("kb:get-printers"),
printHtml: (data) => ipcRenderer.invoke("print-html", data),
  login: (payload) => ipcRenderer.invoke("kb:login", payload),
  loginSuccess: (user) => ipcRenderer.send("kb:login-success", user),
  getRememberedLogin: () => ipcRenderer.invoke("kb:get-remember"),
  getUserInfo: () => ipcRenderer.invoke('kb:get-user-info'),
  clearRemember: () => ipcRenderer.send("kb:clear-remember"),
  logout: () => ipcRenderer.send('kb:logout'),
openPrinterSettings: () => ipcRenderer.invoke('kb:open-printer-settings'),
  getInspectionDetail: (ri_no) =>
    ipcRenderer.invoke("get-inspection-detail", ri_no),
  dragEvent: (e) => {
    console.log("dragEvent:", e.type);
  }, // Giả sử bạn muốn expose dragEvent
  // RI
searchPO: (poNo) => ipcRenderer.invoke('kb:search-po', poNo),
  saveInspection: (payload) => ipcRenderer.invoke("kb:saveInspection", payload),

  searchTC: (tcCode) => ipcRenderer.invoke("kb:searchTC", tcCode),
saveRid: (payload) => ipcRenderer.invoke("kb:saveRid", payload),
  // lất qty công và hàng về
  getPoQtyCombined: (params) =>
    ipcRenderer.invoke("get-po-qty-combined", params),

  // Sidebar
  getSidebarInspections: (rmType, limit) =>
    ipcRenderer.invoke("get-sidebar-inspections", rmType, limit),

  //tem QC

 deleteRid: (payload) => ipcRenderer.invoke('kb:deleteRid', payload),
  getColor: (params) => ipcRenderer.invoke("kb:getColor", params),
  getRidList: (params) => ipcRenderer.invoke("kb:getRidList", params),
   deleteInspection: (ri_no) =>
    ipcRenderer.invoke('inspection:delete', ri_no),
  getRidDetail: (params) => ipcRenderer.invoke("kb:getRidDetail", params),


  //excelllll
exportExcel: (payload) =>
    ipcRenderer.invoke('kb:exportExcel', payload),
  //tem QC
});

