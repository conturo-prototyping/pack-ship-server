const app = require('../src/app');
const { expect } = require('chai');
const chai = require('chai');
const mongoose = require('mongoose');
const { randomInt } = require('crypto');

const Customer = require('../src/customer/model');
const PackingSlip = require('../src/packingSlip/model');
const Shipment = require('../src/shipment/model');
const WorkOrder = require('../src/workOrder/model');

chai.use( require('chai-http') );

mongoose.connect( process.env.MONGO_DB_URI + '-test' );
mongoose.connection
  .on('error', error => console.warn('Error : ', error));

describe('Mocha tests', () => {

  before(async () => {

    await Promise.all([
      Customer.deleteMany(),
      PackingSlip.deleteMany(),
      Shipment.deleteMany(),
      WorkOrder.deleteMany()
    ]);
  
    const customerOne = await Customer.create({ customerTag: 'ABC' });
  
    await WorkOrder.create(
      {
        orderNumber: 'ABC1001',
        partNumber: 'Part 1',
        quantity: 10,
        customer: customerOne._id
      },
      {
        orderNumber: 'ABC1002',
        partNumber: 'Part 2',
        quantity: 10,
        customer: customerOne._id
      }
    );
  });
  
  after( done => mongoose.connection.close(done) );

  // ----------------------------
  // -------- SHIPMENTS ---------
  // ----------------------------
  describe('Shipments', () => {
    // reset shipments before each call
    beforeEach( async () => [await PackingSlip.deleteMany(), await Shipment.deleteMany()] );

    it('Shipped packing slips should not show up in queue', async () => {
      const packingSlips = await makeDummyPackingSlips();
      await makeDummyShipments( packingSlips[0]._id );

      const res = await chai.request( app )
        .get('/shipments/queue')
        .send();

      // 1 shipped, 1 left in queue
      expect( res.body.packingSlips.length ).to.equal(1);

      // left in queue should be the one not shipped
      expect( res.body.packingSlips[0]._id ).to.equal( String(packingSlips[1]._id) );

      // left in queue should not be the one that was used to create shipment
      // NOTE: this seems dumb but it's a way to make sure that the ObjectId test is good,
      //    and not that it failed to some dumb assertion like "String != Object"
      expect( res.body.packingSlips[0]._id ).to.not.equal( String(packingSlips[0]._id) );
    });

    it ('All shipments should show up in history', async () => {
      const packingSlips = await makeDummyPackingSlips();
      await makeDummyShipments( ...packingSlips.map(x => x._id) );
  
      const res = await chai.request( app )
        .get('/shipments')
        .send();

      expect(res.body.shipments.length).to.equal(2);
    });
  });

  // ----------------------------
  // ------ PACKING SLIPS -------
  // ----------------------------

  describe('Packing Slips', () => {
    // Reset packing slips before each call
    beforeEach( async () => await PackingSlip.deleteMany() );
  
    it ('Label packingSlipIds correctly', async () => {
      const [workOrder, customer] = [await WorkOrder.findOne(), await Customer.findOne()];
      const { orderNumber } = workOrder;
      
      const r = randomInt(150);

      const arr = [];
      for (let i=0; i < r; i++) {
        arr.push({
          orderNumber,
          customer: customer._id,
          packingSlipId: ''+i,
          items: [{
            item: workOrder._id,
            qty: 1
          }]
        });
      }
      await PackingSlip.create(arr);

      const res = await chai.request(app)
        .put('/packingSlips')
        .send({
          items: [{
            item: workOrder._id,
            qty: 1
          }],
          customer: customer._id,
          orderNumber,
        });

      expect( res.body.packingSlip.packingSlipId ).to.equal(`${orderNumber}-PS${r+1}`);
    });

    it('All quantities should show up in history', async () => {
      await makeDummyPackingSlips();
  
      const res = await chai.request( app )
        .get('/packingSlips')
        .send();

      const itemsOnly = res.body.packingSlips.map(x => x.items).flat().map(x => x.qty);

      expect(itemsOnly.length).to.equal(2);
      expect( itemsOnly ).to.have.have.members([3, 23]);
    });

    it('Surplus quantities should not show up in queue', async () => {
      const packingSlips = await makeDummyPackingSlips();
  
      const res = await chai.request( app )
        .get('/workOrders/packingQueue')
        .send();

      expect(res.body.length).to.equal(1);
      expect(res.body[0]._id).to.not.equal( String(packingSlips[1].items.item) );
    });

  });

});

async function makeDummyPackingSlips() {
  const [workOrder, customer] = [
    await WorkOrder.findOne(),
    await Customer.findOne()
  ];

  const packingSlips = await PackingSlip.create({
    items: [{
      item: workOrder._id,
      qty: 3
    }],
    customer: customer._id,
    orderNumber: workOrder.orderNumber,
    packingSlipId: '1'
  }, {
    items: [{
      item: workOrder._id,
      qty: 23
    }],
    customer: customer._id,
    orderNumber: workOrder.orderNumber,
    packingSlipId: '2'
  });

  return packingSlips;
}

async function makeDummyShipments(...packingSlipIds) {
  
  
  const shipments = await Shipment.create(
    packingSlipIds.map( (x, xi) => ({
      shipmentId: ''+xi,
      manifest: x
    }))
  );

  await Promise.all(
    shipments.map(x => PackingSlip.updateOne(
      { _id: x.manifest[0] },
      { $set: { shipment: x._id } }
    ))
  );

  return shipments;
}