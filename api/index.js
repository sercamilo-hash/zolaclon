const express = require('express');
const cors = require('cors');
const { resolveZoningInfo } = require('../zoningRules');
const { generateZoningAnalysisCsv, getDefaultBuildingA, getDefaultBuildingB, getDefaultZrClauses } = require('../csvExporter');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Search Address / Place / BBL via NYC Planning Labs GeoSearch API
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
      return res.json({ features: [] });
    }

    const geoUrl = `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(query)}`;
    const response = await fetch(geoUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'GeoSearch API error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search address', details: err.message });
  }
});

// 2. Fetch lot details and build Zoning Analysis from MapPLUTO Carto API
app.get('/api/lot', async (req, res) => {
  try {
    const bbl = req.query.bbl;
    if (!bbl) {
      return res.status(400).json({ error: 'BBL parameter is required' });
    }

    const sql = `SELECT *, ST_AsGeoJSON(the_geom) as geometry_geojson FROM dcp_mappluto WHERE bbl = '${bbl.replace(/[^0-9]/g, '')}'`;
    const cartoUrl = `https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(sql)}`;
    
    const response = await fetch(cartoUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Carto MapPLUTO API error' });
    }
    
    const data = await response.json();
    if (!data.rows || data.rows.length === 0) {
      return res.status(404).json({ error: `Lot with BBL ${bbl} not found in MapPLUTO` });
    }

    const plutoRow = data.rows[0];
    const resolved = resolveZoningInfo(plutoRow);

    resolved.buildingA = getDefaultBuildingA();
    resolved.buildingB = getDefaultBuildingB();
    resolved.zrClauses = getDefaultZrClauses(resolved.propertyInfo);
    resolved.rawPluto = plutoRow;

    res.json(resolved);
  } catch (err) {
    console.error('Lot resolution error:', err);
    res.status(500).json({ error: 'Failed to retrieve lot details', details: err.message });
  }
});

// 2.1 Fetch Surrounding Zoning Districts (ZoLa layer)
app.get('/api/zoning-surrounding', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const sql = `SELECT zonedist, ST_AsGeoJSON(the_geom) as geojson FROM dcp_zoning_districts WHERE ST_DWithin(the_geom, ST_SetSRID(ST_Point(${lng}, ${lat}), 4326), 0.015) LIMIT 25`;
    const cartoUrl = `https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(sql)}`;
    
    const response = await fetch(cartoUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Carto API error' });
    }
    const data = await response.json();
    res.json(data.rows || []);
  } catch (err) {
    console.error('Zoning layer error:', err);
    res.status(500).json({ error: 'Failed to load zoning layer', details: err.message });
  }
});

// 3. Export to CSV in the user's specific format
app.post('/api/export-csv', (req, res) => {
  try {
    const analysisData = req.body;
    const csvContent = generateZoningAnalysisCsv(analysisData);
    
    const filename = `ZR_PLUS_ANALYSIS_${analysisData.propertyInfo?.block || 'BLOCK'}_${analysisData.propertyInfo?.lot || 'LOT'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV Export error:', err);
    res.status(500).json({ error: 'Failed to generate CSV', details: err.message });
  }
});

module.exports = app;
