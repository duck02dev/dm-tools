(async () => {
  'use strict';

  const APP_VERSION = 'v1.0';
  const APP_TITLE = `Find ATS Product · duck02 ${APP_VERSION}`;
  const PANEL_ID = 'find-ats-product-panel';
  const STYLE_ID = 'find-ats-product-style';

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
   * 텍스트를 클립보드에 복사합니다.
   * @param {*} text 
   * @returns 
   */
  const copyText = async (text) => {
    // Use the modern Clipboard API if available
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.fontSize = '12px'; // Prevent zooming on iOS
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

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
        cell.innerHTML = '<span class="highlight">' + productName + '</span>';
        break;
      }
    }
    return isAts;
  }

  document.addEventListener('paste', (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData || window.clipboardData;
    const atsTexts = clipboardData.getData('text');
    if (!atsTexts) return;

    const atsProducts = atsTexts
      .split(/\r?\n/)
      .map(term => term.trim())
      .filter(term => term.length > 0);
    if (atsProducts.length === 0) return;

    scrapeTruckContainerList(atsProducts);
    
    const containerTable = document.getElementById('truckContainerList');
    if (!containerTable) return;

    const existingHighlights = containerTable.querySelectorAll('.highlight');
    existingHighlights.forEach(span => {
      span.outerHTML = span.textContent;
    });

    containerTable.normalize();

    const textNodes = [];
    const walk = document.createTreeWalker(containerTable, NodeFilter.SHOW_TEXT, null, false);
    let currentNode;
    while (currentNode = walk.nextNode()) {
      if (currentNode.nodeValue.trim().length > 0) {
        textNodes.push(currentNode);
      }
    }
    const escapedTerms = atsProducts.map(term => term.replace(/[-\/\\^\$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'g');
    
    // 6. 각 텍스트 노드를 순회하며 매칭되는 단어를 <span> 태그로 치환
    // 뒤에서부터 순회해야 노드가 쪼개져도 인덱스가 들어지지 않습니다.
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const node = textNodes[i];
      const text = node.nodeValue;

      if (regex.test(text)) {
        // 정규식 위치를 리셋하고 매칭 실행
        regex.lastIndex = 0;
        
        // 안전하게 HTML 요소를 생성하기 위해 임시 div 활용
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text.replace(regex, '<span class="highlight">\$1</span>');
        
        // 기존 텍스트 노드가 있던 자리에 하이라이트된 새 노드들을 삽입
        while (tempDiv.firstChild) {
          node.parentNode.insertBefore(tempDiv.firstChild, node);
        }
        // 기존 원본 텍스트 노드는 삭제
        node.parentNode.removeChild(node);
      }
    }
  });
})();
