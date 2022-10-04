import express = require('express');
import { ExpressHandler } from '../utils';
const router = express.Router();
import { RouteStepModel } from './model';


module.exports = router;

//routes
router.get('/', allRouteSteps);



//functions
function allRouteSteps(_req: any, res: any) {
  ExpressHandler(
    async () => {
      const routeSteps = await RouteStepModel.find()
        .lean()
        .select('category name')
        .exec();

      const data = { routeSteps };
      return { data };
    },
    res,
    'getting all routeSteps'
  );
}