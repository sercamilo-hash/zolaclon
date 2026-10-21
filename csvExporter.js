// Exporter that creates the exact CSV structure provided by the user

function generateZoningAnalysisCsv(data) {
  const p = data.propertyInfo || {};
  const res = data.residentialFloorArea || {};
  const comm = data.commercialFloorArea || {};
  const cov = data.lotCoverage || {};
  const y = data.yards || {};
  const h = data.heightAndSetback || {};
  const d = data.density || {};
  const pk = data.parking || {};
  const bldgA = data.buildingA || getDefaultBuildingA();
  const bldgB = data.buildingB || getDefaultBuildingB();
  const clauses = data.zrClauses || getDefaultZrClauses(p);

  const lines = [];

  function row(...cols) {
    lines.push(cols.map(c => {
      if (c === undefined || c === null) return '';
      const str = String(c);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));
  }

  // Header & Section 1: Property Information
  row('', '', 'ZONING ANALYSIS');
  row();
  row('', '', 'PROPERTY INFORMATION');
  row('', '', 'BOROUGH', '', '', p.borough || 'N/A');
  row('', '', 'BLOCK', '', '', p.block || 'N/A');
  row('', '', 'LOT', '', '', p.lot || 'N/A');
  row('', '', 'ZONING DISTRICT', '', '', p.zoningDistrict || 'N/A');
  row('', '', 'SPECIAL ZONING DISTRICT', '', '', p.specialZoningDistrict || 'N/A');
  row('', '', 'SPECIAL SUBDISTRICT', '', '', p.specialSubdistrict || 'N/A');
  row('', '', 'TOTAL LOT AREA ', '', '', p.totalLotArea || 0);
  row('', '', 'LOT TYPE', '', '', p.lotType || 'INTERIOR LOT');
  row('', '', 'SHALLOW LOT', '', '', p.shallowLot || 'NO');
  row('', '', 'MIH SITE', '', '', p.mihSite || 'N/A');
  row('', '', 'FLOOD ZONE', '', '', p.floodZone || 'N/A');
  row('', '', 'ELEGIBLE SITE', '', '', p.eligibleSite || 'YES');
  row('', '', 'OER HAZARD', '', '', p.oerHazard || 'N/A');

  // Use Regulations
  row('', '', 'USE REGULATIONS');
  row('', '', '', '', '', 'ALLOWED', '', 'PROPOSED');
  row('', '', 'USES GROUPS', '', '', p.useRegulations?.usesGroupsAllowed || 'I, II, III, IV, V, VI, VII, VIII, IX', '', p.useRegulations?.usesGroupsProposed || 'II, VI');
  row('', '', 'STREETSCAPE CLASIFICATION', '', '', p.useRegulations?.streetscapeClassification || 'N/A');
  row('', '', 'STREETSCAPE MODIFICATIONS', '', '', p.useRegulations?.streetscapeModifications || 'N/A');

  // Residential Floor Area
  row('', '', 'RESIDENTIAL FLOOR AREA');
  row('', '', '', '', '', 'MAX FAR', 'MAX ZFA', 'PROPOSED', 'REMAINING');
  row('', '', 'RESIDENTIAL FLOOR AREA STANDARD', '', '', res.standardFar, res.standardMaxZfa, res.standardProposed || 0, (res.standardMaxZfa - (res.standardProposed || 0)).toFixed(3));
  row('', '', 'RESIDENTIAL FLOOR AREA STANDARD + 20%', '', '', res.uapFar, res.uapMaxZfa, res.uapProposed || 0, (res.uapMaxZfa - (res.uapProposed || 0)).toFixed(3));
  row('', '', 'ALLOWED AMENITIES DEDUCTIONS', '', '', res.allowedAmenitiesDeductions || (res.uapMaxZfa * 0.05).toFixed(3));
  row('', '', 'REQUIRED AMENITES', '', '', res.requiredAmenities || (res.uapMaxZfa * 0.03).toFixed(3));

  // Commercial Floor Area
  row('', '', 'COMMERCIAL FLOOR AREA');
  row('', '', '', '', '', 'MAX FAR', 'MAX ZFA', 'PROPOSED', 'REMAINING');
  row('', '', 'COMMERCIAL FLOOR AREA', '', '', comm.commFar, comm.maxCommZfa, comm.proposed || 0, (comm.maxCommZfa - (comm.proposed || 0)).toFixed(3));

  // Lot Coverage
  row('', '', 'LOT COVERAGE');
  row('', '', '', '', '', 'ALLOWED', '', 'PROPOSED');
  row('', '', 'RES. LOT COVERAGE WITHIN 100\' OF CORNER', '', '', cov.within100CornerAllowed || 1, '', cov.within100CornerProposed || 'TBD');
  row('', '', 'RES. LOT COVERAGE BEYOND 100\' OF CORNER', '', '', cov.beyond100CornerAllowed || 0.5, '', cov.beyond100CornerProposed || 'TBD');
  row('', '', 'COMMUINTY LOT COVERAGE', '', '', cov.communityLotCoverageAllowed || 0.65, '', cov.communityLotCoverageProposed || 'TBD');

  // Yards
  row('', '', 'YARDS');
  row('', '', '', '', '', 'REQUIRED', '', 'PROPOSED');
  row('', '', 'FRONT YARD', '', '', y.frontYard || 'NOT REQUIRED');
  row('', '', 'SIDE YARD', '', '', y.sideYard || 'NOT REQUIRED');
  row('', '', 'REAR YARD BELOW 75\'-0"', '', '', '', y.rearYardBelow75Allowed || '10\'-0"', '', y.rearYardBelow75Proposed || '10\'-4"');
  row('', '', 'REAR YARD ABOVE 75\'-0"', '', '', '', y.rearYardAbove75Allowed || '30\'-0"', '', y.rearYardAbove75Proposed || 'N/A');

  // Height and Setback
  row('', '', 'HEIGHT AND SETBACK');
  row('', '', '', '', '', 'REQUIRED', '', 'PROPOSED');
  row('', '', 'MIN BASE ', '', '', '', h.minBase || '30\'-0"', '', 'N/A');
  row('', '', 'MAX BASE ', '', '', '', h.maxBase || '65\'-0"', '', h.maxBase || '65\'-0"');
  row('', '', 'MAX BUILDING', '', '', '', h.maxBuilding || '125\'-0"', '', h.maxBase || '65\'-0"');

  // Density
  row('', '', 'DENSITY');
  row('', '', '', '', '', 'ALLOWED', '', 'PROPOSED');
  row('', '', 'MAX ALLOWED DENSITY ', '', '', d.maxAllowedDensity || 0, '', d.proposedDensity || d.maxAllowedDensity || 0);

  // Parking
  row('', '', 'PARKING');
  row('', '', '', '', '', 'REQUIRED', '', 'PROPOSED');
  row('', '', 'TRANSIT ZONE', '', '', pk.transitZone || 'SPECIAL 25-241 PARKING PROVISIONS');
  row('', '', 'REQUIRED PARKING FOR AFFORDABLE', '', '', pk.requiredAffordable || 0, '', pk.proposedAffordable || 0);
  row('', '', 'REQUIRED PARKING FOR MARKET RATE', '', '', pk.requiredMarketRate || 0, '', pk.proposedMarketRate || 0);
  row();
  row();
  row();

  // Buildings Tables (Dynamic list of buildings)
  const buildingsList = (data.buildings && data.buildings.length > 0)
    ? data.buildings
    : [data.buildingA || getDefaultBuildingA(), data.buildingB || getDefaultBuildingB()].filter(Boolean);

  let combResGfa = 0;
  let combCommGfa = 0;
  let combZfa = 0;
  let combUnits = 0;
  let combStudio = 0;
  let combOneBr = 0;
  let combTwoBr = 0;

  buildingsList.forEach(bldg => {
    const bName = bldg.name || 'BUILDING';
    row('', '', bName.toUpperCase());
    row('', '', 'LEVEL', 'RESIDENTIAL GROOS FLOOR AREA', 'COMMERCIAL GROSS FLOOR AREA', 'DEDUCTIONS', '', '', '', '', '', '', 'NET FLOOR AREA', '5% ENERGY DEDUCTION ', 'ZONING FLOOR AREA', '', 'UNIT MIX');
    row('', '', '', '', '', 'CHASE WALLS', 'MECHANICAL', 'PARKING', 'BYCICLE PARKING', 'AMENITIES', 'CORRIDOR', 'REFUSE', '', '', '', '', 'STUDIO', '1BR', '2BR', 'TOTAL');

    (bldg.levels || []).forEach(lvl => {
      row(
        '', '', lvl.level, lvl.resGfa || '', lvl.commGfa || '',
        lvl.chaseWalls || '', lvl.mechanical || '', lvl.parking || '', lvl.bikeParking || '',
        lvl.amenities || '', lvl.corridor || '', lvl.refuse || '',
        lvl.netFloorArea || '', lvl.energyDeduction || '', lvl.zfa || '', '',
        lvl.studio || '', lvl.oneBr || '', lvl.twoBr || '', lvl.totalUnits || ''
      );
    });

    const tot = bldg.totals || {};
    row(
      '', '', 'TOTALS', tot.resGfa || 0, tot.commGfa || 0,
      tot.chaseWalls || 0, tot.mechanical || 0, tot.parking || 0,
      tot.bikeParking || 0, tot.amenities || 0, tot.corridor || 0,
      tot.refuse || 0, tot.netFloorArea || 0, tot.energyDeduction || 0,
      tot.zfa || 0, '',
      tot.studio || 0, tot.oneBr || 0, tot.twoBr || 0, tot.totalUnits || 0
    );
    row();

    // Accumulate for consolidated totals
    combResGfa += Number(tot.resGfa || 0);
    combCommGfa += Number(tot.commGfa || 0);
    combZfa += Number(tot.zfa || 0);
    combUnits += Number(tot.totalUnits || 0);
    combStudio += Number(tot.studio || 0);
    combOneBr += Number(tot.oneBr || 0);
    combTwoBr += Number(tot.twoBr || 0);
  });

  // Consolidated Totals
  row('', '', 'TOTALS', combResGfa, combCommGfa, '', '', '', '', '', '', '', '', '', combZfa, '', combStudio, combOneBr, combTwoBr, combUnits);
  row('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', combUnits ? (combStudio/combUnits).toFixed(4) : 0, combUnits ? (combOneBr/combUnits).toFixed(4) : 0, combUnits ? (combTwoBr/combUnits).toFixed(4) : 0, 1);
  row('', '', '485X CALCS', Math.round(combUnits * 0.25));
  row('', '', 'MARKET UNITS', Math.round(combUnits * 0.75));
  row('', '', 'PARKING %', 0.5);
  row('', '', 'PARKING CALCS', Math.round(combUnits * 0.5));
  row('', '', 'BIKE PARKING', Math.ceil(combUnits / 2));
  row();

  // Detailed ZR Resolution Analysis Table
  row('', 'ZONING ANALYSIS');
  row('', '', 'PROPERTY INFORMATION');
  row('', 'ADDRESS:', p.address || 'N/A');
  row('', 'BLOCK:', p.block || 'N/A');
  row('', 'TAX LOTS:', p.lot || 'N/A');
  row('', 'ZONING LOT AREA:', p.totalLotArea || 0);
  row('', 'LOT TYPE:', p.lotType || 'INTERIOR LOT');
  row('', 'ZONING DISTRICT:', p.zoningDistrict || 'N/A');
  row('', 'SPECIAL ZONING DISTRICT:', p.specialZoningDistrict || 'N/A');
  row('', 'ZONING MAP:', p.zoningMap || 'N/A');
  row('', 'COMMUNITY BOARD:', p.communityBoard || 'N/A');
  row('', 'MIH SITE:', p.mihSite || 'N/A');
  row('', 'AFFORDABLE HOUSING (UAP):', p.affordableHousingUap || 'YES');
  row('', 'FLOOD ZONE:', p.floodZone || 'N/A');
  row('', 'OER:', p.oerHazard || 'N/A');
  row('', 'TRANSIT ZONE:', p.transitZone || 'INNER TRANSIT ZONE - MTA REQUIREMENT NOT APPLICABLE');
  row('', '', p.specialZoningDistrict !== 'N/A' ? p.specialZoningDistrict : 'APPLICABLE ZONING REGULATIONS');

  clauses.forEach(c => {
    row('', c.section, c.title, c.ruleText, c.complianceText);
  });

  return lines.join('\r\n');
}

function getDefaultBuildingA() {
  return {
    levels: [
      { level: 'CELLAR', resGfa: 8116.05, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 8116.05, refuse: 0, netFloorArea: 0, energyDeduction: 0, zfa: 0, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 },
      { level: '1st', resGfa: 8116.05, commGfa: 0, chaseWalls: 0, mechanical: 172.77, parking: 5718.46, bikeParking: 677.67, amenities: 0, corridor: 195.42, refuse: 326.88, netFloorArea: 1024.85, energyDeduction: 51.24, zfa: 973.61, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 },
      { level: '2nd', resGfa: 4398, commGfa: 0, chaseWalls: 145, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 417.46, refuse: 21, netFloorArea: 3814.54, energyDeduction: 190.73, zfa: 3623.81, studio: 1, oneBr: 1, twoBr: 5, totalUnits: 7 },
      { level: '3rd', resGfa: 4398, commGfa: 0, chaseWalls: 145, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 417.46, refuse: 21, netFloorArea: 3814.54, energyDeduction: 190.73, zfa: 3623.81, studio: 1, oneBr: 1, twoBr: 5, totalUnits: 7 },
      { level: '4th', resGfa: 4398, commGfa: 0, chaseWalls: 145, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 417.46, refuse: 21, netFloorArea: 3814.54, energyDeduction: 190.73, zfa: 3623.81, studio: 1, oneBr: 1, twoBr: 5, totalUnits: 7 },
      { level: '5th', resGfa: 4398, commGfa: 0, chaseWalls: 145, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 417.46, refuse: 21, netFloorArea: 3814.54, energyDeduction: 190.73, zfa: 3623.81, studio: 1, oneBr: 1, twoBr: 5, totalUnits: 7 },
      { level: '6th', resGfa: 4398, commGfa: 0, chaseWalls: 145, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 417.46, refuse: 21, netFloorArea: 3814.54, energyDeduction: 190.73, zfa: 3623.81, studio: 1, oneBr: 1, twoBr: 5, totalUnits: 7 },
      { level: '7th', resGfa: 4398, commGfa: 0, chaseWalls: 145, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 417.46, refuse: 21, netFloorArea: 3814.54, energyDeduction: 190.73, zfa: 3623.81, studio: 1, oneBr: 1, twoBr: 5, totalUnits: 7 },
      { level: 'ROOF', resGfa: 700, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 500, refuse: 0, netFloorArea: 200, energyDeduction: 10, zfa: 190, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 }
    ],
    totals: {
      resGfa: 35204.05, commGfa: 0, chaseWalls: 870, mechanical: 172.77, parking: 5718.46, bikeParking: 677.67, amenities: 0, corridor: 3200.18, refuse: 452.88, netFloorArea: 24112.10, energyDeduction: 1205.60, zfa: 22906.49,
      studio: 6, oneBr: 6, twoBr: 30, totalUnits: 42
    }
  };
}

function getDefaultBuildingB() {
  return {
    levels: [
      { level: 'CELLAR', resGfa: 11789.18, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 11789.18, refuse: 0, netFloorArea: 0, energyDeduction: 0, zfa: 0, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 },
      { level: '1st', resGfa: 1398.46, commGfa: 10390.72, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 131.46, corridor: 235.83, refuse: 119.38, netFloorArea: 911.80, energyDeduction: 45.59, zfa: 866.21, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 },
      { level: '2nd', resGfa: 7046, commGfa: 0, chaseWalls: 245, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 739.60, refuse: 42, netFloorArea: 6019.40, energyDeduction: 300.97, zfa: 5718.43, studio: 8, oneBr: 1, twoBr: 5, totalUnits: 14 },
      { level: '3rd', resGfa: 7046, commGfa: 0, chaseWalls: 245, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 739.60, refuse: 42, netFloorArea: 6019.40, energyDeduction: 300.97, zfa: 5718.43, studio: 8, oneBr: 1, twoBr: 5, totalUnits: 14 },
      { level: '4th', resGfa: 7046, commGfa: 0, chaseWalls: 245, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 739.60, refuse: 42, netFloorArea: 6019.40, energyDeduction: 300.97, zfa: 5718.43, studio: 8, oneBr: 1, twoBr: 5, totalUnits: 14 },
      { level: '5th', resGfa: 7046, commGfa: 0, chaseWalls: 245, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 739.60, refuse: 42, netFloorArea: 6019.40, energyDeduction: 300.97, zfa: 5718.43, studio: 8, oneBr: 1, twoBr: 5, totalUnits: 14 },
      { level: '6th', resGfa: 7046, commGfa: 0, chaseWalls: 245, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 739.60, refuse: 42, netFloorArea: 6019.40, energyDeduction: 300.97, zfa: 5718.43, studio: 8, oneBr: 1, twoBr: 5, totalUnits: 14 },
      { level: '7th', resGfa: 7046, commGfa: 0, chaseWalls: 245, mechanical: 0, parking: 0, bikeParking: 0, amenities: 0, corridor: 739.60, refuse: 42, netFloorArea: 6019.40, energyDeduction: 300.97, zfa: 5718.43, studio: 8, oneBr: 1, twoBr: 5, totalUnits: 14 },
      { level: 'ROOF', resGfa: 700, commGfa: 0, chaseWalls: 0, mechanical: 0, parking: 0, bikeParking: 0, amenities: 500, corridor: 0, refuse: 0, netFloorArea: 200, energyDeduction: 10, zfa: 190, studio: 0, oneBr: 0, twoBr: 0, totalUnits: 0 }
    ],
    totals: {
      resGfa: 44374.46, commGfa: 10390.72, chaseWalls: 1470, mechanical: 0, parking: 0, bikeParking: 0, amenities: 631.46, corridor: 5173.43, refuse: 371.38, netFloorArea: 37228.20, energyDeduction: 1861.41, zfa: 35366.79,
      studio: 48, oneBr: 6, twoBr: 30, totalUnits: 84
    }
  };
}

function getDefaultZrClauses(p) {
  const zone = p.zoningDistrict || 'R6';
  const lotArea = p.totalLotArea || 20892.2;
  return [
    { section: 'ZR 123-20', title: 'SPECIAL USE REGULATION', ruleText: `IN SPECIAL MIXED USE DISTRICTS, ALL USES PERMITTED IN THE DESIGNATED RESIDENCE DISTRICT (${zone}) AND DESIGNATED M1 DISTRICT SHALL BE PERMITTED.`, complianceText: `PROPOSED BUILDING IS IN AN ${zone} DISTRICT AND ALL USES ARE PERMITTED. SEE ZR 22-10` },
    { section: 'ZR 22-10', title: 'PERMITTED USES', ruleText: `IN AN ${zone} DISTRICT: USE GROUPS I, II, III, IV, V, VII, VIII`, complianceText: 'PROPOSED USE GROUP II (RESIDENCE)' },
    { section: 'ZR 42-10', title: 'PERMITTED USES', ruleText: 'USE GROUP FROM I TO X', complianceText: 'NO PROPOSED MANUFACTURING USES THEREFORE N/A' },
    { section: 'ZR 123-23', title: 'GROUND FLOOR STREETSCAPE REGULATION', ruleText: 'GROUND FLOOR LEVEL STREETSCAPE PROVISIONS IN SECTION 32-30 SHALL APPLY.', complianceText: 'SEE BELOW FOR ZR 32-30 COMPLIANCE' },
    { section: 'ZR 32-32', title: 'REGULATIONS FOR TIER B FRONTAGES', ruleText: 'MAXIMUM STREET WALL WIDTH OF ANCILLARY RESIDENTIAL USES SHALL BE LIMITED TO 50% OF GROUND FLOOR FRONTAGE OR 50 FT.', complianceText: 'LOT MEETS GROUND FLOOR ELEVATION CRITERIA' },
    { section: 'ZR 32-32', title: 'TRANSPARENCY REGULATIONS', ruleText: 'TRANSPARENT MATERIALS SHALL OCCUPY AT LEAST 50% OF THE SURFACE AREA BETWEEN 2\'-0" AND 12\'-0".', complianceText: 'PROPOSED GLAZING EXCEEDS 50% MINIMUM REQUIRED OK' },
    { section: 'ZR 123-32', title: 'ENVIRONMENTAL CONDITIONS', ruleText: 'DWELLING UNITS SHALL BE PROVIDED WITH MINIMUM 35DB(A) WINDOW WALL ATTENUATION (NOISE).', complianceText: 'PROPOSED WINDOWS HAVE MINIMUM 35dB(A)' },
    { section: 'ZR 23-12', title: 'LOT AREA AND LOT WIDTH', ruleText: 'MINIMUM REQUIRED LOT AREA IS 1,700 SF AND MINIMUM REQUIRED LOT WIDTH IS 18 FT.', complianceText: `LOT AREA IS ${lotArea} SF > 1,700 SF OK` },
    { section: 'ZR 23-22', title: 'MAXIMUM RESIDENTIAL FLOOR AREA REGULATIONS (UAP)', ruleText: `STANDARD FAR: 3.00 (${(lotArea*3.0).toFixed(2)} SF) | UAP FAR: 3.90 (${(lotArea*3.9).toFixed(2)} SF)`, complianceText: 'PROPOSED RESIDENTIAL FAR COMPLIES WITH UAP INCENTIVES' },
    { section: 'ZR 123-631', title: 'SPECIAL YARD REGULATIONS', ruleText: 'NO FRONT YARDS OR SIDE YARDS REQUIRED IN SPECIAL MIXED USE DISTRICTS.', complianceText: 'NO FRONT OR SIDE YARDS PROPOSED OK' },
    { section: 'ZR 23-344(a)', title: 'REAR YARD WITHIN 100 FT OF CORNER', ruleText: 'NO REAR YARD REQUIRED WITHIN 100 FEET OF INTERSECTION.', complianceText: 'COMPLIES WITH CORNER WAIVER' },
    { section: 'ZR 23-372', title: 'DISTANCE BETWEEN LEGALLY REQUIRED WINDOWS', ruleText: 'MINIMUM DISTANCE BETWEEN LEGALLY REQUIRED WINDOW AND ANY WALL/LOT LINE IS 20 FEET.', complianceText: 'PROPOSED DISTANCE 20\'-0" OK' },
    { section: 'ZR 23-231', title: 'FLOOR AREA PROVISION FOR AMENITIES', ruleText: 'RESIDENTIAL AMENITIES EXEMPTED UP TO 5% OF RESIDENTIAL FLOOR AREA.', complianceText: 'PROPOSED AMENITIES DEDUCTED WITHIN 5% CAP OK' },
    { section: 'ZR 23-232', title: 'FLOOR AREA PROVISIONS FOR CORRIDORS', ruleText: '50% OF CORRIDOR SPACE EXEMPTED WHERE LENGTH FROM ELEVATOR DOES NOT EXCEED 100 LINEAR FEET.', complianceText: 'ALL DWELLING ENTRANCES WITHIN 100\'-0" OF ELEVATOR CORE OK' },
    { section: 'ZR 23-233', title: 'REFUSE STORAGE AND DISPOSAL DEDUCTION', ruleText: 'EXEMPTION UP TO 3 SQUARE FEET PER DWELLING UNIT.', complianceText: 'DEDUCTION WITHIN 3 SF PER UNIT CAP OK' },
    { section: 'ZR 23-432', title: 'HEIGHT AND SETBACK REQUIREMENTS', ruleText: 'MIN BASE: 45\'-0", MAX BASE: 65\'-0", MAX BUILDING: 95\'-0" (OR 125\'-0" UNDER UAP)', complianceText: 'PROPOSED BASE AND BUILDING HEIGHT IN FULL COMPLIANCE' },
    { section: 'ZR 25-211', title: 'RESIDENTIAL PARKING REQUIREMENTS', ruleText: 'WITHIN INNER TRANSIT ZONE, NO ACCESSORY OFF-STREET PARKING REQUIRED.', complianceText: 'TRANSIT ZONE EXEMPTION APPLIED OK' },
    { section: 'ZR 25-811', title: 'ENCLOSED BICYCLE PARKING SPACES', ruleText: '1 SPACE PER 2 NEW DWELLING UNITS.', complianceText: 'PROVIDED ACCORDING TO UNIT COUNT OK' },
    { section: 'ZR 23-52', title: 'MAXIMUM NUMBER OF DWELLING UNITS', ruleText: 'RESIDENTIAL FLOOR AREA DIVIDED BY DWELLING UNIT FACTOR OF 680.', complianceText: 'TOTAL UNITS WITHIN MAXIMUM DENSITY LIMIT OK' },
    { section: 'ZR 23-63', title: 'REQUIRED RECREATION SPACE', ruleText: 'MINIMUM 3% OF RESIDENTIAL FLOOR AREA FOR MULTI-FAMILY WITH 9+ UNITS.', complianceText: 'RECREATION SPACE EXCEEDS 3% REQUIRED OK' },
    { section: 'ZR 27-10', title: 'ADMINISTRATION OF AFFORDABLE HOUSING (UAP)', ruleText: 'UNIVERSAL AFFORDABILITY PREFERENCE PROVISIONS GOVERNING BEDROOM MIX AND UNIT DISTRIBUTION.', complianceText: 'AFFORDABLE HOUSING COMPLIES WITH ZR 27-10 / UAP REQUIREMENTS' }
  ];
}

module.exports = {
  generateZoningAnalysisCsv,
  getDefaultBuildingA,
  getDefaultBuildingB,
  getDefaultZrClauses
};
