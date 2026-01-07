import type { Order, OrderItem, Product } from '../models';
import { OrderStatus, createOrder, completeOrder, createOrderItem, updateOrderItemQuantity } from '../models';

const ORDERS_STORAGE_KEY = 'cafe_pos_orders';
const CART_STORAGE_KEY = 'cafe_pos_cart';

/**
 * Daily sales summary interface
 */
export interface DailySalesSummary {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  productSales: Map<string, { name: string; quantity: number; revenue: number }>;
}

/**
 * OrderService - Handles cart and order operations
 */
export class OrderService {
  private cart: OrderItem[] = [];
  private orders: Order[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadCart();
    this.loadOrders();
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Load cart from localStorage
   */
  private loadCart(): void {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        this.cart = JSON.parse(stored);
      } catch {
        this.cart = [];
      }
    }
  }

  /**
   * Save cart to localStorage
   */
  private saveCart(): void {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cart));
    this.notifyListeners();
  }

  /**
   * Load orders from localStorage
   */
  private loadOrders(): void {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.orders = parsed.map((order: Order) => ({
          ...order,
          createdAt: new Date(order.createdAt),
          completedAt: order.completedAt ? new Date(order.completedAt) : undefined,
        }));
      } catch {
        this.orders = [];
      }
    }
  }

  /**
   * Save orders to localStorage
   */
  private saveOrders(): void {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(this.orders));
    this.notifyListeners();
  }

  // ============ CART OPERATIONS ============

  /**
   * Get current cart items
   */
  getCart(): OrderItem[] {
    return [...this.cart];
  }

  /**
   * Get cart total
   */
  getCartTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  /**
   * Get cart item count
   */
  getCartItemCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Add item to cart
   */
  addToCart(product: Product, quantity: number = 1): void {
    const existingIndex = this.cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex !== -1) {
      // Update existing item
      const existing = this.cart[existingIndex];
      this.cart[existingIndex] = updateOrderItemQuantity(existing, existing.quantity + quantity);
    } else {
      // Add new item
      this.cart.push(createOrderItem(product, quantity));
    }

    this.saveCart();
  }

  /**
   * Remove item from cart
   */
  removeFromCart(productId: string): void {
    this.cart = this.cart.filter((item) => item.product.id !== productId);
    this.saveCart();
  }

  /**
   * Update item quantity in cart
   */
  updateCartItemQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const index = this.cart.findIndex((item) => item.product.id === productId);
    if (index !== -1) {
      this.cart[index] = updateOrderItemQuantity(this.cart[index], quantity);
      this.saveCart();
    }
  }

  /**
   * Clear the cart
   */
  clearCart(): void {
    this.cart = [];
    this.saveCart();
  }

  // ============ ORDER OPERATIONS ============

  /**
   * Checkout - Create order from cart
   */
  checkout(): Order | null {
    if (this.cart.length === 0) {
      return null;
    }

    const order = createOrder([...this.cart]);
    const completedOrder = completeOrder(order);
    this.orders.push(completedOrder);
    this.saveOrders();

    this.clearCart();
    return completedOrder;
  }

  /**
   * Get all orders
   */
  getAllOrders(): Order[] {
    return [...this.orders];
  }

  /**
   * Get orders for a specific date
   */
  getOrdersByDate(date: Date): Order[] {
    const dateStr = date.toISOString().slice(0, 10);
    return this.orders.filter((order) => {
      const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
      return orderDate === dateStr;
    });
  }

  /**
   * Get today's orders
   */
  getTodaysOrders(): Order[] {
    return this.getOrdersByDate(new Date());
  }

  /**
   * Get daily sales summary
   */
  getDailySalesSummary(date: Date = new Date()): DailySalesSummary {
    const orders = this.getOrdersByDate(date);
    const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED);

    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = productSales.get(item.product.id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSales.set(item.product.id, {
            name: item.product.name,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }
      });
    });

    return {
      date: date.toISOString().slice(0, 10),
      totalRevenue: completedOrders.reduce((sum, order) => sum + order.total, 0),
      totalOrders: completedOrders.length,
      productSales,
    };
  }

  /**
   * Reset daily summary (clear today's orders)
   */
  resetDailySummary(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.orders = this.orders.filter((order) => {
      const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
      return orderDate !== today;
    });
    this.saveOrders();
  }

  /**
   * Clear all orders
   */
  clearAllOrders(): void {
    this.orders = [];
    this.saveOrders();
  }

  /**
   * Get order by ID
   */
  getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }
}

// Singleton instance
export const orderService = new OrderService();
