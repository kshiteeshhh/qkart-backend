const httpStatus = require("http-status");
const { Cart, Product, User } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const { createAdd } = require("typescript");
// const { cartService } = require(".");

// TODO: CRIO_TASK_MODULE_CART - Implement the Cart service methods

/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  const cart = await Cart.findOne({ email: user.email });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, "User does not have a cart");
  }
  return cart;
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
  const product = await Product.findOne({ _id: productId });
  if (!product) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product doesn't exist in database"
    );
  }

  let userCart = await Cart.findOne({ email: user.email });
  if (!userCart) {
    userCart = await Cart.create({
      email: user.email,
      cartItems: [
        {
          product: product,
          quantity: quantity,
        },
      ],
    });
    if (!userCart) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Internal Server Error"
      );
    }
    await userCart.save();
    return userCart;
  }
  const itemArray = userCart.cartItems;
  const item = itemArray.find((ele) => {
    return ele.product._id == productId;
  });
  if (item) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product already in cart. Use the cart sidebar to update or remove product from cart"
    );
  }
  userCart.cartItems.push({
    product: product,
    quantity: quantity,
  });
  await userCart.save();
  return userCart;
};
/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
  const cart = await Cart.findOne({ email: user.email });
  if (!cart) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User does not have a cart. Use POST to create cart and add a product"
    );
  }
  const product = await Product.findOne({ _id: productId });
  if (!product) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Product doesn't exist in database"
    );
  }
  const itemArray = cart.cartItems;
  const item = itemArray.find((ele) => ele.product._id == productId);
  if (!item) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
  }
  let idx = itemArray.indexOf(item);
  cart.cartItems[idx].quantity = quantity;
  await cart.save();
  return cart;
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  const cart = await Cart.findOne({ email: user.email });
  if (!cart) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User does not have a cart. Use POST to create cart and add a product"
    );
  }
  const itemArray = cart.cartItems;
  const item = itemArray.find((ele) => ele.product._id == productId);
  if (!item) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Product not in cart");
  }
  let idx = itemArray.indexOf(item);
  console.log("old array",itemArray);
  cart.cartItems.splice(idx, 1);
  console.log("new cart Items",cart.cartItems);
  await cart.save();
  return cart;
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  const cart=await Cart.findOne({email:user.email});
  if(!cart)
  {throw new ApiError(httpStatus.NOT_FOUND,"User does not have a cart");}
  if(cart.cartItems.length===0)
  {throw new ApiError(httpStatus.BAD_REQUEST,"User cart is empty")}
  
  if(!await user.hasSetNonDefaultAddress())
  {throw new ApiError(httpStatus.BAD_REQUEST,"Default address is not set")}
  if(!user.walletMoney)
  {throw new ApiError(httpStatus.BAD_REQUEST,"Insufficient balance")}
  let sum=0;
  cart.cartItems.forEach(ele=>{
    sum+=ele.product.cost*ele.quantity;
  })
  user.walletMoney-=sum;
  cart.cartItems=[];
  // console.log("Cart in cart.service",cart);
  await cart.save();
  // return cart;
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
