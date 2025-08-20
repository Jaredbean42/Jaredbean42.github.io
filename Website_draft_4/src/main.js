import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('background') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);


// scene.background = new THREE.Color(0xffffff); // white background

// Lighting
const pointLight = new THREE.PointLight(0xffffff, 1000);
pointLight.position.set(7, 15, 20);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

// Helpers
// scene.add(new THREE.PointLightHelper(pointLight));
// scene.add(new THREE.GridHelper(300, 50));


// Orbit controls
// camera.position.set(0, 0, 40);
// const controls = new OrbitControls(camera, document.body);
// controls.enableDamping = true;
// controls.target.set(0, 0, 0); 




// Background
// const loader = new THREE.TextureLoader();
// loader.load('space.jpg', function (texture) {
//   const geometry = new THREE.SphereGeometry(200, 60, 40); 
//   const material = new THREE.MeshBasicMaterial({
//     map: texture,
//     side: THREE.BackSide
//     // , wireframe: true
//   });
//   const backgroundMesh = new THREE.Mesh(geometry, material);
//   scene.add(backgroundMesh);
// });

let backgroundMesh; // declare in outer scope

const loader = new THREE.TextureLoader();
loader.load('images/space_3.jpg', function (texture) {
  const geometry = new THREE.SphereGeometry(200, 60, 40); 
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  });
  backgroundMesh = new THREE.Mesh(geometry, material);
  scene.add(backgroundMesh);
});
// thanks to! https://www.spacespheremaps.com/ for the background image



// Sphere
const geometry = new THREE.SphereGeometry(15, 32, 16);
const material = new THREE.MeshStandardMaterial({ color: "deepskyblue"});
const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// Stars
const starColors = [
  0xffffff, // white
  0xfff4e5, // warm white
  0xffe4b5, // yellowish
  0xffd700, // golden
  0xffa07a, // orange
  0xff4500, // red
  0xadd8e6, // light blue
  0x87ceeb  // blue
];


function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 24, 24);
  
  // color stars
  // const str_color = starColors[Math.floor(Math.random() * starColors.length)];

  // white stars
  const str_color = 0xffffff;

  const material = new THREE.MeshStandardMaterial({ 
    color: str_color,
    emissive: str_color,
    emissiveIntensity: 1
   });
  const star = new THREE.Mesh(geometry, material);

  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(350));
  
  star.position.set(x, y, z);
  scene.add(star);

}

Array(700).fill().forEach(addStar);


//Ship
const ship = new THREE.OctahedronGeometry(2, 0);
const shipMaterial = new THREE.MeshStandardMaterial({ color: "orangered"});
const shipMesh = new THREE.Mesh(ship, shipMaterial);
scene.add(shipMesh);
shipMesh.position.set(-50, 0, -20);

// Ship Orbit parameters
const orbitRadius = 25;    // distance from planet
let orbitAngle = 0;       // starting angle (radians)
const orbitSpeed = 0.02;   // speed of orbit

// Orbital inclination (45 degrees = Math.PI / 4 radians)
const inclination = Math.PI / 4;

function updateShip() {
  orbitAngle += orbitSpeed;

  // Base orbit
  const x = orbitRadius * Math.sin(orbitAngle);
  const y = orbitRadius * Math.cos(orbitAngle);
  const z = 0;

  // Rotate orbit plane around X axis by 45°
  const tiltedY = y * Math.cos(inclination) - z * Math.sin(inclination);
  const tiltedZ = y * Math.sin(inclination) + z * Math.cos(inclination);

  // Apply new position
  shipMesh.position.set(tiltedY, tiltedZ, x);

  // Optional: spin ship on its own axis
  shipMesh.rotation.z += 0.02;
}


// Scroll camera movement
camera.position.set(0, 0, 16.5); // starting point
const startCameraPos = camera.position.clone(); // remember where it started

function moveCamera() {
  const t = document.body.getBoundingClientRect().top;

  // Smooth camera movement based on starting position
  camera.position.z = startCameraPos.z + t * -0.1;
  camera.position.x = startCameraPos.x + t *  0.05;
  camera.position.y = startCameraPos.y + t * -0.002;
}

document.body.onscroll = moveCamera;


function animate() {
  requestAnimationFrame(animate);

  planet.rotation.y += 0.01;

  // Rotate background mesh
  if (backgroundMesh) { // only rotate if it's loaded
    backgroundMesh.rotation.x += 0.00007;
    backgroundMesh.rotation.y += 0.00007;
    backgroundMesh.rotation.z += 0.00007;
  }

  // Update orbiting ship
  updateShip();

  // controls.update();
  renderer.render(scene, camera);
  
}

animate();


