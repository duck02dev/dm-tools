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
      #atsInfo {
        margin-left: 10px;
        font-size: 0.8em;
        color: red;
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
    
    const rows = table.querySelectorAll('tbody tr');

    let currMainRowCells = null;
    
    return Array.from(rows).reduce((acc, row) => {
      const cells = row.querySelectorAll('td');

      let isAts = false;
      if (cells.length === 9) {
        currMainRowCells = cells;
        isAts = findAtsProduct(cells[5], atsProducts);
        if (isAts) {
          row.classList.add('highlight');
        }
        acc.push({
          containerName: cells[1].innerText.trim(),
          qty: getCellInt(cells, 3),
          isAts: isAts,
          skus: [{
            name: cells[5].innerText.trim(),
            qty: getCellInt(cells, 7)
          }]
        });
      } else if (acc.length > 0) {
        isAts = findAtsProduct(cells[1], atsProducts);
        const currContainer = acc[acc.length - 1];
        if (currContainer.qty === 1) {
          currContainer.skus.push({
            name: cells[1].innerText.trim(),
            qty: getCellInt(cells, 3)
          });
        }
        if (isAts && currMainRowCells) {
          currContainer.isAts = true;
          currMainRowCells[0].classList.add('highlight');
          currMainRowCells[1].classList.add('highlight');
          currMainRowCells[2].classList.add('highlight');
          currMainRowCells[3].classList.add('highlight');
          row.classList.add('highlight');
        }
      }
      if (isAts) {
        row.classList.add('highlight');
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

    const atsInfo = document.getElementById('atsInfo');
    if (atsInfo) {
      atsInfo.remove();
    }

    const containerTable = document.getElementById('truckContainerList');
    const containerTitle = containerTable.previousElementSibling;

    if (!containerTable) return;
    
    const existingHighlights = containerTable.querySelectorAll('.highlight');
    existingHighlights.forEach(element => {
      element.classList.remove('highlight');
    });
    
    containerTable.normalize();
    const containerDatas = scrapeTruckContainerList(atsProducts);

    let fclAtsCnt = 0;
    let lclAtsCnt = 0;

    containerDatas.forEach(data => {
      if (data.isAts) {
        if (data.skus.length === 1) {
          fclAtsCnt += data.qty;
        } else {
          lclAtsCnt++;
        }
      }
    });

    let infoTxt = 'ATS가 없습니다';
    if (fclAtsCnt > 0 || lclAtsCnt > 0) {
      infoTxt = 'ATS: 완적 ' + fclAtsCnt + 'P, 혼적 ' + lclAtsCnt + 'P';
    }

    const atsInfoHTML = '<span id="atsInfo">' + infoTxt + '</span>';

    containerTitle.insertAdjacentHTML('beforeend', atsInfoHTML);

    scrollToElement(containerTitle);
  }

  const scrollToElement = (element) => {
    if (element) {
      element.scrollIntoView({
       block: 'start',
        behavior: 'smooth'
      });
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
