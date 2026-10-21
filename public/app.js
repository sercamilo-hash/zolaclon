// Client Logic for NYC ZoLa Clone - Monochrome Spreadsheet Edition

let map;
let baseLayers = {};
let currentBaseLayer;
let lotGeoJsonLayer = null;
let zoningDistrictsLayer = null;
let currentLotData = null;

document.addEventListener('DOMContentLoaded', () => {
  initExcelMap();
  setupExcelSearch();
  setupExcelExports();

  // Load default demo: Queens R6 (Block 16130, Lot 35)
  loadLotByBbl('4161300035');

  // Trigger resize to guarantee map rendering
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 250);
});

// -------------------------------------------------------------
// Initialize Map with ZoLa Layers & Monochrome Base
// -------------------------------------------------------------
function initExcelMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  map = L.map('map', {
    zoomControl: true,
    attributionControl: false
  }).setView([40.7128, -74.0060], 13);

  // Base Layers
  baseLayers.carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  });

  baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19
  });

  baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  });

  // Default to monochrome Carto layer
  currentBaseLayer = baseLayers.carto;
  currentBaseLayer.addTo(map);

  zoningDistrictsLayer = L.layerGroup().addTo(map);

  // Invalidate size on window resize
  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });
}

function changeBaseMap(layerName) {
  if (!baseLayers[layerName]) return;
  if (currentBaseLayer) map.removeLayer(currentBaseLayer);
  currentBaseLayer = baseLayers[layerName];
  currentBaseLayer.addTo(map);
  if (lotGeoJsonLayer) lotGeoJsonLayer.bringToFront();
}

function toggleZoningLayer() {
  const isChecked = document.getElementById('chkZoningLayer').checked;
  if (isChecked) {
    if (!map.hasLayer(zoningDistrictsLayer)) map.addLayer(zoningDistrictsLayer);
  } else {
    if (map.hasLayer(zoningDistrictsLayer)) map.removeLayer(zoningDistrictsLayer);
  }
}

function toggleLotPolygon() {
  const isChecked = document.getElementById('chkTaxLotLayer').checked;
  if (!lotGeoJsonLayer) return;
  if (isChecked) {
    if (!map.hasLayer(lotGeoJsonLayer)) map.addLayer(lotGeoJsonLayer);
  } else {
    if (map.hasLayer(lotGeoJsonLayer)) map.removeLayer(lotGeoJsonLayer);
  }
}

// -------------------------------------------------------------
// Search Bar with Formula Bar & Dropdown
// -------------------------------------------------------------
function setupExcelSearch() {
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  const btnSubmit = document.getElementById('btnSearchSubmit');
  let debounceTimer;

  input.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchSearch(q);
    }, 280);
  });

  btnSubmit.addEventListener('click', () => {
    const q = input.value.trim();
    if (q) fetchSearch(q);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) fetchSearch(q);
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

async function fetchSearch(query) {
  const dropdown = document.getElementById('searchDropdown');
  setStatus(`SEARCHING: ${query}...`);

  // Direct 10-digit BBL
  if (/^\d{10}$/.test(query)) {
    dropdown.innerHTML = `
      <div class="search-item" onclick="selectBbl('${query}')">
        <strong>BBL DIRECT QUERY: ${query}</strong><br/>
        <span style="font-size: 10px; color: #666;">QUERY MAPPLUTO FOR THIS PROPERTY</span>
      </div>
    `;
    dropdown.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      dropdown.innerHTML = `<div class="search-item" style="color: #888;">NO RESULTS FOUND IN NYC</div>`;
      dropdown.style.display = 'block';
      setStatus('READY');
      return;
    }

    dropdown.innerHTML = data.features.slice(0, 7).map(f => {
      const p = f.properties || {};
      const bbl = p.addendum?.pad?.bbl || p.pad_bbl || '';
      return `
        <div class="search-item" onclick="selectResult('${bbl}', '${encodeURIComponent(p.label || p.name || '')}', ${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]})">
          <strong>${(p.label || p.name || '').toUpperCase()}</strong><br/>
          <span style="font-size: 10px; color: #555;">${p.borough ? p.borough.toUpperCase() : ''} ${bbl ? '• BBL: ' + bbl : ''}</span>
        </div>
      `;
    }).join('');
    dropdown.style.display = 'block';
    setStatus('READY');
  } catch (err) {
    console.error('Search error:', err);
    setStatus('SEARCH ERROR');
  }
}

function selectResult(bbl, encodedLabel, lat, lng) {
  document.getElementById('searchDropdown').style.display = 'none';
  const label = decodeURIComponent(encodedLabel);
  document.getElementById('searchInput').value = label;
  if (bbl) {
    loadLotByBbl(bbl, lat, lng);
  }
}

function selectBbl(bbl) {
  document.getElementById('searchDropdown').style.display = 'none';
  document.getElementById('searchInput').value = bbl;
  loadLotByBbl(bbl);
}

// -------------------------------------------------------------
// Load Lot & Fetch Surrounding Zoning Districts (ZoLa Layers)
// -------------------------------------------------------------
async function loadLotByBbl(bbl, fallbackLat, fallbackLng) {
  setStatus(`LOADING BBL: ${bbl}...`);
  try {
    const res = await fetch(`/api/lot?bbl=${bbl}`);
    if (!res.ok) {
      alert(`BBL ${bbl} not found in MapPLUTO.`);
      setStatus('LOT NOT FOUND');
      return;
    }

    const data = await res.json();
    currentLotData = data;
    renderSpreadsheetData(data);

    // Render Lot Polygon on Map
    const pluto = data.rawPluto || {};
    let lat = parseFloat(pluto.latitude) || fallbackLat;
    let lng = parseFloat(pluto.longitude) || fallbackLng;

    if (pluto.geometry_geojson) {
      try {
        const geojson = JSON.parse(pluto.geometry_geojson);
        if (lotGeoJsonLayer) map.removeLayer(lotGeoJsonLayer);

        lotGeoJsonLayer = L.geoJSON(geojson, {
          style: {
            color: '#000000',
            weight: 3,
            opacity: 1,
            fillColor: '#000000',
            fillOpacity: 0.18
          }
        }).addTo(map);

        lotGeoJsonLayer.bindPopup(`
          <div style="font-size: 11px; font-family: Arial;">
            <strong>${data.propertyInfo.address}</strong><br/>
            <strong>ZONE:</strong> ${data.propertyInfo.zoningDistrict}<br/>
            <strong>LOT AREA:</strong> ${data.propertyInfo.totalLotArea} SF<br/>
            <strong>BBL:</strong> ${data.propertyInfo.bbl}
          </div>
        `);

        map.fitBounds(lotGeoJsonLayer.getBounds(), { padding: [25, 25], maxZoom: 18 });
        lotGeoJsonLayer.openPopup();
      } catch (e) {
        console.error('Failed to parse lot GeoJSON:', e);
      }
    } else if (lat && lng) {
      map.setView([lat, lng], 17);
    }

    // Fetch surrounding zoning districts layer (ZoLa layer)
    if (lat && lng) {
      loadSurroundingZoning(lat, lng);
    }

    setStatus(`READY • BBL: ${data.propertyInfo.bbl} (${data.propertyInfo.zoningDistrict})`);
    setTimeout(() => { if (map) map.invalidateSize(); }, 150);

  } catch (err) {
    console.error('Failed to load lot:', err);
    setStatus('ERROR LOADING LOT');
  }
}

async function loadSurroundingZoning(lat, lng) {
  try {
    const res = await fetch(`/api/zoning-surrounding?lat=${lat}&lng=${lng}`);
    const rows = await res.json();
    zoningDistrictsLayer.clearLayers();

    rows.forEach(r => {
      if (!r.geojson) return;
      try {
        const geom = JSON.parse(r.geojson);
        const poly = L.geoJSON(geom, {
          style: {
            color: '#444444',
            weight: 1.5,
            dashArray: '4, 4',
            fillColor: '#666666',
            fillOpacity: 0.05
          }
        });
        poly.bindTooltip(`<b>${r.zonedist}</b>`, { permanent: false, direction: 'center', className: 'no-radius' });
        zoningDistrictsLayer.addLayer(poly);
      } catch (e) {}
    });

    if (lotGeoJsonLayer) lotGeoJsonLayer.bringToFront();
  } catch (e) {
    console.error('Failed to load zoning layer:', e);
  }
}

// -------------------------------------------------------------
// Render Data in Monochrome Spreadsheet
// -------------------------------------------------------------
function renderSpreadsheetData(data) {
  const p = data.propertyInfo;
  const res = data.residentialFloorArea;
  const comm = data.commercialFloorArea;
  const h = data.heightAndSetback;
  const d = data.density;
  const pk = data.parking;

  // Left card labels
  document.getElementById('lblBbl').innerText = p.bbl || '-';
  document.getElementById('lblAddress').innerText = p.address || '-';
  document.getElementById('lblBoroughBlockLot').innerText = `${p.borough} / ${p.block} / ${p.lot}`;
  document.getElementById('lblZoning').innerText = p.zoningDistrict;
  document.getElementById('lblSpecialDist').innerText = p.specialZoningDistrict;
  document.getElementById('lblLotArea').innerText = `${p.totalLotArea.toLocaleString()} SF`;
  document.getElementById('lblFloodZone').innerText = p.floodZone;
  document.getElementById('lblTransitZone').innerText = p.transitZone.includes('INNER') ? 'INNER TRANSIT ZONE' : 'STANDARD';
  document.getElementById('lblOer').innerText = p.oerHazard;

  // Sheet 1: Property info inputs
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

  // Floor area inputs
  document.getElementById('resFarStd').value = res.standardFar;
  document.getElementById('resFarUap').value = res.uapFar;
  document.getElementById('commFarInput').value = comm.commFar;

  // Height & Setback
  document.getElementById('hMinBase').innerText = h.minBase;
  document.getElementById('hMaxBase').innerText = h.maxBase;
  document.getElementById('hMaxBldg').innerText = h.maxBuilding;

  // Density & Parking
  document.getElementById('densityMaxUnits').innerText = d.maxAllowedDensity;
  document.getElementById('propDensityUnits').value = d.maxAllowedDensity;
  document.getElementById('pkTransitZone').innerText = pk.transitZone;
  document.getElementById('pkBikeSpaces').innerText = `${pk.bikeParking} SPACES`;

  recalculateZoning();

  // Sheet 2: Building Schedules
  renderExcelBuildingTable('A', data.buildingA);
  renderExcelBuildingTable('B', data.buildingB);
  updateCombinedTotals();

  // Sheet 3: ZR Clauses
  renderClausesTable(data.zrClauses);

  // Sheet 4: Raw CSV
  updateCsvPreview();
}

function recalculateZoning() {
  const lotArea = parseFloat(document.getElementById('propLotArea').value) || 0;
  const resFarStd = parseFloat(document.getElementById('resFarStd').value) || 0;
  const resFarUap = parseFloat(document.getElementById('resFarUap').value) || 0;
  const commFar = parseFloat(document.getElementById('commFarInput').value) || 0;

  const zfaStd = Number((lotArea * resFarStd).toFixed(3));
  const zfaUap = Number((lotArea * resFarUap).toFixed(3));
  const zfaComm = Number((lotArea * commFar).toFixed(3));

  document.getElementById('resZfaStd').innerText = zfaStd.toLocaleString();
  document.getElementById('resRemStd').innerText = zfaStd.toLocaleString();

  document.getElementById('resZfaUap').innerText = zfaUap.toLocaleString();
  document.getElementById('resRemUap').innerText = zfaUap.toLocaleString();

  const allowedAmenities = (zfaUap * 0.05).toFixed(3);
  const reqAmenities = (zfaUap * 0.03).toFixed(3);
  document.getElementById('resAllowedAmenities').innerText = `${Number(allowedAmenities).toLocaleString()} SF`;
  document.getElementById('resRequiredAmenities').innerText = `${Number(reqAmenities).toLocaleString()} SF`;

  document.getElementById('commZfaMax').innerText = zfaComm.toLocaleString();
  document.getElementById('commRem').innerText = zfaComm.toLocaleString();

  const maxUnits = zfaUap > 0 ? Math.floor(zfaUap / 680) : 0;
  document.getElementById('densityMaxUnits').innerText = maxUnits;
  document.getElementById('propDensityUnits').value = maxUnits;
  document.getElementById('pkBikeSpaces').innerText = `${Math.ceil(maxUnits / 2)} SPACES`;

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
// Building Schedules Logic
// -------------------------------------------------------------
function renderExcelBuildingTable(bldgLetter, bldgData) {
  const tbody = document.getElementById(`tbodyBldg${bldgLetter}`);
  tbody.innerHTML = '';

  (bldgData.levels || []).forEach((lvl, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="bold"><input type="text" value="${lvl.level}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'level', this.value)" style="width: 55px; font-weight: bold;" /></td>
      <td><input type="number" step="0.01" value="${lvl.resGfa || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'resGfa', this.value)" class="numeric" style="width: 70px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.commGfa || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'commGfa', this.value)" class="numeric" style="width: 70px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.chaseWalls || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'chaseWalls', this.value)" class="numeric" style="width: 50px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.mechanical || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'mechanical', this.value)" class="numeric" style="width: 50px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.parking || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'parking', this.value)" class="numeric" style="width: 50px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.bikeParking || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'bikeParking', this.value)" class="numeric" style="width: 50px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.amenities || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'amenities', this.value)" class="numeric" style="width: 50px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.corridor || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'corridor', this.value)" class="numeric" style="width: 55px;" /></td>
      <td><input type="number" step="0.01" value="${lvl.refuse || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'refuse', this.value)" class="numeric" style="width: 50px;" /></td>
      <td class="numeric bold" id="net_${bldgLetter}_${idx}">${Number(lvl.netFloorArea || 0).toFixed(2)}</td>
      <td class="numeric" id="energy_${bldgLetter}_${idx}">${Number(lvl.energyDeduction || 0).toFixed(2)}</td>
      <td class="numeric bold" id="zfa_${bldgLetter}_${idx}" style="background: #f0f0f0;">${Number(lvl.zfa || 0).toFixed(2)}</td>
      <td><input type="number" value="${lvl.studio || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'studio', this.value)" class="numeric" style="width: 40px;" /></td>
      <td><input type="number" value="${lvl.oneBr || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'oneBr', this.value)" class="numeric" style="width: 40px;" /></td>
      <td><input type="number" value="${lvl.twoBr || 0}" onchange="updateFloorCell('${bldgLetter}', ${idx}, 'twoBr', this.value)" class="numeric" style="width: 40px;" /></td>
      <td class="numeric bold" id="units_${bldgLetter}_${idx}">${lvl.totalUnits || 0}</td>
    `;
    tbody.appendChild(tr);
  });

  recalculateBuildingTotals(bldgLetter);
}

function updateFloorCell(bldgLetter, idx, field, value) {
  const bldgKey = `building${bldgLetter}`;
  const lvl = currentLotData[bldgKey].levels[idx];
  lvl[field] = field === 'level' ? value : (parseFloat(value) || 0);

  const totalGfa = (lvl.resGfa || 0) + (lvl.commGfa || 0);
  const totalDeductions = (lvl.chaseWalls || 0) + (lvl.mechanical || 0) + (lvl.parking || 0) + (lvl.bikeParking || 0) + (lvl.amenities || 0) + (lvl.corridor || 0) + (lvl.refuse || 0);
  
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
      <td class="bold">TOTALS</td>
      <td class="numeric bold">${totals.resGfa.toFixed(2)}</td>
      <td class="numeric bold">${totals.commGfa.toFixed(2)}</td>
      <td class="numeric bold">${totals.chaseWalls.toFixed(2)}</td>
      <td class="numeric bold">${totals.mechanical.toFixed(2)}</td>
      <td class="numeric bold">${totals.parking.toFixed(2)}</td>
      <td class="numeric bold">${totals.bikeParking.toFixed(2)}</td>
      <td class="numeric bold">${totals.amenities.toFixed(2)}</td>
      <td class="numeric bold">${totals.corridor.toFixed(2)}</td>
      <td class="numeric bold">${totals.refuse.toFixed(2)}</td>
      <td class="numeric bold">${totals.netFloorArea.toFixed(2)}</td>
      <td class="numeric bold">${totals.energyDeduction.toFixed(2)}</td>
      <td class="numeric bold" style="background: #000; color: #fff;">${totals.zfa.toFixed(2)}</td>
      <td class="numeric bold">${totals.studio}</td>
      <td class="numeric bold">${totals.oneBr}</td>
      <td class="numeric bold">${totals.twoBr}</td>
      <td class="numeric bold">${totals.totalUnits}</td>
    </tr>
  `;
}

function addFloorRow(bldgLetter) {
  const bldgKey = `building${bldgLetter}`;
  const count = currentLotData[bldgKey].levels.length;
  currentLotData[bldgKey].levels.push({
    level: `${count}TH`, resGfa: 4000, commGfa: 0, chaseWalls: 100, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0,
    corridor: 300, refuse: 20, netFloorArea: 3580, energyDeduction: 179, zfa: 3401, studio: 1, oneBr: 2, twoBr: 4, totalUnits: 7
  });
  renderExcelBuildingTable(bldgLetter, currentLotData[bldgKey]);
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
  document.getElementById('badgeTotalUnits').innerText = `${totalUnits} UNITS`;
  document.getElementById('combAffordableUnits').innerText = `${affordable485x} UNITS`;
  document.getElementById('combMarketUnits').innerText = `${marketUnits} UNITS`;
  document.getElementById('combBikeParking').innerText = `${bikeSpaces} SPACES`;
}

// -------------------------------------------------------------
// ZR Clauses Table
// -------------------------------------------------------------
function renderClausesTable(clauses) {
  const tbody = document.getElementById('tbodyClauses');
  tbody.innerHTML = '';

  (clauses || []).forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="bold">${c.section}</td>
      <td class="bold">${c.title}</td>
      <td style="font-size: 10px; color: #333;">${c.ruleText}</td>
      <td><input type="text" value="${c.complianceText}" onchange="currentLotData.zrClauses[${idx}].complianceText = this.value" class="bold" /></td>
      <td style="text-align: center;" class="no-print">
        <button onclick="removeClause(${idx})" class="excel-btn" style="padding: 1px 4px; font-size: 10px;">DEL</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function removeClause(idx) {
  currentLotData.zrClauses.splice(idx, 1);
  renderClausesTable(currentLotData.zrClauses);
}

function addZrClauseRow() {
  const sec = prompt('ZR Section (e.g., ZR 23-432):', 'ZR ');
  if (!sec) return;
  const title = prompt('Title / Description:', 'HEIGHT & SETBACK');
  currentLotData.zrClauses.push({
    section: sec,
    title: title || '',
    ruleText: 'APPLICABLE NYC ZR REGULATION',
    complianceText: 'COMPLIES'
  });
  renderClausesTable(currentLotData.zrClauses);
}

// -------------------------------------------------------------
// Sheet Switcher (Tabs)
// -------------------------------------------------------------
function switchSheet(sheetId) {
  document.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sheetZoning').style.display = 'none';
  document.getElementById('sheetBuilding').style.display = 'none';
  document.getElementById('sheetClauses').style.display = 'none';
  document.getElementById('sheetPreview').style.display = 'none';

  if (sheetId === 'zoning') {
    document.getElementById('tab1').classList.add('active');
    document.getElementById('sheetZoning').style.display = 'block';
  } else if (sheetId === 'building') {
    document.getElementById('tab2').classList.add('active');
    document.getElementById('sheetBuilding').style.display = 'block';
  } else if (sheetId === 'clauses') {
    document.getElementById('tab3').classList.add('active');
    document.getElementById('sheetClauses').style.display = 'block';
  } else if (sheetId === 'preview') {
    document.getElementById('tab4').classList.add('active');
    document.getElementById('sheetPreview').style.display = 'block';
    updateCsvPreview();
  }
}

// -------------------------------------------------------------
// Exports: CSV & Excel (.xlsx)
// -------------------------------------------------------------
async function updateCsvPreview() {
  if (!currentLotData) return;
  const csv = await fetchCsvString(currentLotData);
  document.getElementById('csvPreviewText').value = csv;
}

async function fetchCsvString(data) {
  const res = await fetch('/api/export-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.text();
}

function setupExcelExports() {
  document.getElementById('btnExportCsv').addEventListener('click', async () => {
    if (!currentLotData) return;
    setStatus('GENERATING CSV...');
    const csv = await fetchCsvString(currentLotData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZR_PLUS_ANALYSIS_${currentLotData.propertyInfo.block || 'BLOCK'}_${currentLotData.propertyInfo.lot || 'LOT'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('CSV EXPORTED');
  });

  document.getElementById('btnExportExcel').addEventListener('click', async () => {
    if (!currentLotData) return;
    setStatus('GENERATING EXCEL (.XLSX)...');
    const csv = await fetchCsvString(currentLotData);
    const workbook = XLSX.read(csv, { type: 'string' });
    const filename = `ZR_PLUS_ANALYSIS_${currentLotData.propertyInfo.block || 'BLOCK'}_${currentLotData.propertyInfo.lot || 'LOT'}.xlsx`;
    XLSX.writeFile(workbook, filename);
    setStatus('EXCEL EXPORTED');
  });
}

function setStatus(msg) {
  const el = document.getElementById('statusBarText');
  if (el) el.innerText = msg;
}
