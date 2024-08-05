# PolygonDrawer

PolygonDrawer is a TypeScript library for drawing and manipulating polygons on a Fabric.js canvas. It supports drawing, editing, deleting polygons, and exporting the canvas as an image. It also allows setting a background image and handling coordinate systems (absolute values or 0-1 normalized values).

## Installation

Install via npm:

```bash
npm install @annotate-image/fabric
```

## Usage

### Import and Initialize

```typescript
import { PolygonDrawer } from '@annotate-image/fabric'

const polygonDrawer = new PolygonDrawer(
  'canvas-container',
  {
    canvasId: 'my-canvas',
    readOnly: false,
    originalWidth: 1920,
    originalHeight: 1080,
    snapTolerance: 10,
    useNormalizedCoordinates: true,
    polygonFill: 'rgba(0, 0, 255, 0.3)',
    polygonStroke: 'blue',
    polygonStrokeWidth: 2,
    cornerColor: 'red'
  },
  {
    onReady: instance => console.log('Canvas ready:', instance),
    onChange: data => console.log('Polygons changed:', data),
    onDelete: data => console.log('Polygon deleted:', data),
    onToggleCoordinate: data =>
      console.log('Coordinate system toggled:', data),
    onResize: data => console.log('Canvas resized:', data),
    onScaling: object => console.log('Scaling:', object),
    onLoad: () => console.log('Polygons loaded'),
    onExport: imageData => console.log('Canvas exported:', imageData),
    onDrawBackground: () => console.log('Background image drawn')
  }
)
```

### Drawing Polygons

To start drawing polygons:

```typescript
polygonDrawer.startDrawing()
```

### Loading Polygons

To load polygons from data:

```typescript
const sampleData = {
  polygons: [
    {
      id: 'polygon_1',
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.1 },
        { x: 0.2, y: 0.2 },
        { x: 0.1, y: 0.2 }
      ],
      useNormalizedCoordinates: true,
      fill: 'rgba(0, 0, 255, 0.3)',
      stroke: 'blue',
      strokeWidth: 2
    },
    {
      id: 'polygon_2',
      points: [
        { x: 0.3, y: 0.3 },
        { x: 0.4, y: 0.3 },
        { x: 0.4, y: 0.4 },
        { x: 0.3, y: 0.4 }
      ],
      useNormalizedCoordinates: true,
      fill: 'rgba(255, 0, 0, 0.3)',
      stroke: 'red',
      strokeWidth: 2
    }
  ],
  backgroundImage: {
    url: 'https://www.example.com/path/to/image.jpg',
    width: 1920,
    height: 1080
  }
}
polygonDrawer.loadPolygons(sampleData, () => {
  console.log('Polygons loaded successfully')
})
```

### Drawing a Background Image

To draw a background image:

```typescript
polygonDrawer.drawBackgroundImage(
  'https://www.example.com/path/to/image.jpg',
  1920,
  1080,
  () => {
    console.log('Background image drawn successfully')
  }
)
```

### Exporting the Canvas as an Image

To export the canvas as an image:

```typescript
polygonDrawer.exportCanvasAsImage((imageData) => {
  console.log('Canvas exported as image:', imageData)
  // You can open the image in a new tab
  window.open(imageData)
})
```

### Deleting Selected Polygons

To delete selected polygons:

```typescript
polygonDrawer.deleteSelectedPolygon()
```

### Toggling the Coordinate System

To toggle the coordinate system between absolute values and 0-1 normalized values:

```typescript
polygonDrawer.toggleCoordinateSystem()
```

### Getting Canvas Data

To get the current canvas data:

```typescript
const canvasData = polygonDrawer.getCanvasData()
console.log(canvasData)
```

## Options

### Configuration Options

- `canvasId`: The ID of the canvas element.
- `readOnly`: Whether the canvas is in read-only mode.
- `originalWidth`: The original width of the canvas.
- `originalHeight`: The original height of the canvas.
- `snapTolerance`: The tolerance for snapping points.
- `useNormalizedCoordinates`: Whether to use normalized coordinates (0-1).
- `polygonFill`: The fill color for polygons.
- `polygonStroke`: The stroke color for polygons.
- `polygonStrokeWidth`: The stroke width for polygons.
- `cornerColor`: The color of the corner controls.

### Callback Options

- `onReady`: Called when the canvas is ready.
- `onChange`: Called when the polygons change.
- `onDelete`: Called when a polygon is deleted.
- `onToggleCoordinate`: Called when the coordinate system is toggled.
- `onResize`: Called when the canvas is resized.
- `onScaling`: Called when a polygon is being scaled.
- `onLoad`: Called when polygons are loaded.
- `onExport`: Called when the canvas is exported as an image.
- `onDrawBackground`: Called when the background image is drawn.

## License

This project is licensed under the MIT License.

```

```
