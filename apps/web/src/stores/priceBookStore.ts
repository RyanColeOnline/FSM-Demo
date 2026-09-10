/**
 * PriceBookStore: Pre-indexed O(1) Price Book catalog per DispatchGroupCategory.
 */

import { DispatchGroupCategory } from '@/rbac/dispatchGroups';
import { CategoryNode, PriceBookItem, BundlePartItem, BundleLaborItem } from '@/models/priceBookItem';
import { initialCategoryTree, initialProducts, initialBundleParts, initialBundleServices } from '@/data/priceBookStore';

export { initialCategoryTree, initialProducts, initialBundleParts, initialBundleServices };
export type { CategoryNode, PriceBookItem, BundlePartItem, BundleLaborItem };

class PriceBookStoreManager {
  private allCategories: CategoryNode[];
  private allProducts: PriceBookItem[];
  private indexedCategoriesByGroup: Record<DispatchGroupCategory, CategoryNode[]>;
  private indexedProductsByGroup: Record<DispatchGroupCategory, PriceBookItem[]>;

  constructor() {
    this.allCategories = initialCategoryTree;
    this.allProducts = initialProducts;
    this.indexedCategoriesByGroup = {
      appliance_techs: [],
      hvac_techs: [],
      installer: [],
      office_staff: [],
    };
    this.indexedProductsByGroup = {
      appliance_techs: [],
      hvac_techs: [],
      installer: [],
      office_staff: [],
    };
    this.rebuildIndexes();
  }

  private rebuildIndexes() {
    // 1. Appliance Techs filter
    const appProducts = this.allProducts.filter((p) => {
      const cat = (p.categoryName || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('appliance') || cat.includes('cod') || name.includes('refrigerator') || name.includes('washer') || name.includes('dryer') || name.includes('oven');
    });
    this.indexedProductsByGroup.appliance_techs = appProducts.length > 0 ? appProducts : this.allProducts;
    this.indexedCategoriesByGroup.appliance_techs = this.allCategories.filter((c) => {
      const n = c.name.toLowerCase();
      return n.includes('appliance') || n.includes('cod') || n.includes('warranty');
    });

    // 2. HVAC Techs filter
    const hvacProducts = this.allProducts.filter((p) => {
      const cat = (p.categoryName || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('hvac') || cat.includes('split') || name.includes('heat pump') || name.includes('air conditioner') || name.includes('condenser');
    });
    this.indexedProductsByGroup.hvac_techs = hvacProducts.length > 0 ? hvacProducts : this.allProducts;
    this.indexedCategoriesByGroup.hvac_techs = this.allCategories.filter((c) => {
      const n = c.name.toLowerCase();
      return n.includes('hvac') || n.includes('heat') || n.includes('maint');
    });

    // 3. Installer filter
    const instProducts = this.allProducts.filter((p) => {
      const cat = (p.categoryName || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return cat.includes('install') || cat.includes('equip') || name.includes('split') || name.includes('air handler');
    });
    this.indexedProductsByGroup.installer = instProducts.length > 0 ? instProducts : this.allProducts;
    this.indexedCategoriesByGroup.installer = this.allCategories.filter((c) => {
      const n = c.name.toLowerCase();
      return n.includes('install') || n.includes('equip') || n.includes('hvac');
    });

    // 4. Office Staff (Full catalog)
    this.indexedProductsByGroup.office_staff = [...this.allProducts];
    this.indexedCategoriesByGroup.office_staff = [...this.allCategories];
  }

  public getCategoryTreeForGroup(group: DispatchGroupCategory): CategoryNode[] {
    return this.indexedCategoriesByGroup[group] || this.allCategories;
  }

  public getProductsForGroup(group: DispatchGroupCategory): PriceBookItem[] {
    return this.indexedProductsByGroup[group] || this.allProducts;
  }

  public getAllCategories(): CategoryNode[] {
    return this.allCategories;
  }

  public getAllProducts(): PriceBookItem[] {
    return this.allProducts;
  }

  public searchProducts(query: string, group?: DispatchGroupCategory): PriceBookItem[] {
    const list = group ? this.getProductsForGroup(group) : this.allProducts;
    if (!query || query.trim() === '') return list;
    const lower = query.toLowerCase().trim();
    return list.filter((item) => {
      return (
        item.name.toLowerCase().includes(lower) ||
        item.sku.toLowerCase().includes(lower) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(lower)) ||
        (item.description && item.description.toLowerCase().includes(lower))
      );
    });
  }
}

export const PriceBookStore = new PriceBookStoreManager();
