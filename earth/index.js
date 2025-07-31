import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getStarfield from './src/getStarfield.js';
import { getFresnelMat } from './src/getFresnelMat.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const loader = new THREE.TextureLoader();

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);

const detail = 12;
const geo = new THREE.IcosahedronGeometry(1, detail);
const mat = new THREE.MeshPhongMaterial({
    map: loader.load('./textures/00_earthmap1k.jpg'),
    specularMap: loader.load('./textures/02_earthspec1k.jpg'),
    bumpMap: loader.load('./textures/01_earthbump1k.jpg'),
    bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geo, mat);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
    map: loader.load('./textures/03_earthlights1k.jpg'),
    blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geo, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
    map: loader.load('./textures/04_earthcloudmap.jpg'),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.5,
    alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
});
const cloudsMesh = new THREE.Mesh(geo, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geo, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const moonGeo = new THREE.SphereGeometry(0.27, 32, 32);
const moonMat = new THREE.MeshPhongMaterial({
    map: loader.load('./textures/moonmap1k.jpg'),
    bumpMap: loader.load('./textures/moonbump1k.jpg'),
    bumpScale: 0.02,
});
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
const moonOrbit = new THREE.Group();
moonOrbit.position.set(0, 0, 0);
moonMesh.position.set(3, 0, 0);
moonOrbit.add(moonMesh);
scene.add(moonOrbit);

function createPlanet(textureURL, size, orbitPos, bumpMapURL = null, bumpScale = 0.05, data = {}) {
    const materialParams = { map: loader.load(textureURL) };
    if (bumpMapURL) {
        materialParams.bumpMap = loader.load(bumpMapURL);
        materialParams.bumpScale = bumpScale;
    }

    const planetGeo = new THREE.SphereGeometry(size, 64, 64);
    const planetMat = new THREE.MeshStandardMaterial(materialParams);
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);

    // Rotation tilt
    const axialTilt = new THREE.Group();
    axialTilt.rotation.z = THREE.MathUtils.degToRad(data.tilt || 0);
    axialTilt.add(planetMesh);

    // Revolution
    const orbitGroup = new THREE.Group();
    orbitGroup.position.copy(orbitPos); 
    planetMesh.position.set(0, 0, 0);
    orbitGroup.add(axialTilt);

    // Attach metadata for animation
    orbitGroup.userData = {
        planetMesh,
        axialTilt,
        rotationSpeed: data.rotationSpeed || 0,
        orbitSpeed: data.orbitSpeed || 0
    };

    return orbitGroup;
}


function createRing(innerRadius, outerRadius, textureURL, alphaURL) {
    const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        map: loader.load(textureURL),
        alphaMap: loader.load(alphaURL),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    return ringMesh;
}

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

const planets = [];
const planetData = {
    Mercury: { tilt: 0.03, rotationSpeed: 0.004, orbitSpeed: 0.002 },
    Venus: { tilt: 177.4, rotationSpeed: -0.0005, orbitSpeed: 0.0015 },
    Earth: { tilt: 23.4, rotationSpeed: 0.002, orbitSpeed: 0.001 },
    Mars: { tilt: 25.2, rotationSpeed: 0.0018, orbitSpeed: 0.0009 },
    Jupiter: { tilt: 3.1, rotationSpeed: 0.005, orbitSpeed: 0.0005 },
    Saturn: { tilt: 26.7, rotationSpeed: 0.004, orbitSpeed: 0.0004 },
    Uranus: { tilt: 97.8, rotationSpeed: -0.003, orbitSpeed: 0.0003 },
    Neptune: { tilt: 28.3, rotationSpeed: 0.003, orbitSpeed: 0.0002 }
};

planets.push({ name: '🟠 Mercury', mesh: createPlanet('./textures/mercurymap.jpg', 0.4, new THREE.Vector3(10, 0, -20), './textures/mercurybump.jpg', 0.1, planetData.Mercury) });
planets.push({ name: '🟠 Venus', mesh: createPlanet('./textures/venusmap.jpg', 0.5, new THREE.Vector3(12, 0, -25), './textures/venusbump.jpg', 0.1, planetData.Venus) });
planets.push({ name: '🔴 Mars', mesh: createPlanet('./textures/8k_mars.jpg', 0.6, new THREE.Vector3(15, 4, -30), './textures/mars_1k_topo.jpg', 0.03, planetData.Mars) });
planets.push({ name: '⏺ Jupiter', mesh: createPlanet('./textures/jupitermap.jpg', 0.7, new THREE.Vector3(18, 0, -35), null, 0, planetData.Jupiter) });

const saturn = createPlanet('./textures/saturnmap.jpg', 0.8, new THREE.Vector3(30, 0, -40), null, 0, planetData.Saturn);
saturn.add(createRing(1.1, 1.9, './textures/saturnringcolor.jpg', './textures/saturnringpattern.gif'));
planets.push({ name: '🪐 Saturn', mesh: saturn });

const uranus = createPlanet('./textures/uranusmap.jpg', 0.9, new THREE.Vector3(-25, -3, -35), null, 0, planetData.Uranus);
uranus.add(createRing(1.2, 1.6, './textures/uranusringcolour.jpg', './textures/uranusringtrans.gif'));
planets.push({ name: '🌑 Uranus', mesh: uranus });

planets.push({ name: '🔵 Neptune', mesh: createPlanet('./textures/neptunemap.jpg', 1.0, new THREE.Vector3(-30, 0, -45), null, 0, planetData.Neptune) });


planets.forEach(p => scene.add(p.mesh));

const stars = getStarfield({ numStars: 2000, minRadius: 80, maxRadius: 160 });
scene.add(stars);

let lerpTargetPos = null;
let lerpTargetLook = null;

function focusOnObject(object3D, offset = new THREE.Vector3(5, 2, 5)) {
    const targetWorldPos = new THREE.Vector3();
    object3D.getWorldPosition(targetWorldPos);
    lerpTargetPos = targetWorldPos.clone().add(offset);
    lerpTargetLook = targetWorldPos.clone();
}

function animate() {
    requestAnimationFrame(animate);

    earthMesh.rotation.y += 0.002;
    lightsMesh.rotation.y += 0.002;
    cloudsMesh.rotation.y += 0.0023;
    glowMesh.rotation.y += 0.002;

    stars.rotation.y += 0.0002;
    moonOrbit.rotation.y += 0.001;

    if (lerpTargetPos && lerpTargetLook) {
        camera.position.lerp(lerpTargetPos, 0.05);
        controls.target.lerp(lerpTargetLook, 0.05);
        controls.update();

        if (camera.position.distanceTo(lerpTargetPos) < 0.01) {
            lerpTargetPos = null;
            lerpTargetLook = null;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

function createFocusButton(label, target) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.position = 'absolute';
    btn.style.top = '10px';
    btn.style.left = `${10 + document.body.querySelectorAll('button').length * 110}px`;
    btn.style.padding = '6px 12px';
    btn.style.background = '#222';
    btn.style.color = '#fff';
    btn.style.border = '1px solid #444';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '1000';
    btn.onclick = () => focusOnObject(target);
    document.body.appendChild(btn);
}

createFocusButton('🌍 Earth', earthMesh);
createFocusButton('🌕 Moon', moonMesh);
planets.forEach(p => createFocusButton(p.name, p.mesh));

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
