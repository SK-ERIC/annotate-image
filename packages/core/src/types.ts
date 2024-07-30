export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type CanvasMouseEvents =
  | "keyup"
  | "click"
  | "mousedown"
  | "mousemove"
  | "mouseup"
  | "contextmenu";

export type AnnotateEvents =
  | "onReady"
  | "onInput"
  | "onChange"
  | "onChoose"
  | "onResize"
  | "onDrawStart"
  | "onDrawEnd"
  | "onModifyStart";

export type ClickPathTypes = "point" | "line" | "polygon";

export type DragPathTypes = "rect" | "circle";

export type PathTypes = ClickPathTypes | DragPathTypes;

export interface CustomHandler {
  (...args: any[]): void;
}

export type MethodsMap = {
  [key: string]: CustomHandler;
};

export type Context2DStyles = Partial<CanvasRenderingContext2D>;

export type PublicMethodNames =
  | "mount"
  | "resetOptions"
  | "resetCanvas"
  | "scale"
  | "invert"
  | "setValue"
  | "clearCanvas"
  | "redrawCanvas"
  | "exportImageFromCanvas"
  | "customDrawing"
  | "choosePath"
  | "destroy";

export interface AnnotatePath {
  type: PathTypes;
  points: Point[];
  styles?: Context2DStyles;
  inner: boolean;
  center?: Point;
  radius?: number;
  scaleRadius?: number;
  start?: Point;
  width?: number;
  height?: number;
}

export type GlobalStyles = Context2DStyles &
  Pick<CanvasRenderingContext2D, "lineWidth" | "strokeStyle" | "fillStyle">;

export type DistanceCheck =
  | ((oPoint: Point, dPoint: Point) => boolean)
  | number;

export type PathChangeType = "add" | "modify" | "delete";
/**
 * Component configuration object
 */
export interface AnnotateOptions {
  /**
   * Read-only mode. Selection can still be made in read-only mode.
   */
  readonly: boolean;
  /**
   * Canvas element scale factor
   * Default is 2 pixels
   */
  canvasScale: number;
  /**
   * Global styles for the canvas
   */
  globalStyles: GlobalStyles;
  /**
   * Styles for the selected state of a region
   */
  focusStyles?: Context2DStyles;
  /**
   * Allow operations only on selected regions
   */
  operateFocusOnly: boolean;
  /**
   * Styles and radius for small circles in polygon operations
   */
  operateCircle: {
    styles: Context2DStyles;
    /**
     * Radius of the small circle, in pixels
     */
    radius: number;
  };
  /**
   * Sensitivity for mouse operation judgment, in pixels
   */
  sensitive: {
    line: number;
    point: number;
  };
  /**
   * Allowed types of regions for drawing
   */
  allowTypes: PathTypes[];
  /**
   * Use single type mode, switching types requires the currentType field
   */
  singleType: boolean;
  /**
   * Type of region being drawn in single type mode. If empty, drawing is not allowed; only selection and modification are allowed.
   */
  currentType: "" | PathTypes;
  /**
   * Allow regions to be moved
   */
  pathCanMove: boolean;
  /**
   * Precision for coordinate point measurements
   * Default is 3 decimal places
   */
  digits: number;
  /**
   * Distance check in pixels. If the distance between two points is less than this value, they are considered close.
   * Default is 10 pixels
   */
  distanceCheck: DistanceCheck;
  /**
   * If the width and height of a rectangle are less than this value, it is considered a misoperation and the rectangle will not be created.
   * Default is 4 pixels
   */
  tinyRectSize: number;
  /**
   * Fixed aspect ratio for drawing rectangles
   * No restriction by default
   */
  rectAspectRatio: number;
  /**
   * Radius value for invalid circles
   * Default is 6 pixels
   */
  tinyCircleRadius: number;
  /**
   * Opacity for non-selected regions to distinguish between the currently selected path and other paths
   * Default is 0.5
   */
  blurStrokeOpacity: number;
  /**
   * Ignore invalid selection operations. If true, clicking on blank areas will not change the selection.
   * Default is false
   */
  ignoreInvalidSelect: boolean;
  /**
   * Configure cursor appearance when hovering over the edges and corners of a rectangular region. The index order is top, right, bottom, left.
   */
  rectCursors: {
    side: string[];
    corner: string[];
  };
  /**
   * Maximum number of paths allowed for drawing
   * Default is 0, meaning no limit
   */
  maxPath: number;
  /**
   * Auto-fit container size changes, based on ResizeObserver
   */
  autoFit: boolean;
  /**
   * Width of the component, in pixels. Usually not needed to be specified.
   */
  width?: number;
  /**
   * Height of the component, in pixels. Usually not needed to be specified.
   */
  height?: number;
  /**
   * Handle data in a way that the last drawn appears in front
   * Default is true
   */
  reverse: boolean;
  /**
   * Use full coordinate points (4 points) data for rectangles
   * Default is 2 points
   */
  rectFullPoint: boolean;
  /**
   * Limit region movement within the visible area
   */
  bounded: boolean;
  /**
   * Triggered when the component is initialized
   */
  onReady?: CustomHandler;
  /**
   * Triggered when the bound region data changes
   */
  onInput?: (value: AnnotatePath[]) => void;
  /**
   * Triggered when a single region changes
   */
  onChange?: (type: PathChangeType, index: number) => void;
  /**
   * Triggered when the index of the currently selected region changes
   */
  onChoose?: (index: number) => void;
  /**
   * Triggered when the component container size changes
   */
  onResize?: CustomHandler;
  /**
   * Triggered when region drawing starts
   */
  onDrawStart?: (pathType: PathTypes, startPoint: Point) => void;
  /**
   * Triggered when region drawing ends
   */
  onDrawEnd?: CustomHandler;
  /**
   * Triggered when region modification starts
   */
  onModifyStart?: CustomHandler;
}

export interface OperateCursor {
  pathType?: PathTypes;
  pathIndex?: number;
  originStartPoint?: Point;
  startPoint?: Point;
  pointIndex?: number;
  lineIndex?: number;
  inPath?: boolean;
}

export type ElementOrSelector = HTMLElement | string;

export type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends Record<string, unknown>
    ? PowerPartial<T[U]>
    : T[U];
};

export type NotObject<T> = T extends Record<string, unknown> ? never : T;

export type PartialAnnotateOptions = PowerPartial<AnnotateOptions>;
