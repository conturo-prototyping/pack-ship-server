
const { LogError } = require('./utils');
const axios = require('axios');
const qs = require('qs');

const User = require( './user/model' );

// Common field names as they appear in the Operations/All POs AirTable
const FIELD_NAMES = {
  READY_TO_SHIP:  'Ready 2 Ship',
  READY_FOR_EPP:  'Ready 4 EPP',
  SHIPPED:        'Shipped'
};

// LEAKY_BUCKET
// ---------------------
const LEAKY_BUCKET = [];

setInterval(
  () => {
    if ( !LEAKY_BUCKET.length ) return;

    const functions = LEAKY_BUCKET.splice(0, 3);

    for ( const f of functions ) {
      f();
    }
  },
  1500
);
// ---------------------

const AIRTABLE_URL = 'https://www.airtable.com'; 
const { 
  AIRTABLE_CLIENT_ID, 
  AIRTABLE_CLIENT_SECRET, 
  AIRTABLE_BASE_ID, 
  AIRTABLE_TABLE_NAME 
} = process.env;

const ENCODED_CREDENTIALS = Buffer.from(`${AIRTABLE_CLIENT_ID}:${AIRTABLE_CLIENT_SECRET}`).toString('base64');

const AUTHORIZATION_HEADER = `Basic ${ENCODED_CREDENTIALS}`;

// used to for AT CRUD operations
const AT_TABLE_STRING = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

module.exports = {
  SetAirTableFields,
  FIELD_NAMES,
  GetAirTableRecordsByCalcItemIds,
}

/**
 * Used to update values in AirTable by searching by calcItemId === 'ShopQ Item Id'
 * @param {String} calcItemId 
 * @param {Object} fields 
 * @param {Object} user req.user
 */
async function SetAirTableFields(calcItemId, fields, user) {
  try {

    const filterByFormulaString = `filterByFormula=SEARCH('${calcItemId}', {ShopQ Item Id})`;
    const [ fetchErr, records ] = await FetchRecords( user, filterByFormulaString ); 
    if ( fetchErr ) {
      return [ fetchErr ];
    }

    const recordId = records?.[0]?.id;   //since there will only be one record
    if ( !recordId ) {
      LogError('Record Id not found (AirTable)');
      return;
    }

    //update record
    const airTableUpdates = [{
      id: recordId,
      fields
    }];
    const [ updateErr, ] = await UpdateManyRecords( user, airTableUpdates, 'Due Dates' );
    if ( updateErr ) {
      return LogError('Error updating AirTable records')
    }

  }
  catch (e) {
    LogError(e)
  }
}

/**
 * Used to get records from AirTable
 * @param {Array} calcItemIds An array of strings for each calcItemId you want to find
 * @param {Object} user req.user
 * @returns 
 */
async function GetAirTableRecordsByCalcItemIds( calcItemIds, user ) {
  try {

    let filterByFormula = 'OR(';

    filterByFormula += calcItemIds
      .map( calcItemId => ` {ShopQ Item Id} = '${calcItemId}' ` )
      .join(',');

    filterByFormula += ')';

    const filterByFormulaString = `filterByFormula=${filterByFormula}`;
    const [ fetchErr, records ] = await FetchRecords( user, filterByFormulaString ); 
    if ( fetchErr ) {
      return [ fetchErr ];
    }



    return [ null, records ];
  } 
  catch (e) {
    LogError(e);
    return [e];
  }
}

// -----------------------------------------------------------------------
// NOTE: FROM HERE DOWN ARE FUNCTIONS THAT WERE COPY PASTED FROM WORKFLOW
// IF THESE NEED TO CHANGE THEY MAY NEED TO BE CHANGED IN WORKFLOW
// MM 012624
// -----------------------------------------------------------------------

/**
 * Used to update 1 to many records. Function breaks updates down into 10 update "chuncks" due to AirTable limitations.
 * @param {Object} user req.user Object
 * @param {Array} updateArr array of updates
 * @param {String} updatingField used for logging errors
 * @param {Function?} callback 
 * @returns 
 */
async function UpdateManyRecords( user, updateArr, updatingField, callback=undefined ) {
  try {
    let { access_token, refresh_token } = user.airTable;
    const [validationErr, newTokens] = await CheckTokenValidation( user );

    if ( validationErr ) {
      return [ validationErr ];
    }

    if ( newTokens ) {
      access_token = newTokens.access_token;
      refresh_token = newTokens.refresh_token;
    }

    const bodyBatches = [];
    let batch = [];
    for ( let i = 1; i <= updateArr.length; i++ ) {
      batch.push( updateArr[i-1] );

      if ( i % 10 === 0 ) {
        bodyBatches.push( batch.slice() );
        batch = [];
      }
    }
    if ( batch.length ) bodyBatches.push( batch.slice() );

    const headers = genHeaders(access_token);
    let url = AT_TABLE_STRING;

    const chunks = [];
    while ( updateArr.length > 0 ) {
      chunks.push( updateArr.splice( 0, 10 ) );
    }

    for ( const records of chunks ) {
      LEAKY_BUCKET.push( async () => {
        try {
          await axios.patch(url, { records }, { headers } );
        } 
        catch (error) {
          LogError( error.response, `Generated while creating AirTable records in CreateRecords function for ${updatingField}.`);
        }
      } );
    }

    return [ null, null ];
  } 
  catch (error) {
    LogError(error, `Generated in UpdateManyRecords function for ${updatingField}.`);
    return [ error ];
  }
}


/**
 * used to validate if access_token isn't expired
 * @param {String} access_token 
 * @param {String} refresh_token 
 */
async function CheckTokenValidation( user ) {  
  const { access_token, refresh_token, expiresAt } = user.airTable;
  
  // quick out if before expired buffer
  if ( Date.now() < expiresAt ) return [ null, null ];
  const userId = user._id;
  try {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`   // workflow
    };

    // hit AT and handle any errors that come from it
    try {
      await axios({
        method: 'GET',
        url: AT_TABLE_STRING + '?maxRecords=1',
        headers,
      });

      return [ null, null ];
    } 
    catch ( e ) {
      // these will only be AT related errors
      const { status, data } = e.response;

      if ( status === 401 ) {
        // try refresh token
        const [ refreshErr, updatedTokens ] = await RefreshToken( refresh_token );
        if ( refreshErr ) return [ refreshErr ];

        const { 
          access_token, 
          // refresh_token, // do not destructure because this is a global var
          expires_in, 
          refresh_expires_in 
        } = updatedTokens

        const fiveMinInSec = 5 * 60;
        const now = Date.now();
        const expireTime = now + ( (expires_in - fiveMinInSec) * 1000 );
        const refreshExpireTime = now + ( (refresh_expires_in - fiveMinInSec) * 1000 );

        // update user information
        const update = {
          $set: {
            'airTable.access_token': access_token,
            'airTable.refresh_token': updatedTokens.refresh_token,
            'airTable.expiresAt': expireTime,
            'airTable.refreshExpiresAt': refreshExpireTime,
          }
        };
        await User.updateOne({_id: userId}, update);
        return [ null, updatedTokens ];
      }
      else {
        LogError( data.error, `Generated trying to check if AT auth token is still valid. Status code is ${status}.` );
        return [ data.error ];
      }
    }
  } 
  catch ( error ) {
    // this should be normal errors
    LogError( error, 'Error generated in CheckTokenValidation function.' );
    return [ error, ];
  }
}


async function RefreshToken( refreshToken ) {
  try {

    const headers = {
      // Content-Type is always required
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    headers.Authorization = AUTHORIZATION_HEADER;

    const response = await axios({
      method: 'POST',
      url: `${AIRTABLE_URL}/oauth2/v1/token`,
      headers,
      // stringify the request body like a URL query string
      data: qs.stringify({
        // client_id is optional if authorization header provided
        // required otherwise.
        client_id: AIRTABLE_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const { access_token, refresh_token, expires_in, refresh_expires_in } = response.data;
    return [ null, { access_token, refresh_token, expires_in, refresh_expires_in } ];
  } 
  catch (e) {
    let _e;
    let _msg;

    if (e.response && [400, 401].includes(e.response.status)) {
      _e = e.response?.data;
      _msg = `Error generated while refreshing AT token (unauthorized). Status code: ${e.response.status}.`;
    } 
    else if (e.response) {
      _e = e.response?.data;
      _msg = `Error generated while refreshing AT token. Status code: ${e.response.status}.`;
    } 
    else {
      _e = e;
      _msg = `Error generated while refreshing AT token. Chance it isn't related to AirTable.`;
    }
    
    LogError( _e, _msg );
    return [ e.response || e ];
  }
}

// formulate a fields string for returning specific record fields
function genFieldsString( fieldsArr ) {
  if ( fieldsArr.length === 0 ) return undefined;
  const fieldsString = fieldsArr
    .map( x => 'fields[]=' + x.replaceAll(' ', '+') )
    .join('&');
  return fieldsString;
}

function genHeaders( access_token ) {
  const headers = {
    'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`
  };
  return headers;
}


/**
 * Used to fetch records from AirTable assuming the user does not have the recordId of the job. Commonly this will be used with the {ShopQ Item Id} column.
 * @param {Object} user - req.user Object 
 * @param {String} filterByFormulaString 
 * @param {Array} fieldsArr - array of field names
 * @returns 
 */
async function FetchRecords( 
  user,
  filterByFormulaString=undefined, 
  fieldsArr=[] 
  ) {
  try {

    const [validationErr, newTokens] = await CheckTokenValidation( user );
    if ( validationErr ) return [ validationErr ];

    const access_token = ( newTokens )
      ? newTokens.access_token
      : user.airTable.access_token;

    const fieldsString = ( fieldsArr )
      ? genFieldsString( fieldsArr )
      : undefined;
    
    const headers = genHeaders(access_token);
    let url = AT_TABLE_STRING;
    if ( fieldsString && filterByFormulaString ) {
      url += `?${fieldsString}&${filterByFormulaString}`;
    }
    else if ( fieldsString || filterByFormulaString ) {
      url += `?${( fieldsString ) ? fieldsString : filterByFormulaString}`;
    }


    const response = await axios.get( url, { headers } );

    // create an array of records since we might have to hit the AT API several times
    const records = response.data.records.map( x => x );

    // because AT limits max of 100 records per page we need to make sure we are not capped
    // AT give a data.offset string that needs passed as a param on the next query
    let offset = response?.data?.offset;
    let count = 1
    while ( !!offset ) {

      const params = {
        pageSize: 100,
        offset
      };

      const _response = await axios.get(url, { params, headers} );
      _response?.data?.records.forEach( r => records.push( r ) );
      offset = _response?.data?.offset;
      count++;
    }

    return [ null, records ];
  } 
  catch (error) {
    const _e = error?.response || error;
    LogError( _e, 'Error from FetchRecords helper.' );
    return [ _e ];
  }
}