let map;
let baseLayers = {};
let currentBaseLayer;
let lotGeoJsonLayer = null;
let neighboringLotsLayer = null;
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
  neighboringLotsLayer = L.layerGroup().addTo(map);

  // Click anywhere on map to query parcel (Point-In-Polygon)
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    setStatus(`SEARCHING LOT AT: ${lat.toFixed(5)}, ${lng.toFixed(5)}...`);
    try {
      const res = await fetch(`/api/lot-by-point?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const found = await res.json();
        if (found.bbl) {
          loadLotByBbl(found.bbl, lat, lng);
        }
      } else {
        setStatus('NO NYC LOT AT CLICKED POINT');
      }
    } catch (err) {
      console.error('Click map query error:', err);
    }
  });

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
  if (neighboringLotsLayer) neighboringLotsLayer.bringToFront();
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

function toggleNeighborLots() {
  const isChecked = document.getElementById('chkNeighborLots').checked;
  if (isChecked) {
    if (!map.hasLayer(neighboringLotsLayer)) map.addLayer(neighboringLotsLayer);
  } else {
    if (map.hasLayer(neighboringLotsLayer)) map.removeLayer(neighboringLotsLayer);
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

    // Fetch surrounding zoning districts layer & neighboring lots (ZoLa layers)
    if (lat && lng) {
      loadSurroundingZoning(lat, lng);
      loadNeighboringLots(lat, lng, data.propertyInfo.bbl);
    }

    setStatus(`READY • BBL: ${data.propertyInfo.bbl} (${data.propertyInfo.zoningDistrict})`);
    setTimeout(() => { if (map) map.invalidateSize(); }, 150);

  } catch (err) {
    console.error('Failed to load lot:', err);
    setStatus('ERROR LOADING LOT');
  }
}

async function loadNeighboringLots(lat, lng, activeBbl) {
  try {
    const res = await fetch(`/api/lots-neighboring?lat=${lat}&lng=${lng}`);
    const rows = await res.json();
    neighboringLotsLayer.clearLayers();

    rows.forEach(r => {
      if (!r.geojson || String(r.bbl) === String(activeBbl)) return;
      try {
        const geom = JSON.parse(r.geojson);
        const poly = L.geoJSON(geom, {
          style: {
            color: '#666666',
            weight: 1.2,
            fillColor: '#000000',
            fillOpacity: 0.04
          }
        });

        // Interactive hover & click
        poly.on('mouseover', (e) => {
          poly.setStyle({
            color: '#000000',
            weight: 2.5,
            fillColor: '#000000',
            fillOpacity: 0.28
          });
          map.getContainer().style.cursor = 'pointer';
        });

        poly.on('mouseout', (e) => {
          poly.setStyle({
            color: '#666666',
            weight: 1.2,
            fillColor: '#000000',
            fillOpacity: 0.04
          });
          map.getContainer().style.cursor = '';
        });

        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setStatus(`SELECTING NEIGHBOR LOT ${r.lot} (BBL: ${r.bbl})...`);
          loadLotByBbl(r.bbl);
        });

        poly.bindTooltip(`
          <div style="font-family: Arial; font-size: 10px;">
            <strong>LOT ${r.lot}</strong><br/>
            ${r.address || 'PARCEL'}<br/>
            <b>${r.zonedist1 || ''}</b> • ${Number(r.lotarea || 0).toLocaleString()} SF
          </div>
        `, { sticky: true, className: 'no-radius' });

        neighboringLotsLayer.addLayer(poly);
      } catch (e) {}
    });

    if (lotGeoJsonLayer) lotGeoJsonLayer.bringToFront();
  } catch (err) {
    console.error('Failed to load neighboring lots:', err);
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
            color: '#888888',
            weight: 1,
            dashArray: '4, 4',
            fillColor: '#000000',
            fillOpacity: 0.02
          }
        });
        poly.bindTooltip(`<b>${r.zonedist}</b>`, { permanent: false, direction: 'center', className: 'no-radius' });
        zoningDistrictsLayer.addLayer(poly);
      } catch (e) {}
    });

    if (neighboringLotsLayer) neighboringLotsLayer.bringToFront();
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

  // Ensure buildings array exists
  initBuildingsArray(data);

  // Sheet 2: Building Schedules (Dynamic)
  renderAllBuildings();
  updateCombinedTotals();

  // Sheet 3: ZR Clauses
  renderClausesTable(data.zrClauses);

  // Sheet 4: Raw CSV
  updateCsvPreview();
}

function initBuildingsArray(data) {
  if (!data.buildings || data.buildings.length === 0) {
    const list = [];
    if (data.buildingA) {
      data.buildingA.id = 'A';
      data.buildingA.name = data.buildingA.name || 'BUILDING A';
      list.push(data.buildingA);
    }
    if (data.buildingB) {
      data.buildingB.id = 'B';
      data.buildingB.name = data.buildingB.name || 'BUILDING B';
      list.push(data.buildingB);
    }
    data.buildings = list;
  }
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
// Dynamic Multi-Building & Multi-Floor Logic
// -------------------------------------------------------------
function renderAllBuildings() {
  const container = document.getElementById('buildingsContainer');
  if (!container) return;
  container.innerHTML = '';

  const buildings = currentLotData.buildings || [];

  buildings.forEach((bldg, bldgIdx) => {
    recalculateBuildingTotals(bldgIdx);

    const bldgWrapper = document.createElement('div');
    bldgWrapper.style.marginBottom = '20px';
    bldgWrapper.innerHTML = `
      <div style="background: #000; color: #fff; padding: 5px 8px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; border: 1px solid #000;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="text" value="${bldg.name || 'BUILDING ' + (bldgIdx + 1)}" onchange="renameBuilding(${bldgIdx}, this.value)" 
                 style="background: transparent; color: #fff; font-weight: bold; border: 1px solid #555; padding: 2px 6px; width: 220px; font-size: 11px; text-transform: uppercase;" />
        </div>
        <div style="display: flex; gap: 4px;" class="no-print">
          <button onclick="addFloorToBuilding(${bldgIdx})" class="excel-btn" style="padding: 2px 8px; font-size: 10px; background: #fff; color: #000;">
            + ADD FLOOR
          </button>
          ${buildings.length > 1 ? `
          <button onclick="deleteBuilding(${bldgIdx})" class="excel-btn" style="padding: 2px 8px; font-size: 10px; background: #333; color: #fff; border-color: #555;">
            DELETE BUILDING
          </button>` : ''}
        </div>
      </div>
      <table class="excel-table" id="tableBldg_${bldgIdx}">
        <thead>
          <tr>
            <th style="width: 70px;">LEVEL</th>
            <th class="numeric">RES GFA</th>
            <th class="numeric">COMM GFA</th>
            <th class="numeric">CHASE</th>
            <th class="numeric">MECH</th>
            <th class="numeric">PARKING</th>
            <th class="numeric">BIKE</th>
            <th class="numeric">AMENITIES</th>
            <th class="numeric">CORRIDOR</th>
            <th class="numeric">REFUSE</th>
            <th class="numeric">NET FA</th>
            <th class="numeric">5% ENERGY</th>
            <th class="numeric" style="background: #000; color: #fff;">ZFA</th>
            <th style="text-align: center;">STUDIO</th>
            <th style="text-align: center;">1BR</th>
            <th style="text-align: center;">2BR</th>
            <th style="text-align: center;" class="bold">TOTAL</th>
            <th style="width: 35px; text-align: center;" class="no-print">DEL</th>
          </tr>
        </thead>
        <tbody id="tbodyBldg_${bldgIdx}"></tbody>
        <tfoot id="tfootBldg_${bldgIdx}" style="background: #e6e6e6; font-weight: bold;"></tfoot>
      </table>
    `;

    container.appendChild(bldgWrapper);

    // Populate rows
    const tbody = bldgWrapper.querySelector(`#tbodyBldg_${bldgIdx}`);
    (bldg.levels || []).forEach((lvl, lvlIdx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="bold"><input type="text" value="${lvl.level}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'level', this.value)" style="width: 65px; font-weight: bold;" /></td>
        <td><input type="number" step="0.01" value="${lvl.resGfa || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'resGfa', this.value)" class="numeric" style="width: 70px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.commGfa || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'commGfa', this.value)" class="numeric" style="width: 70px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.chaseWalls || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'chaseWalls', this.value)" class="numeric" style="width: 50px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.mechanical || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'mechanical', this.value)" class="numeric" style="width: 50px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.parking || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'parking', this.value)" class="numeric" style="width: 50px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.bikeParking || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'bikeParking', this.value)" class="numeric" style="width: 50px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.amenities || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'amenities', this.value)" class="numeric" style="width: 50px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.corridor || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'corridor', this.value)" class="numeric" style="width: 55px;" /></td>
        <td><input type="number" step="0.01" value="${lvl.refuse || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'refuse', this.value)" class="numeric" style="width: 50px;" /></td>
        <td class="numeric bold" id="net_${bldgIdx}_${lvlIdx}">${Number(lvl.netFloorArea || 0).toFixed(2)}</td>
        <td class="numeric" id="energy_${bldgIdx}_${lvlIdx}">${Number(lvl.energyDeduction || 0).toFixed(2)}</td>
        <td class="numeric bold" id="zfa_${bldgIdx}_${lvlIdx}" style="background: #f0f0f0;">${Number(lvl.zfa || 0).toFixed(2)}</td>
        <td><input type="number" value="${lvl.studio || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'studio', this.value)" class="numeric" style="width: 40px;" /></td>
        <td><input type="number" value="${lvl.oneBr || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'oneBr', this.value)" class="numeric" style="width: 40px;" /></td>
        <td><input type="number" value="${lvl.twoBr || 0}" onchange="updateFloorCell(${bldgIdx}, ${lvlIdx}, 'twoBr', this.value)" class="numeric" style="width: 40px;" /></td>
        <td class="numeric bold" id="units_${bldgIdx}_${lvlIdx}">${lvl.totalUnits || 0}</td>
        <td style="text-align: center;" class="no-print">
          <button onclick="deleteFloor(${bldgIdx}, ${lvlIdx})" class="excel-btn" style="padding: 1px 4px; font-size: 10px;" title="Delete floor">X</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Populate foot totals
    renderBuildingFoot(bldgIdx);
  });
}

function renderBuildingFoot(bldgIdx) {
  const bldg = currentLotData.buildings[bldgIdx];
  const tfoot = document.getElementById(`tfootBldg_${bldgIdx}`);
  if (!tfoot || !bldg.totals) return;
  const t = bldg.totals;

  tfoot.innerHTML = `
    <tr>
      <td class="bold">TOTALS</td>
      <td class="numeric bold">${t.resGfa.toFixed(2)}</td>
      <td class="numeric bold">${t.commGfa.toFixed(2)}</td>
      <td class="numeric bold">${t.chaseWalls.toFixed(2)}</td>
      <td class="numeric bold">${t.mechanical.toFixed(2)}</td>
      <td class="numeric bold">${t.parking.toFixed(2)}</td>
      <td class="numeric bold">${t.bikeParking.toFixed(2)}</td>
      <td class="numeric bold">${t.amenities.toFixed(2)}</td>
      <td class="numeric bold">${t.corridor.toFixed(2)}</td>
      <td class="numeric bold">${t.refuse.toFixed(2)}</td>
      <td class="numeric bold">${t.netFloorArea.toFixed(2)}</td>
      <td class="numeric bold">${t.energyDeduction.toFixed(2)}</td>
      <td class="numeric bold" style="background: #000; color: #fff;">${t.zfa.toFixed(2)}</td>
      <td class="numeric bold">${t.studio}</td>
      <td class="numeric bold">${t.oneBr}</td>
      <td class="numeric bold">${t.twoBr}</td>
      <td class="numeric bold">${t.totalUnits}</td>
      <td class="no-print"></td>
    </tr>
  `;
}

function updateFloorCell(bldgIdx, lvlIdx, field, value) {
  const bldg = currentLotData.buildings[bldgIdx];
  const lvl = bldg.levels[lvlIdx];
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

  const netEl = document.getElementById(`net_${bldgIdx}_${lvlIdx}`);
  const energyEl = document.getElementById(`energy_${bldgIdx}_${lvlIdx}`);
  const zfaEl = document.getElementById(`zfa_${bldgIdx}_${lvlIdx}`);
  const unitsEl = document.getElementById(`units_${bldgIdx}_${lvlIdx}`);

  if (netEl) netEl.innerText = lvl.netFloorArea.toFixed(2);
  if (energyEl) energyEl.innerText = lvl.energyDeduction.toFixed(2);
  if (zfaEl) zfaEl.innerText = lvl.zfa.toFixed(2);
  if (unitsEl) unitsEl.innerText = lvl.totalUnits;

  recalculateBuildingTotals(bldgIdx);
  renderBuildingFoot(bldgIdx);
  updateCombinedTotals();
}

function recalculateBuildingTotals(bldgIdx) {
  const bldg = currentLotData.buildings[bldgIdx];
  const levels = bldg.levels || [];

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

  bldg.totals = totals;
}

function renameBuilding(bldgIdx, newName) {
  if (currentLotData.buildings[bldgIdx]) {
    currentLotData.buildings[bldgIdx].name = newName.toUpperCase();
    updateCsvPreview();
  }
}

function addFloorToBuilding(bldgIdx) {
  const bldg = currentLotData.buildings[bldgIdx];
  const nextNum = bldg.levels.length;
  const suffix = (nextNum === 1) ? '1ST' : (nextNum === 2) ? '2ND' : (nextNum === 3) ? '3RD' : `${nextNum}TH`;

  const newFloor = {
    level: suffix,
    resGfa: 4000,
    commGfa: 0,
    chaseWalls: 100,
    mechanical: 0,
    parking: 0,
    bikeParking: 0,
    amenities: 0,
    corridor: 300,
    refuse: 20,
    netFloorArea: 3580,
    energyDeduction: 179,
    zfa: 3401,
    studio: 1,
    oneBr: 2,
    twoBr: 4,
    totalUnits: 7
  };

  // If last floor is ROOF, insert right before ROOF
  if (bldg.levels.length > 0 && bldg.levels[bldg.levels.length - 1].level.toUpperCase().includes('ROOF')) {
    bldg.levels.splice(bldg.levels.length - 1, 0, newFloor);
  } else {
    bldg.levels.push(newFloor);
  }

  recalculateBuildingTotals(bldgIdx);
  renderAllBuildings();
  updateCombinedTotals();
  updateCsvPreview();
}

function deleteFloor(bldgIdx, lvlIdx) {
  const bldg = currentLotData.buildings[bldgIdx];
  if (bldg.levels.length <= 1) {
    alert('A building must contain at least 1 floor level.');
    return;
  }
  bldg.levels.splice(lvlIdx, 1);
  recalculateBuildingTotals(bldgIdx);
  renderAllBuildings();
  updateCombinedTotals();
  updateCsvPreview();
}

function addNewBuildingPrompt() {
  const nextChar = String.fromCharCode(65 + currentLotData.buildings.length);
  const defaultName = `BUILDING ${nextChar}`;
  const inputName = prompt('Enter New Building Name:', defaultName) || defaultName;

  const newBldg = {
    id: nextChar,
    name: inputName.toUpperCase(),
    levels: [
      { level: 'CELLAR', resGfa: 6000, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 6000, refuse: 0, netFloorArea: 0, energyDeduction: 0, zfa: 0, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 },
      { level: '1ST', resGfa: 6000, commGfa: 0, chaseWalls: 0, mechanical: 100, parking: 2500, bikeParking: 250, amenities: 0, corridor: 200, refuse: 100, netFloorArea: 2850, energyDeduction: 142.5, zfa: 2707.5, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 },
      { level: '2ND', resGfa: 4500, commGfa: 0, chaseWalls: 120, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 350, refuse: 20, netFloorArea: 4010, energyDeduction: 200.5, zfa: 3809.5, studio: 2, oneBr: 2, twoBr: 4, totalUnits: 8 },
      { level: '3RD', resGfa: 4500, commGfa: 0, chaseWalls: 120, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 350, refuse: 20, netFloorArea: 4010, energyDeduction: 200.5, zfa: 3809.5, studio: 2, oneBr: 2, twoBr: 4, totalUnits: 8 },
      { level: 'ROOF', resGfa: 500, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 350, corridor: 0, refuse: 0, netFloorArea: 150, energyDeduction: 7.5, zfa: 142.5, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 }
    ],
    totals: {}
  };

  currentLotData.buildings.push(newBldg);
  recalculateBuildingTotals(currentLotData.buildings.length - 1);
  renderAllBuildings();
  updateCombinedTotals();
  updateCsvPreview();
}

function deleteBuilding(bldgIdx) {
  if (currentLotData.buildings.length <= 1) {
    alert('At least one building is required in the zoning schedule.');
    return;
  }
  const bldg = currentLotData.buildings[bldgIdx];
  if (confirm(`Are you sure you want to delete ${bldg.name}?`)) {
    currentLotData.buildings.splice(bldgIdx, 1);
    renderAllBuildings();
    updateCombinedTotals();
    updateCsvPreview();
  }
}

function updateCombinedTotals() {
  const buildings = currentLotData.buildings || [];

  let totalZfa = 0;
  let totalUnits = 0;

  buildings.forEach(b => {
    if (b.totals) {
      totalZfa += Number(b.totals.zfa || 0);
      totalUnits += Number(b.totals.totalUnits || 0);
    }
  });

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
