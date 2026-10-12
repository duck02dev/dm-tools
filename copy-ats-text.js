(async () => {
  'use strict';

  const getAtsText = () => {
    const extractProductNames = [];
    
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
      const rows = targetTable.querySelectorAll('tbody > tr');

      rows.forEach((tr, index) => {
        const tds = tr.querySelectorAll('td');

        if (tds.length >= 5 && tds[1].textContent.trim() === 'ATS') {
          const productNameTd = tds[4];

          let productName = '';
          product Named.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              productName += nodes textContent;
            }
          });

          productName = productName.trim();
          if (productName) {
            extractProductNames.push(productName);
        }
      }
    }
  }
})();
