import * as THREE from "three";

const objCount = 5000;
function getMeshProps() {
  const arr = [];
  for (let i = 0; i < objCount; i += 1) {
    arr.push(
      {
        position: {
          x: Math.random() * 10000 - 5000,
          y: Math.random() * 6000 - 3000,
          z: Math.random() * 8000 - 4000
        },
        rotation: {
          x: Math.random() * 2 * Math.PI,
          y: Math.random() * 2 * Math.PI,
          z: Math.random() * 2 * Math.PI,
        },
        scale: Math.random() * 200 + 100
      }
    )
  }
  return arr;
}

const dummyProps = getMeshProps();
function getMesh(material, needsAnimatedColor = false) {
  const size = 0.25;
  const geometry = new THREE.IcosahedronGeometry(size, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, objCount);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let props;
  for (let i = 0; i < objCount; i++) {
    props = dummyProps[i];
    dummy.position.x = props.position.x;
    dummy.position.y = props.position.y;
    dummy.position.z = props.position.z;

    dummy.rotation.x = props.rotation.x;
    dummy.rotation.y = props.rotation.y;
    dummy.rotation.z = props.rotation.z;

    dummy.scale.set(props.scale, props.scale, props.scale);

    dummy.updateMatrix();

    mesh.setMatrixAt(i, dummy.matrix);
    if (needsAnimatedColor) { mesh.setColorAt(i, color.setScalar(0.1 + 0.9 * Math.random())); }
  }
  return mesh;
}

export function getFXScene({ renderer, material, clearColor, needsAnimatedColor = false }) {

  const w = window.innerWidth;
  const h = window.innerHeight;
  const camera = new THREE.PerspectiveCamera( 50, w / h, 1, 10000);
  camera.position.z = 2000;

  // Setup scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(clearColor, 0.0002);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.0));
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff0000, 2, 1000);
pointLight.position.set(0, 0, 500);
scene.add(pointLight);
  const mesh = getMesh(material, needsAnimatedColor);
  scene.add(mesh);

  const fbo = new THREE.WebGLRenderTarget(w, h);

  const rotationSpeed = new THREE.Vector3(0.1, -0.2, 0.15);
  const update = (delta) => {
    mesh.rotation.x += delta * rotationSpeed.x;
    mesh.rotation.y += delta * rotationSpeed.y;
    mesh.rotation.z += delta * rotationSpeed.z;
    if (needsAnimatedColor) {
       const time = Date.now() * 0.0002;
    material.color.setHSL(0.1 + 0.5 * Math.sin(time), 1, 0.5);
    
    // Animate point light
    pointLight.color.setHSL(Math.sin(time * 0.7) * 0.5 + 0.5, 1, 0.5);
    pointLight.position.x = Math.sin(time * 0.3) * 1000;
    pointLight.position.y = Math.cos(time * 0.2) * 1000;
    }
  }

  const render = (delta, rtt) => {
    update(delta);

    renderer.setClearColor(clearColor);

    if (rtt) {
      renderer.setRenderTarget(fbo);
      renderer.clear();
      renderer.render(scene, camera);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  };

  return { fbo, render, update };
};