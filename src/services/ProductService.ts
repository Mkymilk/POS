import type { Product } from '../models';
import { createProduct } from '../models';

const STORAGE_KEY = 'cafe_pos_products';

/**
 * Default menu items for the café
 */
const defaultProducts: Product[] = [
  {
    id: 'prod_default_001',
    name: 'Thai Tea',
    price: 45,
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=300&h=300&fit=crop',
    category: 'Tea',
    isAvailable: true,
  },
  {
    id: 'prod_default_002',
    name: 'Coffee',
    price: 50,
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_003',
    name: 'Espresso',
    price: 55,
    imageUrl: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_004',
    name: 'Cappuccino',
    price: 65,
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_005',
    name: 'Latte',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_006',
    name: 'Mocha',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_007',
    name: 'Green Tea',
    price: 40,
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=300&h=300&fit=crop',
    category: 'Tea',
    isAvailable: true,
  },
  {
    id: 'prod_default_008',
    name: 'Matcha Latte',
    price: 75,
    imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=300&h=300&fit=crop',
    category: 'Tea',
    isAvailable: true,
  },
  {
    id: 'prod_default_009',
    name: 'Iced Americano',
    price: 55,
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_010',
    name: 'Chocolate Frappe',
    price: 80,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&h=300&fit=crop',
    category: 'Frappe',
    isAvailable: true,
  },
  {
    id: 'prod_default_011',
    name: 'Caramel Macchiato',
    price: 75,
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=300&h=300&fit=crop',
    category: 'Coffee',
    isAvailable: true,
  },
  {
    id: 'prod_default_012',
    name: 'Fresh Orange Juice',
    price: 55,
    imageUrl: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=300&h=300&fit=crop',
    category: 'Juice',
    isAvailable: true,
  },
];

/**
 * ProductService - Handles all product-related operations
 */
export class ProductService {
  private products: Product[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadProducts();
  }

  /**
   * Subscribe to product changes
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
   * Load products from localStorage or use defaults
   */
  private loadProducts(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.products = JSON.parse(stored);
      } catch {
        this.products = [...defaultProducts];
        this.saveProducts();
      }
    } else {
      this.products = [...defaultProducts];
      this.saveProducts();
    }
  }

  /**
   * Save products to localStorage
   */
  private saveProducts(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products));
    this.notifyListeners();
  }

  /**
   * Get all products
   */
  getAllProducts(): Product[] {
    return [...this.products];
  }

  /**
   * Get only available products
   */
  getAvailableProducts(): Product[] {
    return this.products.filter((p) => p.isAvailable);
  }

  /**
   * Get a product by ID
   */
  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  /**
   * Add a new product
   */
  addProduct(name: string, price: number, imageUrl: string, category?: string): Product {
    const product = createProduct(name, price, imageUrl, category);
    this.products.push(product);
    this.saveProducts();
    return product;
  }

  /**
   * Update an existing product
   */
  updateProduct(id: string, updates: Partial<Omit<Product, 'id'>>): Product | undefined {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    this.products[index] = { ...this.products[index], ...updates };
    this.saveProducts();
    return this.products[index];
  }

  /**
   * Remove a product
   */
  removeProduct(id: string): boolean {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.products.splice(index, 1);
    this.saveProducts();
    return true;
  }

  /**
   * Update product price
   */
  updatePrice(id: string, newPrice: number): Product | undefined {
    return this.updateProduct(id, { price: newPrice });
  }

  /**
   * Toggle product availability
   */
  toggleAvailability(id: string): Product | undefined {
    const product = this.getProductById(id);
    if (!product) return undefined;
    return this.updateProduct(id, { isAvailable: !product.isAvailable });
  }

  /**
   * Reset to default products
   */
  resetToDefaults(): void {
    this.products = [...defaultProducts];
    this.saveProducts();
  }

  /**
   * Get unique categories
   */
  getCategories(): string[] {
    const categories = new Set(this.products.map((p) => p.category || 'Other'));
    return Array.from(categories).sort();
  }
}

// Singleton instance
export const productService = new ProductService();
