(function () {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const btnOk = document.getElementById('confirm-ok');
  const btnCancel = document.getElementById('confirm-cancel');

  if (!modal) {
    console.error('Confirm modal not found');
    return;
  }

  window.confirmBox = function ({
    title = 'Confirm',
    message = 'Are you sure?',
    okText = 'OK',
    cancelText = 'Cancel',
    danger = true
  } = {}) {
    return new Promise(resolve => {
      titleEl.textContent = title;
      msgEl.textContent = message;
      btnOk.textContent = okText;
      btnCancel.textContent = cancelText;

      btnOk.className =
        danger
          ? 'px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition'
          : 'px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 active:scale-95 transition';

      modal.classList.remove('hidden');
      modal.classList.add('flex');

      function cleanup(result) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);

        resolve(result);
      }

      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onBackdrop(e) {
        if (e.target === modal) cleanup(false);
      }

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
    });
  };
})();
