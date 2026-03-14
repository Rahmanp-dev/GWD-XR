/**
 * model-loader.js — Centralized 3D Model Loading
 * 
 * Features:
 * - GLTFLoader with DRACOLoader support
 * - Memory-aware cache (auto-evict beyond limit)
 * - Retry logic (3 attempts, exponential backoff)
 * - Progress callbacks
 * - Procedural fallback models
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ── Loader Setup ──────────────────────────────────────────
const gltfLoader = new GLTFLoader();

// Draco decoder from Google CDN (no local install needed)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({ type: 'js' });
gltfLoader.setDRACOLoader(dracoLoader);

// ── Cache ─────────────────────────────────────────────────
const cache = new Map();
const CACHE_MAX_BYTES = 50 * 1024 * 1024; // 50MB limit
let cacheBytes = 0;

function estimateModelSize(scene) {
    let bytes = 0;
    scene.traverse((node) => {
        if (node.isMesh) {
            const geo = node.geometry;
            if (geo) {
                for (const attr of Object.values(geo.attributes)) {
                    bytes += attr.array?.byteLength || 0;
                }
                if (geo.index) bytes += geo.index.array?.byteLength || 0;
            }
            if (node.material) {
                const mats = Array.isArray(node.material) ? node.material : [node.material];
                for (const mat of mats) {
                    for (const key of Object.keys(mat)) {
                        if (mat[key]?.isTexture && mat[key].image) {
                            bytes += (mat[key].image.width || 256) * (mat[key].image.height || 256) * 4;
                        }
                    }
                }
            }
        }
    });
    return bytes;
}

function evictOldest() {
    if (cache.size === 0) return;
    const oldest = cache.keys().next().value;
    const entry = cache.get(oldest);
    if (entry) {
        cacheBytes -= entry.bytes;
        cache.delete(oldest);
    }
}

// ── Core Loader ───────────────────────────────────────────

/**
 * Load a GLB/GLTF model with retry logic and caching.
 *
 * @param {string} url - URL to the model file
 * @param {object} options
 * @param {number} options.maxRetries - Max retry attempts (default 3)
 * @param {function} options.onProgress - Progress callback (0-1)
 * @returns {Promise<THREE.Group>} The model scene (cloned from cache)
 */
export async function loadModel(url, { maxRetries = 3, onProgress } = {}) {
    // Check cache
    if (cache.has(url)) {
        return cache.get(url).scene.clone();
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const gltf = await new Promise((resolve, reject) => {
                gltfLoader.load(
                    url,
                    resolve,
                    (event) => {
                        if (onProgress && event.lengthComputable) {
                            onProgress(event.loaded / event.total);
                        }
                    },
                    reject,
                );
            });

            const scene = gltf.scene;

            // Enable shadows on all meshes
            scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Cache with size tracking
            const bytes = estimateModelSize(scene);
            while (cacheBytes + bytes > CACHE_MAX_BYTES && cache.size > 0) {
                evictOldest();
            }
            cache.set(url, { scene: scene.clone(), bytes });
            cacheBytes += bytes;

            return scene;
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                // Exponential backoff: 500ms, 1s, 2s
                await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
            }
        }
    }

    throw new Error(`Failed to load model ${url} after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Load a model for a menu item, with automatic fallback.
 * Priority: item.modelUrl → /models/{modelType}.glb → procedural fallback
 *
 * @param {object} item - Menu item { modelUrl, modelType }
 * @param {function} createFallback - Fallback procedural model creator
 * @param {object} options - loadModel options
 * @returns {Promise<THREE.Group>}
 */
export async function loadMenuItemModel(item, createFallback, options = {}) {
    const url = item.modelUrl || `/models/${item.modelType}.glb`;

    try {
        return await loadModel(url, options);
    } catch (e) {
        // Fall back to procedural model
        if (createFallback) {
            return createFallback(item.modelType);
        }
        // Ultimate fallback: gray box
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x888888 }),
        );
        mesh.position.y = 0.05;
        mesh.castShadow = true;
        g.add(mesh);
        return g;
    }
}

/**
 * Preload models for a list of menu items (fire-and-forget)
 */
export function preloadModels(items) {
    for (const item of items) {
        const url = item.modelUrl || `/models/${item.modelType}.glb`;
        if (!cache.has(url)) {
            loadModel(url).catch(() => { }); // Silently fail, will use fallback later
        }
    }
}

/**
 * Clear the model cache
 */
export function clearModelCache() {
    cache.clear();
    cacheBytes = 0;
}
