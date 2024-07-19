import { CLICK_PATH_TYPES, DRAG_PATH_TYPES } from "./constant";
import { defaultOptions } from "./options";
import {
  AnnotateEvents,
  AnnotateOptions,
  AnnotatePath,
  CanvasMouseEvents,
  CustomHandler,
  DistanceCheck,
  ElementOrSelector,
  OperateCursor,
  PartialAnnotateOptions,
  PathChangeType,
  PathTypes,
  Point,
  Size,
} from "./types";
import {
  checkPointsEqual,
  countDistance,
  fixRectPoints,
  getMousePoint,
  getVirtualRectPoints,
} from "./utils";

class AnnotateImage {
  public isEventsListening: boolean;
  public drawing: boolean;
  public needDrag: boolean;
  public dragging: boolean;
  public modifying: boolean;
  public operateCursor: OperateCursor | null;
  public lastMoveEvent: MouseEvent | null;
  public newPath: AnnotatePath | null;
  public value: AnnotatePath[];
  public paths: AnnotatePath[];
  public curSingleType: PathTypes | "";
  public pathPointsCoincide: boolean;
  public hasInvertPath: boolean;
  public choseIndex: number;
  public resizeTicker: number;

  public $el?: HTMLElement;
  public $canvas?: HTMLCanvasElement;
  public $ctx?: CanvasRenderingContext2D;
  public $options: AnnotateOptions;
  public $size?: Size;
  public $canvasSize?: Size;

  private events?:
    | { [key in CanvasMouseEvents]: (...args: any[]) => unknown }
    | null;
  private elObserver?: ResizeObserver;
  private elScaleObserver?: MediaQueryList;

  constructor(
    elementOrSelector?: ElementOrSelector,
    options?: PartialAnnotateOptions
  ) {
    this.isEventsListening = false;
    this.drawing = false;
    this.needDrag = false;
    this.dragging = false;
    this.dragging = false;
    this.modifying = false;
    this.operateCursor = null;
    this.lastMoveEvent = null;
    this.newPath = null;
    this.value = [];
    this.paths = [];
    this.curSingleType = "";
    this.pathPointsCoincide = false;
    this.hasInvertPath = false;
    this.choseIndex = -1;
    this.resizeTicker = 0;

    this.$options = defaultOptions();
    this.applyOptions(options);

    elementOrSelector && this.attachToElement(elementOrSelector);
  }

  attachToElement(elementOrSelector: ElementOrSelector) {
    const element =
      typeof elementOrSelector === "string"
        ? document.querySelector(elementOrSelector)
        : elementOrSelector;

    if (!element) {
      return console.error(
        "Can not find element by selector or element itself."
      );
    }
    if (element instanceof HTMLElement) {
      this.$el = element;
      this.initializeCanvas();
    } else {
      console.error("The element is not HTMLElement.");
    }
  }

  private initializeCanvas() {
    const canvas = document.createElement("canvas");
    canvas.className = "annotate-canvas";
    canvas.tabIndex = 99999 * (1 + Math.random());
    canvas.style.cssText = `
    outline: none;
    transform-origin: 0 0;
    `;
    this.$canvas = canvas;
    this.$ctx = canvas.getContext("2d") || undefined;
    this.resetCanvas();
    this.$el?.appendChild(this.$canvas);
    this.registerEventHandlers(this.$options.readonly);
    this.$options.autoFit && this.setupObservers();
    this.triggerEvent("onReady");
  }

  private setupObservers() {
    if (!this.$el) return;
    this.elObserver = new ResizeObserver(this.onCanvasResize);
    this.elObserver.observe(this.$el);
    this.elScaleObserver = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );
    this.elScaleObserver.addEventListener("change", this.onScaleChange);
  }

  private applyOptions<K extends keyof AnnotateOptions>(
    options: PartialAnnotateOptions = {}
  ) {
    if (!options) return;
    const { hasOwnProperty, toString } = Object.prototype;
    (Object.keys(options) as K[]).forEach((key) => {
      const item = options[key];
      if (
        hasOwnProperty.call(this.$options, key) &&
        toString.call(item) === "[object Object]" &&
        this.$options[key]
      ) {
        Object.assign(this.$options[key], options[key]);
      } else if (typeof item !== "undefined") {
        this.$options[key] = item as AnnotateOptions[K];
      }
    });
    this.validateActivePathType();
  }

  private applyContextStyles() {
    const { globalStyles, canvasScale } = this.$options;
    if (this.$ctx)
      Object.assign(this.$ctx, globalStyles, {
        lineWidth: globalStyles.lineWidth * canvasScale,
      });
  }
  private drawPathOnCanvas(type: PathTypes, points: Point[], stroke?: boolean) {
    if (!this.$ctx) return;

    this.$ctx.beginPath();
    switch (type) {
      case "point":
        this.$ctx.arc(
          points[0].x,
          points[0].y,
          this.$ctx.lineWidth * 1.4,
          0,
          2 * Math.PI
        );
        break;
      case "line":
      case "rect":
      case "polygon": {
        const truePoints =
          type === "rect" ? getVirtualRectPoints(points) : points;
        truePoints.forEach((point, idx) => {
          const { x, y } = point;
          idx === 0 ? this.$ctx?.moveTo(x, y) : this.$ctx?.lineTo(x, y);
          stroke && type === "polygon" && this.$ctx?.stroke();
        });
        break;
      }
      case "circle": {
        const center = points[0];
        const radius = countDistance(center, points[1]);
        this.$ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        break;
      }
      default:
        break;
    }
    this.$ctx.closePath();
  }

  private clearExistingPaths() {
    if (!this.$ctx) return;
    this.$ctx.clip();
    this.clearCanvas();
  }

  private renderNewPath(path: AnnotatePath, movePoint?: Point) {
    if (!path || !this.$ctx) return;
    const { type } = path;
    const points = path.points.concat(movePoint ? [movePoint] : []);
    if (points.length < 2) return;
    this.$ctx.save();
    this.$ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    this.drawPathOnCanvas(type, points, type === "polygon");
    this.$ctx.fill();
    type !== "polygon" && this.$ctx.stroke();
    type === "polygon" && this.drawPointIndicators(points);
    this.$ctx.restore();
  }

  private drawPointIndicators(points: Point[]) {
    if (!this.$ctx) return;
    this.$ctx.save();
    const ctx = this.$ctx;
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, ctx.lineWidth * 1.4, 0, 2 * Math.PI);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    });
    this.$ctx.restore();
  }

  private renderDragPoint(point: Point) {
    if (!this.$ctx) return;
    this.$ctx.save();
    this.$ctx.beginPath();
    const {
      operateCircle: { radius, styles },
      canvasScale,
    } = this.$options;
    styles && Object.assign(this.$ctx, styles);
    this.$ctx.arc(point.x, point.y, radius * canvasScale!, 0, 2 * Math.PI);
    this.$ctx.stroke();
    this.$ctx.fill();
    this.$ctx.restore();
  }

  private renderExistingPath(
    path: AnnotatePath,
    index: number,
    stroke = true,
    fill = true
  ) {
    if (!this.$ctx) return;
    this.$ctx.save();
    const { type, points, styles, inner } = path;
    if (!points || points.length < 1) return undefined;
    const { blurStrokeOpacity, focusStyles } = this.$options;
    styles && Object.assign(this.$ctx, styles);
    this.drawPathOnCanvas(type, points);
    if (focusStyles) {
      index === this.choseIndex && Object.assign(this.$ctx, focusStyles);
    } else {
      this.$ctx.globalAlpha =
        index !== this.choseIndex ? blurStrokeOpacity! : 1;
    }
    if (type === "point") {
      this.$ctx.fillStyle = this.$ctx.strokeStyle;
      this.$ctx.fill();
    } else if (fill) {
      inner ? this.$ctx.fill() : this.clearExistingPaths();
    }
    type !== "point" && stroke && this.$ctx.stroke();
    !this.$options.readonly &&
      type === "polygon" &&
      this.drawPointIndicators(points);
    !focusStyles && (this.$ctx.globalAlpha = 1);
    this.$ctx.restore();
  }
  private renderPaths(movePoint?: Point, notClear?: boolean) {
    if (!this.$canvas || !this.$ctx) return;
    !notClear && this.clearCanvas();

    this.hasInvertPath = this.paths.some((path: AnnotatePath) => !path.inner);
    if (this.hasInvertPath) {
      /* 如果存在反选路径，则绘制反选遮层，然后镂空所有反选选区。最后对所有选区描边及非反选填充 */
      this.$ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
      this.paths.forEach(
        (path: AnnotatePath, idx: number) =>
          !path.inner && this.renderExistingPath(path, idx, false)
      );
      this.paths.forEach((path: AnnotatePath, idx: number) =>
        this.renderExistingPath(path, idx, true, path.inner)
      );
    } else {
      this.paths.forEach((path: AnnotatePath, idx: number) =>
        this.renderExistingPath(path, idx)
      );
    }

    this.drawing && this.renderNewPath(this.newPath!, movePoint);
  }
  private renderPathsWithDragPoint(circlePoint?: Point) {
    this.renderPaths();
    circlePoint && this.renderDragPoint(circlePoint);
  }

  private onCanvasResize() {
    if (!this.$canvas) {
      return;
    }
    clearTimeout(this.resizeTicker);
    this.resizeTicker = window.setTimeout(() => {
      this.triggerEvent("onResize");
      this.resetCanvas();
    }, 50);
  }

  private onScaleChange() {
    console.log(123123123131);
    if (!this.$canvas) {
      return;
    }
    this.resetCanvas();
  }

  private toggleAutoFit(newValue?: boolean) {
    if (newValue) {
      if (!this.elObserver) {
        return this.setupObservers();
      }
      return this.elObserver.observe(this.$el as Element);
    }
    return this.elObserver?.unobserve(this.$el as Element);
  }

  private validateActivePathType() {
    const { allowTypes, singleType, currentType } = this.$options;
    this.curSingleType =
      singleType &&
      allowTypes &&
      currentType &&
      allowTypes.includes(currentType)
        ? currentType
        : "";
    this.curSingleType && this.deselectPath();
  }

  private deselectPath() {
    this.choosePath(-1);
  }

  private triggerEvent(name: AnnotateEvents, ...args: unknown[]) {
    // TODO:
    const callback = this.$options[name] as any;
    typeof callback === "function" && callback.call(this, ...args);
  }

  private hasReachedMaxPaths() {
    const { maxPath } = this.$options;
    return maxPath && maxPath > 0 ? this.paths.length >= maxPath : false;
  }

  private isPathTypeAllowed(isDrag?: boolean) {
    const types: PathTypes[] = isDrag ? DRAG_PATH_TYPES : CLICK_PATH_TYPES;
    return Boolean(
      !this.$options.singleType ||
        (this.curSingleType && types.includes(this.curSingleType))
    );
  }

  private toFixedPrecision(value: number): number {
    const { digits = 0 } = this.$options;
    if (digits < 1) return value;
    const times = 10 ** digits;
    return Math.round(value * times) / times;
  }

  private updatePathData(changeType: PathChangeType = "add", index = 0) {
    const value = this.paths;

    this.finalizePathInfo(value);
    this.triggerEvent("onInput", this.convertCoordinates(value));
    this.triggerEvent("onChange", changeType, index, value);
  }

  private finalizePathInfo(values: AnnotatePath[]) {
    values.forEach((path) => {
      const { type, points } = path;
      let info = {};

      if (type === "rect") {
        const fixedPoints = fixRectPoints(points[0], points[1]);
        info = {
          points: fixedPoints,
          start: this.scale(fixedPoints[0]),
          width: this.scale({ x: fixedPoints[1].x - fixedPoints[0].x, y: 0 }).x,
          height: this.scale({ x: 0, y: fixedPoints[1].y - fixedPoints[0].y })
            .y,
        };
      } else if (type === "circle") {
        const radius = countDistance(points[0], points[1]);
        info = {
          center: this.scale(points[0]),
          radius,
          scaleRadius: this.scale({ x: radius, y: 0 }).x,
        };
      }
      Object.assign(path, info);
    });
  }

  private convertCoordinates(
    value: AnnotatePath[],
    toPx?: boolean
  ): AnnotatePath[] {
    const newValue = JSON.parse(JSON.stringify(value)) as AnnotatePath[];
    const { rectFullPoint } = this.$options;

    newValue.forEach((path) => {
      let { points } = path;
      if (Array.isArray(points)) {
        if (path.type === "rect") {
          if (toPx && points.length === 4) {
            points = [points[0], points[2]];
          } else if (rectFullPoint && !toPx && points.length === 2) {
            points = getVirtualRectPoints(points);
          }
        }
        path.points = points.map((point) =>
          toPx ? this.invert(point) : this.scale(point)
        );
      }
    });
    return newValue;
  }

  private handleKeyPress(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    switch (key) {
      case "backspace":
      case "delete":
        this.removePath();
        break;
      case "t":
        this.invertSelectedPath();
        break;
      default:
        break;
    }
  }
  private removePath() {
    if (this.choseIndex < 0) return;
    const index = this.choseIndex;
    this.paths.splice(index, 1);
    this.deselectPath();
    this.checkCursorOperation();
    this.updatePathData("delete", index);
  }
  private validateAnnotation(startPoint: Point, endPoint: Point) {
    const { tinyRectSize, tinyCircleRadius, canvasScale: cs } = this.$options;
    const { type } = this.newPath!;
    const tinyValue = type === "rect" ? tinyRectSize : tinyCircleRadius;
    return tinyValue > 0
      ? type === "rect"
        ? Math.abs(startPoint.x - endPoint.x) > tinyValue * cs &&
          Math.abs(startPoint.y - endPoint.y) > tinyValue * cs
        : countDistance(startPoint, endPoint) > tinyValue * cs
      : !checkPointsEqual(startPoint, endPoint);
  }
  private extendPathWithDrag(endPoint: Point) {
    const { type, points } = this.newPath!;
    const startPoint = points[0];
    if (type === "rect") {
      this.newPath!.points = fixRectPoints(startPoint, endPoint);
    } else if (type === "circle") {
      points.push(endPoint);
    }
    this.addPath();
  }
  private calculateRectangleEndpoint(truePoint: Point): Point {
    const [startPoint] = this.newPath!.points;
    const { rectAspectRatio: ratio } = this.$options;
    return ratio > 0
      ? {
          x: truePoint.x,
          y: startPoint.y + ratio * (truePoint.x - startPoint.x),
        }
      : truePoint;
  }
  private checkCircleBounds(startPoint: Point, point: Point) {
    const { bounded } = this.$options;
    if (!bounded) {
      return false;
    }
    const { width, height } = this.$canvasSize!;
    const radius = countDistance(startPoint, point);
    const { x, y } = startPoint || {};
    return (
      x + radius > width ||
      x - radius < 0 ||
      y - radius < 0 ||
      y + radius > height
    );
  }
  private calculateCircleEndpoint(truePoint: Point): Point {
    const { bounded } = this.$options;
    const [centerPoint] = this.newPath!.points;
    if (!bounded || !this.checkCircleBounds(centerPoint, truePoint)) {
      return truePoint;
    }
    const radius = countDistance(centerPoint, truePoint);
    const { x, y } = centerPoint;
    const { width, height } = this.$canvasSize!;
    const trueX = x - radius < 0 ? 0 : x + radius > width ? width : x;
    const trueY = y - radius < 0 ? 0 : y + radius > height ? height : y;
    return { x: trueX, y: trueY };
  }
  private checkMouseOverlappingPaths(pos: Point) {
    if (!this.$ctx) return -1;
    this.$ctx.save();
    const index = this.paths.findIndex((path: AnnotatePath) => {
      if (!this.$ctx) return;
      this.drawPathOnCanvas(path.type, path.points);
      const checkFn =
        path.type === "line" ? "isPointInStroke" : "isPointInPath";
      return this.$ctx[checkFn](pos.x, pos.y);
    });
    this.$ctx.restore();
    return index;
  }
  private focusOnPath(point: Point) {
    const choseIndex = this.checkMouseOverlappingPaths(point);
    !(this.$options.ignoreInvalidSelect && choseIndex === -1) &&
      this.choosePath(choseIndex);
  }
  private onCanvasMouseUp(e: MouseEvent) {
    const endPoint = getMousePoint(e);
    if (this.drawing && this.needDrag && this.dragging) {
      this.validateAnnotation(this.newPath!.points[0], endPoint)
        ? this.extendPathWithDrag(
            this.newPath!.type === "rect"
              ? this.calculateRectangleEndpoint(endPoint)
              : this.calculateCircleEndpoint(endPoint)
          )
        : this.clearCurrentPath();
      return;
    }
    if (this.modifying) {
      this.modifying = false;
      const { originStartPoint = {} as Point } = this
        .operateCursor as OperateCursor;
      !checkPointsEqual(originStartPoint, endPoint) &&
        this.updatePathData("modify", this.choseIndex);
    } else if (this.$options.readonly) {
      this.focusOnPath(endPoint);
      this.renderPaths();
    } else if (
      !e.shiftKey &&
      (!this.$options.singleType || !this.curSingleType)
    ) {
      this.clearCurrentPath();

      this.focusOnPath(endPoint);
      this.checkCursorOperation(e);
    }
  }
  private onCanvasMouseDown(e: MouseEvent) {
    e.preventDefault();

    if (e.buttons >= 2) return;

    if (
      this.operateCursor &&
      (!this.operateCursor.inPath ||
        this.operateCursor.pathIndex === this.choseIndex)
    ) {
      this.modifying = true;
      this.triggerEvent("onModifyStart", e);
      this.operateCursor.originStartPoint = getMousePoint(e);
      this.operateCursor.startPoint = getMousePoint(e);
      return;
    }

    if (
      this.hasReachedMaxPaths() ||
      !this.isPathTypeAllowed(true) ||
      (!this.$options.singleType && e.shiftKey)
    )
      return;
    const type = this.curSingleType || (e.ctrlKey ? "circle" : "rect");
    if (!this.$options.allowTypes.includes(type)) return;
    const startPoint = getMousePoint(e);
    this.createPath(startPoint, type);
    this.renderPaths();
  }
  private handleDragging(e: MouseEvent) {
    const { type, points } = this.newPath!;
    if (!this.dragging) {
      this.dragging = !checkPointsEqual(points[0], getMousePoint(e));
    }
    const point = getMousePoint(e);
    if (type === "circle" && this.checkCircleBounds(points[0], point)) {
      return;
    }
    this.renderPaths(
      type === "rect" ? this.calculateRectangleEndpoint(point) : point
    );
  }
  private handleClickDrawing(e: MouseEvent) {
    let endPoint = getMousePoint(e);
    const { points } = this.newPath!;
    this.pathPointsCoincide = false;

    if (points.length > 2) {
      const startPoint = points[0];
      if (this.arePointsClose(endPoint, startPoint)) {
        endPoint = startPoint;
        this.pathPointsCoincide = true;
      }
    }
    this.renderPaths(endPoint);
  }
  private addPointToPolygon(points: Point[], point: Point, lineIndex: number) {
    points.splice(lineIndex + 1, 0, point);
    Object.assign(this.operateCursor || {}, {
      pointIndex: lineIndex + 1,
      lineIndex: -1,
    });
  }
  private modifySelectedPath(e: MouseEvent) {
    const newPoint = getMousePoint(e);
    const {
      startPoint: { x, y } = { x: 0, y: 0 },
      pathIndex = -1,
      pointIndex = -1,
      lineIndex,
      inPath,
    } = this.operateCursor || {};
    if (!this.paths[pathIndex]) {
      return;
    }
    const { type, points } = this.paths[pathIndex];

    if (
      !inPath &&
      type === "circle" &&
      !this.checkCircleBounds(points[0], newPoint)
    ) {
      points[1] = newPoint;
      this.renderPathsWithDragPoint(newPoint);
      return;
    }
    const distance = [newPoint.x - x, newPoint.y - y];
    this.operateCursor && (this.operateCursor.startPoint = newPoint);
    const isRect = type === "rect";
    const { bounded } = this.$options;
    let xOut = false;
    let yOut = false;
    if (bounded) {
      const { width, height } = this.$canvasSize!;
      if (type !== "circle") {
        xOut = points.some((point: Point) => {
          const newX = point.x + distance[0];
          return newX < 0 || newX > width;
        });
        yOut = points.some((point: Point) => {
          const newY = point.y + distance[1];
          return newY < 0 || newY > height;
        });
      } else {
        const [center, endPoint] = points;
        const radius = countDistance(center, endPoint);
        const [newCX, newCY] = [center.x + distance[0], center.y + distance[1]];
        xOut = newCX - radius < 0 || newCX + radius > width;
        yOut = newCY - radius < 0 || newCY + radius > height;
      }
    }

    const pointMove = (point: Point, xStatic?: boolean, yStatic?: boolean) => {
      !xStatic && (point.x += distance[0]);
      !yStatic && (point.y += distance[1]);
    };
    // 如果鼠标指针在选区内，则平移选区
    if (inPath) {
      points.forEach((point: Point) => pointMove(point, xOut, yOut));
      this.renderPaths();
      return;
    }

    if (pointIndex >= 0) {
      const rectPointsMove = (idx: number) => {
        if (idx === 1) {
          points[0].y += distance[1];
          points[1].x += distance[0];
        } else if (idx === 3) {
          points[0].x += distance[0];
          points[1].y += distance[1];
        } else {
          pointMove(points[idx / 2]);
        }
      };
      isRect ? rectPointsMove(pointIndex) : pointMove(points[pointIndex]);
      this.renderPathsWithDragPoint(isRect ? undefined : newPoint);
      return;
    }
    if (lineIndex !== undefined && lineIndex >= 0) {
      isRect
        ? lineIndex % 3 === 0
          ? pointMove(points[0], lineIndex === 0, lineIndex === 3)
          : pointMove(points[1], lineIndex === 2, lineIndex === 1)
        : this.addPointToPolygon(points, newPoint, lineIndex);
      this.renderPathsWithDragPoint(isRect ? undefined : newPoint);
    }
  }
  private onCanvasMouseMove(e: MouseEvent) {
    const { drawing, needDrag, dragging, modifying, lastMoveEvent } = this;
    if (((drawing && needDrag && dragging) || modifying) && e.buttons !== 1) {
      this.onCanvasMouseUp(lastMoveEvent as MouseEvent);
      return;
    }
    drawing
      ? needDrag
        ? this.handleDragging(e)
        : this.handleClickDrawing(e)
      : modifying
      ? this.modifySelectedPath(e)
      : this.checkCursorOperation(e);
    this.lastMoveEvent = e;
  }
  private drawPolygon(e: MouseEvent) {
    if (!this.drawing) {
      const startPoint = getMousePoint(e);
      this.createPath(startPoint, "polygon", false);
    } else if (this.pathPointsCoincide) {
      this.addPath();
    } else {
      const newPoint = getMousePoint(e);
      this.newPath!.points.push(newPoint);
    }
  }
  private drawPoint(e: MouseEvent) {
    if (!this.drawing) {
      const point = getMousePoint(e);
      this.createPath(point, "point", false);
      this.addPath();
    }
  }
  private drawLine(e: MouseEvent) {
    if (!this.drawing) {
      const startPoint = getMousePoint(e);
      this.createPath(startPoint, "line", false);
    } else {
      const newPoint = getMousePoint(e);
      this.newPath!.points.push(newPoint);
      this.addPath();
    }
  }
  private onCanvasClick(e: MouseEvent) {
    e.preventDefault();
    if (!this.$canvas) return;
    this.$canvas.focus();
    const { drawing, needDrag, modifying } = this;
    if (
      this.hasReachedMaxPaths() ||
      !this.isPathTypeAllowed() ||
      (drawing && needDrag) ||
      modifying
    )
      return;
    const pos = getMousePoint(e);
    if (e.type === "contextmenu") {
      drawing &&
        (this.newPath!.type === "polygon"
          ? this.newPath!.points.pop()
          : this.clearCurrentPath());
    } else {
      const { singleType, allowTypes } = this.$options;
      if (
        singleType &&
        (CLICK_PATH_TYPES as string[]).includes(this.curSingleType) &&
        (allowTypes as string[]).includes(this.curSingleType)
      ) {
        switch (this.curSingleType) {
          case "polygon":
            this.drawPolygon(e);
            break;
          case "point":
            this.drawPoint(e);
            break;
          case "line":
            this.drawLine(e);
            break;
          default:
            break;
        }
      } else if (!singleType && e.shiftKey && allowTypes.includes("polygon")) {
        this.drawPolygon(e);
      }
    }
    this.renderPaths(pos);
  }
  private arePointsClose(
    oPoint: Point,
    dPoint: Point,
    cusDistanceCheck?: DistanceCheck
  ): boolean {
    const { distanceCheck, canvasScale } = this.$options;
    const checkValue = cusDistanceCheck || distanceCheck;
    return typeof checkValue === "function"
      ? checkValue(oPoint, dPoint)
      : Math.abs(oPoint.x - dPoint.x) < checkValue * canvasScale &&
          Math.abs(oPoint.y - dPoint.y) < checkValue * canvasScale;
  }
  private checkPointInPathLocally(points: Point[], ckPoint: Point) {
    if (!this.$ctx) return;
    const { length } = points;
    const {
      canvasScale,
      sensitive: { point },
    } = this.$options;
    for (let i = 0; i < length; i += 1) {
      const start = points[i];
      const end = points[(i + 1) % length];
      const pointSen = point * canvasScale;
      const nearCorer = this.arePointsClose(start, ckPoint, pointSen)
        ? i
        : this.arePointsClose(end, ckPoint, pointSen)
        ? i + 1
        : -1;
      if (nearCorer > -1) {
        return { pointIndex: nearCorer };
      }
      this.$ctx.beginPath();
      this.$ctx.moveTo(start.x, start.y);
      this.$ctx.lineTo(end.x, end.y);
      this.$ctx.closePath();
      if (this.$ctx.isPointInStroke(ckPoint.x, ckPoint.y)) {
        return { lineIndex: i };
      }
    }
    return;
  }
  private getCursorPosition(
    path: AnnotatePath,
    point: Point,
    idx?: number,
    checkInPath?: boolean
  ) {
    if (!this.$ctx) return;
    const { type, points } = path;
    const {
      canvasScale,
      sensitive: { line },
      pathCanMove,
    } = this.$options;
    this.$ctx.save();
    this.$ctx.lineWidth = line * canvasScale;
    let result = false;

    if (type === "rect" || type === "polygon") {
      const checkPoints =
        type === "rect" ? getVirtualRectPoints(points) : points;
      const info = this.checkPointInPathLocally(checkPoints, point);
      info &&
        (result = true) &&
        (this.operateCursor = { pathType: type, pathIndex: idx, ...info });
    } else if (type === "circle") {
      this.drawPathOnCanvas(type, points);
      result = this.$ctx.isPointInStroke(point.x, point.y);
      result && (this.operateCursor = { pathType: "circle", pathIndex: idx });
    }
    if (pathCanMove && checkInPath) {
      this.drawPathOnCanvas(type, points);
      const checkFn = type === "line" ? "isPointInStroke" : "isPointInPath";
      result = this.$ctx[checkFn](point.x, point.y);
      result &&
        (this.operateCursor = { pathType: type, pathIndex: idx, inPath: true });
    }
    this.$ctx.restore();
    return result;
  }
  private checkCursorOperation(e?: MouseEvent) {
    if (!this.$canvas) return;
    const point = e ? getMousePoint(e) : undefined;
    if (!point) return;
    this.operateCursor = null;
    this.$canvas.style.cursor = "inherit";
    const {
      paths,
      choseIndex,
      $options: { operateFocusOnly },
    } = this;
    if (operateFocusOnly) {
      if (paths[choseIndex]) {
        this.getCursorPosition(paths[choseIndex], point, choseIndex);
        !this.operateCursor &&
          this.getCursorPosition(paths[choseIndex], point, choseIndex, true);
      }
    } else {
      this.paths.some((path: AnnotatePath, idx: number) =>
        this.getCursorPosition(path, point, idx)
      );
      !this.operateCursor &&
        this.paths.some((path: AnnotatePath, idx: number) =>
          this.getCursorPosition(path, point, idx, true)
        );
    }
    let drawOpeCircle = false;
    if (this.operateCursor) {
      const { pathType, lineIndex, pointIndex, inPath, pathIndex } =
        this.operateCursor;
      if (!inPath && pathType === "rect") {
        const { side, corner } = this.$options.rectCursors;
        this.$canvas.style.cursor =
          pointIndex > -1 ? corner[pointIndex] : side[lineIndex];
      } else if (inPath) {
        pathIndex === choseIndex && (this.$canvas.style.cursor = "move");
      } else {
        drawOpeCircle = true;
      }
    }
    this.renderPathsWithDragPoint(drawOpeCircle ? point : undefined);
  }
  private registerEventHandlers(readonly?: boolean) {
    if (this.$canvas) {
      this.$canvas.addEventListener("keyup", (e) => {
        this.handleKeyPress(e);
      });
      this.$canvas.addEventListener("click", (e) => this.onCanvasClick(e));
      this.$canvas.addEventListener("mousedown", (e) =>
        this.onCanvasMouseDown(e)
      );
      this.$canvas.addEventListener("mousemove", (e) =>
        this.onCanvasMouseMove(e)
      );
      this.$canvas.addEventListener("contextmenu", (e) =>
        this.onCanvasClick(e)
      );

      if (!readonly) {
        this.$canvas.addEventListener("mouseup", (e) =>
          this.onCanvasMouseUp(e)
        );
      }
    }
  }

  private unregisterEventHandlers(forceAll?: boolean) {
    if (this.$canvas) {
      this.$canvas.removeEventListener("keyup", (e) => this.handleKeyPress(e));
      this.$canvas.removeEventListener("click", (e) => this.onCanvasClick(e));
      this.$canvas.removeEventListener("mousedown", (e) =>
        this.onCanvasMouseDown(e)
      );
      this.$canvas.removeEventListener("mousemove", (e) =>
        this.onCanvasMouseMove(e)
      );
      this.$canvas.removeEventListener("contextmenu", (e) =>
        this.onCanvasClick(e)
      );

      if (forceAll) {
        this.$canvas.removeEventListener("mouseup", (e) =>
          this.onCanvasMouseUp(e)
        );
      }
    }
  }

  private clearCurrentPath() {
    Object.assign(this, {
      drawing: false,
      needDrag: false,
      dragging: false,
      newPath: {},
      pathPointsCoincide: false,
    });
  }

  private createPath(
    startPoint: Point,
    type: PathTypes = "rect",
    needDrag = true
  ) {
    this.drawing = true;
    this.needDrag = needDrag;
    Object.assign(this.newPath || {}, {
      type,
      points: [startPoint],
      inner: true,
    });
    this.triggerEvent("onDrawStart", type, startPoint);
  }

  private addPath() {
    this.triggerEvent("onDrawEnd");
    const { reverse, singleType } = this.$options;
    reverse
      ? this.paths.unshift(this.newPath!)
      : this.paths.push(this.newPath!);
    this.updatePathData("add", reverse ? 0 : this.paths.length - 1);
    !singleType && this.choosePath(reverse ? 0 : this.paths.length - 1);
    this.clearCurrentPath();
  }

  private invertSelectedPath() {
    const { choseIndex: idx } = this;
    idx >= 0 && (this.paths[idx].inner = !this.paths[idx].inner);
    this.updatePathData("modify", idx);
  }

  resetOptions(options: PartialAnnotateOptions) {
    const oldAutoFit = this.$options.autoFit;
    this.applyOptions(options);

    options.globalStyles && this.applyContextStyles();
    (options.width !== this.$options.width ||
      options.height !== this.$options.height) &&
      this.resetCanvas();

    if (options.readonly) {
      this.isEventsListening && this.unregisterEventHandlers();
    } else {
      this.registerEventHandlers();
    }

    this.$options.autoFit !== oldAutoFit &&
      this.toggleAutoFit(this.$options.autoFit);
    this.redrawCanvas(true);
  }

  resetCanvas() {
    const { offsetWidth, offsetHeight } = this.$el || {};
    const {
      canvasScale = 2,
      width: optWidth,
      height: optHeight,
    } = this.$options;
    const width = optWidth || offsetWidth || 0;
    const height = optHeight || offsetHeight || 0;

    this.$size = { width, height };
    this.$canvasSize = {
      width: width * canvasScale,
      height: height * canvasScale,
    };

    if (this.$canvas) {
      Object.assign(this.$canvas, this.$canvasSize);
      Object.assign(this.$canvas.style, {
        width: `${canvasScale * 100}%`,
        height: `${canvasScale * 100}%`,
        transform: `scale(${1 / canvasScale})`,
      });
    }
    this.setValue(this.value);
    this.applyContextStyles();
    this.renderPaths();
  }

  scale(coords: Point, useSize?: boolean): Point {
    const { width, height } =
      useSize && this.$size ? this.$size : this.$canvasSize!;
    return {
      x: this.toFixedPrecision(coords.x / width),
      y: this.toFixedPrecision(coords.y / height),
    };
  }

  invert(scaleCoords: Point, useSize?: boolean): Point {
    const { width, height } =
      useSize && this.$size ? this.$size : this.$canvasSize!;
    return {
      x: Math.round(scaleCoords.x * width),
      y: Math.round(scaleCoords.y * height),
    };
  }

  setValue(value: AnnotatePath[]) {
    if (Array.isArray(value)) {
      this.value = value;
      this.paths = this.convertCoordinates(value, true);
    }
  }

  choosePath(index: number) {
    this.choseIndex = this.paths[index] ? index : -1;
    this.triggerEvent("onChoose", this.choseIndex);
    this.renderPaths();
  }

  clearCanvas() {
    if (this.$ctx && this.$canvas) {
      this.$ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);
    }
  }

  redrawCanvas(isClear?: boolean) {
    this.renderPaths(undefined, !isClear);
  }

  exportImageFromCanvas(resolve: (url: string) => void) {
    if (this.$canvas) {
      this.$canvas.toBlob((file) => {
        resolve(file ? window.URL.createObjectURL(file) : "");
      });
    }
  }

  customDrawing(fn: CustomHandler) {
    if (!this.$ctx || typeof fn !== "function") return;
    this.$ctx.save();
    fn.call(this, this);
    this.redrawCanvas();
    this.$ctx.restore();
  }

  destroy() {
    this.unregisterEventHandlers();
    if (this.elObserver) {
      this.toggleAutoFit(false);
    }
    if (this.$el && this.$canvas) {
      this.$el.removeChild(this.$canvas);
      delete this.$ctx;
      delete this.$canvas;
    }
  }
}

export default AnnotateImage;
