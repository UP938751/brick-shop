// TODO: rename file?
import sqlite from 'sqlite';
import uuid from 'uuid-random'

async function init() {
  const db = await sqlite.open('./db.sqlite', { verbose: true });
  await db.migrate({ migrationsPath: './server/migrations-sqlite' });
  return db;
}

const dbConn = init();

export async function filterColour(colour) {
  const db = await dbConn;
  return db.all('SELECT * FROM Product WHERE Colour = ? ORDER BY UnitsInStock ', colour);
}

export async function findAllSingles() {
  const db = await dbConn;
  return db.all('SELECT * FROM Product ORDER BY UnitsInStock ');
}

export async function sortHighToLow(colour) {
  const db = await dbConn;
  if (colour === 'any') {
    return db.all('SELECT * FROM Product ORDER BY price DESC')
  }
  return db.all('SELECT * FROM Product WHERE Colour = ? ORDER BY price DESC', colour);
}

export async function sortLowToHigh(colour) {
  const db = await dbConn;
  if (colour === 'any') {
    return db.all('SELECT * FROM Product ORDER BY price')
  }
  return db.all('SELECT * FROM Product WHERE Colour = ? ORDER BY price', colour);
}

export async function sortMostPopular(colour) {
  const db = await dbConn;
  if (colour === 'any') {
    return db.all('SELECT * FROM Product ORDER BY UnitsInStock ')
  }
  return db.all('SELECT * FROM Product WHERE Colour = ? ORDER BY UnitsInStock ', colour);
}

export async function sortAllSingles(sort) {
  const db = await dbConn;
  if (sort === 'PriceLowtohigh') {
    return db.all('SELECT * FROM Product ORDER BY price')
  }
  else if (sort === 'PriceHightolow') {
    return db.all('SELECT * FROM Product ORDER BY price DESC')
  }
  //MostPopular
  return db.all('SELECT * FROM Product ORDER BY UnitsInStock ')
}

// LIMIT, OFFSET, QUERY ORDER BY.
// const params = new URLSearchParams(window.location.search);
// const page = params.get('page') || 0;


export async function findProduct(id) {
  const db = await dbConn;
  return db.get('SELECT * FROM Product WHERE ProductID = ?', id);
}


export async function findBonsaiProducts() {
  const db = await dbConn;
  return db.all('SELECT Product.ProductImageSrc, KitProduct.ProductQuantity FROM Product JOIN KitProduct ON Product.ProductID = KitProduct.ProductID WHERE KitProduct.KitID = ?', 'B0NS41');
}

export async function findKit(req) {
  const db = await dbConn;
  const kitID = req.params.kitID
  return db.get('SELECT * from kit where KitID = ?', kitID)
}


async function findKitPartQuantity(kitID) {
  const db = await dbConn;
  return db.all('SELECT ProductID, ProductQuantity FROM KitProduct WHERE KitID = ?',kitID)
}


export async function findAllKitIDs() {
  const db = await dbConn;
  return db.all('SELECT Kit.KitID from Kit')
}

export async function getKitPrice(req) {
  const qp = await getKitQuantityPrice(req)
  let total = 0
  Object.entries(qp).forEach(([_, product]) => 
  total += product.Price * product.ProductQuantity);
  return total
  
}

async function getKitQuantityPrice(req){
  const kitID = req.params.kitID
  const db = await dbConn;
  return db.all('SELECT Product.Price, KitProduct.ProductQuantity FROM Product JOIN KitProduct ON Product.ProductID = KitProduct.ProductID WHERE KitProduct.KitID = ?', kitID)

}


// ------------ ORDER FUNCTIONS -------------- //

export async function processOrder(req, profile){
  const userID = profile.sub;
  const customerExists = await checkUserID(userID)
  if(customerExists){
    return await createOrder(userID, req)
  }
  // Customer does not exist
  const customerID = await createCustomer(profile)
  return await createOrder(customerID, req)
}

async function checkUserID(userID){
  const db = await dbConn;
  return db.get('SELECT CustomerID FROM Customer WHERE CustomerID = ?', userID);
}

async function createOrder(customerID, req){
  const db = await dbConn;
  const orderID = uuid();
  const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const basket = new Map (JSON.parse(req.params.basket))
  const kitIDs = await findAllKitIDs()
  const kitsInBasket = await checkBasketForKit(kitIDs, basket)
  if(basket.size !==0){
    for (const [productID, quantity] of basket.entries()) {
      await insertSingleProduct(productID, quantity, orderID)
    }
  }
  if(kitsInBasket.size !== 0){
    await processKitParts(kitsInBasket, orderID, customerID, orderDate)
  }
  const stmnt = await db.run('INSERT INTO Orders VALUES(?,?,?,0)', [orderID, customerID, orderDate]);
  if (stmnt.changes === 0) throw new Error('Failed to Process Order');
  return {orderID : orderID, orderDate : orderDate}
}


async function insertSingleProduct(productID, quantity, orderID){
  const db = await dbConn;
  const orderItemID = uuid();
  const stm = await db.run('INSERT INTO OrderItem VALUES(?,?,?,?)', [orderItemID, orderID, productID, quantity])
  if (stm.changes === 0) throw new Error('Failed to Process Order');
}


async function checkBasketForKit(kitIDs, basket){
  const kitsInBasket = new Map()
  for (const [_, id] of Object.entries(kitIDs[0])) {
    if(basket.has(id)){
      //seperate individual bricks and kits
      const quantity = basket.get(id);
      kitsInBasket.set(id, quantity)
      basket.delete(id) 
    }
  }
  return kitsInBasket
}


async function processKitParts(kitsInBasket, orderID){
  const db = await dbConn;
  for (const [kitID, kitQuantity] of kitsInBasket.entries()) {
    const partQuantities = await findKitPartQuantity(kitID);
    for(const partQuantity of partQuantities){
      let productID = partQuantity.ProductID;
      let quantity = partQuantity.ProductQuantity * kitQuantity;
      await insertSingleProduct(productID, quantity, orderID);
    }
    const orderItemID = uuid(); //Generate for each kit, not each kit part
    const stmt = await db.run('INSERT INTO OrderItem VALUES(?,?,?,?)', [orderItemID, orderID, kitID, kitQuantity])
    if (stmt.changes === 0) throw new Error('Failed to Process Order');
  }
}


async function createCustomer(profile){
  const db = await dbConn;
  const customerID = profile.sub;
  const email = profile.email
  const isNamedAccount = hasGivenName(profile)
  if(isNamedAccount){
    const firstname = profile.given_name;
    const surname = profile.family_name;
    console.log(firstname);
    console.log(surname);
    const stmnt = await db.run('INSERT INTO Customer VALUES (?, ?, ?, ?)',[customerID, email, firstname, surname])
    if (stmnt.changes === 0) throw new Error('Failed to Register');
  } else{
    const stmnt = await db.run('INSERT INTO Customer VALUES (?, ?, ?, ?)',[customerID, email, null, null])
    if (stmnt.changes === 0) throw new Error('Failed to Register');
  }
  console.log("Customer Created")
  return customerID
}

function hasGivenName(profile){
  return profile.given_name !== undefined
  //google-oauth2 has given_name and family_name
  //auth0 does not
}



async function decreaseProductStock(productID, quantity, orderDate, userID){
  const db = await dbConn;
  const stmnt = await db.get('SELECT UnitsInStock FROM Product WHERE ProductID = ?', productID);
  const oldStock = stmnt.UnitsInStock;
  if(quantity > oldStock){
    const updateStatement = await db.run('UPDATE Product SET UnitsInStock = 0 WHERE ProductID = ?', productID);
    throw new Error('Quantity exceeds stock level')   
  }
  const newStock = oldStock - quantity;
  const updateStatement = await db.run('UPDATE Product SET UnitsInStock = ? WHERE ProductID = ?', [newStock, productID]);
  // if nothing was updated, the productID doesn't exist
  if (updateStatement.changes === 0) throw new Error('product not found');
  console.log(productID,"old stock:",oldStock);
  console.log(productID,"new stock:",newStock);
  return {oldStock: oldStock, newStock:newStock};
}



// --------------------- ADMIN ----------------------------- //

export async function addProduct(req){
  const db = await dbConn;
  const id = uuid()
  req.file.path = req.file.path.replace(/\\/g, "/") //if windows
  req.file.path = req.file.path.replace('public/','') //remove 'public' so path is relative to client
  const product = {
    ProductID: id,
    ProductName : req.body.name,
    Colour : req.body.colour,
    CategoryName : req.body.category,
    Price : req.body.price,
    UnitsInStock : req.body.stock,
    ProductDesc : req.body.desc,
    ProductImageSrc: req.file.path
   }
  await db.run('INSERT INTO Product VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  [product.ProductID, 
    product.ProductName, 
    product.Colour, 
    product.CategoryName, 
    product.Price, 
    product.UnitsInStock, 
    product.ProductDesc, 
    product.ProductImageSrc
  ]);
  console.log(product);
  return product
}

export async function listAllProducts(){
  const db = await dbConn;
  return db.all('SELECT * FROM Product ORDER BY ProductName'); 
}

export async function listOpenOrders(){
  const db = await dbConn;
  return db.all('SELECT * FROM Orders WHERE Dispatched = 0 ORDER BY OrderDate DESC'); 
}

export async function listCustomerOrders(req){
  const db = await dbConn;
  const userID = req.params.userID;
  return db.all('SELECT Orders.OrderID, Product.ProductName, Product.Colour, OrderItem.Quantity, Orders.OrderDate FROM OrderItem JOIN Orders ON Orders.OrderID = OrderItem.OrderID JOIN Product ON OrderItem.ProductID = Product.ProductID JOIN Customer ON Orders.CustomerID = Customer.CustomerID WHERE Customer.CustomerID = ? GROUP BY OrderItem.OrderItemID ORDER BY OrderDate DESC', userID) 
}

export async function adminIncreaseProductStock(req){
  const productID = req.params.id;
  const quantity = parseInt(req.params.quantity);
  const result = await increaseProductStock(productID, quantity);
  if (!result){
    throw new Error('Stock update Failed')
  }
  return result;
}

export async function adminDecreaseProductStock(req){
  const productID = req.params.id;
  const quantity = parseInt(req.params.quantity);
  const result = await decreaseProductStock(productID, quantity);
  if (!result){
    throw new Error('Stock update Failed');
  }
  return result;
}

export async function adminSetProductStock(req){
  const productID = req.params.id;
  const quantity = parseInt(req.params.quantity);
  // const result = await setProductStock(productID, quantity);
  
  const db = await dbConn;
  const newStock = quantity;
  //TODO: display current stock to user or remove stmt + oldStock
  const stmnt = await db.get('SELECT UnitsInStock FROM Product WHERE ProductID = ?', productID);
  const oldStock = stmnt.UnitsInStock;
  const updateStatement = await db.run('UPDATE Product SET UnitsInStock = ? WHERE ProductID = ?', [newStock, productID]);
  // if nothing was updated, the productID doesn't exist
  if (updateStatement.changes === 0) throw new Error('Stock update failed');
  // console.log(productID,"old stock:",oldStock);
  // console.log(productID,"new stock:",newStock);
  return {oldStock: oldStock, newStock:newStock};
}

async function increaseProductStock(productID, quantity){
  const db = await dbConn;
  const stmnt = await db.get('SELECT UnitsInStock FROM Product WHERE ProductID = ?', productID);
  const oldStock = stmnt.UnitsInStock;
  const newStock = oldStock + quantity;
  const updateStatement = await db.run('UPDATE Product SET UnitsInStock = ? WHERE ProductID = ?', [newStock, productID]);
  // if nothing was updated, the productID doesn't exist
  if (updateStatement.changes === 0) throw new Error('product not found');
  return {oldStock: oldStock, newStock:newStock};
}

export async function deleteProduct(req){
  const db = await dbConn;
  const id = req.params.id
  const product = await findProduct(id) //TODO: check why find
  const statement = await db.run('DELETE FROM Product WHERE ProductID = ?', id)
  //ID does not exist if no changes are made
  if (statement.changes === 0) throw new Error('Product not found');
  return product
}
export async function orderDispatched(req){
  const db = await dbConn;
  const orderID = req.params.orderID;
  const statement = await db.run('UPDATE Orders SET Dispatched = 1 WHERE OrderID = ?', orderID)
  //ID does not exist if no changes are made
  if (statement.changes === 0) throw new Error('Order not found');
  return orderID
}