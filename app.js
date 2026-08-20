const COLORS = {
  primary: '#7C3AED',
  primarySoft: '#D8B4FE',
  accent: '#FF4F8B',
  line: '#ECE8F5',
  positive: '#0FA968',
  negative: '#F43F5E',
  ink: '#1A1523',
  inkSoft: '#6E667E',
};

const state = {
  summary: [],
  byProvince: [],
  byKab: [],
  provKabLookup: {},
  detail: [],
  province: 'Semua',
  kab: 'Semua',
  selectedProgram: null,
  chart: null,
};

const fmtNum = (n) => n === null || n === undefined ? '\u2014' : new Intl.NumberFormat('id-ID').format(Math.round(n));
const fmtRp = (n) => n === null || n === undefined ? '\u2014' : 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n));

async function loadData() {
  const [summary, byProvince, byKab, provKabLookup, detail] = await Promise.all([
    fetch('data/program_summary.json').then(r => r.json()),
    fetch('data/program_by_province.json').then(r => r.json()),
    fetch('data/program_by_kab.json').then(r => r.json()),
    fetch('data/prov_kab_lookup.json').then(r => r.json()),
    fetch('data/program_detail.json').then(r => r.json()),
  ]);
  state.summary = summary;
  state.byProvince = byProvince;
  state.byKab = byKab;
  state.provKabLookup = provKabLookup;
  state.detail = detail;
}

function provinceList() {
  const set = new Set(state.byProvince.map(r => r.prov));
  return ['Semua', ...Array.from(set).sort()];
}

function kabList() {
  if (state.province === 'Semua') {
    const all = new Set(state.byKab.map(r => r.kab));
    return ['Semua', ...Array.from(all).sort()];
  }
  return ['Semua', ...(state.provKabLookup[state.province] || [])];
}

// recompute summary rows filtered by province/kabupaten
function filteredSummary() {
  if (state.kab !== 'Semua') {
    const rows = state.byKab.filter(r => r.kab === state.kab);
    return rows.map(r => {
      const base = state.summary.find(s => s.program_code === r.program_code) || {};
      return {
        program_code: r.program_code,
        program_name: base.program_name || r.program_code,
        akses_2022_ya: r.akses_2022_ya,
        akses_2024_ya: r.akses_2024_ya,
        total_responden: r.total_responden,
        rata_nominal: base.rata_nominal,
        jumlah_masalah: base.jumlah_masalah,
        jumlah_mengadu: base.jumlah_mengadu,
      };
    });
  }
  if (state.province === 'Semua') return state.summary;
  const rows = state.byProvince.filter(r => r.prov === state.province);
  return rows.map(r => {
    const base = state.summary.find(s => s.program_code === r.program_code) || {};
    return {
      program_code: r.program_code,
      program_name: base.program_name || r.program_code,
      akses_2022_ya: r.akses_2022_ya,
      akses_2024_ya: r.akses_2024_ya,
      total_responden: r.total_responden,
      rata_nominal: base.rata_nominal, // nominal rata-rata dihitung nasional saja
      jumlah_masalah: base.jumlah_masalah,
      jumlah_mengadu: base.jumlah_mengadu,
    };
  });
}

function renderProvinceChips() {
  const el = document.getElementById('provFilter');
  el.innerHTML = '';
  provinceList().forEach(p => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (p === state.province ? ' active' : '');
    chip.textContent = p;
    chip.addEventListener('click', () => {
      state.province = p;
      state.kab = 'Semua';
      renderAll();
    });
    el.appendChild(chip);
  });
}

function renderKabChips() {
  const el = document.getElementById('kabFilter');
  el.innerHTML = '';
  kabList().forEach(k => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (k === state.kab ? ' active' : '');
    chip.textContent = k;
    chip.addEventListener('click', () => {
      state.kab = k;
      // kalau pilih provinsi "Semua" tapi kabupaten spesifik, samakan provinsinya otomatis
      if (k !== 'Semua' && state.province === 'Semua') {
        const found = state.byKab.find(r => r.kab === k);
        if (found) state.province = found.prov;
      }
      renderAll();
    });
    el.appendChild(chip);
  });
}

function renderKPIs() {
  const rows = filteredSummary();
  let totalResponden;
  if (state.kab !== 'Semua') {
    totalResponden = state.byKab.find(r => r.kab === state.kab)?.total_responden ?? rows[0]?.total_responden ?? 0;
  } else if (state.province !== 'Semua') {
    totalResponden = state.byProvince.find(r => r.prov === state.province)?.total_responden ?? rows[0]?.total_responden ?? 0;
  } else {
    totalResponden = 1596;
  }

  let biggestUp = null, biggestDown = null;
  rows.forEach(r => {
    const delta = r.akses_2024_ya - r.akses_2022_ya;
    if (biggestUp === null || delta > biggestUp.delta) biggestUp = { ...r, delta };
    if (biggestDown === null || delta < biggestDown.delta) biggestDown = { ...r, delta };
  });

  const totalMasalah = rows.reduce((a, r) => a + (r.jumlah_masalah || 0), 0);

  const cards = [
    { label: 'Rumah tangga tercakup', value: fmtNum(totalResponden), cls: '' },
    { label: `Kenaikan terbesar \u2014 ${biggestUp.program_name}`, value: (biggestUp.delta >= 0 ? '+' : '') + fmtNum(biggestUp.delta), cls: biggestUp.delta >= 0 ? 'up' : 'down' },
    { label: `Penurunan terbesar \u2014 ${biggestDown.program_name}`, value: (biggestDown.delta >= 0 ? '+' : '') + fmtNum(biggestDown.delta), cls: biggestDown.delta >= 0 ? 'up' : 'down' },
    { label: 'Total laporan masalah', value: fmtNum(totalMasalah), cls: '' },
  ];

  const el = document.getElementById('kpiRow');
  el.innerHTML = cards.map(c => `
    <div class="kpi-card">
      <div class="kpi-value ${c.cls}">${c.value}</div>
      <div class="kpi-label">${c.label}</div>
    </div>
  `).join('');
}

function renderChart() {
  const rows = [...filteredSummary()].sort((a, b) => b.akses_2024_ya - a.akses_2024_ya);
  const ctx = document.getElementById('mainChart').getContext('2d');

  if (state.chart) state.chart.destroy();
  state.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.program_name.replace(/\s*\([^)]*\)\s*$/, '')),
      datasets: [
        {
          label: '2022',
          data: rows.map(r => r.akses_2022_ya),
          backgroundColor: COLORS.primarySoft,
          borderRadius: 4,
        },
        {
          label: '2024',
          data: rows.map(r => r.akses_2024_ya),
          backgroundColor: COLORS.primary,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: COLORS.ink, font: { family: 'IBM Plex Sans' } } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${fmtNum(item.raw)} rumah tangga`,
          }
        },
      },
      scales: {
        x: { grid: { color: '#EFEAE0' }, ticks: { color: COLORS.inkSoft } },
        y: { grid: { display: false }, ticks: { color: COLORS.ink, font: { family: 'IBM Plex Sans', size: 12 } } },
      },
    },
  });
}

function renderTable() {
  const rows = [...filteredSummary()].sort((a, b) => b.akses_2024_ya - a.akses_2024_ya);
  const tbody = document.getElementById('programTableBody');
  tbody.innerHTML = rows.map(r => {
    const delta = r.akses_2024_ya - r.akses_2022_ya;
    const trendCls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const arrow = delta > 0 ? '\u25B2' : delta < 0 ? '\u25BC' : '\u2013';
    const selected = state.selectedProgram === r.program_code ? ' selected' : '';
    return `
      <tr data-code="${r.program_code}" class="${selected}">
        <td class="program-name">${r.program_name}</td>
        <td class="num">${fmtNum(r.akses_2022_ya)}</td>
        <td class="num">${fmtNum(r.akses_2024_ya)}</td>
        <td class="num"><span class="trend-pill ${trendCls}">${arrow} ${Math.abs(delta)}</span></td>
        <td class="num">${fmtRp(r.rata_nominal)}</td>
        <td class="num">${fmtNum(r.jumlah_masalah)}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const code = tr.getAttribute('data-code');
      state.selectedProgram = state.selectedProgram === code ? null : code;
      renderTable();
      renderDetail();
    });
  });
}

function renderDetail() {
  const panel = document.getElementById('detailPanel');
  if (!state.selectedProgram) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const code = state.selectedProgram;
  const meta = state.summary.find(s => s.program_code === code);
  document.getElementById('detailEyebrow').textContent = 'Detail program';
  document.getElementById('detailTitle').textContent = meta.program_name;

  // province breakdown
  const provRows = state.byProvince.filter(r => r.program_code === code)
    .sort((a, b) => b.akses_2024_ya - a.akses_2024_ya);
  const maxVal = Math.max(1, ...provRows.map(r => Math.max(r.akses_2022_ya, r.akses_2024_ya)));
  const provEl = document.getElementById('detailProvince');
  provEl.innerHTML = provRows.map(r => `
    <div class="mini-bar-row">
      <span>${r.prov}</span>
      <div class="mini-bar-track">
        <div class="mini-bar-fill-22" style="width:${(r.akses_2022_ya / maxVal) * 100}%"></div>
      </div>
      <span class="mini-bar-count">${r.akses_2022_ya} \u2192 ${r.akses_2024_ya}</span>
    </div>
    <div class="mini-bar-row">
      <span></span>
      <div class="mini-bar-track">
        <div class="mini-bar-fill-24" style="width:${(r.akses_2024_ya / maxVal) * 100}%"></div>
      </div>
      <span></span>
    </div>
  `).join('') + `
    <div class="legend-row">
      <span><span class="legend-dot" style="background:${COLORS.primarySoft}"></span>2022</span>
      <span><span class="legend-dot" style="background:${COLORS.primary}"></span>2024</span>
    </div>
  `;

  // problem detail
  const problems = state.detail.filter(d => d.program_code === code && d.ada_masalah === 'Ya');
  const problemsEl = document.getElementById('detailProblems');
  if (problems.length === 0) {
    problemsEl.innerHTML = `<li class="empty">Tidak ada laporan masalah untuk program ini.</li>`;
  } else {
    const counts = {};
    problems.forEach(p => {
      const label = p.bentuk_masalah || 'Tidak dirinci';
      counts[label] = (counts[label] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    problemsEl.innerHTML = entries.map(([label, n]) => `
      <li>
        <strong>${label}</strong> &mdash; ${n} responden
        <div class="problem-meta">dari total ${problems.length} laporan masalah pada program ini</div>
      </li>
    `).join('');
  }
}

function renderAll() {
  renderProvinceChips();
  renderKabChips();
  renderKPIs();
  renderChart();
  renderTable();
  renderDetail();
}

document.getElementById('detailClose').addEventListener('click', () => {
  state.selectedProgram = null;
  renderTable();
  renderDetail();
});

loadData().then(renderAll).catch(err => {
  document.querySelector('main').innerHTML = `<p style="padding:40px;color:#B7503F;">Gagal memuat data: ${err.message}. Pastikan file di folder <code>data/</code> sudah lengkap.</p>`;
  console.error(err);
});
