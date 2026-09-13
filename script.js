// Front page head with cursor-tracking eyes.
//
// Loads assets/head.glb if it exists. The GLB needs two nodes (bones or
// meshes) named LeftEye / RightEye, which is what Ready Player Me exports.
// If no GLB is present, a plain procedural head is used so the tracking is
// visible while a real model is sourced.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('face');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 0, 6);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(2, 3, 4);
scene.add(key);

// Point the eyes look at. Lives on a plane in front of the face.
const target = new THREE.Vector3(0, 0, 4);
const wanted = new THREE.Vector3(0, 0, 4);

let head = null; // Object3D nudged by the cursor
let eyes = [];   // Object3Ds pointed at the target

function buildPlaceholder() {
  const group = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({ color: 0xd9b8a2, roughness: 0.7 });
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), skin);
  headMesh.scale.set(0.85, 1, 0.9);
  group.add(headMesh);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 16), skin);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.1, 0.92);
  group.add(nose);

  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x5f86a3, roughness: 0.4 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x111111 });

  function eye(x) {
    const e = new THREE.Group();
    e.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), white));
    const i = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), iris);
    i.position.z = 0.155;
    e.add(i);
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), pupil);
    p.position.z = 0.158;
    e.add(p);
    e.position.set(x, 0.18, 0.72);
    return e;
  }
  const l = eye(-0.3);
  const r = eye(0.3);
  group.add(l, r);

  return { root: group, eyes: [l, r] };
}

function findEyes(root) {
  const found = [];
  root.traverse((o) => {
    const n = o.name.toLowerCase();
    if (n === 'lefteye' || n === 'righteye' || n === 'eye_l' || n === 'eye_r') found.push(o);
  });
  return found;
}

function fitToView(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
}

new GLTFLoader().load(
  'assets/head.glb',
  (gltf) => {
    head = gltf.scene;
    fitToView(head);
    eyes = findEyes(head);
    if (eyes.length === 0) console.warn('head.glb has no LeftEye/RightEye nodes, eyes will not track');
    scene.add(head);
  },
  undefined,
  () => {
    const p = buildPlaceholder();
    head = p.root;
    eyes = p.eyes;
    scene.add(head);
  }
);

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

window.addEventListener('pointermove', (e) => {
  const x = (e.clientX / window.innerWidth) * 2 - 1;
  const y = -(e.clientY / window.innerHeight) * 2 + 1;
  wanted.set(x * 3, y * 2, 4);
});

function tick() {
  resize();
  target.lerp(wanted, 0.12);

  if (head) {
    // Slight head follow, the eyes do most of the work.
    head.rotation.y += (target.x * 0.08 - head.rotation.y) * 0.05;
    head.rotation.x += (-target.y * 0.06 - head.rotation.x) * 0.05;
    for (const eye of eyes) eye.lookAt(target);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
