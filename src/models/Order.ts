import { OrderItem } from './OrderItem';

/**
 * Order status enum
 */
export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Order model representing a complete order
 */
export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Creates a new order with a unique ID
 */
export function createOrder(items: OrderItem[]): Order {
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  
  return {
    id: generateOrderId(),
    items,
    total,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
  };
}

/**
 * Generates a unique order ID
 */
function generateOrderId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.getTime().toString(36);
  return `ORD-${dateStr}-${timeStr.toUpperCase()}`;
}

/**
 * Completes an order
 */
export function completeOrder(order: Order): Order {
  return {
    ...order,
    status: OrderStatus.COMPLETED,
    completedAt: new Date(),
  };
}
