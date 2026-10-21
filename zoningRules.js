// NYC Zoning Reference Data & Helper Rules
// Includes City of Yes for Housing Opportunity (UAP) standards

const DISTRICT_SPECS = {
  // Residential Districts
  'R1-1': { resFar: 0.5, uapFar: 0.5, commFar: 0, facilFar: 1.0, minBase: 'N/A', maxBase: 'N/A', maxBldg: '35\'-0"', lotCoverageCorner: 0.4, lotCoverageInterior: 0.35, uses: 'I, II' },
  'R2':   { resFar: 0.5, uapFar: 0.5, commFar: 0, facilFar: 1.0, minBase: 'N/A', maxBase: 'N/A', maxBldg: '35\'-0"', lotCoverageCorner: 0.4, lotCoverageInterior: 0.35, uses: 'I, II' },
  'R3-2': { resFar: 0.5, uapFar: 0.6, commFar: 0, facilFar: 1.0, minBase: 'N/A', maxBase: 'N/A', maxBldg: '35\'-0"', lotCoverageCorner: 0.45, lotCoverageInterior: 0.35, uses: 'I, II' },
  'R4':   { resFar: 0.75, uapFar: 0.9, commFar: 0, facilFar: 2.0, minBase: 'N/A', maxBase: 'N/A', maxBldg: '35\'-0"', lotCoverageCorner: 0.55, lotCoverageInterior: 0.45, uses: 'I, II' },
  'R5':   { resFar: 1.25, uapFar: 1.5, commFar: 0, facilFar: 2.0, minBase: '30\'-0"', maxBase: '40\'-0"', maxBldg: '45\'-0"', lotCoverageCorner: 0.60, lotCoverageInterior: 0.55, uses: 'I, II' },
  'R6':   { resFar: 2.2,  uapFar: 3.9, commFar: 0, facilFar: 4.8, minBase: '30\'-0"', maxBase: '65\'-0"', maxBldg: '125\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R6A':  { resFar: 3.0,  uapFar: 3.9, commFar: 0, facilFar: 4.8, minBase: '45\'-0"', maxBase: '65\'-0"', maxBldg: '95\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R6B':  { resFar: 2.0,  uapFar: 2.4, commFar: 0, facilFar: 2.0, minBase: '30\'-0"', maxBase: '45\'-0"', maxBldg: '55\'-0"', lotCoverageCorner: 0.8, lotCoverageInterior: 0.60, uses: 'I, II, III, IV' },
  'R7-1': { resFar: 3.44, uapFar: 4.6, commFar: 0, facilFar: 4.8, minBase: '40\'-0"', maxBase: '65\'-0"', maxBldg: '135\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R7-2': { resFar: 3.44, uapFar: 4.6, commFar: 0, facilFar: 6.5, minBase: '40\'-0"', maxBase: '65\'-0"', maxBldg: '135\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R7A':  { resFar: 4.0,  uapFar: 4.6, commFar: 0, facilFar: 4.8, minBase: '45\'-0"', maxBase: '75\'-0"', maxBldg: '105\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R7B':  { resFar: 3.0,  uapFar: 3.45, commFar: 0, facilFar: 3.0, minBase: '40\'-0"', maxBase: '65\'-0"', maxBldg: '75\'-0"', lotCoverageCorner: 0.8, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R7D':  { resFar: 4.2,  uapFar: 5.6, commFar: 0, facilFar: 4.8, minBase: '60\'-0"', maxBase: '85\'-0"', maxBldg: '115\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.65, uses: 'I, II, III, IV' },
  'R8':   { resFar: 6.02, uapFar: 7.2, commFar: 0, facilFar: 6.5, minBase: '60\'-0"', maxBase: '85\'-0"', maxBldg: '175\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },
  'R8A':  { resFar: 6.02, uapFar: 7.2, commFar: 0, facilFar: 6.5, minBase: '60\'-0"', maxBase: '85\'-0"', maxBldg: '145\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },
  'R8X':  { resFar: 6.02, uapFar: 7.2, commFar: 0, facilFar: 6.5, minBase: '60\'-0"', maxBase: '85\'-0"', maxBldg: '175\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },
  'R9':   { resFar: 7.52, uapFar: 9.0, commFar: 0, facilFar: 10.0, minBase: '60\'-0"', maxBase: '105\'-0"', maxBldg: '225\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },
  'R9A':  { resFar: 7.52, uapFar: 9.0, commFar: 0, facilFar: 10.0, minBase: '60\'-0"', maxBase: '105\'-0"', maxBldg: '175\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },
  'R10':  { resFar: 10.0, uapFar: 12.0, commFar: 0, facilFar: 10.0, minBase: '60\'-0"', maxBase: '125\'-0"', maxBldg: '255\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },
  'R10A': { resFar: 10.0, uapFar: 12.0, commFar: 0, facilFar: 10.0, minBase: '60\'-0"', maxBase: '125\'-0"', maxBldg: '235\'-0"', lotCoverageCorner: 1.0, lotCoverageInterior: 0.70, uses: 'I, II, III, IV' },

  // Commercial Districts
  'C1-1': { commFar: 1.0, resFar: null, facilFar: null, uses: 'I, II, VI' },
  'C1-2': { commFar: 1.0, resFar: null, facilFar: null, uses: 'I, II, VI' },
  'C2-1': { commFar: 2.0, resFar: null, facilFar: null, uses: 'I, II, VI, VII, VIII, IX' },
  'C2-4': { commFar: 2.0, resFar: null, facilFar: null, uses: 'I, II, VI, VII, VIII, IX' },
  'C4-2': { commFar: 3.4, resFar: 2.43, uapFar: 3.9, facilFar: 4.8, minBase: '30\'-0"', maxBase: '65\'-0"', maxBldg: '125\'-0"', uses: 'I, II, III, IV, V, VI, VII, VIII, IX' },
  'C4-4': { commFar: 3.4, resFar: 3.44, uapFar: 4.6, facilFar: 6.5, minBase: '40\'-0"', maxBase: '65\'-0"', maxBldg: '135\'-0"', uses: 'I, II, III, IV, V, VI, VII, VIII, IX' },
  'C5-5': { commFar: 15.0, resFar: 10.0, uapFar: 12.0, facilFar: 15.0, minBase: '60\'-0"', maxBase: '150\'-0"', maxBldg: 'N/A', uses: 'I, II, III, IV, V, VI, VII, VIII, IX, X' },
  'C6-4': { commFar: 10.0, resFar: 10.0, uapFar: 12.0, facilFar: 10.0, minBase: '60\'-0"', maxBase: '125\'-0"', maxBldg: 'N/A', uses: 'I, II, III, IV, V, VI, VII, VIII, IX, X' },

  // Manufacturing Districts
  'M1-1': { commFar: 1.0, resFar: 0, facilFar: 2.4, minBase: '30\'-0"', maxBase: '60\'-0"', maxBldg: '85\'-0"', uses: 'IV, V, VI, VII, VIII, IX, X, XI, XII, XVI, XVII' },
  'M1-2': { commFar: 2.0, resFar: 0, facilFar: 4.8, minBase: '30\'-0"', maxBase: '60\'-0"', maxBldg: '85\'-0"', uses: 'IV, V, VI, VII, VIII, IX, X, XI, XII, XVI, XVII' },
  'M1-4': { commFar: 2.0, resFar: 0, facilFar: 6.5, minBase: '30\'-0"', maxBase: '60\'-0"', maxBldg: '85\'-0"', uses: 'IV, V, VI, VII, VIII, IX, X, XI, XII, XVI, XVII' },
  'M1-4/R7A': { commFar: 2.0, resFar: 4.0, uapFar: 4.6, facilFar: 4.8, minBase: '45\'-0"', maxBase: '75\'-0"', maxBldg: '105\'-0"', uses: 'I, II, III, IV, V, VI, VII, VIII, IX, X' },
  'M1-5': { commFar: 5.0, resFar: 0, facilFar: 6.5, minBase: '40\'-0"', maxBase: '85\'-0"', maxBldg: '120\'-0"', uses: 'IV, V, VI, VII, VIII, IX, X, XI, XII, XVI, XVII' },
};

const SPECIAL_DISTRICT_NAMES = {
  'G': 'SPECIAL GOWANUS MIXED-USE DISTRICT',
  'DJ': 'SPECIAL DOWNTOWN JAMAICA DISTRICT',
  'LM': 'SPECIAL LOWER MANHATTAN DISTRICT',
  'HY': 'SPECIAL HUDSON YARDS DISTRICT',
  'DB': 'SPECIAL DOWNTOWN BROOKLYN DISTRICT',
  'MX': 'SPECIAL MIXED USE DISTRICT',
  'LIC': 'SPECIAL LONG ISLAND CITY MIXED USE DISTRICT',
  '125': 'SPECIAL 125TH STREET DISTRICT',
  'CO': 'SPECIAL CONEY ISLAND DISTRICT',
  'CL': 'SPECIAL CLINTON DISTRICT',
  'SRD': 'SPECIAL SOUTH RICHMOND DEVELOPMENT DISTRICT',
  'BR': 'SPECIAL BAY RIDGE DISTRICT'
};

const BOROUGH_MAP = {
  1: 'MANHATTAN',
  2: 'BRONX',
  3: 'BROOKLYN',
  4: 'QUEENS',
  5: 'STATEN ISLAND',
  'MN': 'MANHATTAN',
  'BX': 'BRONX',
  'BK': 'BROOKLYN',
  'QN': 'QUEENS',
  'SI': 'STATEN ISLAND'
};

const LOT_TYPE_MAP = {
  1: 'INTERIOR LOT',
  2: 'CORNER LOT',
  3: 'THROUGH LOT',
  4: 'INTERIOR IRREGULAR LOT',
  5: 'CORNER IRREGULAR LOT',
  6: 'THROUGH IRREGULAR LOT'
};

function resolveZoningInfo(plutoRow) {
  const boroCode = plutoRow.borocode || plutoRow.borough;
  const borough = BOROUGH_MAP[boroCode] || (boroCode ? String(boroCode).toUpperCase() : 'N/A');
  const block = plutoRow.block || '';
  const lot = plutoRow.lot || '';
  const address = plutoRow.address || 'N/A';
  const lotArea = parseFloat(plutoRow.lotarea) || 0;
  const lotFront = parseFloat(plutoRow.lotfront) || 0;
  const lotDepth = parseFloat(plutoRow.lotdepth) || 0;

  // Primary & secondary zoning
  const zoneDist1 = plutoRow.zonedist1 || '';
  const zoneDist2 = plutoRow.zonedist2 || '';
  const zoneDist3 = plutoRow.zonedist3 || '';
  const zones = [zoneDist1, zoneDist2, zoneDist3].filter(Boolean).join(', ');

  // Special district
  const spdistCode = plutoRow.spdist1 || '';
  const spDistName = SPECIAL_DISTRICT_NAMES[spdistCode] || (spdistCode ? `SPECIAL DISTRICT (${spdistCode})` : 'N/A');

  // Lot type
  const rawLotType = parseInt(plutoRow.lottype, 10);
  const lotType = LOT_TYPE_MAP[rawLotType] || (lotDepth && lotFront && lotDepth > 150 ? 'THROUGH LOT' : 'INTERIOR LOT');

  // Shallow lot
  const isShallow = lotDepth > 0 && lotDepth <= 90 ? 'YES' : 'NO';

  // Flood zone
  const hasFlood07 = plutoRow.firm07_fla && plutoRow.firm07_fla !== '0' && plutoRow.firm07_fla !== 'N';
  const hasFlood15 = plutoRow.pfirm15_fl && plutoRow.pfirm15_fl !== '0' && plutoRow.pfirm15_fl !== 'N';
  const floodZone = (hasFlood07 || hasFlood15) ? 'HIGH FLOOD RISK' : 'N/A';

  // OER Hazard (E-Designation)
  const oer = plutoRow.edesignum ? `HAZMAT (E-${plutoRow.edesignum})` : 'N/A';

  // MIH Site
  const mihOption = plutoRow.mihoption1 || plutoRow.mihoption2 || plutoRow.mihoption3 || plutoRow.mihoption4;
  const mihSite = mihOption ? `MIH (${mihOption})` : 'N/A';

  // Transit Zone
  const isTransit = plutoRow.trnstzone && plutoRow.trnstzone !== '0';
  const transitZone = isTransit ? 'INNER TRANSIT ZONE - MTA REQUIREMENT NOT APPLICABLE' : 'OUTER ZONE - STANDARD PARKING APPLIES';

  // Community Board
  const cd = plutoRow.cd ? `${borough} COMMUNITY DISTRICT ${String(plutoRow.cd).slice(-2)}` : 'N/A';
  const zoningMap = plutoRow.zonemap || 'N/A';

  // Resolve Spec
  const spec = DISTRICT_SPECS[zoneDist1] || DISTRICT_SPECS[zones] || {
    resFar: parseFloat(plutoRow.residfar) || 2.2,
    uapFar: (parseFloat(plutoRow.residfar) || 2.2) * 1.25,
    commFar: parseFloat(plutoRow.commfar) || 0,
    facilFar: parseFloat(plutoRow.facilfar) || 4.8,
    minBase: '30\'-0"',
    maxBase: '65\'-0"',
    maxBldg: '125\'-0"',
    lotCoverageCorner: 1.0,
    lotCoverageInterior: 0.65,
    uses: 'I, II, III, IV, V, VI, VII, VIII, IX'
  };

  const resFarStandard = parseFloat(plutoRow.residfar) || spec.resFar || 0;
  const resFarUap = spec.uapFar || (resFarStandard * 1.25);
  const commFar = parseFloat(plutoRow.commfar) || spec.commFar || 0;
  const facilFar = parseFloat(plutoRow.facilfar) || spec.facilFar || 0;

  const maxResZfaStd = Number((lotArea * resFarStandard).toFixed(3));
  const maxResZfaUap = Number((lotArea * resFarUap).toFixed(3));
  const maxCommZfa = Number((lotArea * commFar).toFixed(3));
  const allowedAmenitiesDeductions = Number((maxResZfaUap * 0.05).toFixed(3));
  const requiredAmenities = Number((maxResZfaUap * 0.03).toFixed(3));

  // Max Allowed Density (factor 680)
  const maxAllowedDensity = maxResZfaUap > 0 ? Math.floor(maxResZfaUap / 680) : 0;

  // Bicycle parking (1 per 2 units)
  const bikeParking = Math.ceil(maxAllowedDensity / 2);

  return {
    propertyInfo: {
      address,
      borough,
      block,
      lot,
      bbl: plutoRow.bbl,
      zoningDistrict: zones || zoneDist1 || 'N/A',
      specialZoningDistrict: spDistName,
      specialSubdistrict: 'N/A',
      totalLotArea: lotArea,
      lotFront,
      lotDepth,
      lotType,
      shallowLot: isShallow,
      mihSite,
      affordableHousingUap: resFarUap > resFarStandard ? 'YES' : 'NO',
      floodZone,
      eligibleSite: 'YES',
      oerHazard: oer,
      communityBoard: cd,
      zoningMap,
      transitZone
    },
    useRegulations: {
      usesGroupsAllowed: spec.uses || 'I, II, III, IV, V, VI, VII, VIII, IX',
      usesGroupsProposed: 'II, VI',
      streetscapeClassification: 'N/A',
      streetscapeModifications: 'N/A'
    },
    residentialFloorArea: {
      standardFar: resFarStandard,
      standardMaxZfa: maxResZfaStd,
      standardProposed: 0,
      standardRemaining: maxResZfaStd,
      uapFar: resFarUap,
      uapMaxZfa: maxResZfaUap,
      uapProposed: 0,
      uapRemaining: maxResZfaUap,
      allowedAmenitiesDeductions,
      requiredAmenities
    },
    commercialFloorArea: {
      commFar,
      maxCommZfa,
      proposed: 0,
      remaining: maxCommZfa
    },
    lotCoverage: {
      within100CornerAllowed: spec.lotCoverageCorner || 1.0,
      within100CornerProposed: 'TBD',
      beyond100CornerAllowed: spec.lotCoverageInterior || 0.65,
      beyond100CornerProposed: 'TBD',
      communityLotCoverageAllowed: 0.65,
      communityLotCoverageProposed: 'TBD'
    },
    yards: {
      frontYard: 'NOT REQUIRED',
      sideYard: 'NOT REQUIRED',
      rearYardBelow75Allowed: '10\'-0"',
      rearYardBelow75Proposed: '10\'-4"',
      rearYardAbove75Allowed: '30\'-0"',
      rearYardAbove75Proposed: 'N/A'
    },
    heightAndSetback: {
      minBase: spec.minBase || '30\'-0"',
      maxBase: spec.maxBase || '65\'-0"',
      maxBuilding: spec.maxBldg || '125\'-0"'
    },
    density: {
      maxAllowedDensity,
      proposedDensity: maxAllowedDensity
    },
    parking: {
      transitZone: isTransit ? 'SPECIAL 25-241 PARKING PROVISIONS' : 'STANDARD PROVISIONS',
      requiredAffordable: 0,
      proposedAffordable: 0,
      requiredMarketRate: isTransit ? 0 : Math.round(maxAllowedDensity * 0.5),
      proposedMarketRate: isTransit ? 0 : Math.round(maxAllowedDensity * 0.5),
      bikeParking
    }
  };
}

module.exports = {
  DISTRICT_SPECS,
  SPECIAL_DISTRICT_NAMES,
  resolveZoningInfo
};
