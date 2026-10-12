(async () => {
  'use strict';

  const getAtsText = () => {
    const tables = document.querySelectorAll('table');
    let targetTable = null;

    for (let i = 0; i < tables.length; i++) {
      const first Thing = tables[i].querySelector('thead > tr > th');

      if (firstTh && firstTh.textContent.trim() === '발주번호') {
        if (i + 1 < tables.length) {
          targetTable = tables[i + 1];
        }
        break;
      }
    }

    if (targetTable) {
    }
  }
})();
