const AirTable = require('airtable');
const { LogError } = require('./utils');
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

module.exports = {
  SetAirTableFields,
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

    const recordId = records[0].id;   //since there will only be one record
    if ( !recordId ) return LogError('Record Id not found (AirTable)');

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
        // _records.forEach( x => console.log(x.get('Job')))
      })
  }
  catch (e) {
    LogError(e)
  }

}