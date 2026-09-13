import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// The portrait is the reference photo projected onto a warped head mesh. The
// photo's own light does most of the shading; a small studio probe and a weak
// key add the highlights that move when the head turns, and the corneas
// reflect the probe for their catchlight. The eyes are separate spheres that
// follow the cursor. For a blink the lids swing around each eyeball as stiff
// pieces below the crease; only the skin above the crease gives, the way a
// real lid folds. Worked out from the geometry after loading.

const canvas = document.getElementById('face');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pointer = new THREE.Vector2();
const gaze = new THREE.Vector3(0, 0, 3);
const localGaze = new THREE.Vector3();
const HALF_HEIGHT = 0.128;   // metres; matches the photo's crop
const CENTRE_Y = -0.037;
const PHOTO_RIGHT = 0.15;    // photo pixels stop here, right of the head centre
const LID_TRAVEL = 0.68;     // radians the upper lid swings for a full blink
const sway = { value: 0 };
const lid = { value: 0 };
let renderer;

async function start() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.3, 0.3, HALF_HEIGHT, -HALF_HEIGHT, 0.01, 10);
  camera.position.set(0, CENTRE_Y, 1);
  camera.lookAt(0, CENTRE_Y, 0);

  // Ambient plus the probe's diffuse add up to about the texture's own value;
  // the probe's softbox gives every glossy surface something to reflect.
  scene.environment = studioProbe(renderer);
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * 0.68));
  const key = new THREE.DirectionalLight(0xfff6ee, 0.4);
  key.position.set(-0.5, 0.6, 1);
  scene.add(key);

  const decoder = new DRACOLoader();
  decoder.setDecoderPath('./assets/vendor/three/draco/');
  decoder.setDecoderConfig({ type: 'wasm' });
  const loader = new GLTFLoader().setDRACOLoader(decoder);
  const gltf = await loader.loadAsync('./assets/head.glb');
  decoder.dispose();

  const character = gltf.scene.getObjectByName('Character');
  const eyes = ['LeftEye', 'RightEye'].map(name => gltf.scene.getObjectByName(name));
  if (!character || eyes.some(eye => !eye)) throw new Error('The head model is missing its eye pivots.');

  const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const lids = [];
  const softHair = [];
  gltf.scene.traverse(object => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    const source = object.material;
    for (const map of [source.map, source.normalMap, source.roughnessMap]) if (map) map.anisotropy = anisotropy;
    if (source.name === 'Portrait') {
      object.material = skinMaterial(source);
      lids.push(object);
    } else if (source.name === 'HairShell') {
      // Two passes: solid strands write depth, then the soft edges blend on
      // top without writing depth, so overlapping strands never halo.
      object.material = hairMaterial(source, { alphaTest: 0.5 });
      const edges = object.clone();
      // the edge pass carries no highlight of its own, or it would haze the skin behind it
      edges.material = hairMaterial(source, { transparent: true, depthWrite: false, alphaTest: 0.02, specularIntensity: 0, envMapIntensity: 0.1, roughness: 0.7 });
      edges.renderOrder = 2;
      softHair.push([object, edges]);
      object.renderOrder = 1;
    } else if (source.name === 'PhotoEyes') {
      object.material = new THREE.MeshPhysicalMaterial({
        map: source.map, roughness: 0.6, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
      });
    } else if (source.name === 'Mouth') {
      // the dark of the lip seam, for the sliver of mouth that shows at the
      // corners when the head turns
      object.material = new THREE.MeshStandardMaterial({ color: 0x4a2327, roughness: 0.9 });
    }
    if (object.material !== source) source.dispose();
  });
  for (const [solid, edges] of softHair) solid.parent.add(edges);
  scene.add(gltf.scene);
  scene.updateMatrixWorld(true);
  for (const mesh of lids) prepareBlink(mesh, eyes);

  let frame = 0;
  let lastTime = 0;
  let visible = true;
  let activePointer = false;
  let stopped = false;
  const desired = { yaw: 0, pitch: 0 };
  const clamp = THREE.MathUtils.clamp;
  let swayVelocity = 0;
  let previousYaw = 0;
  let nextBlink = 1.6;
  let blinkStart = -1;
  let doubleBlink = false;

  function queue() {
    if (!frame && visible && !document.hidden && !stopped) {
      frame = requestAnimationFrame(draw);
    }
  }

  // Lids drop fast, rest a moment, open a little slower.
  function blinkAmount(elapsed) {
    if (elapsed < 0.07) return THREE.MathUtils.smoothstep(elapsed, 0, 0.07);
    if (elapsed < 0.11) return 1;
    return 1 - THREE.MathUtils.smoothstep(elapsed, 0.11, 0.26);
  }

  function draw(time) {
    frame = 0;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = time;
    const t = time / 1000;
    const headEase = motion.matches ? 1 : 1 - Math.exp(-5 * dt);
    const eyeEase = motion.matches ? 1 : 1 - Math.exp(-15 * dt);

    // A slow drift keeps the portrait from freezing into a still image.
    const idleYaw = motion.matches ? 0 : 0.011 * Math.sin(t * 0.5) + 0.005 * Math.sin(t * 1.3 + 2);
    const idlePitch = motion.matches ? 0 : 0.007 * Math.sin(t * 0.8 + 1);
    character.rotation.y = THREE.MathUtils.lerp(character.rotation.y, desired.yaw + idleYaw, headEase);
    character.rotation.x = THREE.MathUtils.lerp(character.rotation.x, desired.pitch + idlePitch, headEase);
    character.updateWorldMatrix(true, true);

    // Damped spring: the hair takes an impulse from each turn and settles back.
    const turned = character.rotation.y - previousYaw;
    previousYaw = character.rotation.y;
    swayVelocity += -turned * 0.35 + (-35 * sway.value - 3.5 * swayVelocity) * dt;
    sway.value += swayVelocity * dt;

    if (blinkStart < 0 && t >= nextBlink) {
      blinkStart = t;
      doubleBlink = Math.random() < 0.2;
    }
    let blink = 0;
    if (blinkStart >= 0) {
      const elapsed = t - blinkStart;
      blink = blinkAmount(elapsed);
      if (elapsed >= 0.26) {
        blinkStart = -1;
        nextBlink = t + (doubleBlink ? 0.25 : 2.5 + Math.random() * 3.5);
        doubleBlink = false;
      }
    }

    if (activePointer && !motion.matches) {
      gaze.set(camera.position.x + pointer.x * (camera.right - camera.left) / 2,
        pointer.y * HALF_HEIGHT + camera.position.y, 0.72);
    } else {
      gaze.set(0, 0, 3);
    }
    localGaze.copy(gaze);
    character.worldToLocal(localGaze);

    let pitchSum = 0;
    for (const eye of eyes) {
      const direction = localGaze.clone().sub(eye.position);
      const yaw = clamp(Math.atan2(direction.x, direction.z), -0.2, 0.2);
      const pitch = clamp(-Math.atan2(direction.y, Math.hypot(direction.x, direction.z)), -0.1, 0.1);
      eye.rotation.order = 'YXZ';
      eye.rotation.y = THREE.MathUtils.lerp(eye.rotation.y, yaw, eyeEase);
      eye.rotation.x = THREE.MathUtils.lerp(eye.rotation.x, pitch, eyeEase);
      pitchSum += eye.rotation.x;
    }
    // The upper lid rides the globe: it follows a downward glance part way.
    const follow = 0.6 * (pitchSum / eyes.length) / LID_TRAVEL;
    lid.value = blink + follow;

    renderer.render(scene, camera);
    canvas.classList.add('is-ready');
    queue();
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(bounds.width, bounds.height, false);
    const halfWidth = HALF_HEIGHT * bounds.width / bounds.height;
    // Keep the head right of centre, away from the headline, and on wide
    // canvases slide it further so the photo still reaches the right edge.
    const offset = Math.min(-0.02, PHOTO_RIGHT - halfWidth);
    camera.position.x = offset;
    camera.lookAt(offset, CENTRE_Y, 0);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = HALF_HEIGHT;
    camera.bottom = -HALF_HEIGHT;
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
    desired.yaw = Math.tanh(pointer.x) * 0.11;
    desired.pitch = -Math.tanh(pointer.y) * 0.04;
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

// A small grey room with one softbox up and to the left, like the photo's
// key, baked into a reflection probe. Colours are linear.
function studioProbe(renderer) {
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0x2e2c2a, side: THREE.BackSide })));
  const softbox = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  softbox.position.set(-3.5, 3, 7);
  softbox.lookAt(0, 0, 0);
  room.add(softbox);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: 0x555250 }));
  fill.position.set(5, 1, 5);
  fill.lookAt(0, 0, 0);
  room.add(fill);
  const generator = new THREE.PMREMGenerator(renderer);
  const probe = generator.fromScene(room, 0.04).texture;
  generator.dispose();
  return probe;
}

// The face, with the blink handled on the GPU. The lid vertices carry a fixed
// shift each and a single uniform scales it, so a blink costs one number rather
// than rewriting and reuploading the whole 73k-vertex position buffer per frame.
function skinMaterial(source) {
  const material = new THREE.MeshStandardMaterial({
    map: source.map, roughnessMap: source.roughnessMap, roughness: 1, metalness: 0, alphaTest: 0.5,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.lid = lid;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float lid;\nattribute vec2 lidShift;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n            transformed.yz += lidShift * lid;');
  };
  return material;
}

// Hair shell material with the sway shear: hanging hair lags behind head
// turns, growing below the ears and dying out again at the collar.
function hairMaterial(source, options) {
  const material = new THREE.MeshPhysicalMaterial({
    map: source.map, normalMap: source.normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
    side: THREE.DoubleSide, roughness: 0.4, metalness: 0, specularIntensity: 0.6, envMapIntensity: 0.7, ...options,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.sway = sway;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float sway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hang = (1.0 - smoothstep(-0.13, 0.0, position.y)) * smoothstep(-0.175, -0.135, position.y);
        transformed.x += sway * hang * hang;
        transformed.y += abs(sway) * hang * 0.2;`);
  };
  return material;
}

// Finds the eyelid vertices around each eyeball and gives each one the shift
// that closes it: the lid below the crease swings as one piece around the
// sphere, the skin above the crease eases off towards the brow, and both pivot
// at the eye corners. The shifts go in as an attribute and the lid uniform
// scales them, so closing the eye costs nothing per frame. Negative lifts.
function prepareBlink(mesh, eyes) {
  const position = mesh.geometry.attributes.position;
  const centres = eyes.map(eye => mesh.worldToLocal(eye.getWorldPosition(new THREE.Vector3())));
  const smoothstep = THREE.MathUtils.smoothstep;
  const shift = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    for (const c of centres) {
      const dx = x - c.x;
      const up = y - c.y;
      const out = z - c.z;                       // towards the viewer
      if (Math.abs(dx) >= 0.021 || Math.abs(up) >= 0.022 || out <= 0.004) continue;
      const lateral = Math.sqrt(Math.max(0, 1 - (dx / 0.0195) ** 2));
      const upper = up > 0.0015 ? 1 - smoothstep(up, 0.0095, 0.0155) : 0;
      const lower = up < -0.0015 ? 1 - smoothstep(-up, 0.0055, 0.011) : 0;
      const angle = lateral * (upper * LID_TRAVEL - lower * 0.18);
      if (Math.abs(angle) < 1e-6) continue;
      const scale = 1 + 0.02 * upper;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const newOut = (out * cos + up * sin) * scale;
      const newUp = (-out * sin + up * cos) * scale;
      shift[2 * i] = c.y + newUp - y;
      shift[2 * i + 1] = c.z + newOut - z;
      break;
    }
  }
  mesh.geometry.setAttribute('lidShift', new THREE.BufferAttribute(shift, 2));
}

start().catch(error => {
  canvas.classList.remove('is-ready');
  renderer?.dispose();
  console.warn('The 3D portrait could not load.', error);
});
