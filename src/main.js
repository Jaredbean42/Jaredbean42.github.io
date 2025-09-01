import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// vite.config.js
export default {
  base: '/Jaredbean42.github.io/',
}


// -------------------------
// Scene, Camera, Renderer
// -------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('background') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// UI wrapper (for show/hide)
const wrapper = document.getElementById('wrapper');

// -------------------------
// Lighting
// -------------------------
const pointLight = new THREE.PointLight(0xffffff, 1000);
pointLight.position.set(7, 15, 20);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// Helpers (hidden until debug)
const pointLightHelper = new THREE.PointLightHelper(pointLight);
const gridHelper = new THREE.GridHelper(300, 50);
scene.add(pointLightHelper, gridHelper);
const helpers = [pointLightHelper, gridHelper];
helpers.forEach(h => h.visible = false);

// -------------------------
// Camera starting pose (SCROLL MODE)
// -------------------------
camera.position.set(0, 0, 16.5);

// Face forward down -Z (DO NOT lookAt origin in scroll mode)
function setScrollCameraOrientation() {
  // Keep world "forward" along -Z so the origin won't auto-center
  camera.up.set(0, 1, 0);
  const forwardTarget = new THREE.Vector3(
    camera.position.x,
    camera.position.y,
    camera.position.z - 1
  );
  camera.lookAt(forwardTarget);
}
setScrollCameraOrientation();

// -------------------------
// Orbit Controls (start OFF)
// -------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = false; // disabled in scroll mode

// -------------------------
// Resize Handler
// -------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------
// Background (star sphere)
// -------------------------
let backgroundMesh;
const loader = new THREE.TextureLoader();
loader.load('images/space_4.jpg', function (texture) {
  const geometry = new THREE.SphereGeometry(300, 60, 40);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  });
  backgroundMesh = new THREE.Mesh(geometry, material);
  scene.add(backgroundMesh);
});

// -------------------------
// Main Planet
// -------------------------
const planetTexture = new THREE.TextureLoader().load("images/2k_neptune.jpg");
// trying out textures
// const normalTexture = new THREE.TextureLoader().load('planet_tex1.jpg');


const planetMain = new THREE.Mesh(
  new THREE.SphereGeometry(15, 64, 32),
  new THREE.MeshStandardMaterial({
    map: planetTexture
    // ,normalMap: normalTexture
  })
);

planetTexture.flipY = false;

scene.add(planetMain);


// -------------------------
// Particles
// -------------------------


// -------------------------
// Stars
// -------------------------
function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 24, 24);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1
  });
  const star = new THREE.Mesh(geometry, material);
  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(400));
  star.position.set(x, y, z);
  scene.add(star);
}
Array(700).fill().forEach(addStar);

// -------------------------
// Ship Orbit
// -------------------------
const ship = new THREE.OctahedronGeometry(2, 0);
const shipMaterial = new THREE.MeshStandardMaterial({ color: "orangered" });
const shipMesh = new THREE.Mesh(ship, shipMaterial);
scene.add(shipMesh);
shipMesh.position.set(-50, 0, -20);

const orbitRadius = 25;
let orbitAngle = 0;
const orbitSpeed = 0.02;
const inclination = Math.PI / 4;

function updateShip() {
  orbitAngle += orbitSpeed;
  const x = orbitRadius * Math.sin(orbitAngle);
  const y = orbitRadius * Math.cos(orbitAngle);
  const z = 0;
  const tiltedY = y * Math.cos(inclination) - z * Math.sin(inclination);
  const tiltedZ = y * Math.sin(inclination) + z * Math.cos(inclination);
  shipMesh.position.set(tiltedY, tiltedZ, x);
  shipMesh.rotation.z += 0.02;
}

// -------------------------
// Scroll vs Debug Toggle (Shift + D)
// -------------------------
let debugMode = false;
const startCameraPos = camera.position.clone();

function moveCamera() {
  if (debugMode) return; // skip in debug mode
  const t = document.body.getBoundingClientRect().top;

  // Drift & zoom (adjust multipliers as desired)
  camera.position.z = startCameraPos.z + t * -0.1;   
  camera.position.x = startCameraPos.x + t * 0.075;  
  camera.position.y = startCameraPos.y + t * 0.002; 

  // IMPORTANT: do NOT lookAt(0,0,0) here
  // Keep facing forward so origin doesn't auto-center
  setScrollCameraOrientation();
}
document.body.onscroll = moveCamera;

// Toggle with Shift+D
document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key.toLowerCase() === "d") {
    debugMode = !debugMode;

    if (debugMode) {
      // DEBUG ON
      helpers.forEach(h => h.visible = true);
      controls.enabled = true;
      controls.target.set(0, 0, 0); // orbit around origin in debug
      wrapper.classList.add("ui-off"); // hide UI
      document.body.onscroll = null;   // disable scroll animation
      camera.position.set(0, 0, 40);   // pull back a bit for orbiting
      controls.update();               // apply target immediately
    } else {
      // DEBUG OFF -> SCROLL MODE
      helpers.forEach(h => h.visible = false);
      controls.enabled = false;
      wrapper.classList.remove("ui-off"); // show UI
      window.scrollTo(0, 0);              // back to page top
      camera.position.copy(startCameraPos);
      setScrollCameraOrientation();       // face forward, not origin
      document.body.onscroll = moveCamera; // re-enable scroll animation
      moveCamera();                        // sync position immediately
    }
  }
});

// -------------------------
// Animate loop
// -------------------------
function animate() {
  requestAnimationFrame(animate);

  planetMain.rotation.y += 0.01;

  if (backgroundMesh) {
    backgroundMesh.rotation.x += 0.00007;
    backgroundMesh.rotation.y += 0.00007;
    backgroundMesh.rotation.z += 0.00007;
  }

  updateShip();

  // Only update controls when enabled (prevents recentering/lock-on in scroll mode)
  if (controls.enabled) controls.update();

  renderer.render(scene, camera);
}
animate();

// -------------------------
// Experience Section Animations
// -------------------------
const items = document.querySelectorAll('.experience-item');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    } else {
      entry.target.classList.remove('visible');
    }
  });
}, { threshold: 0.2 });
items.forEach(item => observer.observe(item));
