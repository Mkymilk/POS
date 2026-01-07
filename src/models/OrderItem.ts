import { Product } from './Product';

/**
 * OrderItem model representing a single item in an order
 */
export interface OrderItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

/**
 * Creates an order item from a product
 */
export function createOrderItem(product: Product, quantity: number = 1): OrderItem {
  return {
    product,
    quantity,
    subtotal: product.price * quantity,
  };
}

/**
 * Updates the quantity of an order item and recalculates subtotal
 */
export function updateOrderItemQuantity(item: OrderItem, newQuantity: number): OrderItem {
  return {
    ...item,
    quantity: newQuantity,
    subtotal: item.product.price * newQuantity,
  };
}
