import Deliveries from '@/models/Deliveries.model';

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    }
  };

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  }
}

const filter = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 };
  let weight = parseInt(req.body.weight);


  // date filter: From date
  if (req.body.dateFrom) {
    if (query.hasOwnProperty('when')) {
      query.when["$gte"] = new Date(req.body.dateFrom); //Date object declatation required for aggregation
    } else {
      query.when = { "$gte": new Date(req.body.dateFrom)};
    }
  };

  // date filter: To date
  if (req.body.dateTo) {
    if (query.hasOwnProperty('when')) {
      query.when["$lte"] = new Date(req.body.dateTo); //Date object declatation required for aggregation
    } else {
      dateTo
      query.when = { "$lte": new Date(req.body.dateTo) }; 
    }
  };


  let aggregate = Deliveries.aggregate()
    .option({ allowDiskUse: true }) // if true, the MongoDB server will use the hard drive to store data during this aggregation
    .match(query) // date filters
    .lookup({ from: 'products', localField: 'products', foreignField: '_id', as: 'products' }) // populate products
    .unwind({ path: "$products" }) //construct deliveries document with each product. eg: https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/#examples
    .match({ "products.weight": { "$gte": weight } }) //least one product with weights equal or greater than the weight
    .group({ "_id": "$_id", "origin": { "$first": "$origin" }, "destination": { "$first": "$destination" }, "when": { "$first": "$when" }, "products": { "$push": "$products" } }) // group the document by _id and present the remaining filed to the response
    .facet({ // multiple aggregation pipelines within a single stage on the same set of input documents
      totalResults: [{ $count: 'count' }],
      deliveries: [{ $skip: skip }, { $limit: limit }, { $sort: sort }]
    });

  let results = await aggregate.exec();

  if (results[0].totalResults.length < 1 || results[0].totalResults[0].count < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  return results;
}

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    }
  }
}

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({ _id: req.body.id });
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find a delivery with the sent ID`
      }
    }
  }
  return delivery;
}

export default {
  find,
  filter,
  create,
  findOne
}
