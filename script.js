let originalData = [];
let headers = [];

const toggleTableBtn = document.getElementById('toggleTableBtn');
const tableContainer = document.getElementById('tableContainer');
const goFirstRowBtn = document.getElementById('goFirstRowBtn');
const goLastRowBtn = document.getElementById('goLastRowBtn');
const pivotContainer = document.getElementById('pivotContainer');
const pivotBtn = document.getElementById('pivotBtn');
const togglePivotBtn = document.getElementById('togglePivotBtn');

tableContainer.style.display = 'none';
pivotContainer.style.display = 'none';
goFirstRowBtn.style.display = 'none';
goLastRowBtn.style.display = 'none';
togglePivotBtn.style.display = 'none';

toggleTableBtn.addEventListener('click', () => {
  const isVisible = tableContainer.style.display === 'block';

  if (!isVisible) {
    if (!originalData.length || !headers.length) {
      alert('Please upload a CSV file first.');
      return;
    }

    displayTable([headers, ...originalData.map(obj => headers.map(h => obj[h] || ''))]);
    tableContainer.style.display = 'block';
    toggleTableBtn.textContent = 'Hide Table';
    goFirstRowBtn.style.display = 'inline-block';
    goLastRowBtn.style.display = 'inline-block';
  } else {
    tableContainer.style.display = 'none';
    toggleTableBtn.textContent = 'Show Table';
    goFirstRowBtn.style.display = 'none';
    goLastRowBtn.style.display = 'none';
  }
});


togglePivotBtn.addEventListener('click', () => {
  const isVisible = pivotContainer.style.display === 'block';
  pivotContainer.style.display = isVisible ? 'none' : 'block';
  togglePivotBtn.textContent = isVisible ? 'Show Pivot' : 'Hide Pivot';
});

document.getElementById('csvFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
    if (lines.length < 2) return alert("Invalid or empty CSV file.");

    const delimiter = lines[0].includes(',') ? ',' : lines[0].includes(';') ? ';' : '\t';
    const rows = lines.map(line => line.split(delimiter));

    headers = [...rows[0]];
    const rawData = rows.slice(1).map(row => {
      const obj = Object.fromEntries(row.map((val, idx) => [headers[idx], val.trim()]));

      headers.forEach(h => {
        const val = obj[h];
        const isDateField = /date|created|timestamp/i.test(h);
        if (!isDateField) return;

        const date = new Date(val);
        if (!isNaN(date)) {
          obj[`${h}_Year`] = date.getFullYear();
          obj[`${h}_Quarter`] = `Q${Math.floor(date.getMonth() / 3) + 1}`;
          obj[`${h}_Month`] = date.toLocaleString('default', { month: 'long' });
          obj[`${h}_Day`] = date.getDate();
        }
      });

      return obj;
    });

    originalData = rawData;
    headers = Object.keys(originalData[0]);

  //  displayTable([headers, ...originalData.map(obj => headers.map(h => obj[h] || ''))]);
    setupPivotControls(headers);

    document.getElementById('pivotControls').style.display = 'flex';
    toggleTableBtn.style.display = 'inline-block';
    toggleTableBtn.textContent = 'Show Table';
   // tableContainer.style.display = 'block';
    goFirstRowBtn.style.display = 'none';
    goLastRowBtn.style.display = 'none';
  };

  reader.onerror = () => alert('Error reading file.');
  reader.readAsText(file);
});

function displayTable(dataRows) {
  const container = document.getElementById('tableContainer');
  container.innerHTML = '';
  const table = document.createElement('table');

  dataRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const cellElem = document.createElement(idx === 0 ? 'th' : 'td');
      cellElem.textContent = cell;
      tr.appendChild(cellElem);
    });
    table.appendChild(tr);
  });

  container.appendChild(table);
}

function clearSelection(selectId) {
  const select = document.getElementById(selectId);
  Array.from(select.options).forEach(opt => opt.selected = false);
}

function setupPivotControls(headers) {
  const rowSel = document.getElementById('groupByRowsSelect');
  const colSel = document.getElementById('groupByColsSelect');
  const container = document.getElementById('multiMeasuresContainer');

  rowSel.innerHTML = '';
  colSel.innerHTML = '';
  container.innerHTML = '';

  const baseFields = new Set();
  const hierarchyMap = {};

  // Detect hierarchies and build map
  headers.forEach(h => {
    const match = h.match(/^(.+?)_(Year|Month|Quarter|Day)$/);
    if (match) {
      const base = match[1];
      if (!hierarchyMap[base]) hierarchyMap[base] = [];
      hierarchyMap[base].push(h);
    } else {
      baseFields.add(h);
    }
  });

  function populateSelect(select) {
    const baseFieldOrder = [];
  
    baseFields.forEach(base => {
      const opt = document.createElement('option');
      opt.value = base;
      opt.textContent = base;
      opt.dataset.base = 'true';
      select.appendChild(opt);
      baseFieldOrder.push(base);
    });
  
    select.addEventListener('change', function (e) {
      const clickedOption = e.target.selectedOptions[0];
      if (!clickedOption || !clickedOption.dataset.base) return;
  
      const base = clickedOption.value;
      const existingOptions = [...select.options].map(o => o.value);
      const insertIndex = [...select.options].findIndex(o => o.value === base) + 1;
  
      if (hierarchyMap[base]) {
        const alreadyInserted = hierarchyMap[base].every(sub => existingOptions.includes(sub));
  
        // Remove if already inserted
        if (alreadyInserted) {
          hierarchyMap[base].forEach(sub => {
            const optToRemove = [...select.options].find(o => o.value === sub);
            if (optToRemove) select.remove(optToRemove.index);
          });
        } else {
          // Insert if not already present
          hierarchyMap[base].forEach((sub, i) => {
            const subOpt = document.createElement('option');
            subOpt.value = sub;
            subOpt.textContent = `↳ ${sub}`;
            subOpt.style.paddingLeft = '10px';
            select.insertBefore(subOpt, select.options[insertIndex + i]);
          });
        }
  
        // Deselect everything to avoid sticking
        Array.from(select.options).forEach(opt => (opt.selected = false));
      }
    });
  }
  

  populateSelect(rowSel);
  populateSelect(colSel);
}


function addMeasure(value = '', agg = 'sum') {
  const container = document.getElementById('multiMeasuresContainer');

  const wrapper = document.createElement('div');
  wrapper.className = 'measure-set';
  wrapper.style.marginBottom = '5px';

  const valueSelect = document.createElement('select');
  valueSelect.className = 'valueSelect';
  headers.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h;
    if (h === value) opt.selected = true;
    valueSelect.appendChild(opt);
  });

  const aggSelect = document.createElement('select');
  aggSelect.className = 'aggSelect';
  ['sum', 'avg', 'count'].forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === agg) opt.selected = true;
    aggSelect.appendChild(opt);
  });

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  removeBtn.type = 'button';
  removeBtn.onclick = () => wrapper.remove();

  wrapper.appendChild(valueSelect);
  wrapper.appendChild(aggSelect);
  wrapper.appendChild(removeBtn);

  container.appendChild(wrapper);
}

function scrollToLastRow() {
  const table = document.querySelector('#pivotContainer table') || document.querySelector('#tableContainer table');
  if (table && table.rows.length) {
    table.rows[table.rows.length - 1].scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToFirstRow() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function aggregate(values, type) {
  if (type === 'sum') return values.reduce((a, b) => a + parseFloat(b || 0), 0);
  if (type === 'avg') return values.reduce((a, b) => a + parseFloat(b || 0), 0) / values.length;
  if (type === 'count') return values.length;
  return '';
}
let pivotGenerated = false;


pivotBtn.addEventListener('click', () => {
  const isVisible = pivotContainer.style.display === 'block';
  if (pivotGenerated) {
    pivotContainer.style.display = isVisible ? 'none' : 'block';
    pivotBtn.textContent = isVisible ? 'Show Pivot' : 'Hide Pivot';
    return;
  }
    const rowFields = Array.from(document.getElementById('groupByRowsSelect').selectedOptions).map(o => o.value);
    const colFields = Array.from(document.getElementById('groupByColsSelect').selectedOptions).map(o => o.value);

    const measureSets = Array.from(document.querySelectorAll('.measure-set')).map(set => ({
      field: set.querySelector('.valueSelect').value,
      agg: set.querySelector('.aggSelect').value
    }));

    if (measureSets.length === 0) return alert('Please add at least one measure.');

    const pivotData = {};
    const rowKeys = new Set();
    const colKeys = new Set();

    const rowTotals = {};
    const colTotals = {};
    const grandTotals = {};

    originalData.forEach(row => {
      const rowKey = rowFields.map(f => row[f] || 'N/A').join(' | ') || 'Total';
      const colKey = colFields.map(f => row[f] || 'N/A').join(' | ') || 'Total';

      if (!pivotData[rowKey]) pivotData[rowKey] = {};
      if (!pivotData[rowKey][colKey]) pivotData[rowKey][colKey] = {};

      measureSets.forEach(({ field }) => {
        if (!pivotData[rowKey][colKey][field]) pivotData[rowKey][colKey][field] = [];
        pivotData[rowKey][colKey][field].push(row[field]);

        if (!rowTotals[rowKey]) rowTotals[rowKey] = {};
        if (!rowTotals[rowKey][field]) rowTotals[rowKey][field] = [];
        rowTotals[rowKey][field].push(row[field]);

        if (!colTotals[colKey]) colTotals[colKey] = {};
        if (!colTotals[colKey][field]) colTotals[colKey][field] = [];
        colTotals[colKey][field].push(row[field]);

        if (!grandTotals[field]) grandTotals[field] = [];
        grandTotals[field].push(row[field]);
      });

      rowKeys.add(rowKey);
      colKeys.add(colKey);
    });

    pivotContainer.innerHTML = '';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    headRow.innerHTML = `<th>${rowFields.join(' | ') || 'Row'}</th>`;
    const colKeysSorted = [...colKeys];

    colKeysSorted.forEach(col => {
      measureSets.forEach(({ field, agg }) => {
        const th = document.createElement('th');
        th.textContent = `${col} | ${field} (${agg})`;
        headRow.appendChild(th);
      });
    });

    measureSets.forEach(({ field, agg }) => {
      const th = document.createElement('th');
      th.textContent = `Grand Total | ${field} (${agg})`;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const rowKeysSorted = [...rowKeys];

    rowKeysSorted.forEach(rowKey => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${rowKey}</td>`;

      colKeysSorted.forEach(colKey => {
        measureSets.forEach(({ field, agg }) => {
          const vals = (pivotData[rowKey]?.[colKey]?.[field]) || [];
          const aggVal = vals.length ? aggregate(vals, agg) : 0;
          const td = document.createElement('td');
          td.textContent = Number(aggVal).toFixed(2);
          tr.appendChild(td);
        });
      });

      measureSets.forEach(({ field, agg }) => {
        const vals = rowTotals[rowKey]?.[field] || [];
        const aggVal = vals.length ? aggregate(vals, agg) : 0;
        const td = document.createElement('td');
        td.textContent = Number(aggVal).toFixed(2);
        td.style.fontWeight = 'bold';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `<td><strong>Grand Total</strong></td>`;

    colKeysSorted.forEach(colKey => {
      measureSets.forEach(({ field, agg }) => {
        const vals = colTotals[colKey]?.[field] || [];
        const aggVal = vals.length ? aggregate(vals, agg) : 0;
        const td = document.createElement('td');
        td.textContent = Number(aggVal).toFixed(2);
        td.style.fontWeight = 'bold';
        totalRow.appendChild(td);
      });
    });

    measureSets.forEach(({ field, agg }) => {
      const vals = grandTotals[field] || [];
      const aggVal = vals.length ? aggregate(vals, agg) : 0;
      const td = document.createElement('td');
      td.textContent = Number(aggVal).toFixed(2);
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = '#f8f8f8';
      totalRow.appendChild(td);
    });

    tbody.appendChild(totalRow);
    table.appendChild(tbody);
    pivotContainer.appendChild(table);

    pivotGenerated = true;
    pivotContainer.style.display = 'block';
    pivotBtn.textContent = 'Hide Pivot';

  pivotGenerated = true;
  pivotContainer.style.display = 'block';
  pivotBtn.textContent = 'Hide Pivot';
});

function resetPivot() {
  // Clear selected options for rows and columns
  ['groupByRowsSelect', 'groupByColsSelect'].forEach(id => {
    const select = document.getElementById(id);
    for (let option of select.options) {
      option.selected = false;
    }
  });

  // Clear all measure fields
  const measuresContainer = document.getElementById('multiMeasuresContainer');
  measuresContainer.innerHTML = '';

  // Optionally add one default measure input (or leave empty)
  // addMeasure();

  // Clear pivot output
  document.getElementById('pivotContainer').innerHTML = '';

  // Hide both containers
  document.getElementById('pivotContainer').style.display = 'none';
  document.getElementById('tableContainer').style.display = 'none'; // <-- updated from block to none

  // Hide control buttons
  document.getElementById('togglePivotBtn').style.display = 'none';
  document.getElementById('toggleTableBtn').style.display = 'inline-block';
  document.getElementById('toggleTableBtn').textContent = 'Show Table';

  // Hide navigation buttons
  document.getElementById('goFirstRowBtn').style.display = 'none';
  document.getElementById('goLastRowBtn').style.display = 'none';
}


