import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('face');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = new THREE.Vector2();
const gaze = new THREE.Vector3(0, 0, 3);
const localGaze = new THREE.Vector3();
let renderer;

async function start() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0xe8e5df, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.3, 0.3, 0.215, -0.215, 0.01, 10);
  camera.position.set(0, -0.055, 1);
  camera.lookAt(0, -0.055, 0);

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const lighting = pmrem.fromScene(environment, 0.04);
  scene.environment = lighting.texture;
  scene.environmentIntensity = 0.38;
  environment.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x514839, 0.65));
  const key = new THREE.DirectionalLight(0xffead9, 2.2);
  key.position.set(-0.5, 0.55, 0.8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8efff, 0.75);
  fill.position.set(0.6, 0.15, 0.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffefd9, 1.3);
  rim.position.set(0.3, 0.4, -0.5);
  scene.add(rim);

  const decoder = new DRACOLoader();
  decoder.setDecoderPath('./assets/vendor/three/draco/');
  decoder.setDecoderConfig({ type: 'wasm' });
  const loader = new GLTFLoader().setDRACOLoader(decoder);
  const gltf = await loader.loadAsync('./assets/head.glb');
  decoder.dispose();

  const character = gltf.scene.getObjectByName('Character');
  const eyes = ['LeftEye', 'RightEye'].map(name => gltf.scene.getObjectByName(name));
  if (!character || eyes.some(eye => !eye)) throw new Error('The head model is missing its eye pivots.');

  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material.map) material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      // Cutouts retain depth testing, so hair and corneas occlude correctly.
      if (['BlackHair', 'Brows', 'Lashes'].includes(material.name)) {
        material.transparent = false;
        material.alphaTest = 0.25;
        material.alphaToCoverage = true;
        material.depthWrite = true;
        material.needsUpdate = true;
      }
      if (material.name === 'BrownEyes') {
        material.transparent = true;
        material.side = THREE.FrontSide;
        material.depthWrite = true;
        material.needsUpdate = true;
      }
    }
  });
  scene.add(gltf.scene);

  let frame = 0;
  let lastTime = 0;
  let visible = true;
  let activePointer = false;
  let stopped = false;
  const desired = { yaw: 0, pitch: 0 };
  const clamp = THREE.MathUtils.clamp;

  function queue() {
    if (!frame && visible && !document.hidden && !stopped) {
      frame = requestAnimationFrame(draw);
    }
  }

  function draw(time) {
    frame = 0;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = time;
    const headEase = motion.matches ? 1 : 1 - Math.exp(-5 * dt);
    const eyeEase = motion.matches ? 1 : 1 - Math.exp(-15 * dt);

    character.rotation.y = THREE.MathUtils.lerp(character.rotation.y, desired.yaw, headEase);
    character.rotation.x = THREE.MathUtils.lerp(character.rotation.x, desired.pitch, headEase);
    character.updateWorldMatrix(true, true);

    if (activePointer && !motion.matches) {
      gaze.set(pointer.x * (camera.right - camera.left) / 2,
        pointer.y * 0.215 + camera.position.y, 0.72);
    } else {
      gaze.set(0, 0, 3);
    }
    localGaze.copy(gaze);
    character.worldToLocal(localGaze);

    let moving = Math.abs(desired.yaw - character.rotation.y)
      + Math.abs(desired.pitch - character.rotation.x);
    for (const eye of eyes) {
      const direction = localGaze.clone().sub(eye.position);
      const yaw = clamp(Math.atan2(direction.x, direction.z), -0.3, 0.3);
      const pitch = clamp(-Math.atan2(direction.y, Math.hypot(direction.x, direction.z)), -0.2, 0.2);
      eye.rotation.order = 'YXZ';
      eye.rotation.y = THREE.MathUtils.lerp(eye.rotation.y, yaw, eyeEase);
      eye.rotation.x = THREE.MathUtils.lerp(eye.rotation.x, pitch, eyeEase);
      moving += Math.abs(yaw - eye.rotation.y) + Math.abs(pitch - eye.rotation.x);
    }

    renderer.render(scene, camera);
    canvas.classList.add('is-ready');
    if (moving > 0.0001) queue();
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(bounds.width, bounds.height, false);
    const halfHeight = 0.215;
    const halfWidth = halfHeight * bounds.width / bounds.height;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    queue();
  }

  function rest() {
    activePointer = false;
    desired.yaw = desired.pitch = 0;
    queue();
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  document.addEventListener('pointermove', event => {
    if (motion.matches || !visible || event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set(clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1.8, 1.8),
      clamp(1 - (event.clientY - bounds.top) / bounds.height * 2, -1.2, 1.2));
    activePointer = true;
    desired.yaw = Math.tanh(pointer.x) * 0.22;
    desired.pitch = -Math.tanh(pointer.y) * 0.065;
    queue();
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', rest);
  window.addEventListener('blur', rest);
  motion.addEventListener('change', rest);
  window.addEventListener('resize', resize, { passive: true });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resize();
    else pause();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else rest();
  });
  canvas.addEventListener('webglcontextlost', () => {
    stopped = true;
    pause();
    canvas.classList.remove('is-ready');
  });
  resize();
}

start().catch(error => {
  canvas.classList.remove('is-ready');
  renderer?.dispose();
  console.warn('The 3D portrait could not load.', error);
});
