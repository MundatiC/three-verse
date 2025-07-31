import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import spline from './spline.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// create a line geometry from the spline
const geometry = new THREE.BufferGeometry();
const points = spline.getPoints(100);
geometry.setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const line = new THREE.Line(geometry, material);
// scene.add(line);

//create a tube geometry from the spline
const tubeGeometry = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);
const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true });
const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
scene.add(tubeMesh);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
scene.add(hemiLight);

function updateCamera(t) {
    const time = t * 0.1;
    const looptime = 8 * 1000;
    const p = (time % looptime) / looptime;
    const pos = tubeGeometry.parameters.path.getPointAt(p);
    const lookAt = tubeGeometry.parameters.path.getPointAt((p + 0.03) % 1);
    camera.position.copy(pos);
    camera.lookAt(lookAt);
}

function animate(t = 0) {
    requestAnimationFrame(animate);
    updateCamera(t);
    renderer.render(scene, camera);
    controls.update();
}
animate();

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
