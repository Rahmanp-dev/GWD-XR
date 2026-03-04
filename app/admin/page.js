'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);

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
                <Link href="/admin" className="admin-nav-link active">📊 Dashboard</Link>
                <Link href={`/r/${slug}`} className="admin-nav-link" target="_blank">🔗 View AR Menu</Link>
                <div style={{ flex: 1 }} />
                <button className="admin-nav-link" onClick={() => signOut({ callbackUrl: '/admin/login' })}>
                    🚪 Sign Out
                </button>
            </nav>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-header">
                    <h1>{restaurant?.name || 'Dashboard'}</h1>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                        + Add Menu Item
                    </button>
                </div>

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
                                        <span style={{
                                            background: 'var(--color-surface)', padding: '2px 8px',
                                            borderRadius: 4, fontSize: '0.8rem',
                                        }}>
                                            {item.modelType}
                                        </span>
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
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <MenuItemModal
                    title="Add Menu Item"
                    onSave={handleAdd}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {/* Edit Modal */}
            {editItem && (
                <MenuItemModal
                    title="Edit Menu Item"
                    initialData={editItem}
                    onSave={handleUpdate}
                    onClose={() => setEditItem(null)}
                />
            )}
        </div>
    );
}

// ── Menu Item Modal ──────────────────────────────────────────

function MenuItemModal({ title, initialData, onSave, onClose }) {
    const [form, setForm] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price || '',
        icon: initialData?.icon || '🍽️',
        modelType: initialData?.modelType || 'pizza',
        scale: initialData?.scale || 0.3,
        isActive: initialData?.isActive ?? true,
    });

    const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

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
                        <select className="form-select" value={form.modelType} onChange={e => update('modelType', e.target.value)}>
                            <option value="pizza">🍕 Pizza</option>
                            <option value="pasta">🍝 Pasta</option>
                            <option value="burger">🍔 Burger</option>
                            <option value="drink">🥤 Drink</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Model Scale</label>
                        <input className="form-input" type="number" step="0.05" value={form.scale} onChange={e => update('scale', parseFloat(e.target.value))} />
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
                    <button className="btn btn-primary" onClick={() => onSave(form)}>Save</button>
                </div>
            </div>
        </div>
    );
}
