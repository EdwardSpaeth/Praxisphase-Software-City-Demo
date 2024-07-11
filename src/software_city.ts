import * as THREE from "three";

interface Building extends THREE.Mesh {
  component?: Component
}

type SoftwareCityData = {
  usageAreas: UsageArea[]
}

type UsageArea = {
  name: string,
  components: Component[]
}

type Component = {
  name: string,
  usageArea?: string,
  height: number,
  width: number,
  length: number,
  requires: string[]
}

type Coordinates = {
  x: number,
  z: number
}

const COLOR_OF_SKY = 0x44BEE4;
const COLOR_OF_GROUND = 0x005500;
const COLOR_OF_CITY_FOUNDATION = 0xA9A9A9;
const COLOR_OF_BUILDING = 0xAA4A44;
const COLOR_OF_STREET = 0x000000;
const GRASS_MARGIN = 500;
const CITY_MARGIN = 10;
const PLANE_OFFSET = 0.01;
const COLOR_GRADIENT_START = {r: 0xD3, g: 0xD3, b: 0xD3}
const COLOR_GRADIENT_END = {r: 0xEE, g: 0xEE, b: 0xEE}
const STREETWIDTH = 3;
const STREETHEIGHT = 1;
const MIN_BUILDING_AREA_MARGIN = 10;


export class SoftwareCity {
  scene: THREE.Scene
  components: (Component | null)[]
  longestComponentSideLength: number
  buildings: Building[] = []
  usageAreaColorMap = new Map<string, number>()
  constructor(softwareCityData: SoftwareCityData, scene: THREE.Scene) {
    this.scene = scene;
    for (const usageArea of softwareCityData.usageAreas) {
      for (const component of usageArea.components) {
        component.usageArea = usageArea.name;
      }
    }
    this.components = Array.from(softwareCityData.usageAreas.map((usageArea) => usageArea.components).flat())
    this.longestComponentSideLength = MIN_BUILDING_AREA_MARGIN + Math.max(...this.components.filter((component) => component).map((component) => [component!.width, component!.length]).flat());
    this.setupLandscape();
    this.setupLights();
    this.createCity();
  }

  setupLandscape() {
    const grassSideLength = Math.ceil(Math.sqrt(this.components.length)) * this.longestComponentSideLength + GRASS_MARGIN/2;
    const grassGeometry = new THREE.PlaneGeometry(grassSideLength, grassSideLength);
    const grassMaterial = new THREE.MeshBasicMaterial({color: COLOR_OF_GROUND});
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.set(-Math.PI/2, 0, 0);
    
    const citySideLength = Math.ceil(Math.sqrt(this.components.length)) * this.longestComponentSideLength + CITY_MARGIN/2;
    const cityFoundationGeometry = new THREE.PlaneGeometry(citySideLength, citySideLength);
    const cityFoundationMaterial = new THREE.MeshBasicMaterial({color: COLOR_OF_CITY_FOUNDATION})
    const cityFoundation = new THREE.Mesh(cityFoundationGeometry, cityFoundationMaterial);
    cityFoundation.rotation.set(-Math.PI/2, 0, 0);
    cityFoundation.position.set(0, PLANE_OFFSET, 0);
    this.scene.add(grass, cityFoundation);
  }

  setupLights() {
    this.scene.background = new THREE.Color(COLOR_OF_SKY);
    const pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(5, 5, 5);

    const ambientLight = new THREE.AmbientLight(0xffffff);
    this.scene.add(pointLight, ambientLight);
  }

  static getGradientAtPercentage(percentage: number): number {
    const result = {
      r: Math.floor(COLOR_GRADIENT_START.r + percentage/100 * (COLOR_GRADIENT_END.r - COLOR_GRADIENT_START.r)),
      g: Math.floor(COLOR_GRADIENT_START.g + percentage/100 * (COLOR_GRADIENT_END.g - COLOR_GRADIENT_START.g)),
      b: Math.floor(COLOR_GRADIENT_START.b + percentage/100 * (COLOR_GRADIENT_END.b - COLOR_GRADIENT_START.b))
    }
    return result.r * 2**16 + result.g * 2**8 + result.b
  }

  createCoordinates(): Coordinates[] {
    const componentsPerSide = Math.ceil(Math.sqrt(this.components.length));
    let coordinates = [];
    for (let i=0; i < this.components.length; i++) {
      coordinates.push({x: (i % componentsPerSide) * this.longestComponentSideLength, z: Math.floor(i/componentsPerSide) * this.longestComponentSideLength})
    }
    const coordinateMaximumX = Math.max(...coordinates.map((coordinate) => coordinate.x))
    const coordinateMaximumZ = Math.max(...coordinates.map((coordinate) => coordinate.z))
    coordinates = coordinates.map((coordinate) => {return {x: coordinate.x - coordinateMaximumX/2, z: coordinate.z - coordinateMaximumZ/2}})
    return coordinates;
  }

  createBuilding(component: Component, coordinates: Coordinates): [Building, THREE.Mesh] {
    const buildingGeometry = new THREE.BoxGeometry(component.width, component.height, component.length);
    const buildingMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(COLOR_OF_BUILDING)})
    const building: Building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.component = component;
    building.position.set(coordinates.x, component.height/2 + 2*PLANE_OFFSET, coordinates.z);
    const buildingAreaSideLength = this.longestComponentSideLength
    const buildingAreaGeometry = new THREE.PlaneGeometry(buildingAreaSideLength, buildingAreaSideLength);
    const buildingAreaMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(this.usageAreaColorMap.get(component.usageArea!))})
    const buildingArea = new THREE.Mesh(buildingAreaGeometry, buildingAreaMaterial);
    buildingArea.rotation.set(-Math.PI/2, 0, 0);
    buildingArea.position.set(coordinates.x, 2*PLANE_OFFSET, coordinates.z);
    return [building, buildingArea]
  }

  createStreet(buildingA: Building, buildingB: Building | undefined) {
    if (!buildingB) {
      console.error("Name reference could not be found!")
      return
    }
    const streetMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(COLOR_OF_STREET)})
    const firstPartGeometry = new THREE.BoxGeometry(STREETWIDTH, STREETHEIGHT, this.longestComponentSideLength/2);
    const firstPart = new THREE.Mesh(firstPartGeometry, streetMaterial);
    firstPart.position.set(buildingA.position.x, STREETHEIGHT/2, buildingA.position.z/2)
    this.scene.add(firstPart)
    const firstPartEnd = new THREE.Vector2(buildingA.position.x, buildingA.position.z + this.longestComponentSideLength/2);

    const thirdPartGeometry = new THREE.BoxGeometry(STREETWIDTH, STREETHEIGHT, this.longestComponentSideLength/2);
    const thirdPart = new THREE.Mesh(thirdPartGeometry, streetMaterial);
    thirdPart.position.set(buildingB.position.x, STREETHEIGHT/2, buildingB.position.z/2)
    const thirdPartEnd = new THREE.Vector2(buildingB.position.x, buildingB.position.z + this.longestComponentSideLength/2);
    this.scene.add(thirdPart)

    const secondPartGeometry = new THREE.BoxGeometry(Math.abs(firstPartEnd.x - thirdPartEnd.x) - STREETWIDTH, STREETHEIGHT, STREETWIDTH)
    const secondPart = new THREE.Mesh(secondPartGeometry, streetMaterial);
    secondPart.position.set(Math.abs(firstPartEnd.x + thirdPartEnd.x)/2, STREETHEIGHT/2, Math.abs(firstPartEnd.y + thirdPartEnd.y)/2 - STREETWIDTH/2)
    this.scene.add(secondPart)

  }

  createCity() {
    const usageAreas = Array.from(new Set(this.components.filter((component) => component).map((component) => component!.usageArea)))
    usageAreas.forEach((usageArea, index) => {
      const usageAreaColor = SoftwareCity.getGradientAtPercentage(Math.floor(index / (usageAreas.length-1) * 100));
      this.usageAreaColorMap.set(usageArea!, usageAreaColor);
    })
    const componentCoordinates = this.createCoordinates();
    for (let i=0; i < this.components.length; i++) {
      const component = this.components[i];
      const coordinates = componentCoordinates[i];
      if (component) {
        const [building, buildingArea] = this.createBuilding(component, coordinates);
        this.buildings.push(building);
        this.scene.add(building, buildingArea);
      }
    }
    for (const building of this.buildings) {
      const component = building.component!;
      for (const target of component.requires) {
        this.createStreet(building, this.buildings.find((building) => building.component!.name === target))
      }
    }
  }
}