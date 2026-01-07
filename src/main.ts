import { productService, orderService } from './services';
import type { Product } from './models';

const SETTINGS_STORAGE_KEY = 'cafe_pos_settings';

interface AppSettings {
  posName: string;
  browserTitle: string;
  logoIcon: string;
}

const defaultSettings: AppSettings = {
  posName: 'Café POS',
  browserTitle: 'Café POS System',
  logoIcon: '☕',
};

/**
 * Main application class for the Café POS System
 */
class CafePOSApp {
  private currentTab: 'pos' | 'products' | 'summary' | 'settings' = 'pos';
  private editingProduct: Product | null = null;
  private settings: AppSettings = defaultSettings;

  constructor() {
    this.init();
  }

  /**
   * Initialize the application
   */
  private init(): void {
    // Load settings
    this.loadSettings();

    // Subscribe to service changes
    productService.subscribe(() => this.render());
    orderService.subscribe(() => this.render());

    // Set up event listeners
    this.setupEventListeners();

    // Apply settings
    this.applySettings();

    // Initial render
    this.render();
  }

  /**
   * Set up global event listeners
   */
  private setupEventListeners(): void {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.dataset.tab as 'pos' | 'products' | 'summary';
        this.switchTab(tabName);
      });
    });

    // Modal close buttons
    document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('cancelProduct')?.addEventListener('click', () => this.closeModal());

    // Product form submission
    document.getElementById('productForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProduct();
    });

    // Add product button
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
      this.editingProduct = null;
      this.openProductModal();
    });

    // Checkout button
    document.getElementById('checkoutBtn')?.addEventListener('click', () => this.checkout());

    // Clear cart button
    document.getElementById('clearCartBtn')?.addEventListener('click', () => this.clearCart());

    // Reset daily summary button
    document.getElementById('resetSummaryBtn')?.addEventListener('click', () => this.resetDailySummary());

    // Close modal when clicking outside
    document.getElementById('productModal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'productModal') {
        this.closeModal();
      }
    });

    // Settings form submission
    document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  }

  /**
   * Switch between tabs
   */
  private switchTab(tab: 'pos' | 'products' | 'summary' | 'settings'): void {
    this.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.classList.remove('active');
      if ((t as HTMLElement).dataset.tab === tab) {
        t.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`)?.classList.add('active');

    // Load settings form values when switching to settings tab
    if (tab === 'settings') {
      this.loadSettingsForm();
    }

    this.render();
  }

  /**
   * Main render function
   */
  private render(): void {
    this.renderProducts();
    this.renderCart();
    this.renderProductManagement();
    this.renderSalesSummary();
  }

  /**
   * Render product grid for POS
   */
  private renderProducts(): void {
    const container = document.getElementById('productGrid');
    if (!container) return;

    const products = productService.getAvailableProducts();
    
    container.innerHTML = products
      .map(
        (product) => `
        <div class="product-card" data-product-id="${product.id}">
          <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <span class="product-category">${product.category || 'Other'}</span>
            <p class="product-price">฿${product.price.toFixed(2)}</p>
          </div>
        </div>
      `
      )
      .join('');

    // Add click handlers
    container.querySelectorAll('.product-card').forEach((card) => {
      card.addEventListener('click', () => {
        const productId = (card as HTMLElement).dataset.productId;
        if (productId) {
          this.addToCart(productId);
        }
      });
    });
  }

  /**
   * Render cart
   */
  private renderCart(): void {
    const container = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');
    const itemCountElement = document.getElementById('cartItemCount');
    const checkoutBtn = document.getElementById('checkoutBtn') as HTMLButtonElement;

    if (!container || !totalElement) return;

    const cart = orderService.getCart();
    const total = orderService.getCartTotal();
    const itemCount = orderService.getCartItemCount();

    if (itemCountElement) {
      itemCountElement.textContent = itemCount.toString();
    }

    if (cart.length === 0) {
      container.innerHTML = '<div class="empty-cart">Cart is empty</div>';
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      container.innerHTML = cart
        .map(
          (item) => `
          <div class="cart-item">
            <div class="cart-item-info">
              <span class="cart-item-name">${item.product.name}</span>
              <span class="cart-item-price">฿${item.product.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-controls">
              <button class="qty-btn minus" data-product-id="${item.product.id}" data-action="decrease">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn plus" data-product-id="${item.product.id}" data-action="increase">+</button>
              <button class="remove-btn" data-product-id="${item.product.id}" data-action="remove">×</button>
            </div>
            <div class="cart-item-subtotal">฿${item.subtotal.toFixed(2)}</div>
          </div>
        `
        )
        .join('');

      if (checkoutBtn) checkoutBtn.disabled = false;

      // Add event handlers
      container.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = e.currentTarget as HTMLElement;
          const productId = target.dataset.productId;
          const action = target.dataset.action;

          if (!productId) return;

          if (action === 'increase') {
            const item = cart.find((i) => i.product.id === productId);
            if (item) {
              orderService.updateCartItemQuantity(productId, item.quantity + 1);
            }
          } else if (action === 'decrease') {
            const item = cart.find((i) => i.product.id === productId);
            if (item) {
              orderService.updateCartItemQuantity(productId, item.quantity - 1);
            }
          } else if (action === 'remove') {
            orderService.removeFromCart(productId);
          }
        });
      });
    }

    totalElement.textContent = `฿${total.toFixed(2)}`;
  }

  /**
   * Render product management table
   */
  private renderProductManagement(): void {
    const container = document.getElementById('productTableBody');
    if (!container) return;

    const products = productService.getAllProducts();

    container.innerHTML = products
      .map(
        (product) => `
        <tr class="${!product.isAvailable ? 'unavailable' : ''}">
          <td>
            <img src="${product.imageUrl}" alt="${product.name}" class="table-product-image" onerror="this.src='https://via.placeholder.com/50?text=No+Image'">
          </td>
          <td>${product.name}</td>
          <td>${product.category || 'Other'}</td>
          <td>฿${product.price.toFixed(2)}</td>
          <td>
            <span class="status-badge ${product.isAvailable ? 'available' : 'unavailable'}">
              ${product.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </td>
          <td class="actions-cell">
            <button class="action-btn edit-btn" data-product-id="${product.id}" title="Edit">
              ✏️
            </button>
            <button class="action-btn toggle-btn" data-product-id="${product.id}" title="Toggle Availability">
              ${product.isAvailable ? '🔒' : '🔓'}
            </button>
            <button class="action-btn delete-btn" data-product-id="${product.id}" title="Delete">
              🗑️
            </button>
          </td>
        </tr>
      `
      )
      .join('');

    // Add event handlers
    container.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId) {
          this.editProduct(productId);
        }
      });
    });

    container.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId) {
          productService.toggleAvailability(productId);
        }
      });
    });

    container.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const productId = (btn as HTMLElement).dataset.productId;
        if (productId) {
          this.deleteProduct(productId);
        }
      });
    });
  }

  /**
   * Render sales summary
   */
  private renderSalesSummary(): void {
    const summary = orderService.getDailySalesSummary();

    // Update summary cards
    const revenueElement = document.getElementById('totalRevenue');
    const ordersElement = document.getElementById('totalOrders');

    if (revenueElement) {
      revenueElement.textContent = `฿${summary.totalRevenue.toFixed(2)}`;
    }

    if (ordersElement) {
      ordersElement.textContent = summary.totalOrders.toString();
    }

    // Update product sales table
    const tableBody = document.getElementById('salesTableBody');
    if (tableBody) {
      const salesArray = Array.from(summary.productSales.entries());

      if (salesArray.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-table">No sales today</td></tr>';
      } else {
        tableBody.innerHTML = salesArray
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .map(
            ([_, data]) => `
            <tr>
              <td>${data.name}</td>
              <td>${data.quantity}</td>
              <td>฿${(data.revenue / data.quantity).toFixed(2)}</td>
              <td>฿${data.revenue.toFixed(2)}</td>
            </tr>
          `
          )
          .join('');
      }
    }

    // Update recent orders
    const ordersContainer = document.getElementById('recentOrders');
    if (ordersContainer) {
      const todaysOrders = orderService.getTodaysOrders().slice(-10).reverse();

      if (todaysOrders.length === 0) {
        ordersContainer.innerHTML = '<div class="empty-orders">No orders today</div>';
      } else {
        ordersContainer.innerHTML = todaysOrders
          .map(
            (order) => `
            <div class="order-card">
              <div class="order-header">
                <span class="order-id">${order.id}</span>
                <span class="order-time">${new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              <div class="order-items">
                ${order.items.map((item) => `<span>${item.product.name} x${item.quantity}</span>`).join(', ')}
              </div>
              <div class="order-total">฿${order.total.toFixed(2)}</div>
            </div>
          `
          )
          .join('');
      }
    }
  }

  /**
   * Add product to cart
   */
  private addToCart(productId: string): void {
    const product = productService.getProductById(productId);
    if (product) {
      orderService.addToCart(product);
      this.showToast(`Added ${product.name} to cart`);
    }
  }

  /**
   * Clear cart
   */
  private clearCart(): void {
    if (orderService.getCart().length === 0) return;
    
    this.showConfirmToast('Are you sure you want to clear the cart?', () => {
      orderService.clearCart();
      this.showToast('Cart cleared', 'info');
    });
  }

  /**
   * Checkout
   */
  private checkout(): void {
    const cart = orderService.getCart();
    if (cart.length === 0) return;

    const total = orderService.getCartTotal();
    
    this.showConfirmToast(`Complete order for ฿${total.toFixed(2)}?`, () => {
      const order = orderService.checkout();
      if (order) {
        this.showToast(`Order ${order.id} completed!`, 'success');
      }
    });
  }

  /**
   * Open product modal for editing
   */
  private editProduct(productId: string): void {
    const product = productService.getProductById(productId);
    if (product) {
      this.editingProduct = product;
      this.openProductModal();
    }
  }

  /**
   * Open product modal
   */
  private openProductModal(): void {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('productForm') as HTMLFormElement;

    if (!modal || !form) return;

    if (this.editingProduct) {
      if (title) title.textContent = 'Edit Product';
      (form.elements.namedItem('productName') as HTMLInputElement).value = this.editingProduct.name;
      (form.elements.namedItem('productPrice') as HTMLInputElement).value = this.editingProduct.price.toString();
      (form.elements.namedItem('productImage') as HTMLInputElement).value = this.editingProduct.imageUrl;
      (form.elements.namedItem('productCategory') as HTMLInputElement).value = this.editingProduct.category || '';
    } else {
      if (title) title.textContent = 'Add New Product';
      form.reset();
    }

    modal.classList.add('active');
  }

  /**
   * Close product modal
   */
  private closeModal(): void {
    const modal = document.getElementById('productModal');
    if (modal) {
      modal.classList.remove('active');
      this.editingProduct = null;
    }
  }

  /**
   * Save product from form
   */
  private saveProduct(): void {
    const form = document.getElementById('productForm') as HTMLFormElement;
    if (!form) return;

    const name = (form.elements.namedItem('productName') as HTMLInputElement).value.trim();
    const price = parseFloat((form.elements.namedItem('productPrice') as HTMLInputElement).value);
    const imageUrl = (form.elements.namedItem('productImage') as HTMLInputElement).value.trim();
    const category = (form.elements.namedItem('productCategory') as HTMLInputElement).value.trim();

    if (!name || isNaN(price) || price <= 0) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    if (this.editingProduct) {
      productService.updateProduct(this.editingProduct.id, {
        name,
        price,
        imageUrl: imageUrl || 'https://via.placeholder.com/300?text=No+Image',
        category: category || undefined,
      });
      this.showToast('Product updated successfully', 'success');
    } else {
      productService.addProduct(name, price, imageUrl || 'https://via.placeholder.com/300?text=No+Image', category || undefined);
      this.showToast('Product added successfully', 'success');
    }

    this.closeModal();
  }

  /**
   * Delete product
   */
  private deleteProduct(productId: string): void {
    const product = productService.getProductById(productId);
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      productService.removeProduct(productId);
      this.showToast('Product deleted', 'success');
    }
  }

  /**
   * Reset daily summary
   */
  private resetDailySummary(): void {
    if (confirm('Are you sure you want to reset today\'s sales summary? This cannot be undone.')) {
      orderService.resetDailySummary();
      this.showToast('Daily summary reset', 'success');
    }
  }

  /**
   * Show toast notification
   */
  private showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Show confirmation toast with OK/Cancel buttons
   */
  private showConfirmToast(message: string, onConfirm: () => void): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast confirm';
    toast.innerHTML = `
      <div class="toast-message">${message}</div>
      <div class="toast-buttons">
        <button class="toast-btn toast-btn-cancel">Cancel</button>
        <button class="toast-btn toast-btn-ok">OK</button>
      </div>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Handle button clicks
    const okBtn = toast.querySelector('.toast-btn-ok');
    const cancelBtn = toast.querySelector('.toast-btn-cancel');

    const closeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };

    okBtn?.addEventListener('click', () => {
      closeToast();
      onConfirm();
    });

    cancelBtn?.addEventListener('click', () => {
      closeToast();
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        this.settings = { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        this.settings = { ...defaultSettings };
      }
    } else {
      this.settings = { ...defaultSettings };
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    const form = document.getElementById('settingsForm') as HTMLFormElement;
    if (!form) return;

    const posName = (form.elements.namedItem('posName') as HTMLInputElement).value.trim();
    const browserTitle = (form.elements.namedItem('browserTitle') as HTMLInputElement).value.trim();
    const logoIcon = (form.elements.namedItem('logoIcon') as HTMLInputElement).value.trim();

    this.settings = {
      posName: posName || defaultSettings.posName,
      browserTitle: browserTitle || defaultSettings.browserTitle,
      logoIcon: logoIcon || defaultSettings.logoIcon,
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    this.applySettings();
    this.showToast('Settings saved successfully', 'success');
  }

  /**
   * Load settings into form
   */
  private loadSettingsForm(): void {
    const form = document.getElementById('settingsForm') as HTMLFormElement;
    if (!form) return;

    (form.elements.namedItem('posName') as HTMLInputElement).value = this.settings.posName;
    (form.elements.namedItem('browserTitle') as HTMLInputElement).value = this.settings.browserTitle;
    (form.elements.namedItem('logoIcon') as HTMLInputElement).value = this.settings.logoIcon;
  }

  /**
   * Apply settings to the UI
   */
  private applySettings(): void {
    // Update browser title
    document.title = this.settings.browserTitle;

    // Update POS name in header
    const logoTitle = document.querySelector('.logo h1');
    if (logoTitle) {
      logoTitle.textContent = this.settings.posName;
    }

    // Update logo icon
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
      logoIcon.textContent = this.settings.logoIcon;
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CafePOSApp();
});
