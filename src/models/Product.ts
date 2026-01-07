/**
 * Product model representing a drink item in the café menu
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category?: string;
  isAvailable: boolean;
}

/**
 * Creates a new product with a unique ID
 */
export function createProduct(
  name: string,
  price: number,
  imageUrl: string,
  category?: string
): Product {
  return {
    id: generateId(),
    name,
    price,
    imageUrl,
    category,
    isAvailable: true,
  };
}

/**
 * Generates a unique ID for products
 */
function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
