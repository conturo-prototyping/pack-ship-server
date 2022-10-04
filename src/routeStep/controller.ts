import express = require('express');
import { ExpressHandler, HTTPError } from '../utils';
const router = express.Router();
import { RouteStepModel } from './model';


module.exports = router;

//routes
router.delete('/', deleteRouteStep);



//functions
function deleteRouteStep(
  req: { body: { routeStepId: string; }; }, 
  res: any
  ) {
  ExpressHandler(
    async () => {
      const { routeStepId } = req.body;
      if ( !routeStepId ) return HTTPError('no route step id provided');

      const deletedRouteStep = await RouteStepModel.findByIdAndDelete( routeStepId );
      if ( !deletedRouteStep ) return HTTPError('no route step found');

      const data = { deletedRouteStep };
      return { data };
    },
    res,
    'deleting route step'
  );
}