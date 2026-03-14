'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
function AnalyticsView({ data }) {
    if (!data) return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading analytics or no data available...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Conversion Funnel (Last {data.range})</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '20px', borderRadius: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{data.funnel.views}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Page Views</div>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>➔</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{data.funnel.arStarts}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>AR Starts</div>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>➔</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{data.funnel.placements}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Dishes Placed</div>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>➔</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff8f00' }}>{data.funnel.cartAdds}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Added to Cart</div>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)' }}>➔</div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ec4899' }}>{data.funnel.shares}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Shares</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Top Performing Dishes</h2>
                <table className="menu-table">
                    <thead>
                        <tr>
                            <th>Dish Name</th>
                            <th>Total Views</th>
                            <th style={{ textAlign: 'center' }}>AR Placements</th>
                            <th style={{ textAlign: 'center' }}>Cart Adds</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.topDishes.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No data yet</td></tr>
                        ) : data.topDishes.map((dish, i) => (
                            <tr key={dish.id}>
                                <td><strong>#{i + 1} {dish.name}</strong></td>
                                <td>{dish.views}</td>
                                <td style={{ textAlign: 'center' }}>{dish.places}</td>
                                <td style={{ textAlign: 'center' }}>{dish.carts}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [restaurant, setRestaurant] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/admin/login');
    }, [status, router]);

    // Fetch restaurant data
    const fetchData = useCallback(async () => {
        if (!session?.user?.restaurantSlugs?.[0]) return;
        const slug = session.user.restaurantSlugs[0];
        try {
            const res = await fetch(`/api/restaurants/${slug}`);
            const data = await res.json();
            setRestaurant(data);

            const anRes = await fetch(`/api/analytics?slug=${slug}`);
            if (anRes.ok) {
                setAnalytics(await anRes.json());
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
        setLoading(false);
    }, [session]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Add menu item
    const handleAdd = async (formData) => {
        const slug = session.user.restaurantSlugs[0];
        await fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, ...formData }),
        });
        setShowAddModal(false);
        fetchData();
    };

    // Update menu item
    const handleUpdate = async (formData) => {
        const slug = session.user.restaurantSlugs[0];
        await fetch('/api/menu', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, itemId: editItem._id, ...formData }),
        });
        setEditItem(null);
        fetchData();
    };

    // Delete menu item
    const handleDelete = async (itemId) => {
        if (!confirm('Remove this item from the menu?')) return;
        const slug = session.user.restaurantSlugs[0];
        await fetch(`/api/menu?slug=${slug}&itemId=${itemId}`, { method: 'DELETE' });
        fetchData();
    };

    if (status === 'loading' || loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading dashboard…</p>
            </div>
        );
    }

    const slug = session?.user?.restaurantSlugs?.[0];

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <nav className="admin-sidebar">
                <div className="brand">GWD <span>XR</span></div>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`admin-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', transition: '0.2s' }}
                >
                    📦 Menu Management
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`admin-nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', padding: '12px 16px', borderRadius: '8px', transition: '0.2s' }}
                >
                    📈 Analytics
                </button>
                <Link href={`/r/${slug}`} className="admin-nav-link" target="_blank" style={{ marginTop: 'auto' }}>🔗 View AR Menu</Link>
                <button className="admin-nav-link" onClick={() => signOut({ callbackUrl: '/admin/login' })} style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    🚪 Sign Out
                </button>
            </nav>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-header">
                    <h1>{restaurant?.name || 'Dashboard'} - {activeTab === 'dashboard' ? 'Menu Management' : 'Analytics'}</h1>
                    {activeTab === 'dashboard' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                            + Add Menu Item
                        </button>
                    )}
                </div>

                {activeTab === 'dashboard' ? (
                    <>
                        {/* Stats */}
                        <div className="stats-grid">
                            <div className="card stat-card">
                                <div className="stat-value">{restaurant?.analytics?.totalViews || 0}</div>
                                <div className="stat-label">Total Views</div>
                            </div>
                            <div className="card stat-card">
                                <div className="stat-value">{restaurant?.analytics?.totalPlacements || 0}</div>
                                <div className="stat-label">AR Placements</div>
                            </div>
                            <div className="card stat-card">
                                <div className="stat-value">{restaurant?.analytics?.totalCartAdds || 0}</div>
                                <div className="stat-label">Cart Adds</div>
                            </div>
                            <div className="card stat-card">
                                <div className="stat-value">{restaurant?.menuItems?.length || 0}</div>
                                <div className="stat-label">Menu Items</div>
                            </div>
                        </div>

                        {/* Menu Table */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="menu-table">
                                <thead>
                                    <tr>
                                        <th>Icon</th>
                                        <th>Name</th>
                                        <th>Price</th>
                                        <th>Model</th>
                                        <th>Active</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {restaurant?.menuItems?.map(item => (
                                        <tr key={item._id}>
                                            <td style={{ fontSize: '1.5rem' }}>{item.icon}</td>
                                            <td>
                                                <strong>{item.name}</strong>
                                                <br />
                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                                    {item.description}
                                                </span>
                                            </td>
                                            <td>${item.price?.toFixed(2)}</td>
                                            <td>
                                                {item.modelType === 'custom' && item.modelUrl ? (
                                                    <span title={item.modelUrl} style={{
                                                        background: 'rgba(0,240,255,0.1)', padding: '2px 8px',
                                                        borderRadius: 4, fontSize: '0.75rem', color: 'var(--color-primary)',
                                                    }}>
                                                        📦 {item.modelUrl.split('/').pop().substring(0, 20)}
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        background: 'var(--color-surface)', padding: '2px 8px',
                                                        borderRadius: 4, fontSize: '0.8rem',
                                                    }}>
                                                        {item.modelType}
                                                    </span>
                                                )}
                                            </td>
                                            <td>{item.isActive ? '✅' : '❌'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditItem(item)}>Edit</button>
                                                    <button className="btn btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(item._id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <AnalyticsView data={analytics} />
                )}
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <MenuItemModal
                    title="Add Menu Item"
                    slug={slug}
                    onSave={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {/* Edit Modal */}
            {editItem && (
                <MenuItemModal
                    title="Edit Menu Item"
                    initialData={editItem}
                    slug={slug}
                    onSave={handleUpdate}
                    onClose={() => setEditItem(null)}
                />
            )}
        </div>
    );
}

// ── Menu Item Modal ──────────────────────────────────────────

function MenuItemModal({ title, initialData, onSave, onClose, slug }) {
    const [form, setForm] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price || '',
        icon: initialData?.icon || '🍽️',
        modelType: initialData?.modelType || 'pizza',
        modelUrl: initialData?.modelUrl || '',
        scale: initialData?.scale || 0.3,
        ingredients: initialData?.ingredients?.join(', ') || '',
        tags: initialData?.tags || [],
        allergens: initialData?.allergens || [],
        spiceLevel: initialData?.spiceLevel || 0,
        calories: initialData?.calories || 0,
        prepTime: initialData?.prepTime || '',
        availability: initialData?.availability || 'available',
        isActive: initialData?.isActive ?? true,
    });
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleFileUpload = async (file) => {
        if (!file) return;
        const name = file.name.toLowerCase();
        if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
            setUploadError('Only .glb and .gltf files are supported');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('File too large (max 10MB)');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const fd = new FormData();
            fd.append('model', file);
            fd.append('slug', slug);
            const res = await fetch('/api/upload-model', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            update('modelUrl', data.url);
            update('modelType', 'custom');
        } catch (err) {
            setUploadError(err.message);
        }
        setUploading(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileUpload(file);
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{title}</h2>

                <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Margherita Pizza" />
                </div>

                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Classic pizza with fresh basil" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Price ($)</label>
                        <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => update('price', parseFloat(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Icon (emoji)</label>
                        <input className="form-input" value={form.icon} onChange={e => update('icon', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">3D Model</label>
                        <select className="form-select" value={form.modelType} onChange={e => { update('modelType', e.target.value); if (e.target.value !== 'custom') update('modelUrl', ''); }}>
                            <option value="pizza">🍕 Pizza</option>
                            <option value="pasta">🍝 Pasta</option>
                            <option value="burger">🍔 Burger</option>
                            <option value="drink">🥤 Drink</option>
                            <option value="dessert">🍰 Dessert</option>
                            <option value="appetizer">🥗 Appetizer</option>
                            <option value="custom">📦 Custom (.glb)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Model Scale</label>
                        <input className="form-input" type="number" step="0.05" value={form.scale} onChange={e => update('scale', parseFloat(e.target.value))} />
                    </div>
                </div>

                {/* Custom model upload zone */}
                {form.modelType === 'custom' && (
                    <div className="form-group">
                        <label className="form-label">Upload 3D Model</label>
                        {form.modelUrl ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)',
                                borderRadius: 8, padding: '10px 14px',
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>📦</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                        {form.modelUrl.split('/').pop()}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Model uploaded successfully
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--color-danger)', flexShrink: 0 }}
                                    onClick={() => update('modelUrl', '')}
                                >✕</button>
                            </div>
                        ) : (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.glb,.gltf';
                                    input.onchange = (e) => handleFileUpload(e.target.files[0]);
                                    input.click();
                                }}
                                style={{
                                    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'}`,
                                    borderRadius: 8, padding: '24px 16px', textAlign: 'center',
                                    cursor: uploading ? 'wait' : 'pointer',
                                    background: dragOver ? 'rgba(0,240,255,0.05)' : 'transparent',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {uploading ? (
                                    <div>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>⏳</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Uploading…</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📁</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                            Drop a <strong>.glb</strong> file here or click to browse
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                            Max 10MB
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {uploadError && (
                            <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 6 }}>
                                ⚠️ {uploadError}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Food Details ────────────────────── */}

                <div className="form-group">
                    <label className="form-label">Ingredients (comma-separated)</label>
                    <input className="form-input" value={form.ingredients} onChange={e => update('ingredients', e.target.value)} placeholder="Mozzarella, Basil, Tomatoes" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Calories</label>
                        <input className="form-input" type="number" value={form.calories} onChange={e => update('calories', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Prep Time</label>
                        <input className="form-input" value={form.prepTime} onChange={e => update('prepTime', e.target.value)} placeholder="15 min" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Availability</label>
                        <select className="form-select" value={form.availability} onChange={e => update('availability', e.target.value)}>
                            <option value="available">✅ Available</option>
                            <option value="limited">⚠️ Limited</option>
                            <option value="unavailable">❌ Unavailable</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Spice Level: {form.spiceLevel}/5 {'🌶️'.repeat(form.spiceLevel || 0)}</label>
                    <input type="range" min="0" max="5" value={form.spiceLevel} onChange={e => update('spiceLevel', parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
                </div>

                <div className="form-group">
                    <label className="form-label">Tags</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {['chef-pick', 'popular', 'new', 'spicy', 'healthy', 'limited'].map(tag => (
                            <label key={tag} style={{
                                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                                background: form.tags.includes(tag) ? 'rgba(0,240,255,0.15)' : 'var(--color-surface)',
                                border: `1px solid ${form.tags.includes(tag) ? 'var(--color-primary)' : 'transparent'}`,
                                padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem',
                                transition: 'all 0.2s',
                            }}>
                                <input type="checkbox" checked={form.tags.includes(tag)} style={{ display: 'none' }}
                                    onChange={() => update('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])} />
                                {tag}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Allergens</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {['gluten', 'dairy', 'nuts', 'soy', 'eggs', 'shellfish', 'vegan', 'vegetarian'].map(a => (
                            <label key={a} style={{
                                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                                background: form.allergens.includes(a) ? 'rgba(255,107,53,0.15)' : 'var(--color-surface)',
                                border: `1px solid ${form.allergens.includes(a) ? 'var(--color-accent, #ff6b35)' : 'transparent'}`,
                                padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem',
                                transition: 'all 0.2s',
                            }}>
                                <input type="checkbox" checked={form.allergens.includes(a)} style={{ display: 'none' }}
                                    onChange={() => update('allergens', form.allergens.includes(a) ? form.allergens.filter(x => x !== a) : [...form.allergens, a])} />
                                {a}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)} />
                        <span className="form-label" style={{ margin: 0 }}>Active on menu</span>
                    </label>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        disabled={form.modelType === 'custom' && !form.modelUrl}
                        onClick={() => onSave({
                            ...form,
                            ingredients: typeof form.ingredients === 'string'
                                ? form.ingredients.split(',').map(s => s.trim()).filter(Boolean)
                                : form.ingredients,
                        })}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
