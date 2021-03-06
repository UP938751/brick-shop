# Brick Shop

## File Structure

For example, pages with the home screen navbar import the 'nav.js' module, which on load will setup
all event listeners required for the navbar and auth0
initialisation.

As more functionality is added to the navbar, this module becomes
increasingly more useful as changes are easier to make. Also results in less code
as there does not need to be event listeners added in each individual module.

Similarly, my server [server.js module](https://github.com/UP938751/brick-shop/blob/main/server/server.js) heavily utilises the imported [db-helper.js module](https://github.com/UP938751/brick-shop/blob/main/server/db-helper.js) for all database operations. All function names in the server start with the type of HTTP request that invoke the function. The server then calls the necessary function for the db-helper module to perform the requested action. This seperation heavily improvements code comprehensibility highlights, using the server as the 'middleman' between the client and the database [(Client-server model)](https://en.wikipedia.org/wiki/Client%E2%80%93server_model).

## Basket

The user adds to the basket by clicking the 'Add To Basket' button on the product card, this basket Initially stored an array of product objects, however a map was the most suitable for the task as the product quantity (value)
to the product id (key).

## Database

My database of choice was [sqlite3](https://www.npmjs.com/package/sqlite3).
In the early stages of development my choice was to use [PostgreSQL](https://www.postgresql.org/) due to familiarity, however I decided to make the switch to sqlite. There were a number of reasons for this, but the main one being due to the lightweight natue of SQLite in comparison to PSQL. As SQLite is a lightweight DBMS, database operations are generally faster. The cons of SQLite such as a lack of security features / authentication are not really a hindrance for this use case

## User Registration

In order to better understand the flow of the backend database and user registration,
it is important to distinguish between a *user* and a *customer*.
In the context of ecommerce websites these two terms and generally
synonymous, however there is a conceptual difference between the
two in my implementation. A *user* is anyone who logs in to the
website, this is done through the Auth0 portal.

Upon sign up, the user is assigned a profile containing a userID (by Auth0). It is not until the user makes an order that they become a *customer* and are  [inserted into the customer table.](https://github.com/UP938751/brick-shop/blob/main/server/db-helper.js#L188-L205). Auth0 provides two methods of sign up: using username/email address and password or by using Google Oauth2. The latter provides a first name and surname whereas the former does not. This variation in the sign up process is [checked for](https://github.com/UP938751/brick-shop/blob/main/server/db-helper.js#L188-L212) and the values for the firstname and surname are inserted into the Customer table accordingly.

This implementation works well with using Auth0 as the
authentication client as it provides a smooth login and registration process since the ID provided by Auth0 is the one that is used during insertion in the Customer table.

## Kits

When a kit is purchased, the stock levels of the individual kit parts are processed during for insertion into the order table as apposed to the entire kit as a whole. The idea behind this is that the kits are essentially a collection of bricks that could otherwise be purchased indivdually.

## Orders

Orders are inserted into the Order table but stock levels are not updated. Stock will only be updated when the Admin marks an order as dispatched. I inititally implemented stock change levels on purchase but in reality stock is not affected until the products are shipped to the customer.

## Future Work

There are a few things that are still yet to be done which are currently in progress. Some have been mentioned above, but this includes:

- Currently, anyone can access the admin page. This would not be the case in a live version of the website. In my Auth0 application, I have a read:admin scopes on test admin accounts which in practice would allow onThe 'test' routes are for demo purposes and would be replaced once Auth0 scope.  
  
- The 'NEW IN' section on the home page will serve images of newly added products. This would be dome simply by making a request for all products buy with an ORDER and LIMIT 3.
  
- There would need to be tests
- DB optimisation
- Unnamed account firstname and surname

- When an admin marks an order as dispatched, the stock levels of the items in the
  order decrease.
- Styling