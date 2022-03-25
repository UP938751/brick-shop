/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import express from 'express';
import path from 'path';
import url from 'url';

import authConfig from './auth_config.js';

// import * as fil from './filter.js';
// import filterColour from './filter.js';

import auth0Helpers from './auth0_helper.js';

import { products } from './products.js';


const app = express();

const auth0 = auth0Helpers(authConfig);

app.get('/products', (req, res) => {
  res.json(products);
});


app.get('/admin', (req, res) => {
  res.send({
    msg: 'Accessed admin page',
  });
});

// // protect /checkout from unauthenticated users
// app.use('/api', auth0.checkJwt);

// app.get('/api/checkout', async (req, res) => {
//   await console.log('Checked Out succesfully');
// });

// this will serve the files present in /public
app.use(express.static(path.join(path.dirname(url.fileURLToPath(import.meta.url)), '../public')));

// Endpoint to serve the configuration file to client-side app.
app.get('/auth_config', (req, res) => {
  res.json(authConfig);
});

// Filter
app.get('/products/single/:colour', (req, res) => {
  const filteredProducts = filterColour(req.params.colour);
  res.json(filteredProducts);
});

// start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// TODO: async wrap?


// TODO: import from filter.js

function filterColour(colour) {
  const filteredProducts = [];
  products.forEach(product => {
    if (product.colour === colour) {
      filteredProducts.push(product);
    }
  });
  return filteredProducts;
}
