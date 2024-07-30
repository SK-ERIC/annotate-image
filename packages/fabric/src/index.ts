import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Line,
  Point,
  Polygon,
  TDataUrlOptions,
  TPointerEvent,
  TPointerEventInfo,
} from "fabric";

interface IPoint {
  x: number;
  y: number;
}

interface PolygonData {
  id: string;
  points: IPoint[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  useNormalizedCoordinates?: boolean;
}

interface LoadData {
  polygons: PolygonData[];
  backgroundImage?: {
    url: string;
    width?: number;
    height?: number;
  };
}

interface Callbacks {
  onReady?: (instance: PolygonDrawer) => void;
  onChange?: (data: any) => void;
  onDelete?: (data: any) => void;
  onToggleCoordinate?: (data: any) => void;
  onResize?: (data: any) => void;
  onScaling?: (object: FabricObject) => void;
  onLoad?: () => void;
  onExport?: (imageData: string) => void;
  onDrawBackground?: () => void;
}

interface Options {
  canvasId?: string;
  readOnly?: boolean;
  originalWidth?: number;
  originalHeight?: number;
  snapTolerance?: number;
  useNormalizedCoordinates?: boolean;
  polygonFill?: string;
  polygonStroke?: string;
  polygonStrokeWidth?: number;
  cornerColor?: string;
}

export class PolygonDrawer {
  private canvas: Canvas;
  private canvasId: string;
  private readOnly: boolean;
  private originalWidth: number;
  private originalHeight: number;
  private snapTolerance: number;
  private useNormalizedCoordinates: boolean;
  private polygonFill: string;
  private polygonStroke: string;
  private polygonStrokeWidth: number;
  private cornerColor: string;
  private evented: boolean;
  private selectable: boolean;
  private callbacks: Callbacks;
  private isDrawing: boolean;
  private isContinuousDrawing: boolean;
  private points: IPoint[];
  private polygons: Polygon[];
  private tempLines: Line[];
  private tempPoints: Circle[];
  private tempPolygon: Polygon | null;
  private mousePoint: Circle | null;
  private currentPolygon: Polygon | null;

  constructor(
    parentClass: string,
    options: Options = {},
    callbacks: Callbacks = {}
  ) {
    const parentElement = document.querySelector(`.${parentClass}`);
    if (!parentElement) {
      throw new Error(`Parent element with class ${parentClass} not found.`);
    }

    this.canvasId = options.canvasId || "drawing-canvas";
    this.readOnly = options.readOnly || false;
    this.originalWidth = options.originalWidth || 1920;
    this.originalHeight = options.originalHeight || 1080;
    this.snapTolerance = options.snapTolerance || 10;
    this.useNormalizedCoordinates = options.useNormalizedCoordinates || false;
    this.polygonFill = options.polygonFill || "rgba(0, 0, 255, 0.3)";
    this.polygonStroke = options.polygonStroke || "blue";
    this.polygonStrokeWidth = options.polygonStrokeWidth || 2;
    this.cornerColor = options.cornerColor || "red";
    this.evented = !this.readOnly;
    this.selectable = !this.readOnly;

    this.callbacks = {
      onReady: callbacks.onReady || (() => {}),
      onChange: callbacks.onChange || (() => {}),
      onDelete: callbacks.onDelete || (() => {}),
      onToggleCoordinate: callbacks.onToggleCoordinate || (() => {}),
      onResize: callbacks.onResize || (() => {}),
      onScaling: callbacks.onScaling || (() => {}),
      onLoad: callbacks.onLoad || (() => {}),
      onExport: callbacks.onExport || (() => {}),
      onDrawBackground: callbacks.onDrawBackground || (() => {}),
    };

    this.isDrawing = false;
    this.isContinuousDrawing = false;
    this.points = [];
    this.polygons = [];
    this.tempLines = [];
    this.tempPoints = [];
    this.tempPolygon = null;
    this.mousePoint = null;
    this.currentPolygon = null;

    this.canvas = this.createCanvas(parentElement);
    this.initEventListeners();
    this.callbacks.onReady?.(this);
  }

  private createCanvas(parentElement: Element): Canvas {
    const canvasElement = document.createElement("canvas");
    canvasElement.id = this.canvasId;
    canvasElement.width = parentElement.clientWidth;
    canvasElement.height = parentElement.clientHeight;
    parentElement.appendChild(canvasElement);
    return new Canvas(this.canvasId);
  }

  private initEventListeners() {
    if (this.readOnly) {
      return;
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        this.deleteSelectedPolygon();
      }
    });

    window.addEventListener("resize", () => {
      const parentElement = this.canvas.getElement().parentElement;
      if (parentElement) {
        this.canvas.setDimensions({
          width: parentElement.clientWidth,
          height: parentElement.clientHeight,
        });
        this.callbacks.onResize?.(this.getCanvasData());
      }
    });

    this.canvas.on("mouse:down", (e: TPointerEventInfo<TPointerEvent>) => {
      if (this.isDrawing) {
        this.addPoint(e);
      }
    });

    this.canvas.on("mouse:move", (e: TPointerEventInfo<TPointerEvent>) => {
      if (this.isDrawing) {
        this.drawTemporaryLines(e);
      }
    });

    this.canvas.on("mouse:dblclick", () => {
      if (this.isDrawing) {
        this.finishPolygon();
      }
    });

    this.canvas.on("selection:created", (e) => {
      this.isDrawing = false;
      this.isContinuousDrawing = false;
      this.clearTemporaryElements();
    });

    this.canvas.on("object:moving", (e) => {
      const object = e.target;
      if (object && object.type === "circle" && (object as any).polygon) {
        this.updatePointPosition(object as Circle);
      }
    });

    this.canvas.on("object:scaling", (e) => {
      const object = e.target;
      if (object && object.type === "polygon") {
        this.callbacks.onScaling?.(object);
      }
    });

    this.canvas.on("object:modified", (e) => {
      const object = e.target;
      if (object && object.type === "polygon") {
        this.callbacks.onChange?.(this.getPolygonsData());
      }
    });
  }

  private isPointClose(
    point1: IPoint,
    point2: IPoint,
    tolerance: number = this.snapTolerance
  ): boolean {
    return (
      Math.abs(point1.x - point2.x) < tolerance &&
      Math.abs(point1.y - point2.y) < tolerance
    );
  }

  private clearTemporaryElements() {
    this.tempLines.forEach((line) => this.canvas.remove(line));
    this.tempLines = [];
    this.tempPoints.forEach((point) => this.canvas.remove(point));
    this.tempPoints = [];
    if (this.tempPolygon) {
      this.canvas.remove(this.tempPolygon);
      this.tempPolygon = null;
    }
    if (this.mousePoint) {
      this.canvas.remove(this.mousePoint);
      this.mousePoint = null;
    }
  }

  public startDrawing() {
    if (this.readOnly) return;
    this.isDrawing = true;
    this.isContinuousDrawing = true;
    this.points = [];
    this.clearTemporaryElements();
  }

  private addPoint(options: TPointerEventInfo<TPointerEvent>) {
    if (this.readOnly) return;

    const pointer = this.canvas.getPointer(options.e);
    let pointToAdd: IPoint = { x: pointer.x, y: pointer.y };

    if (
      this.points.length >= 2 &&
      this.isPointClose(pointer, this.points[0], this.snapTolerance)
    ) {
      pointToAdd = this.points[0];
      this.finishPolygon();
      return;
    }

    const point = new Circle({
      left: pointToAdd.x,
      top: pointToAdd.y,
      radius: 3,
      fill: "red",
      selectable: false,
      hasControls: false,
      hasBorders: false,
      originX: "center",
      originY: "center",
    });
    this.canvas.add(point);
    this.points.push(pointToAdd);
    this.tempPoints.push(point);

    if (this.points.length >= 2) {
      this.drawTemporaryPolygon(pointer);
    }

    if (!this.mousePoint) {
      this.mousePoint = new Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 3,
        fill: "red",
        selectable: false,
        evented: false,
        originX: "center",
        originY: "center",
      });
      this.canvas.add(this.mousePoint);
    }
  }

  private drawTemporaryPolygon(pointer: Point) {
    if (this.readOnly) return;

    let tempPointsArr = [...this.points];
    if (
      this.points.length >= 2 &&
      this.isPointClose(pointer, this.points[0], this.snapTolerance)
    ) {
      tempPointsArr.push(this.points[0]);
    } else {
      tempPointsArr.push({ x: pointer.x, y: pointer.y });
    }

    if (this.tempPolygon) {
      this.canvas.remove(this.tempPolygon);
    }
    this.tempPolygon = new Polygon(tempPointsArr, {
      fill: "rgba(0, 0, 255, 0.1)",
      selectable: false,
      evented: false,
    });
    this.canvas.add(this.tempPolygon);
    this.canvas.renderAll();
  }

  private drawTemporaryLines(options: TPointerEventInfo<TPointerEvent>) {
    if (this.readOnly) return;

    const pointer = this.canvas.getPointer(options.e);
    let tempPointsArr = [...this.points];
    if (
      this.points.length >= 2 &&
      this.isPointClose(pointer, this.points[0], this.snapTolerance)
    ) {
      tempPointsArr.push(this.points[0]);
    } else {
      tempPointsArr.push({ x: pointer.x, y: pointer.y });
    }

    this.tempLines.forEach((line) => this.canvas.remove(line));
    this.tempLines = [];
    for (let i = 0; i < tempPointsArr.length - 1; i++) {
      const line = new Line(
        [
          tempPointsArr[i].x,
          tempPointsArr[i].y,
          tempPointsArr[i + 1].x,
          tempPointsArr[i + 1].y,
        ],
        {
          stroke: "blue",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        }
      );
      this.tempLines.push(line);
      this.canvas.add(line);
    }

    this.drawTemporaryPolygon(pointer);

    const lastPoint = tempPointsArr[tempPointsArr.length - 1];
    if (this.mousePoint) {
      this.mousePoint.set({ left: lastPoint.x, top: lastPoint.y });
    }
    this.canvas.renderAll();
  }

  private finishPolygon() {
    if (this.readOnly) return;

    if (this.points.length >= 3) {
      this.drawFinalPolygon();
    } else {
      alert("多边形需要至少三个点");
    }
    this.clearTemporaryElements();
    if (this.isContinuousDrawing) {
      this.startDrawing();
    }
  }

  private drawFinalPolygon() {
    if (this.readOnly) return;

    const minX = Math.min(...this.points.map((p) => p.x));
    const minY = Math.min(...this.points.map((p) => p.y));
    const normalizedPoints = this.points.map((p) => ({
      x: p.x - minX,
      y: p.y - minY,
    }));

    this.currentPolygon = new Polygon(normalizedPoints, {
      left: minX,
      top: minY,
      fill: this.polygonFill,
      stroke: this.polygonStroke,
      strokeWidth: this.polygonStrokeWidth,
      selectable: this.selectable,
      evented: this.evented,
      objectCaching: false,
      cornerColor: this.cornerColor,
      hasBorders: true,
      hasControls: true,
      perPixelTargetFind: true,
    });

    this.canvas.add(this.currentPolygon);
    this.polygons.push(this.currentPolygon);
    this.canvas.setActiveObject(this.currentPolygon);

    this.tempPoints.forEach((point, index) => {
      (point as any).polygon = this.currentPolygon;
      (point as any).polygonIndex = index;
    });

    this.tempPoints = [];
    this.isDrawing = false;
    this.callbacks.onChange?.(this.getPolygonsData());
  }

  private updatePointPosition(point: Circle) {
    const polygon = (point as any).polygon as Polygon;
    if (polygon) {
      polygon.points[(point as any).polygonIndex] = {
        x: point.left - polygon.left,
        y: point.top - polygon.top,
      };
      polygon.set({
        dirty: true,
        objectCaching: false,
      });
      polygon.setCoords();
      this.canvas.renderAll();
      this.callbacks.onChange?.(this.getPolygonsData());
    }
  }

  public deleteSelectedPolygon() {
    if (this.readOnly) return;

    const activeObjects = this.canvas.getActiveObjects();
    activeObjects.forEach((activeObject: FabricObject) => {
      if (activeObject && activeObject.type === "polygon") {
        this.canvas.remove(activeObject);
        this.polygons = this.polygons.filter((p) => p !== activeObject);
      }
    });
    this.canvas.discardActiveObject();
    this.canvas.renderAll();

    this.callbacks.onDelete?.(this.getPolygonsData());
  }

  public getPolygonsData() {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    return this.polygons.map((polygon) => {
      const matrix = polygon.calcTransformMatrix();
      const transformedPoints = (polygon.get("points") as Point[])
        .map((p: Point) => {
          return new Point(
            p.x - polygon.pathOffset.x,
            p.y - polygon.pathOffset.y
          );
        })
        .map((p) => p.transform(matrix));

      return {
        id: (polygon as any).id,
        points: transformedPoints.map((p: Point) => {
          if (this.useNormalizedCoordinates) {
            return {
              x: p.x / canvasWidth,
              y: p.y / canvasHeight,
            };
          } else {
            return {
              x: p.x,
              y: p.y,
            };
          }
        }),
        fill: polygon.fill,
        stroke: polygon.stroke,
        strokeWidth: polygon.strokeWidth,
      };
    });
  }

  public loadPolygons(data: LoadData, callback?: () => void) {
    this.clearCanvas();
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();

    data.polygons.forEach((polygonData) => {
      const points = polygonData.points.map((p) => ({
        x: polygonData.useNormalizedCoordinates ? p.x * canvasWidth : p.x,
        y: polygonData.useNormalizedCoordinates ? p.y * canvasHeight : p.y,
      }));

      const polygon = new Polygon(points, {
        left: Math.min(...points.map((p) => p.x)),
        top: Math.min(...points.map((p) => p.y)),
        fill: polygonData.fill || this.polygonFill,
        stroke: polygonData.stroke || this.polygonStroke,
        strokeWidth: polygonData.strokeWidth || this.polygonStrokeWidth,
        selectable: this.selectable,
        evented: this.evented,
        objectCaching: false,
        cornerColor: this.cornerColor,
        hasBorders: true,
        hasControls: true,
        perPixelTargetFind: true,
      });

      this.canvas.add(polygon);
      this.polygons.push(polygon);
    });

    if (data.backgroundImage) {
      this.drawBackgroundImage(
        data.backgroundImage.url,
        data.backgroundImage.width,
        data.backgroundImage.height,
        () => {
          this.canvas.renderAll();
          this.callbacks.onChange?.(this.getPolygonsData());
          if (callback) callback();
          this.callbacks.onLoad?.();
        }
      );
    } else {
      this.canvas.renderAll();
      this.callbacks.onChange?.(this.getPolygonsData());
      if (callback) callback();
      this.callbacks.onLoad?.();
    }
  }

  public async drawBackgroundImage(
    url: string,
    width?: number,
    height?: number,
    callback?: () => void
  ) {
    const img = await FabricImage.fromURL(url, {
      crossOrigin: "anonymous",
    });

    if (width && height) {
      img.set({ width, height });
    } else {
      img.scaleToWidth(this.canvas.getWidth());
      img.scaleToHeight(this.canvas.getHeight());
    }

    this.canvas.set("backgroundImage", img);
    this.canvas.renderAll();
    if (callback) callback();
  }

  public clearCanvas() {
    this.canvas.clear();
    this.polygons = [];
  }

  public async exportCanvasAsImage(callback?: (imageData: string) => void) {
    const originalWidth = this.originalWidth;
    const originalHeight = this.originalHeight;

    const tempCanvas = new Canvas(null as any, {
      width: originalWidth,
      height: originalHeight,
    });

    this.canvas.forEachObject(async (obj: FabricObject) => {
      const clone = await obj.clone();
      clone.scaleX! *= originalWidth / this.canvas.getWidth();
      clone.scaleY! *= originalHeight / this.canvas.getHeight();
      clone.left! *= originalWidth / this.canvas.getWidth();
      clone.top! *= originalHeight / this.canvas.getHeight();
      tempCanvas.add(clone);
    });

    if (this.canvas.backgroundImage) {
      const bgImg = this.canvas.backgroundImage;
      const clonedBgImg = await bgImg.clone();
      clonedBgImg.scaleX! *= originalWidth / this.canvas.getWidth();
      clonedBgImg.scaleY! *= originalHeight / this.canvas.getHeight();
      tempCanvas.set("backgroundImage", clonedBgImg);
      tempCanvas.renderAll();
    }

    const imageData = tempCanvas.toDataURL({
      format: "png",
      quality: 1,
    } as TDataUrlOptions);

    if (callback) callback(imageData);
    this.callbacks.onExport?.(imageData);
  }

  public toggleCoordinateSystem() {
    this.useNormalizedCoordinates = !this.useNormalizedCoordinates;
    console.debug(
      `坐标系已切换为 ${this.useNormalizedCoordinates ? "0-1度量值" : "绝对值"}`
    );

    this.callbacks.onToggleCoordinate?.({
      useNormalizedCoordinates: this.useNormalizedCoordinates,
      polygons: this.getPolygonsData(),
    });
  }

  public getCanvasData() {
    return {
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight(),
      polygons: this.getPolygonsData(),
    };
  }
}
