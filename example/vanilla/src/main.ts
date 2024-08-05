import './style.css'

import { PolygonDrawer } from '@annotate-image/fabric'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <button id="button1">toggleSelectionMode</button>
    <button id="button2">startDrawing</button>
    <button id="button3">clearObjects</button>
    <button id="button4">clearCanvas</button>
    <button id="button5">renderPolygonsToImage</button>
    <div class="annotate-container">
      <img src="https://images.pexels.com/photos/15763644/pexels-photo-15763644.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" />
    </div>

    <div id="img-box">
    </div>
  </div>
`

const instance = new PolygonDrawer(
  'annotate-container',
  {
    canvasId: 'my-canvas',
    readOnly: false,
    originalWidth: 1920,
    originalHeight: 1080,
    snapTolerance: 10,
    useNormalizedCoordinates: true,
    polygonFill: 'rgb(255, 0, 0, 0.3)',
    polygonStroke: 'red',
    polygonStrokeWidth: 2,
    cornerColor: 'blue',
    closeOnDoubleClick: true,
    addPointOnDoubleClickClose: false
  },
  {
    onReady: (instance) => {
      console.log('Canvas ready:', instance)

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
          url: 'https://images.pexels.com/photos/26832682/pexels-photo-26832682.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
          // width: 1920,
          // height: 1080,
        }
      }

      instance.loadPolygons(sampleData)

      // instance.startDrawing();
    },
    onChange: (data: any) => console.log('Polygons changed:', data),
    onDelete: (data: any) => console.log('Polygon deleted:', data),
    onToggleCoordinate: (data: any) =>
      console.log('Coordinate system toggled:', data),
    onResize: (data: any) => console.log('Canvas resized:', data),
    onScaling: (object: any) => console.log('Scaling:', object),
    onLoad: () => console.log('Polygons loaded'),
    onExport: (imageData: any) => console.log('Canvas exported:', imageData),
    onDrawBackground: () => console.log('Background image drawn')
  }
)

document.getElementById('button1')!.onclick = () => {
  instance.toggleSelectionMode()
}
document.getElementById('button2')!.onclick = () => {
  instance.startDrawing()
}
document.getElementById('button3')!.onclick = () => {
  instance.clearObjects()
}
document.getElementById('button4')!.onclick = () => {
  instance.clearCanvas()
}

const drawer = new PolygonDrawer(undefined, {
  originalWidth: 800,
  originalHeight: 600,
  polygonFill: 'rgba(255, 0, 0, 0.6)',
  polygonStroke: 'red',
  polygonStrokeWidth: 2,
  cornerColor: 'green'
})

document.getElementById('button5')!.onclick = () => {
  const loadData = {
    polygons: [
      {
        id: 'polygon1',
        points: [
          { x: 50, y: 50 },
          { x: 150, y: 50 },
          { x: 100, y: 150 }
        ],
        fill: 'rgba(0, 255, 0, 0.5)',
        stroke: 'green',
        strokeWidth: 2
      }
    ],
    backgroundImage: {
      url: 'https://images.pexels.com/photos/26832682/pexels-photo-26832682.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
      // width: 1920,
      // height: 1080,
    }
  }

  drawer.setOriginalSize({
    width: 1920,
    height: 1080
  })

  drawer.renderPolygonsToImage(loadData, true).then((imageData) => {
    console.log('imageData :>> ', imageData)

    const img = document.createElement('img')
    img.src = imageData
    document.getElementById('img-box')!.appendChild(img)
  })
}
