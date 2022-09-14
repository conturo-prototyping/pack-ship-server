
module.exports = {
  SetAirTableFields,
}

const AirTable = require('airtable')
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

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

    //TODO: check that records are found

    const recordId = records[0].id;   //since there will only be one record

    //update record
    base(AIRTABLE_TABLE_NAME)
      .update([
        { 
          'id': recordId,
          'fields': fields
        }
      ], function (err, records) {
        if (err) {
          console.log('error updateing');   //TODO: might need to handle this error differently
          return;
        }
        records.forEach( x => console.log(x.get('Job')))
      })
  }
  catch (e) {
    console.log(e)
  }

}