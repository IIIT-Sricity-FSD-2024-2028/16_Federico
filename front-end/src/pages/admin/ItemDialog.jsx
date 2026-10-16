'use strict';

import { useState } from 'react';
import DialogShell from '../../components/layout/DialogShell.jsx';
import Button from '../../components/ui/Button.jsx';
import { api } from '../../api/index.js';
import { toast } from '../../components/feedback/feedback.js';

/** Ported from the #item-dialog <dialog> in Admin/screen-03-inventory.html. */
const BLANK = { item_name: '', category: 'Medication', stock_quantity: '', reorder_level: '' };

export default function ItemDialog({ open, onClose, onSaved }) {
  // Mounted only while open, so every opening starts from a blank form.
  if (!open) return null;
  return <ItemForm onClose={onClose} onSaved={onSaved} />;
}

function ItemForm({ onClose, onSaved }) {
  const [f, setF] = useState(BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const item_name = f.item_name.trim();
    if (!item_name) return;
    try {
      await api.inventory.items.create({
        item_name,
        category: f.category,
        stock_quantity: Number(f.stock_quantity),
        reorder_level: Number(f.reorder_level),
      });
      toast(item_name + ' added to the catalog.', 'success');
      onClose();
      await onSaved();
    } catch (err) {
      toast(err.message || 'Could not add this item.', 'error');
    }
  }

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Add a Catalog Item"
      subtitle="Define catalog details, unit category, and automatic reorder thresholds."
    >
      <form id="item-form" className="dialog-form" onSubmit={handleSubmit}>
        <div className="md-field">
          <label htmlFor="item-name">Item name</label>
          <input id="item-name" required placeholder="e.g. Digital Thermometer" value={f.item_name} onChange={set('item_name')} />
        </div>
        <div className="md-field">
          <label htmlFor="item-category">Category</label>
          <select id="item-category" value={f.category} onChange={set('category')}>
            <option value="Medication">Medication</option>
            <option value="Consumable">Consumable</option>
            <option value="Equipment">Equipment</option>
          </select>
        </div>
        <div className="md-field">
          <label htmlFor="item-stock">Starting stock</label>
          <input id="item-stock" type="number" min="0" required placeholder="e.g. 50" value={f.stock_quantity} onChange={set('stock_quantity')} />
        </div>
        <div className="md-field">
          <label htmlFor="item-reorder">Reorder level</label>
          <input id="item-reorder" type="number" min="0" required placeholder="e.g. 10" value={f.reorder_level} onChange={set('reorder_level')} />
        </div>
        <div className="md-dialog-actions">
          <Button variant="outline" type="button" id="item-cancel" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
