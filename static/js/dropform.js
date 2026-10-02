/* Eye Drop Form Generator.
 * Rows are added/removed with +/-; generic and brand dropdowns are populated
 * from /data/eye-drops.json (the same file that builds the reference table),
 * and are linked both ways. Output matches page-eye-drop-schedule.php.
 */
(function () {
  'use strict';

  var form = document.getElementById('jk-dropform');
  var rowsEl = document.getElementById('jk-dropform-rows');
  var out = document.getElementById('jk-dropform-result');
  var tpl = document.getElementById('jk-dropform-row');
  if (!form || !rowsEl || !out || !tpl) return;

  var drugs = [];          // [{generic, brand, color, ...}]
  var byGeneric = {};      // generic -> drug
  var brands = [];         // [{name, generic}]  (one entry per comma-separated brand)

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function indexData(list) {
    drugs = list;
    byGeneric = {};
    brands = [];
    list.forEach(function (d) {
      byGeneric[d.generic] = d;
      (d.brand || '').split(',').forEach(function (b) {
        b = b.trim();
        if (b) brands.push({ name: b, generic: d.generic });
      });
    });
    brands.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = '';
    var o = document.createElement('option');
    o.value = ''; o.textContent = placeholder;
    sel.appendChild(o);
    items.forEach(function (it) {
      var op = document.createElement('option');
      op.value = it.value; op.textContent = it.label;
      sel.appendChild(op);
    });
  }

  function addRow(afterRow) {
    var row = tpl.content.firstElementChild.cloneNode(true);
    var gen = row.querySelector('[name=genericName]');
    var brd = row.querySelector('[name=brandName]');
    var col = row.querySelector('[name=topColor]');

    fillSelect(gen, drugs.map(function (d) { return { value: d.generic, label: d.generic }; }), 'Select Generic Name');
    fillSelect(brd, brands.map(function (b) { return { value: b.name, label: b.name }; }), 'Select Brand Name');

    // generic -> brand + color
    gen.addEventListener('change', function () {
      var d = byGeneric[gen.value];
      col.value = d ? d.color : '';
      if (d) {
        var first = (d.brand || '').split(',')[0].trim();
        brd.value = first && brands.some(function (b) { return b.name === first; }) ? first : '';
      } else {
        brd.value = '';
      }
    });

    // brand -> generic + color
    brd.addEventListener('change', function () {
      var b = brands.filter(function (x) { return x.name === brd.value; })[0];
      if (b) {
        gen.value = b.generic;
        col.value = byGeneric[b.generic].color;
      } else {
        gen.value = ''; col.value = '';
      }
    });

    row.querySelector('.jk-rowbtn--add').addEventListener('click', function () { addRow(row); });
    row.querySelector('.jk-rowbtn--del').addEventListener('click', function () {
      if (rowsEl.children.length > 1) row.remove();
      updateDelButtons();
    });

    if (afterRow && afterRow.nextSibling) rowsEl.insertBefore(row, afterRow.nextSibling);
    else rowsEl.appendChild(row);
    updateDelButtons();
    return row;
  }

  // The first/only row can't be deleted (matches the WordPress form).
  function updateDelButtons() {
    var rows = rowsEl.querySelectorAll('.jk-droprow');
    rows.forEach(function (r) {
      r.querySelector('.jk-rowbtn--del').hidden = rows.length === 1;
    });
  }

  function reset() {
    rowsEl.innerHTML = '';
    addRow(null);
    out.hidden = true;
    form.hidden = false;
    printTitle(null);
  }

  function longDate(d) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // The browser prints the document title in its own page header (which CSS
  // cannot touch). Swap it while the schedule is on screen so the printout
  // reads "Eye Drop Schedule — Jonathan Katz, MD" instead of the page name.
  var pageTitle = document.title;
  function printTitle(label) {
    var brand = document.querySelector('.jk-brand__title');
    document.title = label ? label + (brand ? ' \u2014 ' + brand.textContent.trim() : '') : pageTitle;
  }


  // Orientation is a print-dialog setting the page can't read, so offer it
  // here: ticking the box injects an @page rule. Lets you try both without
  // hunting through the dialog.
  function setLandscape(on) {
    var id = 'jk-page-orientation';
    var el = document.getElementById(id);
    if (on) {
      if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
      el.textContent = '@media print{@page{size: letter landscape;}}';
    } else if (el) {
      el.remove();
    }
  }

  function wireLandscape(root) {
    var cb = root.querySelector('.jk-landscape');
    if (!cb) return;
    cb.checked = !!document.getElementById('jk-page-orientation');
    cb.addEventListener('change', function () { setLandscape(cb.checked); });
  }

  function render(entries) {
    var h = '<div class="schedule-head"><h1>Eye Drop Schedule</h1><span>' + longDate(new Date()) + '</span></div>';
    h += '<div class="table-wrapper"><table class="schedule-table"><thead><tr>'
       + '<th>Generic Name</th><th>Brand Name</th><th>Top Color</th><th>Times per Day</th><th>Eye</th><th>Stop Date</th>'
       + '</tr></thead><tbody>';
    entries.forEach(function (e) {
      h += '<tr><td>' + esc(e.generic) + '</td><td>' + esc(e.brand) + '</td><td>' + esc(e.color)
         + '</td><td>' + esc(e.times) + '</td><td>' + esc(e.eye) + '</td><td>' + esc(e.stop) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="button-container">'
       + '<button type="button" onclick="window.print()">Print</button>'
       + '<button type="button" id="jk-dropform-back">Back</button>'
       + '<label class="jk-printopt"><input type="checkbox" class="jk-landscape"> Landscape</label></div>';
    out.innerHTML = h;
    form.hidden = true;
    out.hidden = false;
    printTitle('Eye Drop Schedule');
    // Six columns wrap badly on portrait ("Right Eye", "Teal/Green" and long
    // generic names all break onto two lines), so default to landscape here.
    // The checkbox overrides it.
    setLandscape(true);
    wireLandscape(out);
    document.getElementById('jk-dropform-back').addEventListener('click', function () {
      out.hidden = true; form.hidden = false; printTitle(null); window.scrollTo(0, 0);
    });
    window.scrollTo(0, 0);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var entries = [];
    rowsEl.querySelectorAll('.jk-droprow').forEach(function (r) {
      var g = r.querySelector('[name=genericName]').value;
      if (!g) return;
      entries.push({
        generic: g,
        brand:   r.querySelector('[name=brandName]').value,
        color:   r.querySelector('[name=topColor]').value,
        times:   r.querySelector('[name=timesPerDay]').value,
        eye:     r.querySelector('[name=eye]').value,
        stop:    r.querySelector('[name=stopDate]').value
      });
    });
    if (!entries.length) {
      rowsEl.querySelector('[name=genericName]').focus();
      return;
    }
    render(entries);
  });

  document.getElementById('jk-dropform-reset').addEventListener('click', reset);

  fetch(form.getAttribute('data-source'), { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (list) { indexData(list); reset(); })
    .catch(function () {
      rowsEl.innerHTML = '<p class="jk-status--error">Could not load the eye drop list.</p>';
    });
})();
