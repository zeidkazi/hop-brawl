export type RowKind = 'grass' | 'road' | 'river' | 'rail';
export type Biome = 'meadow' | 'autumn' | 'snow' | 'nightCity';
export type Direction = -1 | 1;

interface RowBase {
  readonly z: number;
  readonly biome: Biome;
}

export interface Obstacle {
  readonly column: number;
  readonly kind: 'tree' | 'rock';
}

export interface Crate {
  readonly id: string;
  readonly column: number;
}

export interface GrassRow extends RowBase {
  readonly kind: 'grass';
  readonly obstacles: readonly Obstacle[];
  readonly crate: Crate | null;
}

/** Offset is the item's centre along the 21-tile repeating lane. */
export interface LaneItem {
  readonly offset: number;
  readonly length: number;
}

export interface Vehicle extends LaneItem {
  readonly kind: 'car' | 'truck';
}

interface MovingRow extends RowBase {
  readonly direction: Direction;
  readonly speed: number;
  readonly phase: number;
}

export interface RoadRow extends MovingRow {
  readonly kind: 'road';
  readonly vehicles: readonly Vehicle[];
}

export interface RiverRow extends MovingRow {
  readonly kind: 'river';
  readonly logs: readonly LaneItem[];
}

export interface RailRow extends RowBase {
  readonly kind: 'rail';
  readonly direction: Direction;
  readonly period: number;
  readonly phase: number;
}

export type Row = GrassRow | RoadRow | RiverRow | RailRow;

export interface SlowMoWindow {
  readonly start: number;
  readonly end: number;
}

/** Mutable output object: callers allocate once and reuse while rendering. */
export interface Position {
  x: number;
  z: number;
}
