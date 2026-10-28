Build a simple but powerful digital drawing and painting application inspired by the workflow and functionality of apps like Ibis Paint X. The app should have a clean, modern, mobile-first interface and should be designed so that drawing remains smooth even on mid-range Android devices.

IMPORTANT:
- Do not simply create a static UI mockup.
- Build the actual functional drawing/editor experience.
- Keep the architecture modular so more drawing tools and features can be added later.
- The app should feel like a real mobile art application.
- Do not copy Ibis Paint X branding, logos, icons, or exact UI. Create an original design and interface inspired by common digital-art workflows.

# 1. PROJECT CREATION

When the user taps "New Project", show a project setup screen.

The user should be able to select:

## Canvas Aspect Ratio
Provide presets such as:

- 1:1
- 4:4
- 16:9
- 9:16
- 4:3
- 3:4
- 3:2
- 2:3

Also provide a "Custom Size" option where the user can manually enter:

- Width
- Height

## Canvas Quality / Resolution

Provide resolution presets such as:

- 720p
- 1080p / 1K
- 2K
- 4K

Also allow the user to enter a custom resolution.

Before creating the project, show an estimated canvas size and warn the user if a very large canvas may require more RAM.

After the user confirms, create the drawing project.

# 2. MAIN ART EDITOR

After entering a project, show a full-screen drawing canvas.

The editor should have a modern mobile-app layout.

Top toolbar should include:

- Undo
- Redo
- Gallery / Reference Image
- Save
- Project settings
- More options

Bottom or side toolbar should contain drawing tools.

The canvas should support:

- Pinch-to-zoom
- Zoom in/out
- Pan/move canvas
- Rotate canvas
- Fit canvas to screen
- Reset canvas rotation
- Full-screen drawing mode

# 3. REFERENCE IMAGE / GALLERY

Add a Gallery/Reference button.

When the user taps it, allow them to select an image from their device gallery.

The selected image should be added as a reference image or reference layer.

The reference image must support:

- Move
- Scale
- Rotate
- Crop
- Opacity adjustment
- Hide/show
- Delete

Opacity should be adjustable with a slider, for example:

0% → 100%

This allows the user to lower the opacity of a reference image and draw over it.

The reference image should not automatically become part of the final artwork unless the user chooses to merge or export it.

# 4. DRAWING TOOLS

Include the essential tools required for digital drawing.

At minimum provide:

- Pencil
- Brush
- Pen
- Marker
- Eraser
- Bucket / Fill
- Color Picker / Eyedropper
- Lasso Select
- Transform
- Move
- Shape tools
- Line tool
- Rectangle
- Circle / Ellipse
- Undo
- Redo

Add additional useful tools where appropriate.

Every drawing tool should have adjustable properties.

For example:

- Brush size
- Opacity
- Flow
- Hardness
- Smoothing
- Color
- Pressure sensitivity if supported by the device

# 5. BRUSH / STROKE SYSTEM

The drawing engine should treat each manually drawn stroke as an editable stroke/object rather than immediately destroying all editable information.

For example:

If the user draws a circle using a pencil or brush, that stroke should remain identifiable as a stroke.

Each stroke should remember properties such as:

- Stroke color
- Stroke size
- Opacity
- Brush type
- Brush settings
- Position
- Rotation
- Scale

The user should be able to modify these properties later whenever technically possible.

# 6. FILL SYSTEM

Bucket Fill should create a separate editable fill associated with the appropriate enclosed area.

Example:

The user draws three circles with a black outline.

Then they use Bucket Fill and fill the circles with red.

The application should conceptually preserve:

- Outline/stroke information
- Fill information

separately where possible.

Therefore the user should be able to change the outline color without destroying the fill color.

Similarly, the fill color should be changeable without redrawing the outline.

# 7. EDITABLE STROKE AND FILL PROPERTIES

The user should be able to select a stroke or fill and change:

- Color
- Opacity
- Size where applicable
- Brush type where applicable
- Other relevant properties

Changes should update the selected object without requiring the user to redraw it.

# 8. FIND & REPLACE COLOR

This is an important feature.

Every layer should have a layer options menu.

When the user selects a layer, show options such as:

- Show / Hide
- Rename
- Duplicate
- Delete
- Merge
- Lock / Unlock
- Flip Horizontal
- Flip Vertical
- Opacity
- Move
- Transform
- Find & Replace Color

Add a special feature called:

"Find & Replace Color"

When selected, open a color replacement panel.

The user should be able to choose:

1. Source Color
2. Replacement Color
3. Tolerance / Similarity

Example:

A layer contains three circles.

All three circles have:

Stroke color = Black
Fill color = Red

The user selects the layer and opens:

Find & Replace Color

They can choose:

Find: Black
Replace with: White
Apply to: Stroke

After pressing "Replace All", all black strokes on that layer should become white.

The three circles should still have red fills.

Similarly:

Find: Red
Replace with: Blue
Apply to: Fill

should change all red fills to blue while keeping the strokes unchanged.

Provide options such as:

- Replace Stroke Color
- Replace Fill Color
- Replace Both
- Replace Selected Object Only
- Replace All on Current Layer

Include a tolerance slider so slightly different shades can optionally be included.

# 9. LASSO SELECT

Create a proper Lasso Selection tool.

The user should be able to draw a freeform selection around artwork.

After selection, provide actions such as:

- Move
- Scale
- Rotate
- Delete
- Copy
- Cut
- Duplicate
- Change opacity
- Change color where supported
- Transform

The selection should be visually indicated.

# 10. TRANSFORM TOOL

Create a powerful Transform system.

The user should be able to:

- Move
- Scale
- Rotate
- Flip horizontally
- Flip vertically
- Distort/skew if supported

## Transform Point / Pivot Point

Implement a movable Transform Point / Pivot Point.

The pivot point determines the center around which an object rotates or scales.

By default:

Pivot Point = Center of selected object

But the user must be able to manually move the pivot point anywhere.

Example:

If the user moves the pivot point to the left side of an object and rotates the object, the object should rotate around that new pivot point.

The pivot point should remain visible during transformation.

Support:

- Move pivot
- Reset pivot to center
- Rotate around pivot
- Scale around pivot

# 11. LAYER SYSTEM

Implement a proper layer system similar to a professional digital art application.

Users should be able to:

- Create new layer
- Delete layer
- Rename layer
- Duplicate layer
- Hide/show layer
- Lock/unlock layer
- Change layer opacity
- Reorder layers
- Merge layers
- Move layer up/down
- Flip layer
- Transform layer
- Select layer

Each layer should maintain its own editable drawing content.

Layers should be displayed in a layer panel with thumbnails.

# 12. COLOR SYSTEM

Create a professional but simple color system.

Include:

- Color wheel
- Saturation/value area
- Hue slider
- RGB controls
- HEX input
- Recent colors
- Favorite colors
- Eyedropper

The user should be able to quickly switch between colors.

Support transparent/alpha color where appropriate.

# 13. BRUSH SIZE AND OPACITY

Provide easy controls for:

- Brush size
- Brush opacity

The user should be able to increase/decrease brush size quickly.

Show the current brush size visually.

Add a brush preview circle when changing brush size.

# 14. SHAPE TOOLS

Provide basic shape tools:

- Line
- Circle
- Rectangle
- Rounded rectangle
- Polygon
- Arrow

Shapes should be editable after creation where possible.

Allow adjustment of:

- Stroke color
- Fill color
- Stroke thickness
- Opacity

# 15. UNDO / REDO

Implement a reliable history system.

The user should be able to:

- Undo drawing
- Redo drawing
- Undo fills
- Undo transformations
- Undo color changes
- Undo layer operations

Do not make undo/redo slow or memory-heavy unnecessarily.

Use an efficient history/state-management system.

# 16. PROJECT SAVE SYSTEM

Projects should be saved in an editable project format.

The project should preserve:

- Canvas dimensions
- Resolution
- Layers
- Strokes
- Fills
- Colors
- Brush settings
- Reference images
- Transformations
- Pivot points
- Layer properties

The user should be able to reopen a project later and continue editing it.

Also provide image export.

Export formats may include:

- PNG
- JPG/JPEG
- WebP

If possible, support transparent PNG.

# 17. PERFORMANCE

Performance is extremely important.

The application should remain responsive while drawing.

Use an efficient rendering architecture.

Avoid redrawing the entire canvas unnecessarily.

Use caching, GPU acceleration, tiled rendering, or other appropriate optimization techniques where possible.

Large canvases such as 2K and 4K should be handled carefully.

If the device cannot safely handle a selected resolution, show a warning before creating the project.

# 18. MOBILE UX

The application is primarily designed for smartphones.

The UI should:

- Be touch-friendly
- Have large enough buttons
- Avoid accidental taps
- Support portrait and landscape orientation
- Support pinch-to-zoom
- Support touch gestures
- Keep the canvas as large as possible
- Avoid unnecessary UI elements while drawing

Use a clean modern design.

Do not make the interface look like a generic website.

It should feel like a real mobile drawing application.

# 19. GESTURES

Where possible support:

- One finger = drawing
- Two fingers = pan/zoom
- Two-finger rotation = canvas rotation
- Two-finger tap = undo
- Three-finger tap/gesture = optional redo

Gestures should not interfere with normal drawing.

# 20. TOOL SETTINGS PANEL

When a tool is selected, show its relevant settings.

For example:

Brush:
- Size
- Opacity
- Hardness
- Smoothing
- Pressure

Eraser:
- Size
- Opacity
- Hardness

Fill:
- Fill color
- Tolerance
- Contiguous/non-contiguous option if possible

Transform:
- Position
- Scale
- Rotation
- Pivot Point

# 21. PROJECT HOME / GALLERY

Create a simple project gallery where users can see their previous projects.

Each project card should show:

- Thumbnail
- Project name
- Canvas size
- Last modified date

Actions:

- Open
- Rename
- Duplicate
- Delete

Also provide:

"New Project"

button.

# 22. IMPORTANT EXAMPLE WORKFLOW

The application must support this workflow:

1. User creates a 1080p 1:1 project.
2. User opens the drawing editor.
3. User adds a reference image from Gallery.
4. User lowers reference opacity to around 30%.
5. User creates a new drawing layer.
6. User uses Pencil/Brush to draw three circles.
7. The circles have black strokes.
8. User uses Bucket Fill and fills them red.
9. The application keeps stroke and fill information logically editable.
10. User selects the layer.
11. User opens Layer Options.
12. User selects "Find & Replace Color".
13. User chooses:
    Find = Black
    Replace = White
    Target = Stroke
14. User presses "Replace All".
15. All three circle outlines become white.
16. The red fills remain red.
17. User can later replace red fill with another color without changing the white strokes.
18. User can select the artwork using Lasso.
19. User can transform it.
20. User can move the Transform/Pivot Point.
21. User rotates the artwork around the new pivot point.
22. User saves the project.
23. Later, the user reopens the project and all editable information remains available.

# 23. UI DESIGN

Create an original modern UI inspired by professional mobile drawing applications.

Suggested layout:

TOP:
- Back
- Project name
- Undo
- Redo
- Reference/Gallery
- Save
- More

CENTER:
- Large drawing canvas

BOTTOM:
- Brush
- Eraser
- Fill
- Lasso
- Transform
- Shape
- Color
- Layers

The toolbar should be customizable or expandable so that additional tools can be added later.

# 24. ARCHITECTURE

Keep the application modular.

Separate major systems into modules such as:

- Canvas Renderer
- Drawing Engine
- Brush Engine
- Stroke Manager
- Fill Manager
- Layer Manager
- Selection Manager
- Transform Manager
- Pivot Point Manager
- Color Manager
- History Manager
- Project Manager
- Export Manager
- Reference Image Manager

The architecture should make it easy to add future features.

# 25. FUTURE-READY DESIGN

Design the code so future features can be added, such as:

- More brushes
- Brush presets
- Text tool
- Gradient tool
- Blur
- Smudge
- Clone tool
- Stabilizer
- Ruler
- Perspective guides
- Symmetry drawing
- Animation timeline
- Frame-by-frame animation
- Cloud project backup
- PSD or other advanced format support

Do not implement every future feature now unless necessary. Focus first on building a stable core drawing application.

# 26. IMPORTANT DEVELOPMENT RULE

Build the application incrementally.

First make sure these core features work correctly:

1. New Project
2. Canvas creation
3. Drawing with Pencil/Brush
4. Eraser
5. Color selection
6. Layers
7. Bucket Fill
8. Undo/Redo
9. Lasso
10. Transform
11. Movable Pivot Point
12. Reference Image
13. Editable Stroke/Fill properties
14. Find & Replace Color
15. Save/Load Project
16. Export Image

After these core features work, improve the UI and add advanced tools.

Do not create fake buttons that do nothing. Every visible core feature should have a functional implementation.

If a requested feature cannot be implemented exactly because of a technical limitation, explain the limitation and implement the closest reliable alternative instead of pretending that the feature works.