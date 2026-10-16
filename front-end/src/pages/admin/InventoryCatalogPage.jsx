'use strict';

import { useState } from 'react';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/layout/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchToolbar from '../../components/ui/SearchToolbar.jsx';
import { toast, confirm } from '../../components/feedback/feedback.js';
import ItemDialog from './ItemDialog.jsx';

/** Ported from Admin/screen-03-inventory.html + inventory-catalog.js. */
export default function InventoryCatalogPage() {
  useDocumentTitle('Inventory Catalog | Federico Hospital Admin');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const { data, reload } = useApi(() => api.inventory.items.list(), []);
  const items = data || [];

  const lowStock = items.filter((i) => i.stock_quantity < i.reorder_level).length;
  const uniqueCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();

  const filteredItems = items.filter((item) => {
    const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    if (!matchCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.item_name && item.item_name.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  async function deleteItem(itemId) {
    const item = items.find((i) => i.item_id === itemId);
    if (!item) return;
    const ok = await confirm({
      title: 'Delete ' + item.item_name + '?',
      body: "This removes it from HOM's inventory screen entirely. This cannot be undone.",
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.inventory.items.remove(itemId);
      toast(item.item_name + ' deleted.', 'warning');
      await reload();
    } catch (err) {
      toast(err.message || 'Could not delete this item.', 'error');
    }
  }

  return (
    <main className="dashboard-container">
      <PageHeader
        title="Inventory Catalog"
        subtitle="Add or remove the item types HOM can track stock and log usage against. Every hospital starts with a standard supply catalog."
        actions={
          <Button variant="primary" id="new-item-btn" onClick={() => setDialogOpen(true)}>
            + Add Item
          </Button>
        }
      />

      <div className="metrics-grid" id="metrics-container">
        <StatCard
          label="Catalog Items"
          value={items.length}
          sub="Tracked non-clinical supplies"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStock}
          sub="Below designated reorder level"
          variant={lowStock > 0 ? 'error' : 'success'}
        />
        <StatCard
          label="Item Categories"
          value={uniqueCategories.length}
          sub="Medicine, consumable, equipment, linen"
          variant="info"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Catalog Items</h2>
          <p className="card-description">Deleting an item here removes it from HOM&apos;s inventory screen entirely.</p>
        </div>
        <div style={{ padding: '0 24px 16px 24px' }}>
          <SearchToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search items by name or category..."
            filters={[
              {
                id: 'category',
                value: selectedCategory,
                onChange: setSelectedCategory,
                options: [
                  { value: 'ALL', label: 'All Categories' },
                  ...uniqueCategories.map((c) => ({ value: c, label: c })),
                ],
              },
            ]}
          />
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Name</th><th>Category</th><th>Starting Stock</th><th>Reorder Level</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="items-tbody">
                <DataTable
                  items={filteredItems}
                  colspan={5}
                  emptyMessage={items.length === 0 ? "No catalog items yet." : "No matching catalog items found."}
                  renderRow={(item) => (
                    <tr key={item.item_id}>
                      <td style={{ fontWeight: 500 }}>{item.item_name}</td>
                      <td>
                        <Badge variant="neutral">{item.category}</Badge>
                      </td>
                      <td>{item.stock_quantity}</td>
                      <td>{item.reorder_level}</td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => deleteItem(item.item_id)}>Delete</Button>
                      </td>
                    </tr>
                  )}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={reload} />
    </main>
  );
}
