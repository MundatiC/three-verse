import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import spline from './spline.js';
import {RenderPass} from 'jsm/postprocessing/RenderPass.js';
import {EffectComposer} from 'jsm/postprocessing/EffectComposer.js';
import {UnrealBloomPass} from 'jsm/postprocessing/UnrealBloomPass.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
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

//postprocessing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 180);
bloomPass.threshold = 0.02;
bloomPass.strength = 3.5;
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// create a line geometry from the spline
const geometry = new THREE.BufferGeometry();
const points = spline.getPoints(100);
geometry.setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const line = new THREE.Line(geometry, material);
// scene.add(line);

//create a tube geometry from the spline
const tubeGeometry = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);

//create edges geometry from the tube
const edges = new THREE.EdgesGeometry(tubeGeometry, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000});
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

//create boxes along the spline
const numBoxes = 55;
const size = 0.075;
const boxGeometry = new THREE.BoxGeometry(size, size, size);
for (let i = 0; i < numBoxes; i += 1) {
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

    const p = (i / numBoxes + Math.random() * 0.1) % 1;
    const pos = tubeGeometry.parameters.path.getPointAt(p);

    pos.x += Math.random() - 0.4;
    pos.z += Math.random() - 0.4;

    boxMesh.position.copy(pos);
    const rotate = new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    boxMesh.rotation.set(rotate.x, rotate.y, rotate.z);

    const boxEdges = new THREE.EdgesGeometry(boxGeometry, 0.2);
    const color = new THREE.Color().setHSL(1.0 - p, 1, 0.5);
    const lineMat = new THREE.LineBasicMaterial({color});
    const boxLines = new THREE.LineSegments(boxEdges, lineMat);
    boxLines.position.copy(pos);
    boxLines.rotation.set(rotate.x, rotate.y, rotate.z);
    // scene.add(boxMesh);
    scene.add(boxLines);
}


function updateCamera(t) {
    const time = t * 0.1;
    const looptime = 6 * 1000;
    const p = (time % looptime) / looptime;
    const pos = tubeGeometry.parameters.path.getPointAt(p);
    const lookAt = tubeGeometry.parameters.path.getPointAt((p + 0.03) % 1);
    camera.position.copy(pos);
    camera.lookAt(lookAt);
}

function animate(t = 0) {
    requestAnimationFrame(animate);
    updateCamera(t);
    composer.render(scene, camera);
    controls.update();
}
animate();

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);
