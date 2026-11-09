javascript:(function() {
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js';
  script.onload = function() {
    var rows= document.querySelectorAll('table.info-table:nth-of-type(2) tbody tr');
    rows.forEach(function(row) {
      var cells = row.cells;
      if (!cells) return;
      if (cells.length != 10 && cells.length != 6) {
        if (row) row.visibility = 'collapse';
        return;
      }
      
      var orderNumIdx = (cells.length === 6) ? 0 : 4;
      if (cells && cells[orderNumIdx]) {
        var cell = cells[orderNumIdx];
        var orderNum = cell.innerText.split('\n')[0].trim();

        if (cell.querySelector('.b-code')) return;
        
        if (orderNum && !isNaN(orderNum)) {
          cell.innerHTML= `<div style="display: flex; flex-direction:column; align-items: center;"><svg class="b-code"></svg></div>`;
          var svg = cell.querySelector('.b-code');
          try {
            JsBarcode(svg, orderNum, {
              format: "CODE128", 
              width: 1.5, 
              height: 35, 
              displayValue: true 
            });
          } catch(e) {}
        }
      }
    });
  };
  document.head.appendChild(script);
})();
