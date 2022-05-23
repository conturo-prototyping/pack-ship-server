const { default: axios } = require("axios");
const { NODE_ENV, SHOPQ_URL } = process.env;

module.exports = {
  GetOrderInfo,
};

/**
 * Get order info from ShopQ API
 * @param {String} orderNumber 
 */
async function GetOrderInfo(orderNumber, cookie) {
  try {

    if ( NODE_ENV === 'DEBUG' && !SHOPQ_URL ) {
      return [
        null,
        {
          shippingContact: {
            name: 'Joe Schmoe',
            address: {
              line1: '1234 Some St.',
              line2: 'Lost My Hat, NM 87121'
            }
          }
        }
      ];
    }

    const res = await axios.get(
      `${SHOPQ_URL}/api/private/v2/orders/job/${orderNumber}/packingInfo`,
      {
        withCredentials: true,
        headers: { cookie }
      }
    );

    return [null, res.data];
  }
  catch (e) {
    console.error(e);
    return [e];
  }
}