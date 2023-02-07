const WorkOrderPO = require("./model");
const { HTTPError, LogError } = require("../utils");

module.exports = { CreateNewWorkOrderPO };

async function GetNewWorkOrderPONumber() {
  const latestWO = await WorkOrderPO.find()
    .limit(1)
    .sort({ PONumber: -1 })
    .collation({ locale: "en_US", numericOrdering: true });

  const addOne = (poNum) => {
    return parseInt(poNum.slice(3)) + 1;
  };

  return latestWO.length > 0 ? `WO-${addOne(latestWO[0].PONumber)}` : "WO-1";
}

async function CreateNewWorkOrderPO(PONumber, createdBy, lines) {
  try {
    const workOrderPO = new WorkOrderPO({
      PONumber: await GetNewWorkOrderPONumber(),
      createdBy,
      lines,
    });

    await workOrderPO.save();

    return [, { workOrderPO }];
  } catch (error) {
    LogError(error);
    return [HTTPError("Unexpected error creating WorkOrder PO.")];
  }
}
