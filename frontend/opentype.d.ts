// Minimal type declarations for the subset of opentype.js we use. The package
// ships no types and there is no @types/opentype.js.
declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  export interface PathCommand {
    type: "M" | "L" | "C" | "Q" | "Z";
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }
  export interface Path {
    commands: PathCommand[];
    getBoundingBox(): BoundingBox;
    draw(ctx: CanvasRenderingContext2D): void;
  }
  export interface Font {
    unitsPerEm: number;
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }
  export function parse(buffer: ArrayBuffer): Font;
  export function load(url: string): Promise<Font>;
  const _default: { parse: typeof parse; load: typeof load };
  export default _default;
}
