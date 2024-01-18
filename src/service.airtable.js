const AirTable = require('airtable');
const { LogError } = require('./utils');
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

// Common field names as they appear in the Operations/All POs AirTable
const FIELD_NAMES = {
  READY_TO_SHIP:  'Ready 2 Ship',
  READY_FOR_EPP:  'Ready 4 EPP',
  SHIPPED:        'Shipped'
};

module.exports = {
  SetAirTableFields,
  FIELD_NAMES,
  GetAirTableRecordsByCalcItemIds,
}

/**
 * Used to update values in AirTable by searching by calcItemId === 'ShopQ Item Id'
 * @param {String} calcItemId 
 * @param {Object} fields 
 */
async function SetAirTableFields(calcItemId, fields) {
  try {
    //setup airtable
    const base = new AirTable({ apiKey: AIRTABLE_API_KEY })
      .base(AIRTABLE_BASE_ID);

    //get record for 
    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        filterByFormula: `SEARCH('${calcItemId}', {ShopQ Item Id})` 
      })
      .all()

    const recordId = records?.[0]?.id;   //since there will only be one record
    if ( !recordId ) {
      LogError('Record Id not found (AirTable)');
      return;
    }

    //update record
    base(AIRTABLE_TABLE_NAME)
      .update([
        { 
          'id': recordId,
          'fields': fields
        }
      ], function (err, _records) {
        if (err) {
          LogError('error updating');
          return;
        }
      })
  }
  catch (e) {
    LogError(e)
  }
}

/**
 * Used to get records from AirTable
 * @param {Array} calcItemIds An array of strings for each calcItemId you want to find
 * @returns 
 */
async function GetAirTableRecordsByCalcItemIds( calcItemIds ) {
  try {
    //setup airtable
    const base = new AirTable({ apiKey: AIRTABLE_API_KEY })
      .base(AIRTABLE_BASE_ID);

    let filterByFormula = 'OR(';

    filterByFormula += calcItemIds
      .map( calcItemId => ` {ShopQ Item Id} = '${calcItemId}' ` )
      .join(',');

    filterByFormula += ')';

    const records = await base(AIRTABLE_TABLE_NAME)
      .select( { filterByFormula })
      .all();

    return [ null, records ];
  } 
  catch (e) {
    LogError(e);
    return [e];
  }
}