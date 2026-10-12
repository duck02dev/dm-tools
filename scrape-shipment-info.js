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
    showToast('쉽먼트 정보를 클립보드에 복사했습니다.')
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

  const scrapeTruckBasicInfo = () => {
    const basicInfo = {
      companyName: '',
      reservationDate: '',
      totalPalletQty: 0
    }
    const infoTable = document.querySelector('table#inputForm');
    [...infoTable.querySelectorAll('tr')].forEach((row, index) => {
      const ths = row.querySelectorAll('th');
      const tds = row.querySelectorAll('td');

      ths.forEach((th, idx) => {
        switch (th.innerText.trim()) {
          case '거래처':
            basicInfo.companyName = tds[idx].textContent.split('/').pop().trim();
            break;
          case '예약일시':
            basicInfo.reservationDate = extractReservationDate(tds[idx].textContent.trim());
            break;
          case '팔렛트 수':
            basicInfo.totalPalletQty = parseInt(tds[idx].textContent.trim(), 10) || 0;
            break;
        }
      });
    });
    return basicInfo;
  };

  const scrapeTruckContainerInfo = () => {
    const table = document.getElementById('truckContainerList');
    if (!table) return [];

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
    const headerIdx = {
      containerName: headers.indexOf('컨테이너 명'),
      containerQty: headers.indexOf('컨테이너 수량'),
      skuQty: headers.indexOf('컨테이너별 수량')
    }

    const ROWSPAN_OFFSET = 4;

    const rows = table.querySelectorAll('tbody tr');

    const containerList = Array.from(rows).reduce((acc, row) => {
      const cells = row.querySelectorAll('td');

      if (cells.length === headers.length) {
        acc.push({
          name: cells[headerIdx.containerName].innerText.trim(),
          qty: getCellInt(cells, headerIdx.containerQty),
          skuQtys: [getCellInt(cells, headerIdx.skuQty)]
        });
      } else if (acc.length > 0) {
        const current = acc[acc.length - 1];
        if (current.qty === 1) {
          current.skuQtys.push(getCellInt(cells, headerIdx.skuQty - ROWSPAN_OFFSET));
        }
      }
      return acc;
    }, []);

    const containerInfos = {
      fullPalletLoadQty: 0,
      lessPalletLoadQty: 0,
      largeFullPalletLoadQty: 0,
      largeLessPalletLoadQty: 0
    }

    containerList.forEach(({ qty, skuQtys }) => {
      const isSingleSku = skuQtys.length === 1;

      if (isSingleSku) {
        containerInfos.fullPalletLoadQty += qty;
        if (skuQtys[0] > 1000) {
          containerInfos.largeFullPalletLoadQty += qty;
        }
      } else {
        containerInfos.lessPalletLoadQty++;
        if (skuQtys.length < 4 && skuQtys.some(q => q > 1000)) {
          containerInfos.largeLessPalletLoadQty++;
        }
      }
    });

    return containerInfos;
  }

  const getCellInt = (cells, idx) => cells[idx] ? (parseInt(cells[idx].innerText.trim(), 10) || 0) : 0;

  /**
   * 팔렛트 수량에 따라 톤수를 계산합니다.
   * @param {number} palletCount 
   * @param {string} vehicleType 
   * @returns {string}
   */
  const calcTons = (palletCount, vehicleType) => {
    if (vehicleType) {
      const vehicleTon = extractTonsValue(vehicleType);

      if (vehicleTon >= 11) return '11';
      if (vehicleTon >= 5) return '5';
      if (vehicleTon >= 3.5) return '3.5';
      if (vehicleTon > 0) return '1';
    }

    if (palletCount > 18) return 'DDT';
    if (palletCount > 12) return '11';
    if (palletCount > 6) return '5';
    if (palletCount > 2) return '3.5';
    return '1';
  }

  const extractTonsValue = (text) => {
    const match = String(text).match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const extractReservationDate = (dateText) => {
    if (!dateText) return '';
    
    const [dateStr, timeStr] = dateText.split(' ');

    const reservationDate = new Date(dateStr);
    if (isNaN(reservationDate.getTime())) {
      return '';
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (dateStr === todayStr) return timeStr;
    if (dateStr < todayStr) return '전일자';
    return '익일자';
  }

  /**
   * 
   * @param {*} totalPalletQty 
   * @param {*} fullPalletLoadQty 
   * @returns 
   */
  const assignFloor = (totalPalletQty, fullPalletLoadQty) => {
    if ((!totalPalletQty && totalPalletQty !== 0) || (!fullPalletLoadQty && fullPalletLoadQty !== 0)) return '지하';

    const SMALL_QTY_THRESHOLD = 12;
    const HIGH_FPL_RATE_THRESHOLD = 0.875;

    const palletLoadRate = fullPalletLoadQty / totalPalletQty;
    const isHighFPLRate = palletLoadRate > HIGH_FPL_RATE_THRESHOLD;

    if (totalPalletQty < SMALL_QTY_THRESHOLD) {
      return (isHighFPLRate) ? '2층' : '3층';
    }
    return (isHighFPLRate) ? '지하' : '3층';
  }

  const buildUnloadTime = (containerInfo) => {
    let result = '';
    if (containerInfo.largeFullPalletLoadQty > 0) {
      result += `대량${containerInfo.largeFullPalletLoadQty}P`;
    }
    if (containerInfo.largeLessPalletLoadQty > 0) {
      result += `대량혼${containerInfo.largeLessPalletLoadQty}P`;
    }
    return result.trim();
  }

  const scrapeTruckPage = () => {
    const basicInfo = scrapeTruckBasicInfo();
    const containerInfo = scrapeTruckContainerInfo();

    const excelCells = [
      basicInfo.companyName,
      '',  // 차량번호
      basicInfo.reservationDate,
      '',  // 호출시간
      buildUnloadTime(containerInfo),  // 하차시간
      basicInfo.totalPalletQty,
      containerInfo.fullPalletLoadQty,
      calcTons(basicInfo.totalPalletQty),
      '일반',
      assignFloor(basicInfo.totalPalletQty, containerInfo.fullPalletLoadQty)
    ];
    copyText(excelCells.join('\t'));
  };

  const scrapeMilkrunBasicInfo = () => {
    const infoTable = document.querySelector('table.info-table');
    const rows = infoTable.querySelectorAll('tr');

    let truckType = '';
    let reservationDate = '';
    let palletQty = 0;

    rows.forEach(row => {
      const ths = row.querySelectorAll('th');
      const tds = row.querySelectorAll('td');

      ths.forEach((th, idx) => {
        const header = th.textContent.trim();
        const value = tds[idx]?.textContent.trim();

        if (header === '트럭 타입') {
          truckType = value;
        }
        if (header === '예약일시') {
          reservationDate = extractReservationDate(value);
        }
        if (header === '팔렛트 수') {
          palletQty = parseInt(value, 10) || 0;
        }
      });
    });

    return { truckType, reservationDate, palletQty };
  }

  const scrapeMilkrunContainerInfo = (palletQty) => {
    const table = document.querySelectorAll('table.info-table')[1];
    const rows = table.querySelectorAll('tbody tr');
    
    const result = {
      companyName: '',
      fullPalletLoadQty: '',
      skuName: ''
    }

    const cells = rows[0].querySelectorAll('td');

    if (cells[0] && cells[2]) {
      const fullPalletLoadQty = parseInt(cells[2].innerText.trim(), 10) || 0;
      if (cells[0].rowSpan === rows.length && fullPalletLoadQty === palletQty) {  // 단일 거래처
        result.companyName = cells[0].innerText.split('\n')[0].trim();
        if (cells[0].rowSpan === 1 && cells[4].rowSpan === 1) {
          result.fullPalletLoadQty = fullPalletLoadQty;
          result.skuName = cells[7].innerText.replace(/\n/g, ' ').trim();
        } else {
          result.fullPalletLoadQty = '혼적확인';
        }
      } else {
        result.fullPalletLoadQty = '혼적확인';
        result.companyName = getMilkrunId(); // FIXME: URL에서 예약번호 가져오기
      }
    }
    return result;
  };

  const getMilkrunId = () => {
    const urlParam = new URLSearchParams(window.location.search);
    return urlParam.get('id');
  }

  const scrapMilkrunPage = () => {
    const basicInfo = scrapeMilkrunBasicInfo();
    const containerInfo = scrapeMilkrunContainerInfo(basicInfo.palletQty);

    const isSingleSku = basicInfo.palletQty === containerInfo.fullPalletLoadQty;

    const excelCells = [
      containerInfo.companyName,
      '',  // 차량번호
      basicInfo.reservationDate,
      '',  // 호출시간
      isSingleSku ? containerInfo.skuName : '',  // 하차시간
      basicInfo.palletQty,
      containerInfo.fullPalletLoadQty,
      calcTons(basicInfo.palletQty, basicInfo.truckType),
      '밀크런',
      isSingleSku ? '지하' : '3층'
    ];
    copyText(excelCells.join('\t'));
  };

  const currentUrl = window.location.href;
  if (currentUrl.includes('truck')) {
    scrapeTruckPage();
  } else if (currentUrl.includes('milkrun')) {
    scrapMilkrunPage();
  }

})();
