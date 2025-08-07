import * as THREE from "three";
import spline from "./spline.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "jsm/postprocessing/UnrealBloomPass.js";
import { getStarfield } from './getStarfield.js';

// Game state
let gameState = {
    isPaused: false,
    ammo: 10,
    score: 0,
    volume: 0.5,
    difficulty: 1,
    startingAmmo: 10
};

// DOM elements
const landingPage = document.getElementById('landing-page');
const gameCanvas = document.getElementById('game-canvas');
const pauseMenu = document.getElementById('pause-menu');
const instructionsMenu = document.getElementById('instructions-menu');
const settingsMenu = document.getElementById('settings-menu');
const ammoCount = document.getElementById('ammo-count');
const scoreDisplay = document.getElementById('score');
const volumeControl = document.getElementById('volume-control');
const difficultyControl = document.getElementById('difficulty-control');
const startingAmmoControl = document.getElementById('starting-ammo');

// Button event listeners
document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('instructions-btn').addEventListener('click', showInstructions);
document.getElementById('settings-btn').addEventListener('click', showSettings);
document.getElementById('back-from-instructions').addEventListener('click', hideInstructions);
document.getElementById('back-from-settings').addEventListener('click', hideSettings);
document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('resume-game').addEventListener('click', resumeGame);
document.getElementById('quit-to-menu').addEventListener('click', quitToMenu);

// Load saved settings
function loadSettings() {
    const savedSettings = localStorage.getItem('battleGalacticaSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        gameState.volume = settings.volume || 0.5;
        gameState.difficulty = settings.difficulty || 1;
        gameState.startingAmmo = settings.startingAmmo || 10;

        volumeControl.value = gameState.volume;
        difficultyControl.value = gameState.difficulty;
        startingAmmoControl.value = gameState.startingAmmo;
    }
}

function saveSettings() {
    gameState.volume = parseFloat(volumeControl.value);
    gameState.difficulty = parseFloat(difficultyControl.value);
    gameState.startingAmmo = parseInt(startingAmmoControl.value);

    localStorage.setItem('battleGalacticaSettings', JSON.stringify({
        volume: gameState.volume,
        difficulty: gameState.difficulty,
        startingAmmo: gameState.startingAmmo
    }));

    hideSettings();
}

function showInstructions() {
    landingPage.style.display = 'none';
    instructionsMenu.style.display = 'block';
}

function hideInstructions() {
    instructionsMenu.style.display = 'none';
    landingPage.style.display = 'flex';
}

function showSettings() {
    landingPage.style.display = 'none';
    settingsMenu.style.display = 'block';
}

function hideSettings() {
    settingsMenu.style.display = 'none';
    landingPage.style.display = 'flex';
}

function startGame() {
    loadSettings();
    gameState.ammo = gameState.startingAmmo;
    gameState.score = 0;
    gameState.isPaused = false;

    updateUI();
    landingPage.style.display = 'none';
    gameCanvas.style.display = 'block';
    initGame();
}

function pauseGame() {
    gameState.isPaused = true;
    pauseMenu.style.display = 'flex';
}

function resumeGame() {
    gameState.isPaused = false;
    pauseMenu.style.display = 'none';
}

function quitToMenu() {
    gameState.isPaused = false;
    pauseMenu.style.display = 'none';
    gameCanvas.style.display = 'none';
    landingPage.style.display = 'flex';

    // Clean up game resources
    if (renderer) {
        renderer.dispose();
    }
    if (scene) {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
}

function updateUI() {
    ammoCount.textContent = gameState.ammo;
    scoreDisplay.textContent = gameState.score;
}

// Game variables
let w, h, scene, camera, renderer, composer, crosshairs, laserGeo, raycaster, direction,tubeHitArea;
let tubeGeo, boxGroup, lasers = [];
let fitzSound, laserSound;
let mousePos = new THREE.Vector2();
let impactPos = new THREE.Vector3();
let impactColor = new THREE.Color();
let impactBox = null;

function initGame() {
    w = window.innerWidth;
    h = window.innerHeight;

    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.3);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;
    scene.add(camera);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Post-processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
    bloomPass.threshold = 0.002;
    bloomPass.strength = 3.5;
    bloomPass.radius = 0;
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Sound Effects
    const sounds = [];
    const manager = new THREE.LoadingManager();
    const audioLoader = new THREE.AudioLoader(manager);
    const mp3s = ["fitz", "laser-01", "blarmp"];
    const listener = new THREE.AudioListener();
    camera.add(listener);

    mp3s.forEach((name) => {
        const sound = new THREE.Audio(listener);
        sound.name = name;
        sound.setVolume(gameState.volume);
        if (name === "blarmp") {
            fitzSound = sound;
        }
        if (name === "laser-01") {
            laserSound = sound;
        }
        sounds.push(sound);
        audioLoader.load(`./sfx/${name}.mp3`, function (buffer) {
            sound.setBuffer(buffer);
        });
    });

    // Starfield
    const stars = getStarfield();
    scene.add(stars);

    // Create tunnel
    tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);
    const tubeColor = 0x00ccff;
    const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
    const lineMat = new THREE.LineBasicMaterial({ color: tubeColor });
    const tubeLines = new THREE.LineSegments(edges, lineMat);
    scene.add(tubeLines);

    const hitMat = new THREE.MeshBasicMaterial({
        color: tubeColor,
        transparent: true,
        opacity: 0.0,
        side: THREE.BackSide
    });
    tubeHitArea = new THREE.Mesh(tubeGeo, hitMat);
    tubeHitArea.name = 'tube';
    scene.add(tubeHitArea);

    // Create targets
    boxGroup = new THREE.Group();
    scene.add(boxGroup);

    const numBoxes = 55;
    const size = 0.10;
    const boxGeo = new THREE.BoxGeometry(size, size, size);
    for (let i = 0; i < numBoxes; i += 1) {
        const p = (i / numBoxes + Math.random() * 0.1) % 1;
        const pos = tubeGeo.parameters.path.getPointAt(p);
        const color = new THREE.Color().setHSL(0.7 + p, 1, 0.5);
        const boxMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.0
        });
        const hitBox = new THREE.Mesh(boxGeo, boxMat);
        hitBox.name = 'box';

        pos.x += Math.random() - 0.4;
        pos.z += Math.random() - 0.4;
        hitBox.position.copy(pos);
        const rote = new THREE.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        hitBox.rotation.set(rote.x, rote.y, rote.z);
        const edges = new THREE.EdgesGeometry(boxGeo, 0.2);

        const lineMat = new THREE.LineBasicMaterial({ color });
        const boxLines = new THREE.LineSegments(edges, lineMat);
        boxLines.position.copy(pos);
        boxLines.rotation.set(rote.x, rote.y, rote.z);
        hitBox.userData.box = boxLines;
        boxGroup.add(hitBox);
        scene.add(boxLines);
    }

    // Crosshairs
    crosshairs = new THREE.Group();
    crosshairs.position.z = -1;
    camera.add(crosshairs);
    const crossMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
    });
    const lineGeo = new THREE.BufferGeometry();
    const lineVerts = [0, 0.05, 0, 0, 0.02, 0];
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));

    for (let i = 0; i < 4; i += 1) {
        const line = new THREE.Line(lineGeo, crossMat);
        line.rotation.z = i * 0.5 * Math.PI;
        crosshairs.add(line);
    }

    // Laser setup
    laserGeo = new THREE.IcosahedronGeometry(0.05, 2);
    raycaster = new THREE.Raycaster();
    direction = new THREE.Vector3();

    // Event listeners
    window.addEventListener('click', fireLaser);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('resize', handleWindowResize, false);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (gameState.isPaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    });

    animate();
}

function getLaserBolt() {
    const laserMat = new THREE.MeshBasicMaterial({
        color: 0xFFCC00,
        transparent: true,
        fog: false
    });
    const laserBolt = new THREE.Mesh(laserGeo, laserMat);
    laserBolt.position.copy(camera.position);

    let active = true;
    let speed = 0.5 * gameState.difficulty;

    let goalPos = camera.position.clone()
        .setFromMatrixPosition(crosshairs.matrixWorld);

    const laserDirection = new THREE.Vector3(0, 0, 0);
    laserDirection.subVectors(laserBolt.position, goalPos)
        .normalize()
        .multiplyScalar(speed);

    direction.subVectors(goalPos, camera.position);
    raycaster.set(camera.position, direction);
    let intersects = raycaster.intersectObjects([...boxGroup.children, tubeHitArea], true);

    if (intersects.length > 0) {
        impactPos.copy(intersects[0].point);
        impactColor.copy(intersects[0].object.material.color);
        if (intersects[0].object.name === 'box') {
            impactBox = intersects[0].object.userData.box;
            boxGroup.remove(intersects[0].object);
            fitzSound.stop();
            fitzSound.setVolume(gameState.volume);
            fitzSound.play();

            // Score points and gain ammo
            gameState.score += 100;
            gameState.ammo += 1;
            updateUI();
        }
    }

    let scale = 1.0;
    let opacity = 1.0;
    let isExploding = false;

    function update() {
        if (active === true && !gameState.isPaused) {
            if (isExploding === false) {
                laserBolt.position.sub(laserDirection);

                if (laserBolt.position.distanceTo(impactPos) < 0.5) {
                    laserBolt.position.copy(impactPos);
                    laserBolt.material.color.set(impactColor);
                    isExploding = true;
                    impactBox?.scale.setScalar(0.0);
                }
            } else {
                if (opacity > 0.01) {
                    scale += 0.2;
                    opacity *= 0.85;
                } else {
                    opacity = 0.0;
                    scale = 0.01;
                    active = false;
                }
                laserBolt.scale.setScalar(scale);
                laserBolt.material.opacity = opacity;
                laserBolt.userData.active = active;
            }
        }
    }
    laserBolt.userData = { update, active };
    return laserBolt;
}

function fireLaser() {
    if (gameState.isPaused || gameState.ammo <= 0) return;

    gameState.ammo -= 1;
    updateUI();

    const laser = getLaserBolt();
    lasers.push(laser);
    scene.add(laser);
    laserSound.stop();
    laserSound.setVolume(gameState.volume);
    laserSound.play();

    // Cleanup inactive lasers
    let inactiveLasers = lasers.filter((l) => l.userData.active === false);
    scene.remove(...inactiveLasers);
    lasers = lasers.filter((l) => l.userData.active === true);
}

function updateCamera(t) {
    if (gameState.isPaused) return;

    const time = t * 0.06 * gameState.difficulty;
    const looptime = 10 * 1000;
    const p = (time % looptime) / looptime;
    const pos = tubeGeo.parameters.path.getPointAt(p);
    const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
    camera.position.copy(pos);
    camera.lookAt(lookAt);
}

function animate(t = 0) {
    requestAnimationFrame(animate);

    if (!gameState.isPaused) {
        updateCamera(t);
        crosshairs.position.set(mousePos.x, mousePos.y, -1);
        lasers.forEach(l => l.userData.update());
    }

    composer.render(scene, camera);
}

function onMouseMove(evt) {
    w = window.innerWidth;
    h = window.innerHeight;
    let aspect = w / h;
    let fudge = { x: aspect * 0.75, y: 0.75 };
    mousePos.x = ((evt.clientX / w) * 2 - 1) * fudge.x;
    mousePos.y = (-1 * (evt.clientY / h) * 2 + 1) * fudge.y;
}

function handleWindowResize() {
    w = window.innerWidth;
    h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
}

// Load settings when page loads
loadSettings();