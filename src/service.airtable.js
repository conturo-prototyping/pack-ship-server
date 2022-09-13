

module.exports = {
  test,
  SetAirTableField,
}

const AirTable = require('airtable')
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

// console.log(AIRTABLE_API_KEY)

async function test(){
  console.log(AIRTABLE_API_KEY);
};


async function SetAirTableField(calcItemId, field, value) {
  try {
      //setup airtable
    // console.clear();
    const base = new AirTable({ apiKey: AIRTABLE_API_KEY })
      .base(AIRTABLE_BASE_ID);

    // const query = { maxRecords: 5 }
    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        // filterByFormula: `Job = 'KA1028'`     //for testing    //works
        // filterByFormula: `'ShopQ Item Id' = '${calcItemId}'`   //does not work
        // filterByFormula: `ShopQ Item Id = '6318e85175dc3d451445028a'`    //does not work
        // filterByFormula: `SEARCH('6318e85175dc3d451445028a', {ShopQ Item Id})`    //this works
        filterByFormula: `SEARCH('${calcItemId}', {ShopQ Item Id})` 
      })
      .all()

    console.log(base)
    console.log(records.length)

    const recordId = records[0].id;   //since there will only be one record
    console.log(recordId)


    //UPDATE RECORD
    base(AIRTABLE_TABLE_NAME)
      .update([
        // { 'id': `recZRTApgvf66lY7v`,
        { 
          'id': recordId,
          'fields': {
            [field]: value
          } 
        }
      ], function (err, records) {
        if (err) {
          console.log('error updateing');   //TODO: might need to handle this error differently
          return;
        }
        records.forEach( x => console.log(x.get('Job')))
      })

    // records.forEach( x => {
    //   console.log('-----------------  --------------------------');
    //   // console.log(x.fields)
    //   // console.log(x) 
    //   console.log(x.id) 
    //   console.log('-----------------  --------------------------');
    // } )
  }
  catch (e) {
    console.log(e)
  }

}