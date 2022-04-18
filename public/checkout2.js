import * as main from './main.js';
// import * as auth from './auth.js';
import * as ba from './basket.js';
import * as fjs from './fetch.js';




async function renderCheckoutPage(){
  const isBasketEmpty = localStorage.getItem('basket') === null;
  if (isBasketEmpty) {
    const emptyBasketMsg = document.querySelector('#empty-checkout-msg');
    // const continueShopping = document.querySelector('#continue-shopping');
    emptyBasketMsg.textContent = 'Your basket is Empty'
    // continueShopping.innerHTML = '<a href="./index.html">Continue shopping</a>'
    return;
  }
  await renderReviewSection()
  // TODO: renderAddressSection()
  // TODO: renderPaymentMethodSection() ?
  // const buyNowBtn = document.querySelector('#buy-btn') 
}

async function renderReviewSection(){
  document.querySelector('.box-title-basket').textContent = 'Basket';
  document.querySelector('.box-title-items').textContent = `${calculateItemNumber()} items`;
  await renderReviewItems()

}

function calculateItemNumber(){
  let totalQuantity = 0
  for (const [_, quantity] of ba.basket.entries()) {
    totalQuantity += quantity
  }
  return totalQuantity
}

async function renderReviewItems(){
  const container = document.querySelector('.checkout-items-container');
  let total = 0;
  const products = await fjs.fetchAllSingles();
  for (const [itemID, quantity] of ba.basket.entries()) {
    const product = products.find(({ ProductID }) => ProductID === itemID);
    const t1 = document.querySelector('#checkout-item-template');
    const itemTemplate = t1.content.cloneNode(true);
    const img = itemTemplate.querySelector('#checkout-item-img');
    const itemName = itemTemplate.querySelector('#checkout-item-name');
    const itemPriceDOM = itemTemplate.querySelector('#checkout-item-price');
    const checkoutItemDom = itemTemplate.querySelector('.checkout-item');
    const price = product.Price / 100;
    let itemQuantityDOM = itemTemplate.querySelector('.checkout-item-quantity');
    checkoutItemDom.dataset.id = product.ProductID;
    itemName.textContent = product.ProductName;
    img.src = product.ProductImage;
    img.alt = product.ProductImage;
    itemName.textContent = product.ProductName;
    itemPriceDOM.textContent = `£${(price).toFixed(2)}`;
    itemQuantityDOM.textContent = `${quantity} x`
    total += price * quantity
    container.append(itemTemplate);
  }
  renderOrderTotal(total)
}


function renderOrderTotal(total){
  let preTotalDOM =  document.querySelector('#review-box-pre-total')
  let totalDOM = document.querySelector('.review-box-total-value')
  preTotalDOM.textContent = 'Order Total : £'
  totalDOM.textContent = total.toFixed(2);
}

function setupListeners() {
}


async function init() {
  // await auth.initializeAuth0Client();
  // await auth.updateAuthUI();
  // await auth.handleAuth0Redirect();
  await ba.initBasket();
  await renderCheckoutPage();
  setupListeners();
}

window.addEventListener('load', init);