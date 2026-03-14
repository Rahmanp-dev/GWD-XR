'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { loadMenuItemModel, preloadModels } from '@/lib/model-loader';
import { trackEvent } from '@/lib/analytics';

/* ================================================================
   ARExperience – Production AR Menu (Complete Rewrite)
   ================================================================
   Architecture:
   - createModel()        → procedural 3D food (outside component)
   - Scene / Renderer     → one-time shared setup
   - AR Engine            → single startAR() with WebXR / Camera / Desktop
   - Model Manager        → place, anchor, persist position/scale/rotation
   - Gesture Controller   → unified touch + mouse + WebXR input
     • Drag              = move model on ground plane
     • Shift+Drag        = rotate model (Y horizontal, X vertical)
     • Pinch             = scale model
     • Scroll            = zoom camera
     • Click empty space  = orbit camera
   - Cart + UI
   ================================================================ */

/* ── Procedural 3D Food Models ─────────────────────────────────── */
const _mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.6, metalness: opts.metalness ?? 0,
    transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
});
const _m = (geo, material, pos) => {
    const mesh = new THREE.Mesh(geo, material);
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
};

function createModel(type) {
    const g = new THREE.Group();
    g.name = type;
    switch (type) {
        case 'pizza': {
            g.add(_m(new THREE.CylinderGeometry(0.15, 0.15, 0.015, 32), _mat(0xD4A056, { roughness: 0.8 }), [0, 0.0075, 0]));
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.01, 8, 32), _mat(0xC89040, { roughness: 0.85 }));
            rim.rotation.x = Math.PI / 2; rim.position.y = 0.012; g.add(rim);
            g.add(_m(new THREE.CylinderGeometry(0.13, 0.13, 0.005, 32), _mat(0xCC3333), [0, 0.018, 0]));
            g.add(_m(new THREE.CylinderGeometry(0.125, 0.125, 0.007, 32), _mat(0xF5D76E, { roughness: 0.4 }), [0, 0.023, 0]));
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + i * 0.12, r = 0.05 + (i % 3) * 0.025;
                g.add(_m(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 12), _mat(0x8B2500, { roughness: 0.5 }), [Math.cos(a) * r, 0.029, Math.sin(a) * r]));
            }
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 + 0.3, r = 0.03 + (i % 3) * 0.025;
                const lf = new THREE.SphereGeometry(0.013, 8, 5); lf.scale(1, 0.25, 1.8);
                const leaf = new THREE.Mesh(lf, _mat(0x2D8B2D, { roughness: 0.7 }));
                leaf.position.set(Math.cos(a) * r, 0.03, Math.sin(a) * r); leaf.rotation.y = a + 0.5; leaf.castShadow = true; g.add(leaf);
            }
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 + 1.0, r = 0.06 + (i % 2) * 0.03;
                const mg = new THREE.SphereGeometry(0.01, 8, 8); mg.scale(1, 0.5, 1);
                g.add(_m(mg, _mat(0xFFFAF0, { roughness: 0.3 }), [Math.cos(a) * r, 0.028, Math.sin(a) * r]));
            }
            break;
        }
        case 'pasta': {
            const bowlGeo = new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const bowl = new THREE.Mesh(bowlGeo, _mat(0xFAF0E6, { roughness: 0.25, doubleSide: true }));
            bowl.rotation.x = Math.PI; bowl.position.y = 0.065; bowl.castShadow = true; g.add(bowl);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 8, 24), _mat(0xF5F5DC));
            ring.position.y = 0.002; ring.rotation.x = Math.PI / 2; g.add(ring);
            g.add(_m(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 24), _mat(0xCC4422, { roughness: 0.45 }), [0, 0.042, 0]));
            for (let i = 0; i < 8; i++) {
                const n = new THREE.Mesh(new THREE.TorusGeometry(0.035 + (i % 4) * 0.008, 0.0045, 6, 16), _mat(0xF5DEB3, { roughness: 0.4 }));
                n.position.set(((i % 3) - 1) * 0.015, 0.05 + (i % 2) * 0.008, ((i % 4) - 1.5) * 0.012);
                n.rotation.set(i * 0.45, i * 0.7, i * 0.2); n.castShadow = true; g.add(n);
            }
            for (let i = 0; i < 6; i++) g.add(_m(new THREE.BoxGeometry(0.005, 0.002, 0.005), _mat(0x388E3C), [((i % 3) - 1) * 0.02, 0.062, ((i % 2) - 0.5) * 0.03]));
            break;
        }
        case 'burger': {
            const bun = _mat(0xD2922E, { roughness: 0.7 }); let y = 0;
            g.add(_m(new THREE.CylinderGeometry(0.08, 0.075, 0.022, 24), bun, [0, y += 0.011, 0])); y += 0.011;
            g.add(_m(new THREE.CylinderGeometry(0.088, 0.085, 0.006, 18), _mat(0x4CAF50, { roughness: 0.6 }), [0, y += 0.003, 0])); y += 0.003;
            g.add(_m(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 24), _mat(0x4E2A0C, { roughness: 0.85 }), [0, y += 0.011, 0])); y += 0.011;
            const ch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.004, 0.14), _mat(0xFFC107, { roughness: 0.3 }));
            ch.position.set(0, y += 0.002, 0); ch.rotation.y = Math.PI / 4; ch.castShadow = true; g.add(ch); y += 0.002;
            g.add(_m(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 16), _mat(0xE53935, { roughness: 0.5 }), [0, y += 0.003, 0])); y += 0.003;
            const onion = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 16), _mat(0xE8D5F5, { roughness: 0.4 }));
            onion.position.set(0, y += 0.005, 0); onion.rotation.x = Math.PI / 2; g.add(onion); y += 0.002;
            const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), _mat(0xD2922E, { roughness: 0.65 }));
            top.position.y = y; top.castShadow = true; g.add(top);
            for (let i = 0; i < 12; i++) {
                const sg = new THREE.SphereGeometry(0.0035, 5, 3); sg.scale(1, 0.4, 1.6);
                const seed = new THREE.Mesh(sg, _mat(0xFFF8DC, { roughness: 0.9 }));
                const a = (i / 12) * Math.PI * 2, e = (i % 3) * 0.12 + 0.1;
                seed.position.set(Math.cos(a) * 0.055 * (1 - e * 0.3), y + 0.025 + e * 0.035, Math.sin(a) * 0.055 * (1 - e * 0.3)); g.add(seed);
            }
            break;
        }
        case 'drink': {
            g.add(_m(new THREE.CylinderGeometry(0.042, 0.035, 0.14, 20, 1, true), _mat(0xCCE5FF, { roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.2, doubleSide: true }), [0, 0.07, 0]));
            g.add(_m(new THREE.CylinderGeometry(0.035, 0.035, 0.003, 20), _mat(0xCCCCCC, { transparent: true, opacity: 0.3 }), [0, 0.0015, 0]));
            g.add(_m(new THREE.CylinderGeometry(0.039, 0.033, 0.10, 20), _mat(0xFFA726, { transparent: true, opacity: 0.85, roughness: 0.15 }), [0, 0.053, 0]));
            g.add(_m(new THREE.CylinderGeometry(0.039, 0.039, 0.005, 20), _mat(0xFFCC80, { transparent: true, opacity: 0.6 }), [0, 0.106, 0]));
            const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.19, 8), _mat(0xE53935, { roughness: 0.5 }));
            straw.position.set(0.015, 0.095, 0); straw.rotation.z = -0.12; straw.castShadow = true; g.add(straw);
            for (let i = 0; i < 3; i++) {
                const ice = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016), _mat(0xE0F7FA, { transparent: true, opacity: 0.45, roughness: 0.03 }));
                const a = (i / 3) * Math.PI * 2 + 0.5;
                ice.position.set(Math.cos(a) * 0.014, 0.085 + i * 0.012, Math.sin(a) * 0.014);
                ice.rotation.set(i * 0.5, i * 0.8, 0); g.add(ice);
            }
            const lemon = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 12, 1, false, 0, Math.PI), _mat(0xFFEB3B, { roughness: 0.45 }));
            lemon.position.set(0.042, 0.137, 0); lemon.rotation.z = Math.PI / 3; g.add(lemon);
            break;
        }
        default:
            g.add(_m(new THREE.BoxGeometry(0.1, 0.1, 0.1), _mat(0x888888), [0, 0.05, 0]));
    }
    return g;
}


/* ── Bounce-in animation helper ────────────────────────────────── */
function bounceIn(model, targetScale) {
    const start = performance.now(), dur = 500;
    const tick = () => {
        const t = Math.min((performance.now() - start) / dur, 1);
        const p = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * (2 * Math.PI / 3));
        const s = targetScale * p;
        model.scale.set(s, s, s);
        if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function ARExperience({ restaurant }) {
    /* ── State ──────────────────────────────────────────────── */
    const [phase, setPhase] = useState('consent');
    const [selectedItem, setSelectedItem] = useState(null);

    // Track page views
    useEffect(() => {
        trackEvent(restaurant.slug, 'page_view');
    }, [restaurant.slug]);

    // Track dish views
    useEffect(() => {
        if (selectedItem) {
            trackEvent(restaurant.slug, 'dish_view', selectedItem);
        }
    }, [selectedItem, restaurant.slug]);
    const [placedModels, setPlacedModels] = useState([]);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [statusMsg, setStatusMsg] = useState('');
    const [arMode, setArMode] = useState('desktop');
    const [errorMsg, setErrorMsg] = useState('');
    const [shiftHeld, setShiftHeld] = useState(false);
    const [activeFilters, setActiveFilters] = useState([]);
    const [showDishInfo, setShowDishInfo] = useState(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [needsHttps, setNeedsHttps] = useState(false);

    /* ── Refs ───────────────────────────────────────────────── */
    const containerRef = useRef(null);
    const overlayRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const animFrameRef = useRef(null);
    const groundRef = useRef(null);
    const reticleRef = useRef(null);
    const modelsRef = useRef([]);     // [{item, model}]
    const selectedItemRef = useRef(null);
    const arModeRef = useRef('desktop');

    // WebXR
    const xrSessionRef = useRef(null);
    const hitTestSrcRef = useRef(null);
    const refSpaceRef = useRef(null);

    // Gyroscope
    const orientRef = useRef({ a: 0, b: 0, g: 0, orient: 0, cal: null, active: false });

    // Gesture
    const gestRef = useRef({
        dragging: false, pinching: false, shiftKey: false,
        model: null, lastX: 0, lastY: 0, lastDist: 0, lastAngle: 0,
    });

    // Raycaster (reused)
    const rayRef = useRef(new THREE.Raycaster());
    const ptrVec = useRef(new THREE.Vector2());

    const { menuItems, name } = restaurant;

    // Keep refs in sync with state
    useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);
    useEffect(() => { arModeRef.current = arMode; }, [arMode]);

    // Detect HTTPS requirement after mount (avoids hydration mismatch)
    useEffect(() => {
        if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
            setNeedsHttps(true);
        }
    }, []);

    // Track shift key globally
    useEffect(() => {
        const down = (e) => { if (e.key === 'Shift') { setShiftHeld(true); gestRef.current.shiftKey = true; } };
        const up = (e) => { if (e.key === 'Shift') { setShiftHeld(false); gestRef.current.shiftKey = false; } };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    /* ══════════════════════════════════════════════════════════
       SCENE + RENDERER (shared, one-time)
       ══════════════════════════════════════════════════════════ */

    const initScene = useCallback(() => {
        if (sceneRef.current) return;
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
        cam.position.set(0, 0.35, 0.7);
        cam.lookAt(0, 0, 0);
        cameraRef.current = cam;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dir = new THREE.DirectionalLight(0xffffff, 1.0);
        dir.position.set(2, 4, 3);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        dir.shadow.camera.near = 0.1; dir.shadow.camera.far = 10;
        dir.shadow.camera.left = -2; dir.shadow.camera.right = 2;
        dir.shadow.camera.top = 2; dir.shadow.camera.bottom = -2;
        scene.add(dir);
        const fill = new THREE.DirectionalLight(0x88ccff, 0.3);
        fill.position.set(-1, 2, -1);
        scene.add(fill);

        // Invisible ground for raycasting
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.name = 'ground';
        scene.add(ground);
        groundRef.current = ground;

        // Shadow ground
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.15 }));
        sg.rotation.x = -Math.PI / 2; sg.position.y = -0.001; sg.receiveShadow = true;
        scene.add(sg);

        // Reticle for WebXR hit-test
        const rGeo = new THREE.RingGeometry(0.05, 0.06, 32);
        rGeo.rotateX(-Math.PI / 2);
        const reticle = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
        reticle.visible = false;
        reticle.matrixAutoUpdate = false;
        scene.add(reticle);
        // Center dot
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.008, 16), new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 }));
        dot.rotation.x = -Math.PI / 2; dot.position.y = 0.001;
        reticle.add(dot);
        reticleRef.current = reticle;
    }, []);

    const initRenderer = useCallback((forWebXR = false) => {
        if (rendererRef.current) return rendererRef.current;
        const container = containerRef.current;
        if (!container) { console.warn('[AR] No container ref'); return null; }

        try {
            const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
            r.setSize(window.innerWidth, window.innerHeight);
            r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            r.setClearColor(0x000000, 0);
            r.shadowMap.enabled = true;
            r.shadowMap.type = THREE.PCFShadowMap;
            r.outputColorSpace = THREE.SRGBColorSpace;
            r.toneMapping = THREE.ACESFilmicToneMapping;
            r.toneMappingExposure = 1.2;
            if (forWebXR) r.xr.enabled = true;

            container.appendChild(r.domElement);
            Object.assign(r.domElement.style, { position: 'fixed', top: '0', left: '0', zIndex: '2', pointerEvents: 'none' });
            rendererRef.current = r;

            const onResize = () => {
                const w = window.innerWidth, h = window.innerHeight;
                if (cameraRef.current) { cameraRef.current.aspect = w / h; cameraRef.current.updateProjectionMatrix(); }
                r.setSize(w, h);
            };
            window.addEventListener('resize', onResize);

            return r;
        } catch (err) {
            console.error('[AR] WebGL renderer failed:', err.message);
            return null;
        }
    }, []);

    /* ══════════════════════════════════════════════════════════
       GYROSCOPE (3DOF) for camera fallback
       ══════════════════════════════════════════════════════════ */

    const startGyroscope = useCallback(async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false; }
            catch (e) { return false; }
        }
        const o = orientRef.current;
        const handler = (e) => {
            if (e.alpha === null) return;
            o.a = e.alpha; o.b = e.beta; o.g = e.gamma;
            if (!o.cal) { o.cal = { a: e.alpha, b: e.beta, g: e.gamma }; }
        };
        const orientHandler = () => { o.orient = window.screen?.orientation?.angle || window.orientation || 0; };
        window.addEventListener('deviceorientation', handler, true);
        window.addEventListener('orientationchange', orientHandler);
        orientHandler();
        o.active = true;
        return true;
    }, []);

    const updateGyroCamera = useCallback(() => {
        const cam = cameraRef.current;
        const o = orientRef.current;
        if (!cam || !o.active || !o.cal) return;
        const D = Math.PI / 180;
        let a = (o.a - o.cal.a) * D, b = (o.b - o.cal.b) * D, g = (o.g - o.cal.g) * D;
        const q = new THREE.Quaternion();
        q.setFromEuler(new THREE.Euler(b, a, -g, 'YXZ'));
        q.multiply(new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2));
        const q2 = new THREE.Quaternion();
        q2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -o.orient * D);
        q.multiply(q2);
        cam.quaternion.copy(q);
    }, []);

    /* ══════════════════════════════════════════════════════════
       AR ENGINE — single entry point
       ══════════════════════════════════════════════════════════ */

    const startAR = useCallback(async () => {
        trackEvent(restaurant.slug, 'ar_start', null, { mode: 'camera' });
        setPhase('loading'); setLoadProgress(10); setStatusMsg('Detecting AR capabilities…');
        initScene();

        const isSecure = typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost');

        // Check WebXR (with timeout to avoid hanging in environments where navigator.xr exists but never resolves)
        let hasWebXR = false;
        if (isSecure && navigator.xr) {
            try {
                hasWebXR = await Promise.race([
                    navigator.xr.isSessionSupported('immersive-ar'),
                    new Promise(resolve => setTimeout(() => resolve(false), 2000)),
                ]);
            } catch (e) { }
        }
        const isMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
        console.log('[AR] Detection:', { isSecure, hasWebXR, isMobile });

        /* ── PATH 1: WebXR 6DOF ─────────────────────────────── */
        if (hasWebXR) {
            setArMode('webxr'); arModeRef.current = 'webxr';
            setLoadProgress(30); setStatusMsg('Starting AR session…');

            const renderer = initRenderer(true);
            if (!renderer) return;

            try {
                const overlay = overlayRef.current;
                const init = { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay', 'local-floor'] };
                if (overlay) init.domOverlay = { root: overlay };

                const session = await navigator.xr.requestSession('immersive-ar', init);
                xrSessionRef.current = session;
                renderer.xr.setReferenceSpaceType('local');
                await renderer.xr.setSession(session);

                setLoadProgress(60); setStatusMsg('Scanning surfaces…');
                const refSpace = await session.requestReferenceSpace('local');
                refSpaceRef.current = refSpace;
                const viewerSpace = await session.requestReferenceSpace('viewer');
                const hitSrc = await session.requestHitTestSource({ space: viewerSpace });
                hitTestSrcRef.current = hitSrc;

                // XR Controller for tap-to-place
                const ctrl = renderer.xr.getController(0);
                sceneRef.current.add(ctrl);
                ctrl.addEventListener('select', async () => {
                    const item = selectedItemRef.current;
                    const reticle = reticleRef.current;
                    if (!item || !reticle || !reticle.visible) return;
                    const model = await loadMenuItemModel(item, createModel);
                    const scale = item.scale || 0.3;
                    model.position.setFromMatrixPosition(reticle.matrix);
                    model.scale.set(0, 0, 0);
                    model.userData = { itemId: item.id, anchoredPos: model.position.clone(), anchoredScale: scale, anchoredRotY: 0 };
                    sceneRef.current.add(model);
                    bounceIn(model, scale);
                    modelsRef.current.push({ item, model });
                    setPlacedModels(p => [...p, { id: Date.now(), item }]);
                    console.log('[AR] WebXR placed:', item.modelType);
                });

                setLoadProgress(90); setStatusMsg('AR ready! Point at a surface and tap.');

                // Render loop
                let rTime = 0;
                renderer.setAnimationLoop((ts, frame) => {
                    if (!frame) return;
                    const reticle = reticleRef.current;
                    if (hitTestSrcRef.current) {
                        const results = frame.getHitTestResults(hitTestSrcRef.current);
                        if (results.length > 0) {
                            const pose = results[0].getPose(refSpaceRef.current);
                            if (pose) {
                                reticle.visible = true;
                                reticle.matrix.fromArray(pose.transform.matrix);
                                rTime += 0.05;
                                reticle.material.opacity = 0.5 + 0.3 * Math.sin(rTime);
                            }
                        } else { reticle.visible = false; }
                    }
                    renderer.render(sceneRef.current, renderer.xr.getCamera());
                });

                session.addEventListener('end', () => {
                    hitTestSrcRef.current = null;
                    xrSessionRef.current = null;
                    renderer.setAnimationLoop(null);
                });

                setLoadProgress(100);
                setTimeout(() => setPhase('ready'), 200);
                return;
            } catch (err) {
                console.warn('[AR] WebXR failed:', err.message);
                renderer.xr.enabled = false;
                // fall through to camera path
            }
        }

        /* ── PATH 2: Camera + Gyroscope ──────────────────────── */
        /* Runs on ANY secure context (desktop or mobile).         */
        /* Gyroscope only activates on mobile. Desktop gets camera  */
        /* feed behind the 3D canvas as a visual background.        */
        if (isSecure) {
            setArMode('camera'); arModeRef.current = 'camera';
            setLoadProgress(30); setStatusMsg('Requesting camera…');

            const renderer = initRenderer(false);
            if (!renderer) { setPhase('ready'); return; }
            let camOK = false;

            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia not available');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.style.display = 'block';
                    await videoRef.current.play();
                }
                camOK = true;
                setLoadProgress(50); setStatusMsg('Camera active!');
            } catch (err) {
                console.warn('[AR] Camera failed:', err.name, err.message);
                // Don't set errorMsg here — just fall through to desktop
            }

            if (camOK) {
                // Try gyroscope (only works on mobile devices)
                let hasGyro = false;
                if (isMobile) {
                    hasGyro = await startGyroscope();
                    if (hasGyro) {
                        cameraRef.current.position.set(0, 0.15, 0);
                        cameraRef.current.lookAt(0, 0, -1);
                        setStatusMsg('Tracked AR ready!');
                    } else {
                        setStatusMsg('Camera AR (drag to look around)');
                    }
                } else {
                    setStatusMsg('Camera AR (drag models, scroll to zoom)');
                }
                setLoadProgress(80);

                // Render loop — transparent canvas over camera feed
                const animate = () => {
                    animFrameRef.current = requestAnimationFrame(animate);
                    if (hasGyro) updateGyroCamera();
                    renderer.render(sceneRef.current, cameraRef.current);
                };
                animate();
                setLoadProgress(100);
                setTimeout(() => setPhase('ready'), 200);
                return;
            }
            // Camera failed — fall through to desktop viewer
        }

        /* ── PATH 3: Desktop 3D Viewer (fallback) ───────────── */
        setArMode('desktop'); arModeRef.current = 'desktop';
        setLoadProgress(50); setStatusMsg('Loading 3D viewer…');

        const renderer = initRenderer(false);
        if (!renderer) { setPhase('ready'); return; }
        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
            modelsRef.current.forEach(e => { if (e.autoRotate) e.model.rotation.y += 0.003; });
            renderer.render(sceneRef.current, cameraRef.current);
        };
        animate();
        setLoadProgress(100); setStatusMsg('Ready!');
        setTimeout(() => setPhase('ready'), 200);
    }, [initScene, initRenderer, startGyroscope, updateGyroCamera]);

    const startDesktopViewer = useCallback(() => {
        trackEvent(restaurant.slug, 'ar_start', null, { mode: 'desktop' });

        setPhase('loading'); setLoadProgress(30); setStatusMsg('Loading 3D viewer…');
        initScene();
        setArMode('desktop'); arModeRef.current = 'desktop';
        const renderer = initRenderer(false);
        if (!renderer) { console.warn('[AR] No renderer'); setPhase('ready'); return; }

        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
            modelsRef.current.forEach(e => { if (e.autoRotate) e.model.rotation.y += 0.003; });
            renderer.render(sceneRef.current, cameraRef.current);
        };
        animate();
        setLoadProgress(100); setTimeout(() => setPhase('ready'), 200);

    }, [initScene, initRenderer]);

    /* ── Cleanup ───────────────────────────────────────────── */
    useEffect(() => () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (xrSessionRef.current) xrSessionRef.current.end().catch(() => { });
        if (rendererRef.current) { rendererRef.current.setAnimationLoop(null); rendererRef.current.dispose(); }
        orientRef.current.active = false;
    }, []);

    /* ══════════════════════════════════════════════════════════
       MODEL PLACEMENT (button click)
       ══════════════════════════════════════════════════════════ */

    const placeModel = useCallback(async () => {
        if (!selectedItem) return;
        trackEvent(restaurant.slug, 'dish_place', selectedItem);
        const scene = sceneRef.current;
        if (!scene) return;

        const model = await loadMenuItemModel(selectedItem, createModel);
        const scale = selectedItem.scale || 0.3;

        if (arMode === 'webxr') {
            const reticle = reticleRef.current;
            if (reticle && reticle.visible) model.position.setFromMatrixPosition(reticle.matrix);
            else model.position.set(0, 0, -0.5);
        } else if (arMode === 'camera' && orientRef.current.active) {
            const cam = cameraRef.current;
            const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
            const t = -cam.position.y / dir.y || 0;
            const off = (modelsRef.current.length % 3 - 1) * 0.15;
            model.position.set(cam.position.x + dir.x * Math.max(t, 0.4) + off, 0, cam.position.z + dir.z * Math.max(t, 0.4));
        } else {
            const off = (modelsRef.current.length % 3 - 1) * 0.25;
            model.position.set(off, 0, 0);
        }

        model.scale.set(0, 0, 0);
        model.userData = { itemId: selectedItem.id, anchoredPos: model.position.clone(), anchoredScale: scale, anchoredRotY: 0 };
        scene.add(model);
        bounceIn(model, scale);

        const autoRotate = arMode === 'desktop';
        modelsRef.current.push({ item: selectedItem, model, autoRotate });
        setPlacedModels(p => [...p, { id: Date.now(), item: selectedItem }]);
    }, [selectedItem, arMode]);

    /* ══════════════════════════════════════════════════════════
       UNIFIED GESTURE CONTROLLER
       ══════════════════════════════════════════════════════════ */

    const rayToGround = useCallback((cx, cy) => {
        const cam = cameraRef.current, ground = groundRef.current;
        if (!cam || !ground) return null;
        ptrVec.current.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
        rayRef.current.setFromCamera(ptrVec.current, cam);
        const hits = rayRef.current.intersectObject(ground);
        return hits.length > 0 ? hits[0].point : null;
    }, []);

    const findModel = useCallback((cx, cy) => {
        const cam = cameraRef.current;
        if (!cam || modelsRef.current.length === 0) return null;
        ptrVec.current.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
        rayRef.current.setFromCamera(ptrVec.current, cam);
        const objs = modelsRef.current.map(e => e.model);
        const hits = rayRef.current.intersectObjects(objs, true);
        if (hits.length === 0) return null;
        let obj = hits[0].object;
        while (obj.parent && !modelsRef.current.find(e => e.model === obj)) obj = obj.parent;
        return modelsRef.current.find(e => e.model === obj) || null;
    }, []);

    /* ── Touch ─────────────────────────────────────────────── */
    const onTouchStart = useCallback((e) => {
        if (e.target.closest('[data-ui]')) return;
        const g = gestRef.current;
        modelsRef.current.forEach(en => en.autoRotate = false);
        if (e.touches.length === 1) {
            const entry = findModel(e.touches[0].clientX, e.touches[0].clientY);
            g.dragging = true;
            g.model = entry?.model || null;
            g.lastX = e.touches[0].clientX;
            g.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            g.dragging = false; g.pinching = true;
            g.lastDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
            g.lastAngle = Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX);
            if (!g.model && modelsRef.current.length > 0) g.model = modelsRef.current[modelsRef.current.length - 1].model;
        }
    }, [findModel]);

    const onTouchMove = useCallback((e) => {
        if (e.target.closest('[data-ui]')) return;
        const g = gestRef.current;
        if (e.touches.length === 1 && g.dragging) {
            e.preventDefault();
            if (g.model) {
                const pt = rayToGround(e.touches[0].clientX, e.touches[0].clientY);
                if (pt) { g.model.position.x = pt.x; g.model.position.z = pt.z; }
            } else {
                // Orbit camera
                const dx = e.touches[0].clientX - g.lastX;
                const cam = cameraRef.current;
                if (cam) {
                    const a = dx * 0.005, r = Math.sqrt(cam.position.x ** 2 + cam.position.z ** 2);
                    const ca = Math.atan2(cam.position.z, cam.position.x);
                    cam.position.x = r * Math.cos(ca + a); cam.position.z = r * Math.sin(ca + a);
                    cam.lookAt(0, 0, 0);
                }
                g.lastX = e.touches[0].clientX;
            }
        } else if (e.touches.length === 2 && g.pinching && g.model) {
            e.preventDefault();
            const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
            const angle = Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX);
            const sf = dist / g.lastDist, s = g.model.scale.x;
            const ns = Math.max(0.05, Math.min(3.0, s * sf));
            g.model.scale.set(ns, ns, ns);
            g.model.rotation.y += angle - g.lastAngle;
            g.lastDist = dist; g.lastAngle = angle;
        }
    }, [rayToGround]);

    const onTouchEnd = useCallback(() => { gestRef.current.dragging = false; gestRef.current.pinching = false; }, []);

    /* ── Mouse ─────────────────────────────────────────────── */
    const onMouseDown = useCallback((e) => {
        if (e.target.closest('[data-ui]')) return;
        const g = gestRef.current;
        modelsRef.current.forEach(en => en.autoRotate = false);
        const entry = findModel(e.clientX, e.clientY);
        g.dragging = true;
        g.model = entry?.model || null;
        g.lastX = e.clientX; g.lastY = e.clientY;
    }, [findModel]);

    const onMouseMove = useCallback((e) => {
        const g = gestRef.current;
        if (!g.dragging) return;
        const dx = e.clientX - g.lastX, dy = e.clientY - g.lastY;

        if (g.model) {
            if (g.shiftKey) {
                // SHIFT+DRAG: rotate model
                g.model.rotation.y += dx * 0.008;
                g.model.rotation.x += dy * 0.008;
                // Clamp X rotation to ±45°
                g.model.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, g.model.rotation.x));
            } else {
                // Normal drag: move on ground
                const pt = rayToGround(e.clientX, e.clientY);
                if (pt) { g.model.position.x = pt.x; g.model.position.z = pt.z; }
            }
        } else {
            // Orbit camera
            const cam = cameraRef.current;
            if (cam) {
                const a = dx * 0.005, r = Math.sqrt(cam.position.x ** 2 + cam.position.z ** 2);
                const ca = Math.atan2(cam.position.z, cam.position.x);
                cam.position.x = r * Math.cos(ca + a); cam.position.z = r * Math.sin(ca + a);
                cam.lookAt(0, 0, 0);
            }
        }
        g.lastX = e.clientX; g.lastY = e.clientY;
    }, [rayToGround]);

    const onMouseUp = useCallback(() => { gestRef.current.dragging = false; gestRef.current.model = null; }, []);

    const onWheel = useCallback((e) => {
        const cam = cameraRef.current;
        if (!cam) return;
        const f = 1 + e.deltaY * 0.001;
        cam.position.multiplyScalar(Math.max(0.3, Math.min(3.0, f)));
        cam.lookAt(0, 0, 0);
    }, []);

    /* ══════════════════════════════════════════════════════════
       CART
       ══════════════════════════════════════════════════════════ */

    const addToCart = useCallback(() => {
        if (!selectedItem) return;
        trackEvent(restaurant.slug, 'cart_add', selectedItem);
        setCart(p => {
            const ex = p.find(c => c.id === selectedItem.id);
            if (ex) return p.map(c => c.id === selectedItem.id ? { ...c, quantity: c.quantity + 1 } : c);
            return [...p, { ...selectedItem, quantity: 1 }];
        });
        setShowCart(true);
    }, [selectedItem, restaurant.slug]);

    const removeFromCart = useCallback((id) => {
        setCart(p => p.filter(c => c.id !== id));
    }, []);

    const handleShare = useCallback(async () => {
        trackEvent(restaurant.slug, 'share');
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        try {
            // Force a render to ensure canvas isn't clear
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            const dataUrl = rendererRef.current.domElement.toDataURL('image/png');

            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], 'ar-dish.png', { type: 'image/png' });

            const shareData = {
                title: `${restaurant.name} AR Menu`,
                text: `Check out the AR Menu at ${restaurant.name}!`,
                files: [file]
            };

            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`Check out ${restaurant.name}'s AR Menu at ${window.location.href}`);
                alert('Link copied to clipboard! (Image sharing not supported on this browser)');
            }
        } catch (err) {
            console.error('[AR] Share error:', err);
        }
    }, [restaurant]);
    const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

    const checkout = useCallback(async () => {
        if (cart.length === 0) return;
        try {
            const res = await fetch('/api/cart', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantSlug: restaurant.slug, items: cart.map(c => ({ name: c.name, price: c.price, quantity: c.quantity, modelType: c.modelType })) }),
            });
            const data = await res.json();
            if (data.success) { alert(`Order placed! #${data.orderId.slice(-6).toUpperCase()}\nTotal: $${data.total.toFixed(2)}`); setCart([]); setShowCart(false); }
        } catch (err) { console.error('[AR] Checkout error:', err); }
    }, [cart, restaurant.slug]);

    /* ══════════════════════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════════════════════ */

    const modeLabel = arMode === 'webxr' ? 'Surface AR'
        : arMode === 'camera' && orientRef.current.active ? 'Tracked AR'
            : arMode === 'camera' ? 'Camera AR' : '3D Viewer';

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: arMode === 'desktop' ? 'var(--color-bg)' : '#000', overflow: 'hidden', touchAction: 'none' }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onWheel={onWheel}
        >
            {/* Camera feed */}
            <video ref={videoRef} autoPlay playsInline muted style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, display: 'none', background: '#000' }} />

            {/* Three.js canvas */}
            <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />

            {/* ── CONSENT ──────────────────────────────────── */}
            {phase === 'consent' && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', zIndex: 100, padding: 24 }}>
                    <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🍽️</div>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>{name}</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: '0.95rem', lineHeight: 1.5 }}>
                            View our menu in <strong>augmented reality</strong>. Point your camera at the table and see life-size 3D dishes.
                        </p>

                        {needsHttps && (
                            <div style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, textAlign: 'left' }}>
                                <p style={{ fontSize: '0.8rem', color: '#ffb400', margin: 0, fontWeight: 600 }}>⚠️ HTTPS Required for Camera</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                                    Run with: <code style={{ color: 'var(--color-primary)', fontSize: '0.72rem' }}>npm run dev:https</code>
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button className="btn btn-primary" onClick={startAR} style={{ width: '100%' }} data-ui="true">📷 Start AR Experience</button>
                            <button className="btn btn-ghost" onClick={startDesktopViewer} style={{ width: '100%' }} data-ui="true">View 3D Menu (No Camera)</button>
                        </div>

                        {errorMsg && <p style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: 12 }}>{errorMsg}</p>}
                    </div>
                </div>
            )}

            {/* ── LOADING ──────────────────────────────────── */}
            {phase === 'loading' && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', zIndex: 90 }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 16 }}>GWD <span style={{ color: 'var(--color-primary)' }}>XR</span></div>
                    <div style={{ width: 220, height: 4, background: 'var(--color-border)', borderRadius: 2 }}>
                        <div style={{ width: `${loadProgress}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--color-primary), #6366f1)', transition: 'width 0.3s ease' }} />
                    </div>
                    <p style={{ marginTop: 12, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{statusMsg}</p>
                </div>
            )}

            {/* ── UI OVERLAY (always in DOM for WebXR dom-overlay) ── */}
            <div ref={(el) => { overlayRef.current = el; if (el) el.addEventListener('beforexrselect', (e) => e.preventDefault()); }} data-ui="true" style={{ position: 'fixed', inset: 0, zIndex: 10, display: phase === 'ready' ? 'flex' : 'none', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'none' }}>

                {/* Top Bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', pointerEvents: 'auto', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)' }} data-ui="true">
                    <div style={{ fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                        {name || 'GWD'} <span style={{ color: 'var(--color-primary)' }}>XR</span>
                        <span style={{ fontSize: '0.65rem', marginLeft: 8, padding: '2px 6px', background: 'rgba(0,240,255,0.15)', borderRadius: 4, color: 'var(--color-primary)', verticalAlign: 'middle' }}>{modeLabel}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={handleShare} style={{ padding: '0 12px', backdropFilter: 'blur(10px)' }} data-ui="true">
                            📤 Share
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowCart(true)} style={{ position: 'relative', backdropFilter: 'blur(10px)' }} data-ui="true">
                            🛒 {cart.length > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--color-accent)', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cart.reduce((s, c) => s + c.quantity, 0)}</span>}
                        </button>
                    </div>
                </div>

                {/* Shift indicator */}
                {shiftHeld && arMode === 'desktop' && (
                    <div style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,240,255,0.2)', border: '1px solid rgba(0,240,255,0.4)', borderRadius: 8, padding: '4px 12px', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, pointerEvents: 'none' }}>
                        🔄 Rotate Mode (Shift held)
                    </div>
                )}

                {/* Hint */}
                {placedModels.length === 0 && (
                    <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', pointerEvents: 'none', maxWidth: 280 }}>
                        {arMode === 'webxr' ? 'Point at a flat surface. A ring will appear. Select a dish and tap to place.'
                            : 'Select a dish below, tap Place, then drag to move it around.'}
                    </div>
                )}

                {/* Bottom: Carousel + Actions */}
                <div style={{ pointerEvents: 'auto', padding: '0 12px 16px', background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} data-ui="true">

                    {/* Allergen Filter Pills */}
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                        {['gluten', 'dairy', 'nuts', 'vegan', 'vegetarian'].map(f => (
                            <button key={f} data-ui="true" onClick={() => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                                style={{
                                    flex: '0 0 auto', padding: '4px 10px', borderRadius: 16, fontSize: '0.7rem', fontWeight: 600,
                                    border: activeFilters.includes(f) ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                                    background: activeFilters.includes(f) ? 'rgba(0,240,255,0.15)' : 'rgba(0,0,0,0.3)',
                                    color: activeFilters.includes(f) ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer', backdropFilter: 'blur(6px)', transition: 'all 0.2s',
                                }}
                            >{f === 'gluten' ? '🌾 No Gluten' : f === 'dairy' ? '🥛 No Dairy' : f === 'nuts' ? '🥜 No Nuts' : f === 'vegan' ? '🌱 Vegan' : '🥕 Vegetarian'}</button>
                        ))}
                        {activeFilters.length > 0 && (
                            <button data-ui="true" onClick={() => setActiveFilters([])} style={{ flex: '0 0 auto', padding: '4px 10px', borderRadius: 16, fontSize: '0.7rem', border: '1px solid rgba(255,100,100,0.3)', background: 'rgba(255,100,100,0.1)', color: '#ff6b6b', cursor: 'pointer' }}>✕ Clear</button>
                        )}
                    </div>

                    {/* Menu Carousel */}
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                        {menuItems
                            .filter(item => {
                                if (activeFilters.length === 0) return true;
                                // For 'vegan'/'vegetarian' filters: item must HAVE the allergen tag
                                // For 'gluten'/'dairy'/'nuts': item must NOT have the allergen
                                return activeFilters.every(f => {
                                    if (f === 'vegan' || f === 'vegetarian') return (item.allergens || []).includes(f);
                                    return !(item.allergens || []).includes(f);
                                });
                            })
                            .map(item => {
                                const isSelected = selectedItem?.id === item.id;
                                const hasTags = item.tags && item.tags.length > 0;
                                return (
                                    <button key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        onDoubleClick={() => setShowDishInfo(item)}
                                        data-ui="true"
                                        style={{
                                            flex: '0 0 auto', scrollSnapAlign: 'center', width: 110, padding: '8px 6px',
                                            background: isSelected ? 'rgba(0,240,255,0.1)' : 'rgba(0,0,0,0.5)',
                                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                            color: 'var(--color-text)', backdropFilter: 'blur(12px)', transition: 'all 0.2s ease',
                                            position: 'relative',
                                            opacity: item.availability === 'unavailable' ? 0.4 : 1,
                                        }}
                                    >
                                        {/* Tags */}
                                        {hasTags && (
                                            <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2 }}>
                                                {item.tags.includes('chef-pick') && <span style={{ background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: 8, fontSize: '0.55rem', fontWeight: 700, whiteSpace: 'nowrap' }}>⭐ Chef</span>}
                                                {item.tags.includes('popular') && <span style={{ background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: 8, fontSize: '0.55rem', fontWeight: 700, whiteSpace: 'nowrap' }}>🔥 Hot</span>}
                                                {item.tags.includes('new') && <span style={{ background: '#22c55e', color: '#fff', padding: '1px 5px', borderRadius: 8, fontSize: '0.55rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✨ New</span>}
                                            </div>
                                        )}
                                        <span style={{ fontSize: '1.5rem', marginTop: hasTags ? 4 : 0 }}>{item.icon}</span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 500, lineHeight: 1.2, textAlign: 'center' }}>{item.name}</span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                                        {/* Bottom row: spice + rating */}
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.6rem' }}>
                                            {item.spiceLevel > 0 && <span>{'🌶️'.repeat(Math.min(item.spiceLevel, 3))}</span>}
                                            {item.reviews?.avgRating > 0 && <span style={{ color: '#fbbf24' }}>★{item.reviews.avgRating}</span>}
                                        </div>
                                    </button>
                                );
                            })
                        }
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-primary" disabled={!selectedItem} onClick={placeModel} style={{ flex: 1, opacity: selectedItem ? 1 : 0.5 }} data-ui="true">+ Place Item</button>
                        {selectedItem && (
                            <button className="btn btn-ghost" onClick={() => setShowDishInfo(selectedItem)} style={{ padding: '0 14px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }} data-ui="true">ℹ️</button>
                        )}
                        <button className="btn btn-accent" disabled={!selectedItem} onClick={addToCart} style={{ flex: 1, opacity: selectedItem ? 1 : 0.5 }} data-ui="true">
                            Add to Cart{selectedItem ? ` $${selectedItem.price.toFixed(2)}` : ''}
                        </button>
                    </div>
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', marginTop: 6 }}>
                        {arMode === 'webxr' ? 'Tap surface to place • Pinch to scale'
                            : arMode === 'desktop' ? 'Drag to move • Shift+Drag to rotate • Scroll to zoom'
                                : 'Drag to move • Pinch to scale'}
                    </p>
                </div>
            </div>

            {/* ── DISH INFO PANEL ─────────────────────────── */}
            {showDishInfo && (
                <div data-ui="true" onClick={() => { setShowDishInfo(null); setReviewRating(0); setReviewSubmitted(false); }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                >
                    <div onClick={e => e.stopPropagation()} data-ui="true"
                        style={{
                            width: '100%', maxWidth: 440, maxHeight: '70vh', overflowY: 'auto',
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
                            borderRadius: '20px 20px 0 0', padding: '20px 18px', backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
                            animation: 'slideUp 0.3s ease-out',
                        }}
                    >
                        {/* Drag handle */}
                        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 14px' }} />

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                    {showDishInfo.tags?.includes('chef-pick') && <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700 }}>⭐ Chef&apos;s Pick</span>}
                                    {showDishInfo.tags?.includes('popular') && <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700 }}>🔥 Popular</span>}
                                    {showDishInfo.tags?.includes('new') && <span style={{ background: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700 }}>✨ New</span>}
                                    {showDishInfo.tags?.includes('spicy') && <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700 }}>🌶️ Spicy</span>}
                                    {showDishInfo.tags?.includes('healthy') && <span style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700 }}>💚 Healthy</span>}
                                </div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{showDishInfo.icon} {showDishInfo.name}</h3>
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>${showDishInfo.price.toFixed(2)}</span>
                        </div>

                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 14px' }}>{showDishInfo.description}</p>

                        {/* Info chips */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                            {showDishInfo.calories > 0 && (
                                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>🔥 {showDishInfo.calories} cal</span>
                            )}
                            {showDishInfo.prepTime && (
                                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>⏱️ {showDishInfo.prepTime}</span>
                            )}
                            {showDishInfo.spiceLevel > 0 && (
                                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem' }}>
                                    {'🌶️'.repeat(showDishInfo.spiceLevel)} <span style={{ color: 'var(--color-text-muted)', marginLeft: 2 }}>{showDishInfo.spiceLevel}/5</span>
                                </span>
                            )}
                            {showDishInfo.availability === 'limited' && (
                                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600 }}>⚠️ Limited</span>
                            )}
                        </div>

                        {/* Ingredients */}
                        {showDishInfo.ingredients?.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Ingredients</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {showDishInfo.ingredients.map((ing, i) => (
                                        <span key={i} style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{ing}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Allergens */}
                        {showDishInfo.allergens?.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Allergen Info</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {showDishInfo.allergens.map((a, i) => (
                                        <span key={i} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem' }}>⚠ {a}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Reviews</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
                                    {showDishInfo.reviews?.avgRating?.toFixed(1) || '—'}
                                </div>
                                <div>
                                    <div style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                                        {'★'.repeat(Math.round(showDishInfo.reviews?.avgRating || 0))}{'☆'.repeat(5 - Math.round(showDishInfo.reviews?.avgRating || 0))}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        {showDishInfo.reviews?.count || 0} reviews
                                    </div>
                                </div>
                            </div>
                            {/* Quick rate */}
                            {!reviewSubmitted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Rate:</span>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} data-ui="true" onClick={() => setReviewRating(n)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: n <= reviewRating ? '#fbbf24' : 'rgba(255,255,255,0.2)', transition: 'color 0.15s', padding: 2 }}
                                        >{n <= reviewRating ? '★' : '☆'}</button>
                                    ))}
                                    {reviewRating > 0 && (
                                        <button data-ui="true" className="btn btn-primary btn-sm"
                                            onClick={async () => {
                                                try {
                                                    await fetch('/api/reviews', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ slug: restaurant.slug, itemId: showDishInfo.id, rating: reviewRating }),
                                                    });
                                                    setReviewSubmitted(true);
                                                } catch (e) { console.error('[AR] Review error:', e); }
                                            }}
                                            style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                                        >Submit</button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600 }}>✓ Thanks for your review!</div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button className="btn btn-primary" data-ui="true" style={{ flex: 1 }} onClick={() => { setSelectedItem(showDishInfo); placeModel(); setShowDishInfo(null); }}>+ Place in AR</button>
                            <button className="btn btn-accent" data-ui="true" style={{ flex: 1 }} onClick={() => { setSelectedItem(showDishInfo); addToCart(); setShowDishInfo(null); }}>Add to Cart</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CART PANEL ───────────────────────────────── */}
            {showCart && (
                <div className="modal-backdrop" onClick={() => setShowCart(false)} data-ui="true" style={{ zIndex: 50 }}>
                    <div className="modal" onClick={e => e.stopPropagation()} data-ui="true">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Your Order</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowCart(false)} data-ui="true">✕</button>
                        </div>
                        {cart.length === 0 ? (
                            <p style={{ color: 'var(--color-text-secondary)', padding: '24px 0', textAlign: 'center' }}>Cart is empty. Select a dish and add it!</p>
                        ) : (
                            <>
                                {cart.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <div><span style={{ marginRight: 8 }}>{item.icon}</span><strong>{item.name}</strong><span style={{ color: 'var(--color-text-secondary)', marginLeft: 8 }}>×{item.quantity}</span></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>${(item.price * item.quantity).toFixed(2)}</span><button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.id)} data-ui="true">✕</button></div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontWeight: 700, fontSize: '1.1rem' }}><span>Total</span><span style={{ color: 'var(--color-primary)' }}>${cartTotal.toFixed(2)}</span></div>
                                <button className="btn btn-primary" onClick={checkout} data-ui="true" style={{ width: '100%' }}>Place Order — ${cartTotal.toFixed(2)}</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
