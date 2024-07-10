import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SoftwareCity } from "./software_city";
import { softwareCityData } from "./software_city_data.json";

const canvasElement = <HTMLCanvasElement>document.getElementById("sw-city-canvas")!;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 40, 50);

const renderer = new THREE.WebGLRenderer({
  canvas: canvasElement,
  antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, canvasElement);
controls.maxPolarAngle = Math.PI/2 - 0.01

new SoftwareCity(softwareCityData, scene);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.onresize = () => {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
}
