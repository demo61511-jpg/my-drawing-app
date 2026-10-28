# TRANSFORM TOOL ONLY — IBIS PAINT X STYLE TRANSFORM BOTTOM SHEET

I want to add/improve ONLY the Transform tool behavior in my existing digital drawing app.

I am providing two reference images.

The first reference shows the Transform tool with direct finger manipulation on the selected object and manual controls such as Translate/Scale.

The second reference shows the type of large, scrollable Transform control panel I want.

## VERY IMPORTANT

This is a LIMITED FEATURE CHANGE.

DO NOT modify or redesign anything unrelated to the Transform tool.

DO NOT change:

* Canvas Fit
* Canvas Viewport
* Canvas Zoom
* Canvas Pan
* Drawing
* Brush
* Pencil
* Eraser
* Fill
* Curve
* Lasso
* Shape
* Layers
* Alpha Lock
* Reference Image
* Stroke System
* Color System
* Existing toolbar
* Existing navigation
* Existing project/document structure

Do not change the current canvas behavior.

Only add/fix the Transform interaction and its floating Transform Bottom Sheet.

---

# 1. TRANSFORM ICON

When the user taps the existing Transform icon/tool:

* Keep the currently selected object.
* Show the Transform controls.
* The selected object must remain visible on the canvas.
* The user must be able to directly manipulate the selected object with their finger.

The Transform tool must work regardless of where the Transform icon currently exists in the UI.

If the Transform icon is moved somewhere else later, clicking that same Transform action must still open the Transform Bottom Sheet.

Do not hard-code the Bottom Sheet to one particular screen coordinate.

The Transform action should open the Transform Bottom Sheet as an overlay associated with the Transform tool.

---

# 2. DIRECT FINGER OBJECT TRANSFORM

When Transform mode is active, the selected object can be manipulated directly on the canvas.

The user must be able to:

* Drag the object with one finger.
* Move the object.
* Scale the object.
* Rotate the object around its pivot point.

The existing direct manipulation behavior should remain available.

Do NOT replace direct finger manipulation with sliders.

The manual controls and direct finger controls must work together.

---

# 3. TRANSFORM BOTTOM SHEET

When the Transform tool is activated, show a large Transform Bottom Sheet similar to the provided second reference image.

The Bottom Sheet should behave like a FLOATING OVERLAY.

It must NOT resize the canvas viewport.

It must NOT cause the canvas to become smaller.

It must NOT change canvas zoom.

It must NOT change canvas pan/position.

It must NOT automatically fit the canvas again.

It must NOT move the canvas when the sheet opens.

The canvas behind the Bottom Sheet must remain exactly where it was before opening Transform.

---

# 4. CRITICAL CANVAS PRESERVATION RULE

This is the MOST IMPORTANT requirement.

Suppose the user does this:

1. User zooms the canvas to 250%.
2. User pans the canvas to a specific position.
3. User draws something.
4. User selects an object.
5. User taps Transform.

At step 5:

THE CANVAS MUST STAY AT EXACTLY 250% ZOOM.

THE CANVAS MUST STAY AT EXACTLY THE SAME PAN POSITION.

THE CANVAS MUST NOT FIT AGAIN.

THE CANVAS MUST NOT SHRINK.

THE CANVAS MUST NOT ENLARGE.

THE CANVAS MUST NOT MOVE.

Only the Transform Bottom Sheet should appear as an overlay on top of the existing editor.

This must behave like a floating UI layer, not like a layout element that changes the canvas viewport.

---

# 5. FLOATING OVERLAY ARCHITECTURE

The Transform Bottom Sheet must be visually layered ABOVE the canvas.

Conceptually:

SCREEN
│
├── Existing App UI
│
├── Canvas Viewport
│
│   └── Canvas + Artwork
│
└── Transform Floating Bottom Sheet
└── Transform Controls

The Bottom Sheet must NOT participate in the canvas viewport size calculation.

In other words:

Opening the Transform Bottom Sheet must NOT trigger:

* canvas resize
* canvas refit
* camera reset
* camera zoom change
* camera offset change
* document resize

The canvas camera state must remain untouched when the sheet opens.

---

# 6. SCROLLABLE BOTTOM SHEET

The Transform Bottom Sheet must be vertically scrollable.

It should contain all Transform controls even when the controls are taller than the phone screen.

The user should be able to:

* Swipe upward to see more controls.
* Swipe downward to see previous controls.
* Scroll smoothly.
* Access all controls on small Android screens.

The Bottom Sheet itself should scroll.

The canvas behind it must remain unchanged.

Do not create a second page.

Do not navigate away from the editor.

Do not replace the editor.

---

# 7. TRANSFORM MODES

Keep the existing Transform mode structure where applicable.

The Transform panel should support the existing modes such as:

* Translate / Scale
* Perspective Form
* Mesh Form

Do not remove existing Transform modes.

If these modes already exist, connect the new Bottom Sheet controls to the existing Transform implementation instead of creating duplicate Transform systems.

---

# 8. TRANSLATE / SCALE CONTROLS

The Translate / Scale section should provide manual controls similar to the reference.

Include controls for:

### Translation X

* Minus button
* Slider
* Current numeric value
* Plus button

### Translation Y

* Minus button
* Slider
* Current numeric value
* Plus button

### Scale / Zoom of SELECTED OBJECT

* Minus button
* Slider
* Current percentage/value
* Plus button

IMPORTANT:

This "Zoom" control means zoom/scale of the SELECTED OBJECT.

It does NOT mean canvas zoom.

Do not connect this control to the canvas camera.

Changing object scale must never change canvas zoom.

---

# 9. ROTATION CONTROL

Add/keep a manual rotation control in the Transform Bottom Sheet.

Show:

* Minus button
* Slider
* Current rotation angle
* Plus button

Example:

```text
Rotation
      0°
− ─────●──────────── +
```

The rotation must happen around the selected object's pivot point.

Changing object rotation must NOT rotate the canvas.

It must only rotate the selected object.

---

# 10. PIVOT POINT

Add a Pivot Point control to the Transform system.

The pivot point is the center/reference point from which:

* Rotation
* Object scaling
* Object transformation

are calculated.

## DEFAULT PIVOT

When an object is first selected for Transform:

The pivot point must automatically be placed at the CENTER of the selected object's bounding box.

Do not place it at the canvas center.

Do not place it at screen center.

Do not place it at a random location.

It must be the selected object's center.

---

# 11. PIVOT VISUAL MARKER

The pivot point must be displayed as a SMALL BLACK DOT.

The black dot is only a visual marker showing the current pivot position.

It should look similar to the pivot-point indicator used in mobile animation/editing applications such as Alight Motion.

Example concept:

```text
        ┌───────────────┐
        │               │
        │       ●       │
        │               │
        └───────────────┘
                ↑
          Pivot Point
```

The black dot should remain visible while Transform mode is active.

Do not make it unnecessarily large.

It should be a small, clear black circular marker.

---

# 12. MOVE PIVOT POINT

The user must be able to manually move the pivot point.

When the user drags the pivot point:

* The black dot moves.
* The object's actual visual position does NOT automatically move just because the pivot was moved.
* Only the transformation reference point changes.

After moving the pivot:

Rotation must occur around the new pivot.

Scaling must occur around the new pivot when the transform operation is configured to scale around the pivot.

Example:

Initial:

```text
Object
┌───────────────┐
│               │
│       ●       │
│               │
└───────────────┘
```

After moving pivot:

```text
Object
┌───────────────┐
│               │
│  ●            │
│               │
└───────────────┘
```

Now rotation must use that new black-dot position as the rotation center.

---

# 13. PIVOT MUST BE OBJECT-SPECIFIC

The pivot belongs to the selected object.

It must NOT become the global canvas pivot.

Each transformable object should be able to maintain its own pivot information.

When selecting another object:

* That object's pivot should be used.
* If it has never been manually changed, default to its own center.
* Do not use the previous object's pivot.

Do not store one global pivot for all objects.

---

# 14. PIVOT + ROTATION

If the pivot is moved away from the object's center:

Rotation must happen around that exact pivot.

Example:

```text
        ● Pivot
        │
        │
    ┌─────────┐
    │ Object  │
    └─────────┘
```

When rotation changes:

The object should orbit/rotate around the black pivot point.

The pivot itself remains the transformation reference.

Do not rotate the canvas.

Do not rotate other objects.

---

# 15. PIVOT + SCALE

When manually scaling the selected object:

The transformation origin must respect the selected pivot point according to the existing Transform behavior.

If the pivot is moved away from the center, scaling should use that pivot as the reference.

Do not modify the canvas camera.

---

# 16. MANUAL CONTROLS AND FINGER CONTROLS MUST STAY SYNCHRONIZED

If the user moves the object with their finger:

The Bottom Sheet values must update.

For example:

```text
Translation X
+120 px
```

If the user changes Translation X using the slider:

The object must move immediately on the canvas.

If the user rotates the object with their finger:

The Rotation value must update.

If the user changes Rotation using the slider:

The object must rotate immediately.

If the user scales the object with their finger:

The Scale value must update.

If the user changes Scale using the slider:

The object must scale immediately.

The two control methods must represent the same Transform state.

Do NOT create two independent transform states.

---

# 17. BOTTOM SHEET MUST NOT RESET TRANSFORM STATE

Opening or scrolling the Bottom Sheet must NOT reset:

* object position
* object scale
* object rotation
* pivot point
* canvas zoom
* canvas pan

Scrolling the sheet should ONLY scroll the sheet.

---

# 18. CLOSE / CONFIRM

Keep the existing confirmation behavior.

The green checkmark should confirm/apply the Transform.

The red X should cancel the Transform if that behavior already exists.

Do not remove the existing confirmation/cancel functionality.

When confirming:

* Save the object's new transform.
* Save its pivot point.
* Keep the canvas camera exactly as it was.

When cancelling:

* Restore the object's previous transform state.
* Restore its previous pivot state if the current application treats pivot movement as part of the transform session.
* Do NOT reset the canvas camera.

---

# 19. CANVAS CAMERA MUST BE COMPLETELY SEPARATE

This requirement is critical.

There are two different concepts:

### CANVAS CAMERA

Controls:

* Canvas zoom
* Canvas pan
* Canvas rotation if supported

### OBJECT TRANSFORM

Controls:

* Object X
* Object Y
* Object scale
* Object rotation
* Object pivot

These must remain completely separate.

Changing object Transform must NEVER modify Canvas Camera.

Changing Canvas Camera must NEVER modify the object's Transform.

---

# 20. BOTTOM SHEET OPENING MUST NOT TRIGGER FIT-TO-CANVAS

If the existing application has a function such as:

```text
fitCanvasToViewport()
```

DO NOT call it when Transform is opened.

Do not reset camera state when the Transform Bottom Sheet appears.

Do not calculate a new canvas fit because the Bottom Sheet is visible.

The Bottom Sheet is an overlay and therefore must not be treated as part of the canvas viewport.

---

# 21. BOTTOM SHEET MUST NOT CHANGE CANVAS DIMENSIONS

Before opening Transform:

```text
Canvas Viewport = existing size
Canvas Zoom = existing value
Canvas Offset = existing value
```

After opening Transform:

```text
Canvas Viewport = SAME
Canvas Zoom = SAME
Canvas Offset = SAME
```

Only:

```text
Transform Bottom Sheet = VISIBLE
```

changes.

---

# 22. EXAMPLE USER FLOW

The final behavior must support this exact workflow:

1. User opens a project.
2. User zooms canvas to 300%.
3. User pans to a specific area.
4. User draws an object.
5. User selects the object.
6. User taps Transform.
7. Transform Bottom Sheet appears.
8. Canvas remains at 300%.
9. Canvas remains at exactly the same position.
10. User drags the object with their finger.
11. Object moves.
12. User scrolls the Bottom Sheet.
13. Canvas does not move.
14. User changes Translation X with +/− or slider.
15. Object moves.
16. User changes Scale.
17. Only object scale changes.
18. User changes Rotation.
19. Object rotates around the pivot.
20. User moves the black pivot dot.
21. Black dot moves.
22. User rotates again.
23. Object rotates around the new pivot.
24. User confirms.
25. Transform is applied.
26. Canvas is still at the same 300% zoom and same position.

This exact workflow must work.

---

# 23. MOBILE UI REQUIREMENTS

The Bottom Sheet must work properly on Android phones.

It must:

* fit the screen width
* have rounded top corners if consistent with the existing design
* be vertically scrollable
* keep controls large enough for finger interaction
* avoid controls being cut off
* respect Android safe areas
* keep the existing canvas visible behind it
* behave like a floating overlay

Do not force the entire editor layout to resize just because the Bottom Sheet is open.

---

# 24. PERFORMANCE

Do not rebuild the entire canvas/document every time a slider moves.

During slider interaction:

* update the selected object's transform efficiently
* render efficiently
* use requestAnimationFrame where appropriate
* do not recreate all layers unnecessarily

The existing drawing performance must remain unchanged.

---

# 25. DO NOT CREATE A SECOND TRANSFORM SYSTEM

If the existing application already has:

* Transform state
* Object transform
* Selection system
* Bounding box
* Rotation
* Scaling
* Translation

reuse and extend those systems.

Do not create duplicate transformation logic.

The new Bottom Sheet must control the existing Transform state.

---

# 26. DO NOT BREAK EXISTING FEATURES

After implementing this Transform feature, verify:

* Brush still works.
* Pencil still works.
* Eraser still works.
* Fill still works.
* Curve still works.
* Lasso still works.
* Shape still works.
* Layers still work.
* Alpha Lock still works.
* Reference images still work.
* Existing editable strokes still work.
* Canvas zoom still works.
* Canvas pan still works.
* Canvas fit behavior remains unchanged.
* Existing UI remains unchanged except for the Transform Bottom Sheet.

---

# 27. FINAL IMPLEMENTATION RULE

This is NOT a request to redesign the application.

This is NOT a request to change the canvas.

This is NOT a request to change the existing tools.

This is ONLY a request to improve the existing Transform tool with:

1. Direct finger object manipulation.
2. A large vertically scrollable Transform Bottom Sheet.
3. Translate X/Y controls.
4. Object Scale controls.
5. Rotation controls.
6. A default object-center pivot.
7. A small black pivot-point marker.
8. Manually movable pivot point.
9. Rotation around the manually selected pivot.
10. Scaling around the pivot.
11. Synchronization between sliders and direct finger manipulation.
12. Floating overlay behavior.
13. ZERO change to canvas zoom.
14. ZERO change to canvas pan.
15. ZERO change to canvas viewport size.
16. ZERO automatic canvas refit when Bottom Sheet opens.

## MOST IMPORTANT RULE

**THE TRANSFORM BOTTOM SHEET IS A FLOATING OVERLAY, NOT PART OF THE CANVAS LAYOUT.**

Opening it must NEVER make the canvas smaller, larger, repositioned, refitted, or re-zoomed.

The canvas must remain exactly where the user left it.

Only the selected object's Transform state changes.

Implement this carefully without changing any unrelated feature.
