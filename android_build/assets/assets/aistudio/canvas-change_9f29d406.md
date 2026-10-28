## CRITICAL TASK — FIX ONLY THE CANVAS FIT / VIEWPORT SYSTEM

I want you to modify ONLY the canvas fitting, canvas viewport, zoom, and canvas positioning behavior of my existing drawing app.

### VERY IMPORTANT — DO NOT CHANGE ANYTHING ELSE

Do NOT redesign the UI.

Do NOT change the existing toolbar.

Do NOT change the bottom tools.

Do NOT change Brush.

Do NOT change Pencil.

Do NOT change Eraser.

Do NOT change Fill.

Do NOT change Curve.

Do NOT change Lasso.

Do NOT change Transform.

Do NOT change Shape.

Do NOT change Layers.

Do NOT change Alpha Lock.

Do NOT change Reference Image.

Do NOT change stroke behavior.

Do NOT change drawing behavior.

Do NOT change colors.

Do NOT change buttons.

Do NOT change icons.

Do NOT change menus.

Do NOT add new features.

Do NOT remove existing features.

Do NOT rewrite unrelated components.

Do NOT modify the existing document/layer/object data model unless absolutely required for the canvas camera.

The ONLY task is to make the canvas viewport behave like a professional mobile drawing application such as ibisPaint X.

---

# 1. TARGET BEHAVIOR

The current problem is:

The artwork canvas appears very small in the middle of the editor with a large amount of empty dark space around it.

This is WRONG.

The canvas should automatically use the available editor viewport efficiently.

The behavior should be similar to ibisPaint X:

- The artwork/document remains at its real document size.
- The viewport displays the artwork as large as possible.
- The canvas is automatically fitted when the editor opens.
- The canvas remains centered.
- The aspect ratio is always preserved.
- There must be no unwanted stretching.
- There must be no tiny fixed-size canvas.
- There must be no unnecessary empty space.
- The canvas must adapt to different Android screen sizes.
- Portrait and landscape orientations must work.
- Different canvas aspect ratios must work.
- 16:9 must work.
- 9:16 must work.
- 1:1 must work.
- 4:4 must work.
- Any custom document size must work.

---

# 2. DO NOT CONFUSE CANVAS FIT WITH CSS FULLSCREEN

Do NOT simply make the HTML canvas:

width: 100%;
height: 100%;

That is NOT the requested solution.

Do NOT stretch the artwork to fill the screen.

Do NOT change the actual document dimensions.

Implement a proper professional canvas viewport/camera system.

The architecture must conceptually be:

SCREEN
↓
EDITOR VIEWPORT
↓
CANVAS CAMERA
↓
DOCUMENT SPACE
↓
LAYERS / OBJECTS / STROKES

The document and the viewport are different things.

---

# 3. CANVAS CAMERA SYSTEM

Create or fix the existing canvas camera system.

The camera should contain at least:

```ts
interface CanvasCamera {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}
```

If the project already has a camera system, improve/fix it instead of creating a duplicate system.

The camera controls how the document is viewed.

The camera must NOT modify the actual document/layer/object coordinates.

---

# 4. AUTOMATIC INITIAL FIT

When a project/editor opens, calculate the available drawing viewport.

Use the actual available editor area, NOT the entire device screen blindly.

For example:

```ts
availableWidth = viewportWidth;
availableHeight = viewportHeight;

scaleX = availableWidth / documentWidth;
scaleY = availableHeight / documentHeight;

fitZoom = Math.min(scaleX, scaleY);
```

Then apply a small safety margin so the complete artwork remains visible:

```ts
initialZoom = fitZoom * 0.95;
```

The exact margin can be adjusted slightly if necessary.

The important behavior is:

FIT THE COMPLETE DOCUMENT INSIDE THE AVAILABLE VIEWPORT WHILE MAKING IT AS LARGE AS POSSIBLE.

---

# 5. CENTER THE CANVAS

After calculating the fit zoom, automatically center the document.

Conceptually:

```ts
scaledWidth = documentWidth * zoom;
scaledHeight = documentHeight * zoom;

offsetX = (viewportWidth - scaledWidth) / 2;
offsetY = (viewportHeight - scaledHeight) / 2;
```

The canvas should appear centered inside the available editor viewport.

Do not center it based on the full browser window if the toolbar/header/bottom tool area occupies part of the screen.

Use the REAL canvas editor viewport.

---

# 6. IMPORTANT — USE THE ACTUAL AVAILABLE EDITOR AREA

The application contains UI around the drawing area.

For example:

TOP UI
↓
EDITOR / CANVAS VIEWPORT
↓
BOTTOM TOOLBAR

The canvas must fit inside the area between those UI regions.

Calculate:

```text
viewportTop
viewportLeft
viewportWidth
viewportHeight
```

from the actual editor container.

Do NOT use:

```text
window.innerWidth
window.innerHeight
```

as the only measurement if the editor viewport is smaller because of UI elements.

The fit calculation must use the real canvas viewport/container dimensions.

---

# 7. RESPONSIVE AUTO-FIT

When any of the following happens:

- Android screen size changes
- orientation changes
- portrait → landscape
- landscape → portrait
- app window size changes
- browser/PWA viewport changes
- system navigation bar changes available space
- editor toolbar changes the available drawing area

recalculate the canvas viewport.

Example:

```ts
ResizeObserver
```

should be used where appropriate.

The canvas should automatically recalculate:

```text
viewport size
→ fit zoom
→ canvas position
→ center
```

Do NOT reload the project.

Do NOT recreate the document.

Do NOT destroy layers.

Do NOT lose strokes.

Do NOT modify artwork data.

Only update the camera/view.

---

# 8. PRESERVE ASPECT RATIO

Never stretch the artwork.

Always use:

```ts
zoom = Math.min(scaleX, scaleY);
```

The document aspect ratio must remain exactly the same.

For example:

16:9 document:

```text
████████████████
████████████████
```

must remain 16:9.

Do not convert it into a square simply to fill the screen.

---

# 9. IBISPAINT-STYLE CANVAS NAVIGATION

After the initial fit, the user must be able to navigate the canvas naturally.

Implement/fix:

### One-finger drawing

When a drawing tool is active:

One finger should draw normally.

Do NOT accidentally move the camera while drawing.

### Two-finger pan

Two fingers drag:

→ move/pan the canvas.

### Pinch zoom

Two fingers moving closer/farther:

→ zoom out/in.

Zoom must happen around the user's finger midpoint rather than randomly around the screen center.

### Optional two-finger rotation

If the current application already supports canvas rotation, preserve it.

If it does not already support rotation, DO NOT add unrelated functionality just for this task.

The primary task is canvas fit.

---

# 10. ZOOM MUST NOT CHANGE THE DOCUMENT

Zooming means changing the camera.

It must NOT:

- resize the document
- resize layers
- resize strokes
- change object coordinates
- rasterize artwork
- modify image resolution

For example:

```text
Document = 2000 × 2000
```

must remain:

```text
Document = 2000 × 2000
```

even if the user zooms to:

```text
50%
100%
200%
400%
```

Only the camera zoom changes.

---

# 11. INITIAL VIEW SHOULD LOOK LIKE A PROFESSIONAL MOBILE DRAWING APP

When opening a normal project, the user should immediately see something similar to:

```text
┌─────────────────────────────┐
│         TOP TOOLBAR         │
├─────────────────────────────┤
│                             │
│     ┌─────────────────┐     │
│     │                 │     │
│     │     ARTWORK     │     │
│     │                 │     │
│     │                 │     │
│     └─────────────────┘     │
│                             │
├─────────────────────────────┤
│       BOTTOM TOOLS          │
└─────────────────────────────┘
```

The artwork should be LARGE.

Do not produce:

```text
┌─────────────────────────────┐
│                             │
│          ┌────┐             │
│          │    │             │
│          │art │             │
│          │    │             │
│          └────┘             │
│                             │
│                             │
└─────────────────────────────┘
```

The second behavior is the current problem and must be fixed.

---

# 12. DO NOT FORCE A PORTRAIT CANVAS

This is extremely important.

If the document is landscape, show it landscape.

If the document is square, show it square.

If the document is portrait, show it portrait.

The viewport must adapt to the document.

Example:

### 16:9 document

Use the available width efficiently.

### 1:1 document

Make the square as large as possible while keeping it fully visible.

### 9:16 document

Make the portrait document as large as possible while keeping it fully visible.

Do NOT force every document into a small portrait rectangle.

---

# 13. SEPARATE DOCUMENT SPACE FROM SCREEN SPACE

Pointer/touch coordinates must be converted correctly.

Use a proper transformation:

```text
Screen Coordinates
        ↓
Viewport Coordinates
        ↓
Camera Transform
        ↓
Document Coordinates
```

Drawing should happen in DOCUMENT coordinates.

The camera only controls how the document is displayed.

This is essential for correct:

- drawing
- erasing
- lasso
- transform
- selection
- stroke editing
- reference images
- layers

Do not break any of these existing systems.

---

# 14. EXISTING FEATURES MUST REMAIN UNCHANGED

After fixing the viewport, verify that all current features still work exactly as before:

- Brush
- Pencil
- Eraser
- Fill
- Curve
- Lasso
- Transform
- Shape
- Layers
- Alpha Lock
- Reference Image
- Editable Strokes
- Existing gestures
- Existing colors
- Existing project save/load

If any existing feature already works, DO NOT rewrite it unnecessarily.

---

# 15. NO HARD-CODED CANVAS SIZE

Remove/fix any code responsible for creating a permanently small visual canvas such as:

```css
width: 300px;
height: 500px;
```

or similar fixed display dimensions.

However:

DO NOT change the actual document resolution.

For example, the document can still be:

```text
1920 × 1080
```

while the viewport displays it at:

```text
1200 × 675
```

because of camera zoom.

That is correct.

---

# 16. CANVAS CONTAINER

The editor should have a dedicated viewport container:

```text
Editor
 └── CanvasViewport
      └── CanvasRenderer
```

The viewport determines the available screen area.

The camera determines how the document appears inside that viewport.

Do not use CSS scaling as a replacement for the camera.

---

# 17. FIT FUNCTION

Create or fix a function similar to:

```ts
fitCanvasToViewport()
```

It should:

1. Read actual viewport width/height.
2. Read document width/height.
3. Calculate the maximum fitting zoom.
4. Preserve aspect ratio.
5. Apply a small margin.
6. Calculate centered offsets.
7. Update camera only.
8. Request a render.

Conceptually:

```ts
function fitCanvasToViewport() {
  const viewportWidth = getViewportWidth();
  const viewportHeight = getViewportHeight();

  const documentWidth = document.width;
  const documentHeight = document.height;

  const scaleX = viewportWidth / documentWidth;
  const scaleY = viewportHeight / documentHeight;

  const zoom = Math.min(scaleX, scaleY) * 0.95;

  const scaledWidth = documentWidth * zoom;
  const scaledHeight = documentHeight * zoom;

  const offsetX =
    (viewportWidth - scaledWidth) / 2;

  const offsetY =
    (viewportHeight - scaledHeight) / 2;

  updateCamera({
    zoom,
    offsetX,
    offsetY
  });

  requestRender();
}
```

Adapt this to the existing architecture instead of blindly copying it.

---

# 18. IMPORTANT: DO NOT RESET CAMERA DURING NORMAL DRAWING

Once the user manually zooms or pans:

DO NOT continuously call:

```ts
fitCanvasToViewport()
```

during drawing.

Automatic fit should happen when appropriate, such as:

- opening a project
- creating a new project
- changing orientation
- viewport size changing
- explicitly resetting the view

After the user manually zooms/pans, preserve their camera position.

---

# 19. RESET VIEW

If the application already has a reset/fit view action, make it call:

```ts
fitCanvasToViewport()
```

Do not create a completely new UI button unless one already exists.

---

# 20. PERFORMANCE

The canvas may be:

- 1K
- 2K
- 4K
- large custom documents

Do not continuously recreate the canvas bitmap.

Do not continuously recreate all layers.

Do not put pointer movement into heavy React state updates.

Use the existing renderer architecture.

Use:

```text
requestAnimationFrame
```

where appropriate.

The camera should update efficiently.

---

# 21. FINAL TEST REQUIREMENTS

After implementing ONLY this fix, test these cases:

### Test 1
Open a 16:9 document.

Expected:
The document appears large and centered.

### Test 2
Open a 1:1 document.

Expected:
The square canvas appears as large as possible and centered.

### Test 3
Open a 9:16 document.

Expected:
The portrait canvas appears large and centered.

### Test 4
Rotate Android device.

Expected:
Canvas automatically recalculates to the new viewport.

### Test 5
Pinch zoom.

Expected:
Canvas zooms smoothly around the finger midpoint.

### Test 6
Two-finger pan.

Expected:
Canvas moves smoothly.

### Test 7
Draw after zooming.

Expected:
The stroke appears exactly under the finger.

### Test 8
Use Eraser after zooming.

Expected:
Eraser coordinates remain correct.

### Test 9
Use Lasso after zooming.

Expected:
Selection coordinates remain correct.

### Test 10
Use Transform after zooming.

Expected:
Object transformation remains correct.

### Test 11
Close and reopen the project.

Expected:
Document/layers/strokes remain unchanged.

---

# FINAL INSTRUCTION

This is a VERY LIMITED task.

I am NOT asking you to redesign my application.

I am NOT asking you to add features.

I am NOT asking you to change existing tools.

I am ONLY asking you to fix the CANVAS VIEWPORT / FIT / CAMERA behavior.

Make the canvas behave like a professional mobile drawing application such as ibisPaint X:

- large
- centered
- automatically fitted
- aspect-ratio preserved
- responsive to the available editor viewport
- pinch zoom
- two-finger pan
- correct screen-to-document coordinate conversion
- no tiny fixed canvas
- no unwanted empty space

Most importantly:

**DO NOT MODIFY ANYTHING OUTSIDE THE CANVAS VIEWPORT / CAMERA / FIT SYSTEM.**

Before finishing, verify that all existing tools and features still behave exactly as they did before this change.