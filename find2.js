(async () => {
  'use strict';

  const STYLE_ID = 'find-ats-style';

  const clean = (text) =>
    text?.trim().replace(/\s+/g, ' ') ?? '';

  const getCellValue = (cells, index) => {
    if (index < 0 || !cells) return '';
    return clean(cells[index].innerText || cells[index].textContent);
  };

  const getCellInt = (cells, idx) => {
    return cells[idx] ? (parseInt(cells[idx].innerText.trim(), 10) || 0) : 0;
  }

  const isAbortError = (error) => error?.name === 'AbortError';

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const injectStyle = () => {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .highlight {
        background: yellow;
        padding: 6px 12px;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  }; 

  /**
   * 화면에 간단한 메시지를 표시합니다.
   * @param {*} message 메시지
   */
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.background = 'rgba(0,0,0,0.7)';
    toast.style.color = '#E0E0E0';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    toast.style.opacity = '1';
    toast.style.transition = 'opacity 1s ease';

    document.body.appendChild(toast);

    // 일정 시간 후 서서히 사라지게 하기
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000); // transition 시간과 동일하게 설정
    }, 2000); // 2초 후 사라지기 시작
  }
  
  const scrapeTruckContainerList = (atsProducts) => {
    const table = document.getElementById('truckContainerList');
    if (!table) return [];

    const ROWSPAN_OFFSET = 4;

    const rows = table.querySelectorAll('tbody tr');

    return Array.from(rows).reduce((acc, row) => {
      const cells = row.querySelectorAll('td');

      let isAts = false;
      if (cells.length === 9) {
        isAts = findAtsProduct(cells[5], atsProducts);
        acc.push({
          name: cells[1].innerText.trim(),
          qty: getCellInt(cells, 3),
          skus: [{
            name: cells[5].innerText.trim(),
            qty: getCellInt(cells, 7)
          }]
        });
      } else if (acc.length > 0) {
        isAts = findAtsProduct(cells[5 - ROWSPAN_OFFSET], atsProducts);
        const current = acc[acc.length - 1];
        if (current.qty === 1) {
          current.skus.push({
            name: cells[5 - ROWSPAN_OFFSET].innerText.trim(),
            qty: getCellInt(cells, 7 - ROWSPAN_OFFSET)
          });
        }
      }
      return acc;
    }, []);
  }

  const findAtsProduct = (cell, atsProducts) => {
    const productName = cell.innerText.trim();

    let isAts = false;
    for (let i = 0; i <= atsProducts.length; i++) {
      if (productName === atsProducts[i]) {
        isAts = true;
        cell.classList.add('highlight');
        break;
      }
    }
    return isAts;
  }
  document.addEventListener('paste', (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const atsTexts = clipboardData.getData('text');
    findAts(atsTexts);
  });

  const findAts = (atsTexts) => {
    if (!atsTexts) return;

    const atsProducts = atsTexts
      .split(/\r?\n/)
      .map(term => term.trim())
      .filter(term => term.length > 0);
    if (atsProducts.length === 0) return;
    
    const containerTable = document.getElementById('truckContainerList');
    if (!containerTable) return;

    const existingHighlights = containerTable.querySelectorAll('.highlight');
    existingHighlights.forEach(span => {
      span.outerHTML = span.textContent;
    });

    containerTable.normalize();
    scrapeTruckContainerList(atsProducts);

    scrollToElement('truckContainerList');
  }

  const scrollToElement = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const sibling = element.previousElementSibling;
      if (sibling) {
        sibling.scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
      } else {
        element.scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        });
      }
    }
  }

  const main = async () => {
    injectStyle();

    window.focus();
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText) {
        showToast('클립보드에 ATS정보가 없습니다');
        return;
      }
      findAts(clipboardText);

    } catch (error) {
      showToast('Ctrl+V로 ATS정보를 넣어주세요');
    }
  }

  main();
})();
