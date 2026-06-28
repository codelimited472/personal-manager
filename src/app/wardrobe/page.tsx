'use client';

import { useState, useEffect } from 'react';
import { Shirt, Scissors, Tag, Plus, Check, Trash2, Layers } from 'lucide-react';
import { getDB, type LocalWardrobeItem, type LocalOutfit } from '@/lib/db';
import styles from './wardrobe.module.css';

export default function WardrobePage() {
  const db = getDB();
  const [activeTab, setActiveTab] = useState<'catalog' | 'builder'>('catalog');

  // Catalog State
  const [items, setItems] = useState<LocalWardrobeItem[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'formal' | 'casual' | 'party' | 'gym' | 'traditional'>('casual');
  const [type, setType] = useState<'clothing' | 'shoes' | 'watches' | 'accessories' | 'bags'>('clothing');
  const [tagsInput, setTagsInput] = useState('');
  const [imagePlaceholder, setImagePlaceholder] = useState('https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&auto=format&fit=crop&q=60');

  // Builder State
  const [outfits, setOutfits] = useState<LocalOutfit[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [outfitNotes, setOutfitNotes] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      const allItems = await db.wardrobeItems.toArray();
      setItems(allItems);
      const allOutfits = await db.outfits.toArray();
      setOutfits(allOutfits);
    }
    loadData();
  }, [refreshKey]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    await db.wardrobeItems.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name,
      category,
      type,
      images: [imagePlaceholder],
      tags,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setName('');
    setTagsInput('');
    // Alternate default images for fun mockup feel
    const imgUrls = [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=150&auto=format&fit=crop&q=60'
    ];
    setImagePlaceholder(imgUrls[Math.floor(Math.random() * imgUrls.length)]);
    setRefreshKey(prev => prev + 1);
  };

  const deleteItem = async (id: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    await db.wardrobeItems.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  const selectForOutfit = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const buildOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitName || selectedItems.length === 0) return;

    // Collate selected item images
    const outfitImages = items
      .filter(i => selectedItems.includes(i.id))
      .map(i => i.images[0]);

    await db.outfits.add({
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: outfitName,
      notes: outfitNotes,
      item_ids: selectedItems,
      images: outfitImages,
      created_at: new Date().toISOString(),
      _syncStatus: 'pending',
    });

    setOutfitName('');
    setOutfitNotes('');
    setSelectedItems([]);
    setRefreshKey(prev => prev + 1);
    setActiveTab('catalog');
  };

  const deleteOutfit = async (id: string) => {
    if (!(await window.appConfirm('Are you sure you want to delete this item?'))) return;
    await db.outfits.delete(id);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page">
      {/* Tabs */}
      <div className={styles.tabBar}>
        <button
          onClick={() => setActiveTab('catalog')}
          className={activeTab === 'catalog' ? styles.tabActive : styles.tab}
        >
          <Shirt size={16} /> Catalog
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={activeTab === 'builder' ? styles.tabActive : styles.tab}
        >
          <Scissors size={16} /> Outfit Builder
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div>
          {/* Add Wardrobe Item Form */}
          <form onSubmit={addItem} className={styles.formCard}>
            <h4 className={styles.formTitle}>Add Wardrobe Item</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Item Name (e.g. Leather Jacket, Sneakers)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroupRow}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'formal' | 'casual' | 'party' | 'gym' | 'traditional')}
                className={styles.input}
              >
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="party">Party Wear</option>
                <option value="gym">Gym Wear</option>
                <option value="traditional">Traditional</option>
              </select>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'clothing' | 'shoes' | 'watches' | 'accessories' | 'bags')}
                className={styles.input}
              >
                <option value="clothing">Clothing</option>
                <option value="shoes">Shoes</option>
                <option value="watches">Watch</option>
                <option value="accessories">Accessory</option>
                <option value="bags">Bag</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Tags (separated by comma)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <Plus size={16} /> Add to Wardrobe
            </button>
          </form>

          {/* Catalog list */}
          <h3 className={styles.sectionHeader}>Your Wardrobe</h3>
          <div className={styles.catalogGrid}>
            {items.map(item => (
              <div key={item.id} className={styles.itemCard}>
                <img src={item.images[0]} alt={item.name} className={styles.itemImg} />
                <div className={styles.cardInfo}>
                  <strong className={styles.itemName}>{item.name}</strong>
                  <span className={styles.itemMeta}>{item.category} • {item.type}</span>
                  <div className={styles.tagsContainer}>
                    {item.tags.map(t => (
                      <span key={t} className={styles.tagBadge}>#{t}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteItem(item.id)} className={styles.deleteBtn}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Saved Outfits */}
          {outfits.length > 0 && (
            <div className={styles.outfitsSection}>
              <h3 className={styles.sectionHeader}>Saved Outfits</h3>
              <div className={styles.outfitsList}>
                {outfits.map(outfit => (
                  <div key={outfit.id} className={styles.outfitCard}>
                    <div className={styles.outfitHeader}>
                      <strong className={styles.outfitName}>{outfit.name}</strong>
                      <button onClick={() => deleteOutfit(outfit.id)} className={styles.deleteBtn}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {outfit.notes && <p className={styles.outfitNotes}>{outfit.notes}</p>}
                    <div className={styles.outfitImagesGrid}>
                      {outfit.images.map((img, idx) => (
                        <img key={idx} src={img} alt="item" className={styles.outfitItemImg} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'builder' && (
        <div>
          <form onSubmit={buildOutfit} className={styles.formCard}>
            <h4 className={styles.formTitle}>Outfit Board Builder</h4>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Outfit Name (e.g. Monday Office, Weekend Hike)"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Style Notes / Occasion details"
                value={outfitNotes}
                onChange={(e) => setOutfitNotes(e.target.value)}
                className={styles.input}
              />
            </div>

            <h5 className={styles.selectLabel}>Select items for combination ({selectedItems.length}):</h5>
            <div className={styles.selectorGrid}>
              {items.map(item => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => selectForOutfit(item.id)}
                    className={isSelected ? styles.selectorCardActive : styles.selectorCard}
                  >
                    <img src={item.images[0]} alt={item.name} className={styles.selectorImg} />
                    {isSelected && (
                      <div className={styles.checkOverlay}>
                        <Check size={18} color="white" />
                      </div>
                    )}
                    <span className={styles.selectorName}>{item.name}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={selectedItems.length === 0}
            >
              <Layers size={16} /> Save Combination Board
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
