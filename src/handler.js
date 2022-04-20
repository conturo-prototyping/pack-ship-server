/**
 * Generic handler for shipment functions
 * @param {Function} f 
 * @param {String} msg 
 * @returns 
 */
 module.exports = async (f, msg, res) => {
  try {
    const [error, data] = await f();
    if (error) res.status( error.status ).send( error.message );
    else res.send( data );
  }
  catch (e) {
    console.error(e);
    res.status(500).send(`Unexpected error ${msg}.`);
  }
};