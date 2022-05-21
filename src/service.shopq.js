const { default: axios } = require("axios");

module.exports = {
  GetOrderInfo,
};

/**
 * Get order info from ShopQ API
 * @param {String} orderNumber 
 */
async function GetOrderInfo(orderNumber) {
  try {
    return [null, {}];

    const res = await axios.get(
      `https://conturo.shopq.io/api/public/v1/orders/${orderNumber}/packingInfo`,
    );

    return [null, res.data];
  }
  catch (e) {
    return [e];
  }
}