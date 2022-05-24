const { HTTPError, LogError } = require('../utils');
const shopQOrder = require('./order.model');

module.exports = {
  GetOrderFulfillmentInfo
};

/**
 * Get shipping contact and PO # from GenOrder-v2
 * @param {string} orderNumber 
 */
async function GetOrderFulfillmentInfo(orderNumber) {
  try {
    const orderDoc = await shopQOrder.findOne({ orderNumber })
      .populate('content.shipping.shippingContact')
      .select('orderNumber content.billing.purchaseOrderNumber content.shipping.shippingContact')
      .lean();

    let { shippingContact } = orderDoc?.content?.shipping || {};
    const { name, address } = shippingContact || {};

    if (!shippingContact?.name) {
      return [ HTTPError('Shipping contact not set. Please contact sales rep!', 400) ];
    }

    shippingContact = { name, address };

    const data = {
      purchaseOrderNumber: orderDoc?.content?.billing?.purchaseOrderNumber,
      shippingContact,
    };

    return [null, data];
  }
  catch (e) {
    LogError(e);
    return [ HTTPError('Unexpected error fetching fulfillment info for order ' + orderNumber) ];
  }
}