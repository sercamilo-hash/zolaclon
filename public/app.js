// Client Application for NYC ZoLa Clone & Zoning Resolution Formatter

let map;
let marker;
let currentLotData = null;

// Initialize Map & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupSearch();
  setupExports();
  // Load default demo (Queens R6 Lot)
  loadDemoProperty('4161300035');
});

function initMap() {
  map = L.map('map').setView([40.7128, -74.0060], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
}

// -------------------------------------------------------------
// Search & Autocomplete
// -------------------------------------------------------------
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const clearSearch = document.getElementById('clearSearch');
  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
      clearSearch.classList.remove('hidden');
    } else {
      clearSearch.classList.add('hidden');
      searchResults.classList.add('hidden');
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchSearchResults(val);
    }, 280);
  });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.classList.add('hidden');
    searchResults.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
}

async function fetchSearchResults(query) {
  const searchResults = document.getElementById('searchResults');
  // Check if user entered a 10-digit BBL directly
  if (/^\d{10}$/.test(query)) {
    searchResults.innerHTML = `
      <div onclick="selectBbl('${query}')" class="p-3 hover:bg-blue-50 cursor-pointer border-b text-xs flex items-center justify-between">
        <div>
          <span class="font-bold text-blue-600">BBL Directo: ${query}</span>
          <span class="text-slate-500 block">Consultar MapPLUTO para este BBL</span>
        </div>
        <i class="fa-solid fa-arrow-right text-slate-400"></i>
      </div>
    `;
    searchResults.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      searchResults.innerHTML = `<div class="p-3 text-xs text-slate-500">No se encontraron resultados en NYC.</div>`;
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = data.features.slice(0, 6).map(f => {
      const p = f.properties || {};
      const bbl = p.addendum?.pad?.bbl || p.pad_bbl || '';
      return `
        <div onclick="selectFeature('${bbl}', '${encodeURIComponent(p.label || p.name || '')}', ${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]})" 
             class="p-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 text-xs flex justify-between items-center transition">
          <div>
            <div class="font-bold text-slate-800">${p.label || p.name}</div>
            <div class="text-[11px] text-slate-500">${p.borough || ''} ${bbl ? '• BBL: ' + bbl : ''}</div>
          </div>
          <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Select</span>
        </div>
      `;
    }).join('');
    searchResults.classList.remove('hidden');
  } catch (err) {
    console.error('Error fetching search results:', err);
  }
}

function selectFeature(bbl, labelEncoded, lat, lng) {
  document.getElementById('searchResults').classList.add('hidden');
  const label = decodeURIComponent(labelEncoded);
  document.getElementById('searchInput').value = label;
  if (bbl) {
    loadLotByBbl(bbl, lat, lng);
  }
}

function selectBbl(bbl) {
  document.getElementById('searchResults').classList.add('hidden');
  document.getElementById('searchInput').value = bbl;
  loadLotByBbl(bbl);
}

// -------------------------------------------------------------
// Load Lot from API
// -------------------------------------------------------------
async function loadLotByBbl(bbl, fallbackLat, fallbackLng) {
  document.getElementById('mapStatusBadge').innerText = 'Cargando...';
  try {
    const res = await fetch(`/api/lot?bbl=${bbl}`);
    if (!res.ok) {
      alert(`No se encontró el lote BBL ${bbl} en MapPLUTO.`);
      document.getElementById('mapStatusBadge').innerText = 'Error';
      return;
    }

    const data = await res.json();
    currentLotData = data;
    renderAll(data);

    // Center map
    let lat = parseFloat(data.rawPluto?.latitude) || fallbackLat;
    let lng = parseFloat(data.rawPluto?.longitude) || fallbackLng;
    if (lat && lng) {
      map.setView([lat, lng], 17);
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${data.propertyInfo.address}</b><br>Zoning: ${data.propertyInfo.zoningDistrict}<br>Lot Area: ${data.propertyInfo.totalLotArea} SF`)
        .openPopup();
    }
    document.getElementById('mapStatusBadge').innerText = 'Activo';
  } catch (err) {
    console.error('Failed to load lot:', err);
    document.getElementById('mapStatusBadge').innerText = 'Error';
  }
}

function loadDemoProperty(bbl) {
  loadLotByBbl(bbl);
}

async function loadDemoAddress(addr) {
  document.getElementById('searchInput').value = addr;
  const res = await fetch(`/api/search?q=${encodeURIComponent(addr)}`);
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    const f = data.features[0];
    const bbl = f.properties?.addendum?.pad?.bbl || f.properties?.pad_bbl;
    if (bbl) {
      loadLotByBbl(bbl, f.geometry.coordinates[1], f.geometry.coordinates[0]);
    }
  }
}

// -------------------------------------------------------------
// Render Data in UI
// -------------------------------------------------------------
function renderAll(data) {
  const p = data.propertyInfo;
  const res = data.residentialFloorArea;
  const comm = data.commercialFloorArea;
  const h = data.heightAndSetback;
  const d = data.density;
  const pk = data.parking;

  // Left summary card
  document.getElementById('activeBblBadge').innerText = `BBL: ${p.bbl || '-'}`;
  document.getElementById('summaryAddress').innerText = p.address || 'N/A';
  document.getElementById('summaryBoroughBlock').innerText = `${p.borough} • Block ${p.block} • Lot ${p.lot}`;
  document.getElementById('summaryZoning').innerText = p.zoningDistrict;
  document.getElementById('summaryLotArea').innerText = `${p.totalLotArea.toLocaleString()} SF`;
  document.getElementById('summarySpecialDist').innerText = p.specialZoningDistrict;
  document.getElementById('summaryTransit').innerText = p.transitZone.includes('INNER') ? 'Inner Transit Zone' : 'Standard Zone';

  // Tab 1: Property Info
  document.getElementById('propBorough').value = p.borough;
  document.getElementById('propBlock').value = p.block;
  document.getElementById('propLot').value = p.lot;
  document.getElementById('propZoningDistrict').value = p.zoningDistrict;
  document.getElementById('propSpecialDistrict').value = p.specialZoningDistrict;
  document.getElementById('propSpecialSubdistrict').value = p.specialSubdistrict;
  document.getElementById('propLotArea').value = p.totalLotArea;
  document.getElementById('propLotType').value = p.lotType;
  document.getElementById('propShallowLot').value = p.shallowLot;
  document.getElementById('propMihSite').value = p.mihSite;
  document.getElementById('propFloodZone').value = p.floodZone;
  document.getElementById('propEligibleSite').value = p.eligibleSite;
  document.getElementById('propOerHazard').value = p.oerHazard;
  document.getElementById('propCommunityBoard').value = p.communityBoard;
  document.getElementById('propZoningMap').value = p.zoningMap;

  // Tab 1: Floor Area
  document.getElementById('resFarStd').value = res.standardFar;
  document.getElementById('resFarUap').value = res.uapFar;
  document.getElementById('resPropStd').value = res.standardProposed || 0;
  document.getElementById('resPropUap').value = res.uapProposed || 0;
  document.getElementById('commFarInput').value = comm.commFar;
  document.getElementById('commPropInput').value = comm.proposed || 0;

  // Height & Setback
  document.getElementById('hMinBase').innerText = h.minBase;
  document.getElementById('hMaxBase').innerText = h.maxBase;
  document.getElementById('hMaxBldg').innerText = h.maxBuilding;

  // Density & Parking
  document.getElementById('densityMaxUnits').innerText = d.maxAllowedDensity;
  document.getElementById('pkTransitZone').innerText = pk.transitZone;
  document.getElementById('pkBikeSpaces').innerText = pk.bikeParking;

  recalculateZoning();

  // Tab 2: Buildings
  renderBuildingTable('A', data.buildingA);
  renderBuildingTable('B', data.buildingB);
  updateCombinedTotals();

  // Tab 3: Clauses
  renderClauses(data.zrClauses);

  // Tab 4: CSV
  updateCsvPreview();
}

function recalculateZoning() {
  const lotArea = parseFloat(document.getElementById('propLotArea').value) || 0;
  const resFarStd = parseFloat(document.getElementById('resFarStd').value) || 0;
  const resFarUap = parseFloat(document.getElementById('resFarUap').value) || 0;
  const resPropStd = parseFloat(document.getElementById('resPropStd').value) || 0;
  const resPropUap = parseFloat(document.getElementById('resPropUap').value) || 0;
  const commFar = parseFloat(document.getElementById('commFarInput').value) || 0;
  const commProp = parseFloat(document.getElementById('commPropInput').value) || 0;

  const zfaStd = Number((lotArea * resFarStd).toFixed(3));
  const zfaUap = Number((lotArea * resFarUap).toFixed(3));
  const zfaComm = Number((lotArea * commFar).toFixed(3));

  document.getElementById('resZfaStd').innerText = zfaStd.toLocaleString();
  document.getElementById('resRemStd').innerText = (zfaStd - resPropStd).toLocaleString();

  document.getElementById('resZfaUap').innerText = zfaUap.toLocaleString();
  document.getElementById('resRemUap').innerText = (zfaUap - resPropUap).toLocaleString();

  const allowedAmenities = (zfaUap * 0.05).toFixed(3);
  const reqAmenities = (zfaUap * 0.03).toFixed(3);
  document.getElementById('resAllowedAmenities').innerText = `${Number(allowedAmenities).toLocaleString()} SF`;
  document.getElementById('resRequiredAmenities').innerText = `${Number(reqAmenities).toLocaleString()} SF`;

  document.getElementById('commZfaMax').innerText = zfaComm.toLocaleString();
  document.getElementById('commRem').innerText = (zfaComm - commProp).toLocaleString();

  // Update Density (factor 680)
  const maxUnits = zfaUap > 0 ? Math.floor(zfaUap / 680) : 0;
  document.getElementById('densityMaxUnits').innerText = maxUnits;
  document.getElementById('pkBikeSpaces').innerText = Math.ceil(maxUnits / 2);

  // Sync to currentLotData
  if (currentLotData) {
    currentLotData.propertyInfo.totalLotArea = lotArea;
    currentLotData.residentialFloorArea.standardFar = resFarStd;
    currentLotData.residentialFloorArea.standardMaxZfa = zfaStd;
    currentLotData.residentialFloorArea.uapFar = resFarUap;
    currentLotData.residentialFloorArea.uapMaxZfa = zfaUap;
    currentLotData.commercialFloorArea.commFar = commFar;
    currentLotData.commercialFloorArea.maxCommZfa = zfaComm;
    currentLotData.density.maxAllowedDensity = maxUnits;
  }
}

// -------------------------------------------------------------
// Building Tables Logic (Building A & Building B)
// -------------------------------------------------------------
function renderBuildingTable(bldgLetter, bldgData) {
  const tbody = document.getElementById(`tbodyBldg${bldgLetter}`);
  tbody.innerHTML = '';

  (bldgData.levels || []).forEach((lvl, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100 text-[11px]';
    tr.innerHTML = `
      <td class="p-1 border"><input type="text" value="${lvl.level}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'level', this.value)" class="w-14 font-bold border-0 bg-transparent" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.resGfa || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'resGfa', this.value)" class="w-16 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.commGfa || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'commGfa', this.value)" class="w-16 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.chaseWalls || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'chaseWalls', this.value)" class="w-12 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.mechanical || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'mechanical', this.value)" class="w-12 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.parking || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'parking', this.value)" class="w-12 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.bikeParking || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'bikeParking', this.value)" class="w-12 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.amenities || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'amenities', this.value)" class="w-12 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.corridor || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'corridor', this.value)" class="w-14 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right"><input type="number" step="0.01" value="${lvl.refuse || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'refuse', this.value)" class="w-12 text-right border rounded p-0.5" /></td>
      <td class="p-1 border text-right font-mono font-semibold" id="net_${bldgLetter}_${idx}">${Number(lvl.netFloorArea || 0).toFixed(2)}</td>
      <td class="p-1 border text-right font-mono text-slate-500" id="energy_${bldgLetter}_${idx}">${Number(lvl.energyDeduction || 0).toFixed(2)}</td>
      <td class="p-1 border text-right font-mono font-bold text-blue-900 bg-blue-50" id="zfa_${bldgLetter}_${idx}">${Number(lvl.zfa || 0).toFixed(2)}</td>
      <td class="p-1 border text-center"><input type="number" value="${lvl.studio || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'studio', this.value)" class="w-10 text-center border rounded p-0.5" /></td>
      <td class="p-1 border text-center"><input type="number" value="${lvl.oneBr || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'oneBr', this.value)" class="w-10 text-center border rounded p-0.5" /></td>
      <td class="p-1 border text-center"><input type="number" value="${lvl.twoBr || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'twoBr', this.value)" class="w-10 text-center border rounded p-0.5" /></td>
      <td class="p-1 border text-center font-bold font-mono" id="units_${bldgLetter}_${idx}">${lvl.totalUnits || 0}</td>
    `;
    tbody.appendChild(tr);
  });

  recalculateBuildingTotals(bldgLetter);
}

function updateFloorCell(bldgLetter, idx, field, value) {
  const bldgKey = `building${bldgLetter}`;
  const lvl = currentLotData[bldgKey].levels[idx];
  lvl[field] = field === 'level' ? value : (parseFloat(value) || 0);

  // Auto calculate Net FA, Energy Deduction, ZFA, Units
  const totalGfa = (lvl.resGfa || 0) + (lvl.commGfa || 0);
  const totalDeductions = (lvl.chaseWalls || 0) + (lvl.mechanical || 0) + (lvl.parking || 0) + (lvl.bikeParking || 0) + (lvl.amenities || 0) + (lvl.corridor || 0) + (lvl.refuse || 0);
  
  // If Cellar, Net FA is typically 0 for ZFA purposes unless specified
  if (lvl.level.toUpperCase().includes('CELLAR')) {
    lvl.netFloorArea = 0;
    lvl.energyDeduction = 0;
    lvl.zfa = 0;
  } else {
    lvl.netFloorArea = Math.max(0, totalGfa - totalDeductions);
    lvl.energyDeduction = Number((lvl.netFloorArea * 0.05).toFixed(3));
    lvl.zfa = Number((lvl.netFloorArea - lvl.energyDeduction).toFixed(3));
  }

  lvl.totalUnits = (lvl.studio || 0) + (lvl.oneBr || 0) + (lvl.twoBr || 0);

  // Update UI row elements
  document.getElementById(`net_${bldgLetter}_${idx}`).innerText = lvl.netFloorArea.toFixed(2);
  document.getElementById(`energy_${bldgLetter}_${idx}`).innerText = lvl.energyDeduction.toFixed(2);
  document.getElementById(`zfa_${bldgLetter}_${idx}`).innerText = lvl.zfa.toFixed(2);
  document.getElementById(`units_${bldgLetter}_${idx}`).innerText = lvl.totalUnits;

  recalculateBuildingTotals(bldgLetter);
  updateCombinedTotals();
}

function recalculateBuildingTotals(bldgLetter) {
  const bldgKey = `building${bldgLetter}`;
  const levels = currentLotData[bldgKey].levels;

  const totals = {
    resGfa: 0, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 0, refuse: 0,
    netFloorArea: 0, energyDeduction: 0, zfa: 0, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0
  };

  levels.forEach(l => {
    totals.resGfa += l.resGfa || 0;
    totals.commGfa += l.commGfa || 0;
    totals.chaseWalls += l.chaseWalls || 0;
    totals.mechanical += l.mechanical || 0;
    totals.parking += l.parking || 0;
    totals.bikeParking += l.bikeParking || 0;
    totals.amenities += l.amenities || 0;
    totals.corridor += l.corridor || 0;
    totals.refuse += l.refuse || 0;
    totals.netFloorArea += l.netFloorArea || 0;
    totals.energyDeduction += l.energyDeduction || 0;
    totals.zfa += l.zfa || 0;
    totals.studio += l.studio || 0;
    totals.oneBr += l.oneBr || 0;
    totals.twoBr += l.twoBr || 0;
    totals.totalUnits += l.totalUnits || 0;
  });

  currentLotData[bldgKey].totals = totals;

  const tfoot = document.getElementById(`tfootBldg${bldgLetter}`);
  tfoot.innerHTML = `
    <tr>
      <td class="p-1.5 border">TOTALS</td>
      <td class="p-1.5 border text-right font-mono">${totals.resGfa.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.commGfa.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.chaseWalls.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.mechanical.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.parking.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.bikeParking.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.amenities.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.corridor.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.refuse.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.netFloorArea.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono">${totals.energyDeduction.toFixed(2)}</td>
      <td class="p-1.5 border text-right font-mono text-blue-900 bg-blue-100">${totals.zfa.toFixed(2)}</td>
      <td class="p-1.5 border text-center font-mono">${totals.studio}</td>
      <td class="p-1.5 border text-center font-mono">${totals.oneBr}</td>
      <td class="p-1.5 border text-center font-mono">${totals.twoBr}</td>
      <td class="p-1.5 border text-center font-mono">${totals.totalUnits}</td>
    </tr>
  `;
}

function addFloorRow(bldgLetter) {
  const bldgKey = `building${bldgLetter}`;
  const count = currentLotData[bldgKey].levels.length;
  currentLotData[bldgKey].levels.push({
    level: `${count}th`, resGfa: 4000, commGfa: 0, chaseWalls: 100, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0,
    corridor: 300, refuse: 20, netFloorArea: 3580, energyDeduction: 179, zfa: 3401, studio: 1, oneBr: 2, twoBr: 4, totalUnits: 7
  });
  renderBuildingTable(bldgLetter, currentLotData[bldgKey]);
  updateCombinedTotals();
}

function updateCombinedTotals() {
  const totA = currentLotData.buildingA.totals || {};
  const totB = currentLotData.buildingB.totals || {};

  const totalZfa = (totA.zfa || 0) + (totB.zfa || 0);
  const totalUnits = (totA.totalUnits || 0) + (totB.totalUnits || 0);
  const affordable485x = Math.round(totalUnits * 0.25);
  const marketUnits = totalUnits - affordable485x;
  const bikeSpaces = Math.ceil(totalUnits / 2);

  document.getElementById('combZfaTotal').innerText = `${totalZfa.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SF`;
  document.getElementById('badgeTotalUnits').innerText = `${totalUnits} Unidades Totales`;
  document.getElementById('combAffordableUnits').innerText = `${affordable485x} Unidades`;
  document.getElementById('combMarketUnits').innerText = `${marketUnits} Unidades`;
  document.getElementById('combBikeParking').innerText = `${bikeSpaces} Plazas`;
}

// -------------------------------------------------------------
// ZR Clauses Logic
// -------------------------------------------------------------
function renderClauses(clauses) {
  const tbody = document.getElementById('tbodyClauses');
  tbody.innerHTML = '';

  (clauses || []).forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100 text-xs';
    tr.innerHTML = `
      <td class="p-2 border font-bold text-blue-700">${c.section}</td>
      <td class="p-2 border font-semibold text-slate-800">${c.title}</td>
      <td class="p-2 border text-slate-600 font-mono text-[11px]">${c.ruleText}</td>
      <td class="p-2 border"><textarea onchange="updateClauseCompliance(${idx}, this.value)" class="w-full text-xs p-1 border rounded bg-slate-50 text-slate-800 font-medium" rows="2">${c.complianceText}</textarea></td>
      <td class="p-2 border text-center no-print">
        <button onclick="removeClause(${idx})" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateClauseCompliance(idx, val) {
  currentLotData.zrClauses[idx].complianceText = val;
}

function removeClause(idx) {
  currentLotData.zrClauses.splice(idx, 1);
  renderClauses(currentLotData.zrClauses);
}

function addZrClauseRow() {
  const sec = prompt('Número de sección ZR (ej: ZR 23-432):', 'ZR ');
  if (!sec) return;
  const title = prompt('Título / Descripción:', 'REGULACIÓN DE ALTURA');
  currentLotData.zrClauses.push({
    section: sec,
    title: title || '',
    ruleText: 'REGULACIÓN APLICABLE NYC ZR',
    complianceText: 'CUMPLE CON LA REGULACIÓN'
  });
  renderClauses(currentLotData.zrClauses);
}

// -------------------------------------------------------------
// Navigation Tabs
// -------------------------------------------------------------
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('bg-blue-600', 'text-white');
    b.classList.add('text-slate-600', 'hover:bg-slate-100');
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

  if (tabId === 'zoning') {
    document.getElementById('tabBtn1').classList.add('bg-blue-600', 'text-white');
    document.getElementById('tabContentZoning').classList.remove('hidden');
  } else if (tabId === 'building') {
    document.getElementById('tabBtn2').classList.add('bg-blue-600', 'text-white');
    document.getElementById('tabContentBuilding').classList.remove('hidden');
  } else if (tabId === 'clauses') {
    document.getElementById('tabBtn3').classList.add('bg-blue-600', 'text-white');
    document.getElementById('tabContentClauses').classList.remove('hidden');
  } else if (tabId === 'preview') {
    document.getElementById('tabBtn4').classList.add('bg-blue-600', 'text-white');
    document.getElementById('tabContentPreview').classList.remove('hidden');
    updateCsvPreview();
  }
}

// -------------------------------------------------------------
// CSV & Excel Exporter
// -------------------------------------------------------------
async function updateCsvPreview() {
  if (!currentLotData) return;
  const csvStr = await generateCsvString(currentLotData);
  document.getElementById('csvPreviewText').value = csvStr;
}

async function generateCsvString(data) {
  const res = await fetch('/api/export-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.text();
}

function setupExports() {
  // 1. Export CSV
  document.getElementById('btnExportCsv').addEventListener('click', async () => {
    if (!currentLotData) return;
    const csvContent = await generateCsvString(currentLotData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZONING_ANALYSIS_${currentLotData.propertyInfo.block || 'BLOCK'}_${currentLotData.propertyInfo.lot || 'LOT'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 2. Export Excel (.xlsx) using SheetJS
  document.getElementById('btnExportExcel').addEventListener('click', async () => {
    if (!currentLotData) return;
    const csvContent = await generateCsvString(currentLotData);
    const workbook = XLSX.read(csvContent, { type: 'string' });
    const filename = `ZONING_ANALYSIS_${currentLotData.propertyInfo.block || 'BLOCK'}_${currentLotData.propertyInfo.lot || 'LOT'}.xlsx`;
    XLSX.writeFile(workbook, filename);
  });
}
