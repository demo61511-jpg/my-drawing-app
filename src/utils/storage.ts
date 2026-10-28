import { Project, LayerItem } from '../types/canvas';

const DB_NAME = 'ArtFlowStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToDB(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ ...project, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllProjectsFromDB(): Promise<Project[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result as Project[];
        if (list && list.length > 0) {
          resolve(list.sort((a, b) => b.updatedAt - a.updatedAt));
        } else {
          // Initialize default projects if empty
          const defaults = getInitialSampleProjects();
          Promise.all(defaults.map((p) => saveProjectToDB(p)))
            .then(() => resolve(defaults))
            .catch(() => resolve(defaults));
        }
      };
      req.onerror = () => resolve(getInitialSampleProjects());
    });
  } catch (e) {
    return getInitialSampleProjects();
  }
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Generate the initial starter projects matching the showcase UI
export function getInitialSampleProjects(): Project[] {
  const now = Date.now();

  const animeGirlProject: Project = {
    id: 'proj_anime_girl',
    name: 'Anime Girl',
    aspectRatio: '1:1',
    quality: '1080p',
    width: 1080,
    height: 1080,
    backgroundColor: '#1e293b',
    activeLayerId: 'layer_lineart',
    referenceImage: {
      id: 'ref_1',
      url: '/assets/aistudio/ArtFlow_Drawing_App_UI_Showcase_eb850341.png',
      visible: true,
      opacity: 0.3,
      x: 270,
      y: 270,
      scale: 0.8,
      rotation: 0,
      width: 540,
      height: 540,
    },
    layers: [
      {
        id: 'layer_bg',
        name: 'Background',
        visible: true,
        locked: true,
        opacity: 1,
        blendMode: 'source-over',
        items: [],
      },
      {
        id: 'layer_color',
        name: 'Colors & Fills',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        items: [
          // Pre-filled shapes for test workflow: 3 red circles!
          {
            id: 'sample_shape_1',
            type: 'shape',
            shapeType: 'circle',
            startX: 320,
            startY: 450,
            endX: 440,
            endY: 570,
            strokeColor: '#000000',
            fillColor: '#EF4444',
            strokeWidth: 6,
            opacity: 1,
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 380, pivotY: 510 },
            boundingBox: { minX: 320, minY: 450, maxX: 440, maxY: 570 },
          },
          {
            id: 'sample_shape_2',
            type: 'shape',
            shapeType: 'circle',
            startX: 480,
            startY: 450,
            endX: 600,
            endY: 570,
            strokeColor: '#000000',
            fillColor: '#EF4444',
            strokeWidth: 6,
            opacity: 1,
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 540, pivotY: 510 },
            boundingBox: { minX: 480, minY: 450, maxX: 600, maxY: 570 },
          },
          {
            id: 'sample_shape_3',
            type: 'shape',
            shapeType: 'circle',
            startX: 640,
            startY: 450,
            endX: 760,
            endY: 570,
            strokeColor: '#000000',
            fillColor: '#EF4444',
            strokeWidth: 6,
            opacity: 1,
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 700, pivotY: 510 },
            boundingBox: { minX: 640, minY: 450, maxX: 760, maxY: 570 },
          },
        ],
      },
      {
        id: 'layer_lineart',
        name: 'Lineart & Inking',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        items: [
          // Sample strokes
          {
            id: 'sample_stroke_1',
            type: 'stroke',
            brushType: 'pen',
            points: [
              { x: 380, y: 350, pressure: 0.8 },
              { x: 420, y: 320, pressure: 0.9 },
              { x: 500, y: 300, pressure: 1.0 },
              { x: 580, y: 320, pressure: 0.9 },
              { x: 620, y: 360, pressure: 0.8 },
            ],
            strokeColor: '#000000',
            strokeWidth: 6,
            opacity: 1,
            hardness: 90,
            smoothing: 40,
            pressureSensitivity: true,
            transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, pivotX: 500, pivotY: 330 },
            boundingBox: { minX: 380, minY: 300, maxX: 620, maxY: 360 },
          },
        ],
      },
    ],
    createdAt: now - 7200000,
    updatedAt: now - 7200000,
    thumbnailUrl: '/assets/aistudio/ArtFlow_Drawing_App_UI_Showcase_eb850341.png',
  };

  const landscapeProject: Project = {
    id: 'proj_landscape',
    name: 'Landscape',
    aspectRatio: '16:9',
    quality: '1080p',
    width: 1920,
    height: 1080,
    backgroundColor: '#0f172a',
    activeLayerId: 'layer_main',
    layers: [
      {
        id: 'layer_bg_2',
        name: 'Background',
        visible: true,
        locked: true,
        opacity: 1,
        blendMode: 'source-over',
        items: [],
      },
      {
        id: 'layer_main',
        name: 'Mountains & Sky',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        items: [],
      },
    ],
    createdAt: now - 18000000,
    updatedAt: now - 18000000,
  };

  const sketchProject: Project = {
    id: 'proj_sketch',
    name: 'Sketch',
    aspectRatio: '3:4',
    quality: '1080p',
    width: 1080,
    height: 1440,
    backgroundColor: '#ffffff',
    activeLayerId: 'layer_pencils',
    layers: [
      {
        id: 'layer_bg_3',
        name: 'Paper',
        visible: true,
        locked: true,
        opacity: 1,
        blendMode: 'source-over',
        items: [],
      },
      {
        id: 'layer_pencils',
        name: 'Rough Sketch',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'source-over',
        items: [],
      },
    ],
    createdAt: now - 86400000,
    updatedAt: now - 86400000,
  };

  return [animeGirlProject, landscapeProject, sketchProject];
}
