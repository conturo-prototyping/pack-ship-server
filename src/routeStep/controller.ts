import express = require('express');
import { ExpressHandler, HTTPError } from '../utils';
const router = express.Router();
import { RouteStepModel } from './model';


module.exports = router;

//routes
router.put('/', putRouteStep);



//functions
async function putRouteStep(
  req: { body: { category: string; name: string; }; }, 
  res: any
  ) {
  ExpressHandler(
    async () => {
      const { category, name } = req.body;

      if ( !category ) return HTTPError('no step category');
      if ( !name ) return HTTPError('no step name');

      const newRouteStep = new RouteStepModel( { category, name });
      await newRouteStep.save();
      
      const data = { message: 'success' };
      return { data };
    },
    res,
    'putting route step'
  );
}



