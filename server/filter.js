import fetchProducts from '../public/main.js';

export async function filterColour(colour) {
  const filteredProducts = [];
  const products = await fetchProducts();
  products.forEach(product => {
    if (product.colour === colour) {
      filteredProducts.push(product);
    }
  });
  return filteredProducts;
}