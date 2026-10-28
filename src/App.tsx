import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Project,
  LayerItem,
  CanvasItem,
  StrokeItem,
  FillItem,
  ShapeItem,
  ImageItem,
  CurveItem,
  ToolType,
  ShapeType,
  BrushSettings,
  FillSettings,
  ShapeSettings,
  CurveSettings,
  ActiveModal,
  HistoryState,
  ReferenceImage,
  AnimationProjectData,
} from './types/canvas';
import { getAllProjectsFromDB, saveProjectToDB, deleteProjectFromDB } from './utils/storage';
import { isColorMatch } from './utils/color';
import { renderCanvas } from './utils/canvasRenderer';
import { calculateAutoFitCamera } from './utils/cameraViewport';
import { computeAllLayerStatesAtFrame, setKeyframeValue } from './utils/animationEngine';
import {
  getEffectiveLayerItems,
  transformLayerItemsAtFrame,
  ensureLayerFrames,
  updateLayerArtworkAtFrame,
} from './utils/frameAnimationEngine';

// Components
import { HomeGallery } from './components/HomeGallery';
import { NewProjectModal } from './components/NewProjectModal';
import { TopBar } from './components/TopBar';
import { SideToolbar } from './components/SideToolbar';
import { BottomToolbar } from './components/BottomToolbar';
import { MainCanvas } from './components/MainCanvas';
import { BrushSettingsModal } from './components/BrushSettingsModal';
import { ColorPickerModal } from './components/ColorPickerModal';
import { LayersModal } from './components/LayersModal';
import { ReferenceModal } from './components/ReferenceModal';
import { ShapeModal } from './components/ShapeModal';
import { LassoToolbar } from './components/LassoToolbar';
import { TransformToolbar } from './components/TransformToolbar';
import { FindReplaceModal } from './components/FindReplaceModal';
import { FillPropertiesModal } from './components/FillPropertiesModal';
import { SaveProjectModal } from './components/SaveProjectModal';
import { ExportModal } from './components/ExportModal';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { AiImageGenModal } from './components/AiImageGenModal';
import { AnimationTimeline } from './components/AnimationTimeline';
import { FloatingToolsOverlay, FloatingPanelType } from './components/FloatingToolsOverlay';

export default function App() {
  // Navigation View
  const [view, setView] = useState<'gallery' | 'editor'>('gallery');

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [initialRatioForModal, setInitialRatioForModal] = useState<string>('1:1');

  // Active Tool & Colors
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [colorPickerTarget, setColorPickerTarget] = useState<'primary' | 'stroke' | 'fill'>('primary');

  // Floating Tools & Overlay Panels
  const [isFloatingToolbarOpen, setIsFloatingToolbarOpen] = useState<boolean>(false);
  const [activeFloatingPanel, setActiveFloatingPanel] = useState<FloatingPanelType>('none');
  const [isFingerMenuOpen, setIsFingerMenuOpen] = useState<boolean>(false);

  // Tool Settings
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    type: 'brush',
    size: 16,
    opacity: 1,
    hardness: 80,
    spacing: 5,
    smoothing: 35,
    pressureSensitivity: true,
  });

  const [fillSettings, setFillSettings] = useState<FillSettings>({
    fillColor: '#EF4444',
    tolerance: 30,
    contiguous: true,
    antiAliasing: true,
  });

  const [shapeSettings, setShapeSettings] = useState<ShapeSettings>({
    shapeType: 'circle',
    strokeColor: '#000000',
    fillColor: '#EF4444',
    strokeWidth: 5,
    opacity: 1,
  });

  const [curveSettings, setCurveSettings] = useState<CurveSettings>({
    strokeColor: '#000000',
    fillColor: 'none',
    strokeWidth: 5,
    opacity: 1,
    closed: false,
  });

  // Dedicated Eraser & Curve Tool Mode States
  const [eraserSize, setEraserSize] = useState<number>(28);
  const [eraserOpacity, setEraserOpacity] = useState<number>(1);
  const [curveMode, setCurveMode] = useState<'bezier' | 'freehand'>('bezier');

  // Active Ruler, Active Floating Shape, & Active Eraser Model
  const [activeRuler, setActiveRuler] = useState<string>('off');
  const [activeShape, setActiveShape] = useState<string>('off');
  const [selectedEraserModel, setSelectedEraserModel] = useState<string>('hard');

  // Lasso, Selection & Clipboard
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<CanvasItem[]>([]);
  const [transformMode, setTransformMode] = useState<'all' | 'move' | 'scale' | 'rotate' | 'perspective' | 'mesh'>('all');
  const [pivotPoint, setPivotPoint] = useState<{ x: number; y: number } | null>(null);
  const initialTransformLayersRef = useRef<LayerItem[] | null>(null);

  // Animation Mode State
  const [appMode, setAppMode] = useState<'drawing' | 'animation'>('drawing');
  const [animationData, setAnimationData] = useState<AnimationProjectData>({
    fps: 24,
    durationFrames: 120,
    currentFrame: 0,
    isPlaying: false,
    loop: true,
    tracks: [],
    groups: [],
    parentRelationships: [],
  });

  const getTargetItemIds = useCallback(() => {
    if (!currentProject) return [];
    if (selectedItemIds.length > 0) return selectedItemIds;
    const activeL = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeL) return [];
    const items = appMode === 'animation' ? getEffectiveLayerItems(activeL, animationData.currentFrame) : activeL.items;
    return items.map((i) => i.id);
  }, [currentProject, selectedItemIds, appMode, animationData.currentFrame]);

  // Snapshot layers and initialize pivot when entering transform mode
  useEffect(() => {
    if (activeTool === 'transform' && currentProject) {
      initialTransformLayersRef.current = JSON.parse(JSON.stringify(currentProject.layers));
      
      // Initialize pivot point from the first selected item
      const activeL = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
      const items = appMode === 'animation' ? getEffectiveLayerItems(activeL!, animationData.currentFrame) : (activeL?.items || []);
      const targetIds = selectedItemIds.length > 0 ? selectedItemIds : items.map((i) => i.id);
      
      const item = activeL?.items.find(i => i.id === targetIds[0]);
      if (item && item.transform) {
             setPivotPoint({ x: (item.transform.pivotX || 0) + (item.transform.x || 0), y: (item.transform.pivotY || 0) + (item.transform.y || 0) });
      }
    } else {
      setPivotPoint(null);
    }
  }, [activeTool, currentProject, selectedItemIds, appMode, animationData.currentFrame]);

  // Canvas Viewport Transformation
  const [canvasZoom, setCanvasZoom] = useState<number>(0.65);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasRotation, setCanvasRotation] = useState<number>(0);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Load projects from IndexedDB on startup
  useEffect(() => {
    getAllProjectsFromDB().then((data) => {
      setProjects(data);
    });
  }, []);

  // Compute adaptive camera fit for mobile viewport dimensions
  const fitCanvasToMobile = useCallback((project: Project) => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight - 148; // Account for top header (56px) and bottom toolbar panel
    const camera = calculateAutoFitCamera(
      project.width,
      project.height,
      { width: viewportW, height: viewportH },
      0.95
    );
    setCanvasZoom(camera.zoom);
    setCanvasPan({ x: camera.panX, y: camera.panY });
    setCanvasRotation(camera.rotation);
  }, []);

  // Toggle Alpha Lock on Layer (Problem 6)
  const handleToggleAlphaLock = (layerId: string) => {
    if (!currentProject) return;
    const updatedLayers = currentProject.layers.map((l) =>
      l.id === layerId ? { ...l, isAlphaLocked: !l.isAlphaLocked } : l
    );
    handleUpdateProjectLayers(updatedLayers, true);
  };

  // Animation Mode State


  // Animation Playback Engine Loop
  useEffect(() => {
    if (!animationData.isPlaying) return;

    const intervalMs = 1000 / (animationData.fps || 24);
    let lastTime = performance.now();
    let animFrameId: number;

    const loop = (now: number) => {
      const delta = now - lastTime;
      if (delta >= intervalMs) {
        lastTime = now - (delta % intervalMs);
        setAnimationData((prev) => {
          const nextFrame = prev.currentFrame + 1;
          if (nextFrame >= prev.durationFrames) {
            if (prev.loop) {
              return { ...prev, currentFrame: 0 };
            } else {
              return { ...prev, currentFrame: prev.durationFrames - 1, isPlaying: false };
            }
          }
          return { ...prev, currentFrame: nextFrame };
        });
      }
      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [animationData.isPlaying, animationData.fps, animationData.durationFrames, animationData.loop]);

  // Compute 2D Animation States for All Layers at Current Frame
  const animationStates = useMemo(() => {
    if (!currentProject) return undefined;
    return computeAllLayerStatesAtFrame(currentProject.layers, animationData, animationData.currentFrame);
  }, [currentProject, animationData]);

  const handleUpdateAnimationData = useCallback((newAnimData: AnimationProjectData) => {
    setAnimationData(newAnimData);
    if (currentProject) {
      const updated = {
        ...currentProject,
        animation: newAnimData,
        updatedAt: Date.now(),
      };
      setCurrentProject(updated);
      saveProjectToDB(updated).catch(console.error);
    }
  }, [currentProject]);

  const handleAddLayerFromTimeline = () => {
    if (!currentProject) return;
    const count = currentProject.layers.length + 1;
    const newLayer: LayerItem = {
      id: `layer_${Date.now()}_${count}`,
      name: `Layer ${count}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      items: [],
    };
    handleUpdateProjectLayers([...currentProject.layers, newLayer], true);
    setCurrentProject((prev) => (prev ? { ...prev, activeLayerId: newLayer.id } : null));
  };

  const handleDeleteLayerFromTimeline = (id: string) => {
    if (!currentProject || currentProject.layers.length <= 1) return;
    const remaining = currentProject.layers.filter((l) => l.id !== id);
    const nextActive = currentProject.activeLayerId === id ? remaining[0].id : currentProject.activeLayerId;
    setCurrentProject({ ...currentProject, activeLayerId: nextActive });
    handleUpdateProjectLayers(remaining, true);
  };

  const handleToggleLayerVisibilityFromTimeline = (id: string) => {
    if (!currentProject) return;
    const updated = currentProject.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    handleUpdateProjectLayers(updated, true);
  };

  const handleToggleLayerLockFromTimeline = (id: string) => {
    if (!currentProject) return;
    const updated = currentProject.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l));
    handleUpdateProjectLayers(updated, true);
  };

  const handleOpenProject = (project: Project) => {
    const initializedLayers = project.layers.map((l) => ({
      ...l,
      frames: ensureLayerFrames(l),
    }));
    const initializedProject = { ...project, layers: initializedLayers };

    setCurrentProject(initializedProject);
    setView('editor');
    setActiveTool('brush');
    setSelectedItemIds([]);
    setPivotPoint(null);
    fitCanvasToMobile(initializedProject);

    if (project.animation) {
      setAnimationData(project.animation);
    } else {
      setAnimationData({
        fps: 24,
        durationFrames: 120,
        currentFrame: 0,
        isPlaying: false,
        loop: true,
        tracks: [],
        groups: [],
        parentRelationships: [],
      });
    }

    // Initialize history
    setHistory([{ layers: project.layers, activeLayerId: project.activeLayerId }]);
    setHistoryIndex(0);
  };

  const handleUpdateProjectLayers = (newLayers: LayerItem[], pushHistory: boolean = true) => {
    if (!currentProject) return;

    const updated = {
      ...currentProject,
      layers: newLayers,
      updatedAt: Date.now(),
    };
    setCurrentProject(updated);

    // Save to DB in background
    saveProjectToDB(updated).catch(console.error);

    if (pushHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ layers: newLayers, activeLayerId: currentProject.activeLayerId });
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  // Undo / Redo Actions
  const handleUndo = () => {
    if (historyIndex > 0 && currentProject) {
      const nextIndex = historyIndex - 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      const updated = {
        ...currentProject,
        layers: targetState.layers,
        activeLayerId: targetState.activeLayerId,
        updatedAt: Date.now(),
      };
      setCurrentProject(updated);
      saveProjectToDB(updated).catch(console.error);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && currentProject) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      const updated = {
        ...currentProject,
        layers: targetState.layers,
        activeLayerId: targetState.activeLayerId,
        updatedAt: Date.now(),
      };
      setCurrentProject(updated);
      saveProjectToDB(updated).catch(console.error);
    }
  };

  // Adobe Animate-Style Stroke & Color Modification on Selected Objects
  const handleSelectColor = (color: string) => {
    setCurrentColor(color);
    setCurveSettings((prev) => ({ ...prev, strokeColor: color }));
    setShapeSettings((prev) => ({ ...prev, strokeColor: color }));
    setFillSettings((prev) => ({ ...prev, fillColor: color }));

    // If objects are selected, immediately update their stroke/fill color!
    if (currentProject && selectedItemIds.length > 0) {
      const updatedLayers = currentProject.layers.map((layer) => {
        if (layer.id === currentProject.activeLayerId) {
          return {
            ...layer,
            items: layer.items.map((item) => {
              if (selectedItemIds.includes(item.id)) {
                if (item.type === 'stroke') {
                  return { ...item, strokeColor: color };
                } else if (item.type === 'shape') {
                  return { ...item, strokeColor: color };
                } else if (item.type === 'fill') {
                  return { ...item, fillColor: color };
                } else if (item.type === 'curve') {
                  return { ...item, strokeColor: color };
                }
              }
              return item;
            }),
          };
        }
        return layer;
      });
      handleUpdateProjectLayers(updatedLayers, true);
    }
  };

  const handleSelectShape = (shapeId: string) => {
    setActiveShape(shapeId);
    if (activeFloatingPanel === 'eraser') return;

    if (shapeId === 'off') {
      setActiveTool('brush');
    } else if (shapeId === 'bezier' || shapeId === 'wave') {
      setActiveTool('curve');
      setCurveMode(shapeId === 'bezier' ? 'bezier' : 'freehand');
      setCurveSettings((prev) => ({
        ...prev,
        strokeWidth: brushSettings.size,
        opacity: brushSettings.opacity,
      }));
    } else {
      setActiveTool('shape');
      let type: ShapeType = 'circle';
      if (shapeId === 'line') type = 'line';
      if (shapeId === 'rectangle') type = 'rectangle';
      if (shapeId === 'circle' || shapeId === 'oval') type = 'circle';
      if (shapeId === 'polygon') type = 'polygon';
      setShapeSettings((prev) => ({
        ...prev,
        shapeType: type,
        strokeColor: currentColor,
        strokeWidth: brushSettings.size,
        opacity: brushSettings.opacity,
      }));
    }
  };

  const handleSelectRuler = (rulerId: string) => {
    setActiveRuler(rulerId);
  };

  const handleSelectEraserModel = (modelId: string) => {
    setSelectedEraserModel(modelId);
    if (modelId === 'hard') {
      setEraserOpacity(1.0);
      setEraserSize(28);
    } else if (modelId === 'soft') {
      setEraserOpacity(0.5);
      setEraserSize(36);
    } else if (modelId === 'vector') {
      setEraserOpacity(1.0);
      setEraserSize(24);
    } else if (modelId === 'block') {
      setEraserOpacity(1.0);
      setEraserSize(40);
    }
  };

  const handleUpdateBrushSettings = (newSettings: Partial<BrushSettings>) => {
    setBrushSettings((prev) => ({ ...prev, ...newSettings }));

    // If strokeWidth is updated and a stroke/shape is selected, update existing stroke thickness!
    if (newSettings.size !== undefined && currentProject && selectedItemIds.length > 0) {
      const updatedLayers = currentProject.layers.map((layer) => {
        if (layer.id === currentProject.activeLayerId) {
          return {
            ...layer,
            items: layer.items.map((item) => {
              if (selectedItemIds.includes(item.id)) {
                if (item.type === 'stroke') {
                  return { ...item, strokeWidth: newSettings.size! };
                } else if (item.type === 'shape') {
                  return { ...item, strokeWidth: newSettings.size! };
                } else if (item.type === 'curve') {
                  return { ...item, strokeWidth: newSettings.size! };
                }
              }
              return item;
            }),
          };
        }
        return layer;
      });
      handleUpdateProjectLayers(updatedLayers, true);
    }
  };

  // Universal Stroke Width & Opacity handlers across all drawing tools and eraser
  const currentUniversalSize = activeTool === 'eraser' ? eraserSize : brushSettings.size;
  const currentUniversalOpacity = activeTool === 'eraser' ? eraserOpacity : brushSettings.opacity;

  const handleUniversalSizeChange = (newSize: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(newSize)));
    if (activeTool === 'eraser') {
      setEraserSize(clamped);
    } else {
      handleUpdateBrushSettings({ size: clamped });
      setShapeSettings((prev) => ({ ...prev, strokeWidth: clamped }));
      setCurveSettings((prev) => ({ ...prev, strokeWidth: clamped }));
    }
  };

  const handleUniversalOpacityChange = (newOpacity: number) => {
    const clamped = Math.max(0.01, Math.min(1, Number(newOpacity.toFixed(2))));
    if (activeTool === 'eraser') {
      setEraserOpacity(clamped);
    } else {
      handleUpdateBrushSettings({ opacity: clamped });
      setShapeSettings((prev) => ({ ...prev, opacity: clamped }));
      setCurveSettings((prev) => ({ ...prev, opacity: clamped }));
    }
  };

  // Find & Replace Color Feature
  const handleExecuteFindReplace = (
    findColor: string,
    replaceColor: string,
    target: 'stroke' | 'fill' | 'both',
    tolerance: number,
    scope: 'layer' | 'selected'
  ) => {
    if (!currentProject) return;

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === currentProject.activeLayerId) {
        const updatedItems = layer.items.map((item) => {
          if (scope === 'selected' && !selectedItemIds.includes(item.id)) {
            return item;
          }

          if (item.type === 'stroke') {
            if (target === 'stroke' || target === 'both') {
              if (isColorMatch(item.strokeColor, findColor, tolerance)) {
                return { ...item, strokeColor: replaceColor };
              }
            }
          } else if (item.type === 'fill') {
            if (target === 'fill' || target === 'both') {
              if (isColorMatch(item.fillColor, findColor, tolerance)) {
                return { ...item, fillColor: replaceColor };
              }
            }
          } else if (item.type === 'shape') {
            let sColor = item.strokeColor;
            let fColor = item.fillColor;

            if (target === 'stroke' || target === 'both') {
              if (isColorMatch(item.strokeColor, findColor, tolerance)) {
                sColor = replaceColor;
              }
            }
            if (target === 'fill' || target === 'both') {
              if (isColorMatch(item.fillColor, findColor, tolerance)) {
                fColor = replaceColor;
              }
            }
            return { ...item, strokeColor: sColor, fillColor: fColor };
          } else if (item.type === 'curve') {
            if (target === 'stroke' || target === 'both') {
              if (isColorMatch(item.strokeColor, findColor, tolerance)) {
                return { ...item, strokeColor: replaceColor };
              }
            }
          }

          return item;
        });

        return { ...layer, items: updatedItems };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
  };

  // Transform Actions

  const handleFlipSelected = (axis: 'h' | 'v') => {
    if (!currentProject) return;
    const targetIds = getTargetItemIds();
    if (targetIds.length === 0) return;

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === currentProject.activeLayerId) {
        if (appMode === 'animation') {
          return transformLayerItemsAtFrame(layer, animationData.currentFrame, targetIds, (item) => ({
            ...item,
            transform: {
              ...item.transform,
              scaleX: axis === 'h' ? -item.transform.scaleX : item.transform.scaleX,
              scaleY: axis === 'v' ? -item.transform.scaleY : item.transform.scaleY,
            },
          }));
        }
        return {
          ...layer,
          items: layer.items.map((item) => {
            if (targetIds.includes(item.id)) {
              return {
                ...item,
                transform: {
                  ...item.transform,
                  scaleX: axis === 'h' ? -item.transform.scaleX : item.transform.scaleX,
                  scaleY: axis === 'v' ? -item.transform.scaleY : item.transform.scaleY,
                },
              };
            }
            return item;
          }),
        };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
  };

  const handleResetPivot = () => {
    if (!currentProject) return;
    const activeLayer = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    const targetIds = getTargetItemIds();
    const effectiveItems = appMode === 'animation' && activeLayer ? getEffectiveLayerItems(activeLayer, animationData.currentFrame) : (activeLayer?.items || []);
    const selected = effectiveItems.filter((i) => targetIds.includes(i.id)) || [];
    if (selected.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of selected) {
      if (item.boundingBox) {
        if (item.boundingBox.minX < minX) minX = item.boundingBox.minX;
        if (item.boundingBox.minY < minY) minY = item.boundingBox.minY;
        if (item.boundingBox.maxX > maxX) maxX = item.boundingBox.maxX;
        if (item.boundingBox.maxY > maxY) maxY = item.boundingBox.maxY;
      }
    }
    if (minX !== Infinity) {
      const bboxCenterX = (minX + maxX) / 2;
      const bboxCenterY = (minY + maxY) / 2;
      const firstItem = selected[0];
      const tf = firstItem.transform || { x: 0, y: 0 };
      const worldPivotX = bboxCenterX + (tf.x || 0);
      const worldPivotY = bboxCenterY + (tf.y || 0);
      setPivotPoint({ x: worldPivotX, y: worldPivotY });

      // Update local pivot offset on selected items
      const updatedLayers = currentProject.layers.map((layer) => {
        if (layer.id === currentProject.activeLayerId) {
          return {
            ...layer,
            items: layer.items.map((item) => {
              if (targetIds.includes(item.id)) {
                const itemTf = item.transform || { x: 0, y: 0 };
                const cx = item.boundingBox ? (item.boundingBox.minX + item.boundingBox.maxX) / 2 : bboxCenterX;
                const cy = item.boundingBox ? (item.boundingBox.minY + item.boundingBox.maxY) / 2 : bboxCenterY;
                return {
                  ...item,
                  transform: {
                    ...itemTf,
                    pivotX: cx,
                    pivotY: cy,
                  },
                };
              }
              return item;
            }),
          };
        }
        return layer;
      });
      handleUpdateProjectLayers(updatedLayers, true);
    }
  };

  // Compute active transform values for selected object(s)
  const activeTransformValues = useMemo(() => {
    if (!currentProject) {
      return { translateX: 0, translateY: 0, scalePercent: 100, rotationDeg: 0, pivotValue: 0 };
    }

    const activeL = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeL) return { translateX: 0, translateY: 0, scalePercent: 100, rotationDeg: 0, pivotValue: 0 };

    const effectiveItems =
      appMode === 'animation'
        ? getEffectiveLayerItems(activeL, animationData.currentFrame)
        : activeL.items;

    const targetIds = selectedItemIds.length > 0 ? selectedItemIds : effectiveItems.map((i) => i.id);
    const targetItems = effectiveItems.filter((i) => targetIds.includes(i.id));

    if (targetItems.length === 0) {
      return { translateX: 0, translateY: 0, scalePercent: 100, rotationDeg: 0, pivotValue: 0 };
    }

    const primary = targetItems[0];
    const tf = primary.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    const pVal = pivotPoint ? Math.round(pivotPoint.x) : Math.round((tf.pivotX || 0) + (tf.x || 0));

    return {
      translateX: Math.round(tf.x),
      translateY: Math.round(tf.y),
      scalePercent: Math.round((tf.scaleX || 1) * 100),
      rotationDeg: Math.round(((tf.rotation || 0) * 180) / Math.PI),
      pivotValue: pVal,
    };
  }, [currentProject, selectedItemIds, appMode, animationData.currentFrame, pivotPoint]);

  // Synchronized manual transform handler from Transform Bottom Sheet
  const handleManualTransformChange = (
    field: 'x' | 'y' | 'scale' | 'rotation' | 'pivot',
    value: number
  ) => {
    if (!currentProject) return;
    const targetIds = getTargetItemIds();
    if (targetIds.length === 0) return;

    // Calculate new pivot point world position synchronously
    let newWorldPivot = pivotPoint;

    if (field === 'x') {
      const deltaX = value - activeTransformValues.translateX;
      if (pivotPoint) {
        newWorldPivot = { x: pivotPoint.x + deltaX, y: pivotPoint.y };
      }
    } else if (field === 'y') {
      const deltaY = value - activeTransformValues.translateY;
      if (pivotPoint) {
        newWorldPivot = { x: pivotPoint.x, y: pivotPoint.y + deltaY };
      }
    } else if (field === 'pivot') {
      newWorldPivot = { x: value, y: pivotPoint ? pivotPoint.y : 0 };
    }
    
    // Update pivot state
    if (newWorldPivot) setPivotPoint(newWorldPivot);

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === currentProject.activeLayerId) {
        if (appMode === 'animation') {
          return transformLayerItemsAtFrame(layer, animationData.currentFrame, targetIds, (item) => {
            const currentTf = item.transform || {
              x: 0,
              y: 0,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              pivotX: 0,
              pivotY: 0,
            };

            let newX = currentTf.x;
            let newY = currentTf.y;
            let newScaleX = currentTf.scaleX;
            let newScaleY = currentTf.scaleY;
            let newRotation = currentTf.rotation;

            if (field === 'x') newX = value;
            if (field === 'y') newY = value;
            if (field === 'scale') {
              const s = Math.max(0.05, value / 100);
              newScaleX = s;
              newScaleY = s;
            }
            if (field === 'rotation') {
              newRotation = (value * Math.PI) / 180;
            }

            // Use the synchronously calculated pivot
            let worldPivotX = newWorldPivot ? newWorldPivot.x : (currentTf.pivotX + currentTf.x);
            let worldPivotY = newWorldPivot ? newWorldPivot.y : (currentTf.pivotY + currentTf.y);

            const localPivotX = worldPivotX - newX;
            const localPivotY = worldPivotY - newY;

            return {
              ...item,
              transform: {
                ...currentTf,
                x: newX,
                y: newY,
                scaleX: newScaleX,
                scaleY: newScaleY,
                rotation: newRotation,
                pivotX: localPivotX,
                pivotY: localPivotY,
              },
            };
          });
        }

        return {
          ...layer,
          items: layer.items.map((item) => {
            if (targetIds.includes(item.id)) {
              const currentTf = item.transform || {
                x: 0,
                y: 0,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                pivotX: 0,
                pivotY: 0,
              };

              let newX = currentTf.x;
              let newY = currentTf.y;
              let newScaleX = currentTf.scaleX;
              let newScaleY = currentTf.scaleY;
              let newRotation = currentTf.rotation;

              if (field === 'x') newX = value;
              if (field === 'y') newY = value;
              if (field === 'scale') {
                const s = Math.max(0.05, value / 100);
                newScaleX = s;
                newScaleY = s;
              }
              if (field === 'rotation') {
                newRotation = (value * Math.PI) / 180;
              }

              // Use the synchronously calculated pivot
              let worldPivotX = newWorldPivot ? newWorldPivot.x : (currentTf.pivotX + currentTf.x);
              let worldPivotY = newWorldPivot ? newWorldPivot.y : (currentTf.pivotY + currentTf.y);

              const localPivotX = worldPivotX - newX;
              const localPivotY = worldPivotY - newY;

              return {
                ...item,
                transform: {
                  ...currentTf,
                  x: newX,
                  y: newY,
                  scaleX: newScaleX,
                  scaleY: newScaleY,
                  rotation: newRotation,
                  pivotX: localPivotX,
                  pivotY: localPivotY,
                },
              };
            }
            return item;
          }),
        };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, false);
  };

  // Cross-Layer Copy, Cut & Paste Implementation
  const handleCopySelected = () => {
    if (!currentProject) return;
    const targetIds = getTargetItemIds();
    if (targetIds.length === 0) return;
    const activeLayer = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeLayer) return;

    const layerItems = appMode === 'animation' ? getEffectiveLayerItems(activeLayer, animationData.currentFrame) : activeLayer.items;
    const itemsToCopy = layerItems
      .filter((item) => targetIds.includes(item.id))
      .map((item) => JSON.parse(JSON.stringify(item)) as CanvasItem);

    setClipboard(itemsToCopy);
  };

  const handleCutSelected = () => {
    handleCopySelected();
    handleDeleteSelected();
  };

  const handlePasteToActiveLayer = () => {
    if (!currentProject || clipboard.length === 0) return;
    const activeLayer = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeLayer) return;

    const pastedItems: CanvasItem[] = [];
    const newSelectedIds: string[] = [];

    for (const item of clipboard) {
      const newId = `paste_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      newSelectedIds.push(newId);
      const cloned = JSON.parse(JSON.stringify(item)) as CanvasItem;
      cloned.id = newId;
      cloned.layerId = activeLayer.id;
      cloned.transform.x += 25;
      cloned.transform.y += 25;
      if (cloned.boundingBox) {
        cloned.boundingBox.minX += 25;
        cloned.boundingBox.minY += 25;
        cloned.boundingBox.maxX += 25;
        cloned.boundingBox.maxY += 25;
      }
      pastedItems.push(cloned);
    }

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === activeLayer.id) {
        if (appMode === 'animation') {
          const effectiveItems = getEffectiveLayerItems(layer, animationData.currentFrame);
          return updateLayerArtworkAtFrame(layer, animationData.currentFrame, [...effectiveItems, ...pastedItems]);
        }
        return {
          ...layer,
          items: [...layer.items, ...pastedItems],
        };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
    setSelectedItemIds(newSelectedIds);
  };

  const handleDuplicateSelected = () => {
    if (!currentProject) return;
    const targetIds = getTargetItemIds();
    if (targetIds.length === 0) return;
    const activeLayer = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeLayer) return;

    const effectiveItems = appMode === 'animation' ? getEffectiveLayerItems(activeLayer, animationData.currentFrame) : activeLayer.items;
    const duplicates: CanvasItem[] = [];
    const newSelectedIds: string[] = [];

    for (const item of effectiveItems) {
      if (targetIds.includes(item.id)) {
        const newId = `dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        newSelectedIds.push(newId);
        const duplicatedItem = JSON.parse(JSON.stringify(item)) as CanvasItem;
        duplicatedItem.id = newId;
        duplicatedItem.layerId = activeLayer.id;
        duplicatedItem.transform.x += 20;
        duplicatedItem.transform.y += 20;
        if (duplicatedItem.boundingBox) {
          duplicatedItem.boundingBox.minX += 20;
          duplicatedItem.boundingBox.minY += 20;
          duplicatedItem.boundingBox.maxX += 20;
          duplicatedItem.boundingBox.maxY += 20;
        }
        duplicates.push(duplicatedItem);
      }
    }

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === activeLayer.id) {
        if (appMode === 'animation') {
          return updateLayerArtworkAtFrame(layer, animationData.currentFrame, [...effectiveItems, ...duplicates]);
        }
        return {
          ...layer,
          items: [...layer.items, ...duplicates],
        };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
    setSelectedItemIds(newSelectedIds);
  };

  const handleDeleteSelected = () => {
    if (!currentProject) return;
    const targetIds = getTargetItemIds();
    if (targetIds.length === 0) return;

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === currentProject.activeLayerId) {
        if (appMode === 'animation') {
          const effectiveItems = getEffectiveLayerItems(layer, animationData.currentFrame);
          return updateLayerArtworkAtFrame(
            layer,
            animationData.currentFrame,
            effectiveItems.filter((item) => !targetIds.includes(item.id))
          );
        }
        return {
          ...layer,
          items: layer.items.filter((item) => !targetIds.includes(item.id)),
        };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
    setSelectedItemIds([]);
    setPivotPoint(null);
  };

  // Image Export Handler with Native Android, Object Cropping & Mobile Web Share Support
  const handleExportImage = (
    format: 'png' | 'jpeg' | 'webp',
    quality: number,
    transparentBg: boolean,
    cropToObjects: boolean = false
  ): string | null => {
    if (!currentProject) return null;

    let targetWidth = currentProject.width;
    let targetHeight = currentProject.height;
    let offsetX = 0;
    let offsetY = 0;

    // Calculate bounding box if user requested cropping to drawn objects
    if (cropToObjects) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let found = false;

      const targetIds = selectedItemIds.length > 0 ? selectedItemIds : undefined;

      for (const layer of currentProject.layers) {
        if (!layer.visible) continue;
        for (const item of layer.items) {
          if (targetIds && !targetIds.includes(item.id)) continue;
          if (item.boundingBox) {
            const tf = item.transform || { x: 0, y: 0 };
            minX = Math.min(minX, item.boundingBox.minX + tf.x);
            minY = Math.min(minY, item.boundingBox.minY + tf.y);
            maxX = Math.max(maxX, item.boundingBox.maxX + tf.x);
            maxY = Math.max(maxY, item.boundingBox.maxY + tf.y);
            found = true;
          }
        }
      }

      if (found && isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
        const pad = 20;
        minX = Math.floor(minX - pad);
        minY = Math.floor(minY - pad);
        maxX = Math.ceil(maxX + pad);
        maxY = Math.ceil(maxY + pad);

        targetWidth = Math.max(20, maxX - minX);
        targetHeight = Math.max(20, maxY - minY);
        offsetX = -minX;
        offsetY = -minY;
      }
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetWidth;
    exportCanvas.height = targetHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    if (offsetX !== 0 || offsetY !== 0) {
      ctx.translate(offsetX, offsetY);
    }

    // Render layers without drawing background or checkerboard pattern when transparentBg is true
    renderCanvas(
      ctx,
      currentProject.width,
      currentProject.height,
      currentProject.layers,
      transparentBg ? 'transparent' : currentProject.backgroundColor,
      cropToObjects ? null : currentProject.referenceImage,
      false // CRITICAL: NEVER draw checkerboard pattern on exported images!
    );

    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : format;
    const fileName = `${currentProject.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.${ext}`;
    const dataUrl = exportCanvas.toDataURL(mimeType, quality);

    // 1. Android APK Native Bridge check
    if ((window as any).AndroidApp && typeof (window as any).AndroidApp.saveImageToGallery === 'function') {
      try {
        const saved = (window as any).AndroidApp.saveImageToGallery(dataUrl, fileName);
        if (saved) return dataUrl;
      } catch (err) {
        console.error('Android native save error:', err);
      }
    }

    // 2. Web Share API & Blob Download Fallback
    exportCanvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: currentProject.name,
            text: 'Exported Artwork from ArtFlow Studio',
            files: [file],
          });
          return;
        } catch (_) {
          // User closed share modal, fallback to blob download
        }
      }

      // Standard browser Blob URL download trigger
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    }, mimeType, quality);

    return dataUrl;
  };

  // Bind Reference Image DIRECTLY to Selected Layer (Requirements 2 & 3)
  const handleImportImageToActiveLayer = (dataUrl: string, width: number, height: number) => {
    if (!currentProject) return;
    const activeLayer = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeLayer) return;

    // Scale to fit ~70% of canvas
    const maxW = currentProject.width * 0.75;
    const maxH = currentProject.height * 0.75;
    const scale = Math.min(1, maxW / width, maxH / height);

    const imageItem: ImageItem = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'image',
      layerId: activeLayer.id,
      url: dataUrl,
      opacity: 0.35, // 35% default trace mode
      width,
      height,
      isReference: true,
      transform: {
        x: 0,
        y: 0,
        scaleX: scale,
        scaleY: scale,
        rotation: 0,
        pivotX: currentProject.width / 2,
        pivotY: currentProject.height / 2,
      },
      boundingBox: {
        minX: currentProject.width / 2 - (width * scale) / 2,
        minY: currentProject.height / 2 - (height * scale) / 2,
        maxX: currentProject.width / 2 + (width * scale) / 2,
        maxY: currentProject.height / 2 + (height * scale) / 2,
      },
    };

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === activeLayer.id) {
        return {
          ...layer,
          items: [...layer.items, imageItem],
        };
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
  };

  const handleUpdateLayerImage = (update: Partial<ImageItem> | null) => {
    if (!currentProject) return;
    const activeLayer = currentProject.layers.find((l) => l.id === currentProject.activeLayerId);
    if (!activeLayer) return;

    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === activeLayer.id) {
        if (update === null) {
          // Delete image from layer
          return {
            ...layer,
            items: layer.items.filter((item) => item.type !== 'image'),
          };
        } else {
          // Update image properties on layer
          return {
            ...layer,
            items: layer.items.map((item) => {
              if (item.type === 'image') {
                return { ...item, ...update };
              }
              return item;
            }),
          };
        }
      }
      return layer;
    });

    handleUpdateProjectLayers(updatedLayers, true);
  };

  const activeLayer = currentProject?.layers.find((l) => l.id === currentProject.activeLayerId);
  const activeLayerImageItem = activeLayer?.items.find((item) => item.type === 'image') as ImageItem | undefined;

  // Clean active layer
  const handleClearActiveLayer = () => {
    if (!currentProject) return;
    const updatedLayers = currentProject.layers.map((layer) => {
      if (layer.id === currentProject.activeLayerId) {
        if (appMode === 'animation') {
          return updateLayerArtworkAtFrame(layer, animationData.currentFrame, []);
        }
        return { ...layer, items: [] };
      }
      return layer;
    });
    handleUpdateProjectLayers(updatedLayers, true);
    setSelectedItemIds([]);
  };

  return (
    <div className="w-screen h-screen bg-[#070B14] text-slate-100 flex flex-col select-none overflow-hidden font-sans fixed inset-0 m-0 p-0">
      {view === 'gallery' ? (
        <HomeGallery
          projects={projects}
          onOpenProject={handleOpenProject}
          onNewProjectClick={(initialRatio) => {
            setInitialRatioForModal(initialRatio || '1:1');
            setActiveModal('new-project');
          }}
          onDeleteProject={async (id) => {
            await deleteProjectFromDB(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
          }}
          onDuplicateProject={async (proj) => {
            const duplicated: Project = {
              ...proj,
              id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: `${proj.name} (Copy)`,
              updatedAt: Date.now(),
            };
            await saveProjectToDB(duplicated);
            setProjects((prev) => [duplicated, ...prev]);
          }}
          onRenameProject={async (id, newName) => {
            const proj = projects.find((p) => p.id === id);
            if (proj) {
              const updated = { ...proj, name: newName, updatedAt: Date.now() };
              await saveProjectToDB(updated);
              setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
            }
          }}
          onOpenAiGen={() => setActiveModal('ai-image-gen')}
          onOpenAiAssistant={() => setActiveModal('ai-chat')}
        />
      ) : currentProject ? (
        <div className="flex flex-col w-full h-full relative overflow-hidden">
          {/* Top Bar with Safe-Area handling */}
          <TopBar
            projectName={currentProject.name}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            appMode={appMode}
            isToolbarOpen={isFloatingToolbarOpen}
            activePanel={activeFloatingPanel}
            isFingerMenuOpen={isFingerMenuOpen}
            onToggleFingerMenu={() => setIsFingerMenuOpen((prev) => !prev)}
            currentToolSize={currentUniversalSize}
            currentToolOpacity={currentUniversalOpacity}
            activeToolName={activeTool}
            onUpdateToolSize={handleUniversalSizeChange}
            onUpdateToolOpacity={handleUniversalOpacityChange}
            onToggleFloatingToolbar={() => {
              if (activeFloatingPanel !== 'none' || isFloatingToolbarOpen) {
                setIsFloatingToolbarOpen(false);
                setActiveFloatingPanel('none');
              } else {
                setIsFloatingToolbarOpen(true);
              }
            }}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onBackToHome={() => {
              getAllProjectsFromDB().then(setProjects);
              setView('gallery');
            }}
            onToggleReferenceModal={() => setActiveModal('reference')}
            onToggleAnimationMode={() => {
              setAppMode((prev) => {
                const nextMode = prev === 'drawing' ? 'animation' : 'drawing';
                if (nextMode === 'animation' && currentProject) {
                  // Ensure all layers have their default keyframe 0 initialized with deep-cloned artwork
                  const initializedLayers = currentProject.layers.map((l) => ({
                    ...l,
                    frames: ensureLayerFrames(l),
                  }));
                  handleUpdateProjectLayers(initializedLayers, false);
                }
                return nextMode;
              });
            }}
            onOpenSaveModal={() => setActiveModal('save-project')}
            onOpenExportModal={() => setActiveModal('export-image')}
            onOpenProjectSettings={() => setActiveModal('project-settings')}
            onOpenFindReplace={() => setActiveModal('find-replace')}
            onOpenAiAssistant={() => setActiveModal('ai-chat')}
            onClearActiveLayer={handleClearActiveLayer}
            onFitToScreen={() => fitCanvasToMobile(currentProject)}
            onResetRotation={() => setCanvasRotation(0)}
            hasReferenceImage={Boolean(activeLayerImageItem || (currentProject.referenceImage && currentProject.referenceImage.visible))}
            canvasRotation={canvasRotation}
          />

          {/* Canvas Workspace Center */}
          <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden">
            {/* Side Toolbar (Hidden on small mobile, visible on tablet/desktop) */}
            <SideToolbar
              activeTool={activeTool}
              onSelectTool={(tool) => {
                setActiveTool(tool);
                if (tool !== 'lasso' && tool !== 'transform' && tool !== 'select') {
                  setSelectedItemIds([]);
                }
              }}
              onOpenToolSettings={(tool) => {
                if (['brush', 'pencil', 'pen', 'marker'].includes(tool)) {
                  setActiveModal('brush-settings');
                } else if (tool === 'fill') {
                  setActiveModal('fill-properties');
                } else if (tool === 'shape') {
                  setActiveModal('shape-settings');
                }
              }}
            />

            {/* Floating Tools & Panels Overlay (Panels 1, 2, 3, 4, 5) */}
            <FloatingToolsOverlay
              isToolbarOpen={isFloatingToolbarOpen}
              activePanel={activeFloatingPanel}
              activeTool={activeTool}
              currentColor={currentColor}
              brushSettings={brushSettings}
              eraserSize={eraserSize}
              eraserOpacity={eraserOpacity}
              activeRuler={activeRuler}
              activeShape={activeShape}
              selectedEraserModel={selectedEraserModel}
              translateX={activeTransformValues.translateX}
              translateY={activeTransformValues.translateY}
              scalePercent={activeTransformValues.scalePercent}
              rotationDeg={activeTransformValues.rotationDeg}
              onCloseToolbar={() => setIsFloatingToolbarOpen(false)}
              onOpenPanel={(panel) => {
                setIsFloatingToolbarOpen(false);
                setActiveFloatingPanel(panel);
              }}
              onClosePanel={() => setActiveFloatingPanel('none')}
              onSelectTool={(tool) => {
                setActiveTool(tool);
                if (tool !== 'lasso' && tool !== 'transform' && tool !== 'select') {
                  setSelectedItemIds([]);
                }
              }}
              onUpdateBrushSettings={handleUpdateBrushSettings}
              onUpdateEraserSize={setEraserSize}
              onUpdateEraserOpacity={setEraserOpacity}
              onSelectRuler={handleSelectRuler}
              onSelectShape={handleSelectShape}
              onSelectEraserModel={handleSelectEraserModel}
              onSelectColor={handleSelectColor}
              onChangeTranslateX={(val) => handleManualTransformChange('x', val)}
              onChangeTranslateY={(val) => handleManualTransformChange('y', val)}
              onChangeScale={(val) => handleManualTransformChange('scale', val)}
              onChangeRotation={(val) => handleManualTransformChange('rotation', val)}
            />

            {/* Main Canvas Engine */}
            <MainCanvas
              project={currentProject}
              activeTool={activeTool}
              brushSettings={brushSettings}
              eraserSize={eraserSize}
              eraserOpacity={eraserOpacity}
              activeRuler={activeRuler}
              fillSettings={fillSettings}
              shapeSettings={shapeSettings}
              curveSettings={curveSettings}
              curveMode={curveMode}
              currentColor={currentColor}
              onSelectColor={handleSelectColor}
              onUpdateProjectLayers={handleUpdateProjectLayers}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onOpenReferenceModal={() => setActiveModal('reference')}
              selectedItemIds={selectedItemIds}
              setSelectedItemIds={setSelectedItemIds}
              transformMode={transformMode}
              pivotPoint={pivotPoint}
              setPivotPoint={setPivotPoint}
              canvasRotation={canvasRotation}
              setCanvasRotation={setCanvasRotation}
              canvasZoom={canvasZoom}
              setCanvasZoom={setCanvasZoom}
              canvasPan={canvasPan}
              setCanvasPan={setCanvasPan}
              animationStates={animationStates}
              currentFrame={appMode === 'animation' ? animationData.currentFrame : undefined}
            />

            {/* Floating Lasso Selection Toolbar */}
            {activeTool === 'lasso' && (selectedItemIds.length > 0 || clipboard.length > 0) && (
              <LassoToolbar
                onTransform={() => setActiveTool('transform')}
                onCopy={handleCopySelected}
                onCut={handleCutSelected}
                onPaste={handlePasteToActiveLayer}
                onDuplicate={handleDuplicateSelected}
                onDelete={handleDeleteSelected}
                onDeselect={() => setSelectedItemIds([])}
                canPaste={clipboard.length > 0}
              />
            )}

            {/* Floating Transform Bottom Sheet Overlay */}
            {activeTool === 'transform' && (
              <TransformToolbar
                translateX={activeTransformValues.translateX}
                translateY={activeTransformValues.translateY}
                scalePercent={activeTransformValues.scalePercent}
                rotationDeg={activeTransformValues.rotationDeg}
                pivotValue={activeTransformValues.pivotValue}
                transformMode={transformMode}
                onChangeMode={setTransformMode}
                onChangeTranslateX={(val) => handleManualTransformChange('x', val)}
                onChangeTranslateY={(val) => handleManualTransformChange('y', val)}
                onChangeScale={(val) => handleManualTransformChange('scale', val)}
                onChangeRotation={(val) => handleManualTransformChange('rotation', val)}
                onChangePivot={(val) => handleManualTransformChange('pivot', val)}
                onFlipHorizontal={() => handleFlipSelected('h')}
                onFlipVertical={() => handleFlipSelected('v')}
                onResetPivot={handleResetPivot}
                onDuplicate={handleDuplicateSelected}
                onDelete={handleDeleteSelected}
                onApply={() => {
                  if (currentProject) {
                    handleUpdateProjectLayers(currentProject.layers, true);
                  }
                  initialTransformLayersRef.current = null;
                  setActiveTool('brush');
                  setSelectedItemIds([]);
                  setPivotPoint(null);
                }}
                onCancel={() => {
                  if (initialTransformLayersRef.current && currentProject) {
                    handleUpdateProjectLayers(initialTransformLayersRef.current, false);
                  }
                  initialTransformLayersRef.current = null;
                  setActiveTool('brush');
                  setSelectedItemIds([]);
                  setPivotPoint(null);
                }}
              />
            )}
          </div>

          {/* Floating 2D Animation Timeline Overlay */}
          {appMode === 'animation' && currentProject && (
            <AnimationTimeline
              project={currentProject}
              animationData={animationData}
              activeLayerId={currentProject.activeLayerId}
              onSelectLayer={(id) => setCurrentProject({ ...currentProject, activeLayerId: id })}
              onUpdateAnimationData={handleUpdateAnimationData}
              onUpdateProjectLayers={(newLayers, pushHist) => handleUpdateProjectLayers(newLayers, pushHist)}
              onAddLayer={handleAddLayerFromTimeline}
              onDeleteLayer={handleDeleteLayerFromTimeline}
              onToggleLayerVisibility={handleToggleLayerVisibilityFromTimeline}
              onToggleLayerLock={handleToggleLayerLockFromTimeline}
              onSwitchToDrawingMode={() => setAppMode('drawing')}
            />
          )}

          {/* Bottom Toolbar with Integrated Tool Size & Opacity Panel (Mockup Item 6) */}
          <BottomToolbar
            activeTool={activeTool}
            currentColor={currentColor}
            onSelectColor={handleSelectColor}
            layerCount={currentProject.layers.length}
            brushSettings={brushSettings}
            onUpdateBrushSettings={handleUpdateBrushSettings}
            eraserSize={eraserSize}
            onUpdateEraserSize={setEraserSize}
            eraserOpacity={eraserOpacity}
            onUpdateEraserOpacity={setEraserOpacity}
            curveSettings={curveSettings}
            onUpdateCurveSettings={(newSet) => setCurveSettings((prev) => ({ ...prev, ...newSet }))}
            shapeSettings={shapeSettings}
            onUpdateShapeSettings={(newSet) => setShapeSettings((prev) => ({ ...prev, ...newSet }))}
            onSelectTool={(tool) => {
              setActiveTool(tool);
              if (tool !== 'lasso' && tool !== 'transform' && tool !== 'select') {
                setSelectedItemIds([]);
              }
            }}
            onOpenBrushSettings={() => setActiveModal('brush-settings')}
            onOpenColorPicker={() => {
              setColorPickerTarget('primary');
              setActiveModal('color-picker');
            }}
            onOpenLayersModal={() => setActiveModal('layers')}
            onOpenShapeModal={() => setActiveModal('shape-settings')}
            onOpenFillProperties={() => setActiveModal('fill-properties')}
            onOpenCurveSettings={() => {
              setActiveTool('curve');
              setActiveModal('shape-settings');
            }}
            onActivateEyedropper={() => setActiveTool('eyedropper')}
          />
        </div>
      ) : null}

      {/* MODALS */}
      {activeModal === 'new-project' && (
        <NewProjectModal
          initialRatio={initialRatioForModal}
          onClose={() => setActiveModal('none')}
          onCreateProject={(newProj) => {
            saveProjectToDB(newProj).then(() => {
              setProjects((prev) => [newProj, ...prev]);
              handleOpenProject(newProj);
              setActiveModal('none');
            });
          }}
        />
      )}

      {activeModal === 'brush-settings' && (
        <BrushSettingsModal
          settings={brushSettings}
          currentColor={currentColor}
          onUpdateSettings={handleUpdateBrushSettings}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'color-picker' && (
        <ColorPickerModal
          color={
            colorPickerTarget === 'primary'
              ? currentColor
              : colorPickerTarget === 'stroke'
              ? shapeSettings.strokeColor
              : shapeSettings.fillColor
          }
          onColorChange={(newColor) => {
            if (colorPickerTarget === 'primary') {
              handleSelectColor(newColor);
            } else if (colorPickerTarget === 'stroke') {
              setShapeSettings((prev) => ({ ...prev, strokeColor: newColor }));
            } else if (colorPickerTarget === 'fill') {
              setShapeSettings((prev) => ({ ...prev, fillColor: newColor }));
              setFillSettings((prev) => ({ ...prev, fillColor: newColor }));
            }
          }}
          onClose={() => setActiveModal('none')}
          onEyedropperClick={() => {
            setActiveTool('eyedropper');
            setActiveModal('none');
          }}
        />
      )}

      {activeModal === 'layers' && currentProject && (
        <LayersModal
          layers={currentProject.layers}
          activeLayerId={currentProject.activeLayerId}
          onSelectLayer={(id) => setCurrentProject({ ...currentProject, activeLayerId: id })}
          onAddLayer={() => {
            const count = currentProject.layers.length + 1;
            const newLayer: LayerItem = {
              id: `layer_${Date.now()}_${count}`,
              name: `Layer ${count}`,
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
              items: [],
            };
            handleUpdateProjectLayers([...currentProject.layers, newLayer], true);
            setCurrentProject((prev) => (prev ? { ...prev, activeLayerId: newLayer.id } : null));
          }}
          onDeleteLayer={(id) => {
            if (currentProject.layers.length <= 1) return;
            const remaining = currentProject.layers.filter((l) => l.id !== id);
            const nextActive = currentProject.activeLayerId === id ? remaining[0].id : currentProject.activeLayerId;
            setCurrentProject({ ...currentProject, activeLayerId: nextActive });
            handleUpdateProjectLayers(remaining, true);
          }}
          onDuplicateLayer={(id) => {
            const target = currentProject.layers.find((l) => l.id === id);
            if (!target) return;
            const dup: LayerItem = {
              ...JSON.parse(JSON.stringify(target)),
              id: `layer_${Date.now()}_dup`,
              name: `${target.name} (Copy)`,
            };
            handleUpdateProjectLayers([...currentProject.layers, dup], true);
          }}
          onToggleVisibility={(id) => {
            const updated = currentProject.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
            handleUpdateProjectLayers(updated, true);
          }}
          onToggleLock={(id) => {
            const updated = currentProject.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l));
            handleUpdateProjectLayers(updated, true);
          }}
          onChangeOpacity={(id, opacity) => {
            const updated = currentProject.layers.map((l) => (l.id === id ? { ...l, opacity } : l));
            handleUpdateProjectLayers(updated, false);
          }}
          onMergeDown={(id) => {
            const index = currentProject.layers.findIndex((l) => l.id === id);
            if (index <= 0) return;
            const upper = currentProject.layers[index];
            const lower = currentProject.layers[index - 1];
            const merged: LayerItem = {
              ...lower,
              items: [...lower.items, ...upper.items],
            };
            const updated = currentProject.layers.filter((_, i) => i !== index);
            updated[index - 1] = merged;
            setCurrentProject({ ...currentProject, activeLayerId: merged.id });
            handleUpdateProjectLayers(updated, true);
          }}
          onMoveLayer={(id, dir) => {
            const index = currentProject.layers.findIndex((l) => l.id === id);
            const targetIndex = dir === 'up' ? index + 1 : index - 1;
            if (targetIndex < 0 || targetIndex >= currentProject.layers.length) return;
            const copy = [...currentProject.layers];
            const temp = copy[index];
            copy[index] = copy[targetIndex];
            copy[targetIndex] = temp;
            handleUpdateProjectLayers(copy, true);
          }}
          onFlipLayer={(id, axis) => {
            const updated = currentProject.layers.map((layer) => {
              if (layer.id === id) {
                return {
                  ...layer,
                  items: layer.items.map((item) => ({
                    ...item,
                    transform: {
                      ...item.transform,
                      scaleX: axis === 'h' ? -item.transform.scaleX : item.transform.scaleX,
                      scaleY: axis === 'v' ? -item.transform.scaleY : item.transform.scaleY,
                    },
                  })),
                };
              }
              return layer;
            });
            handleUpdateProjectLayers(updated, true);
          }}
          onToggleAlphaLock={handleToggleAlphaLock}
          onOpenFindReplace={() => setActiveModal('find-replace')}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Reference Image Modal directly associated with active layer */}
      {activeModal === 'reference' && currentProject && activeLayer && (
        <ReferenceModal
          activeLayerName={activeLayer.name}
          activeLayerImageItem={activeLayerImageItem}
          onUpdateLayerImage={handleUpdateLayerImage}
          onImportImageToLayer={handleImportImageToActiveLayer}
          onOpenAiGen={() => setActiveModal('ai-image-gen')}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'shape-settings' && (
        <ShapeModal
          settings={shapeSettings}
          curveMode={curveMode}
          initialIsCurve={activeTool === 'curve'}
          onUpdateSettings={(newSettings) => setShapeSettings((prev) => ({ ...prev, ...newSettings }))}
          onApplyShape={(settings) => {
            setShapeSettings(settings);
            setActiveTool('shape');
          }}
          onSelectCurveMode={(mode) => {
            setCurveMode(mode);
            setActiveTool('curve');
          }}
          onClose={() => setActiveModal('none')}
          onOpenColorPicker={(target) => {
            setColorPickerTarget(target);
            setActiveModal('color-picker');
          }}
        />
      )}

      {activeModal === 'find-replace' && (
        <FindReplaceModal
          initialFindColor="#000000"
          initialReplaceColor="#FFFFFF"
          onExecuteReplace={handleExecuteFindReplace}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'fill-properties' && (
        <FillPropertiesModal
          settings={fillSettings}
          onUpdateSettings={(newSettings) => setFillSettings((prev) => ({ ...prev, ...newSettings }))}
          onClose={() => setActiveModal('none')}
          onOpenColorPicker={() => {
            setColorPickerTarget('fill');
            setActiveModal('color-picker');
          }}
          onSwitchToBrushSettings={() => setActiveModal('brush-settings')}
        />
      )}

      {activeModal === 'save-project' && currentProject && (
        <SaveProjectModal
          project={currentProject}
          onSave={async (newName) => {
            const updated = { ...currentProject, name: newName, updatedAt: Date.now() };
            setCurrentProject(updated);
            await saveProjectToDB(updated);
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'export-image' && currentProject && (
        <ExportModal
          project={currentProject}
          onExport={handleExportImage}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'project-settings' && currentProject && (
        <ProjectSettingsModal
          project={currentProject}
          onUpdateBackgroundColor={(color) => {
            const updated = { ...currentProject, backgroundColor: color };
            setCurrentProject(updated);
            saveProjectToDB(updated).catch(console.error);
          }}
          onOpenLayers={() => setActiveModal('layers')}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'ai-chat' && (
        <AiAssistantModal onClose={() => setActiveModal('none')} />
      )}

      {activeModal === 'ai-image-gen' && (
        <AiImageGenModal
          onAddAsReference={(url) => {
            handleImportImageToActiveLayer(url, 800, 800);
          }}
          onAddAsLayer={(url) => {
            handleImportImageToActiveLayer(url, 800, 800);
          }}
          onClose={() => setActiveModal('none')}
        />
      )}
    </div>
  );
}
