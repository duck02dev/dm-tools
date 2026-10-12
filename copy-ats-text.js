(async () => {
  'use strict';

  /**
   * 텍스트를 클립보드에 복사합니다.
   * @param {*} text 
   * @returns 
   */
  const copyText = async (text) => {
    // Use the modern Clipboard API if available
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
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
    }
    showToast('ATS 정보를 클립보드에 복사했습니다.')
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

  const getAtsText = () => {
    const extractProductNames = [];
    
    const tables = document.querySelectorAll('table');
    let targetTable = null;

    for (let i = 0; i < tables.length; i++) {
      const firstTh = tables[i].querySelector('thead > tr > th');

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
          productNamed.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              productName += node.textContent;
            }
          });

          productName = productName.trim();
          if (productName) {
            extractProductNames.push(productName);
          }
        }
      });
    }
    return extractProductNames;
  }

  const main = () => {
    const atsText = getAtsText();
    if (atsText.length > 0) {
      copyText(atsText.join('\n'));
    } else {
      showToast('ATS가 없습니다');
    }
  }

  main();
  
})();
