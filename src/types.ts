import {Geom3} from '@jscad/modeling/src/geometries/geom3';

export interface Viewable {
  readonly displayName: string;
  readonly viewerItems: readonly ViewerItem[];
}

export interface ViewerItem {
  readonly label: string;
  readonly model: (() => Geom3) | (() => Geom3[]);
}

export type RecursiveValue<T> = T | readonly T[] | {readonly [key: string]: RecursiveValue<T>};
export type Vec3 = readonly [number, number, number];
export type Vec2 = readonly [number, number];

export interface PointViewMeta {
  readonly color?: Vec3;
  readonly radius?: number;
  readonly defaultVisible?: boolean;
}

export type PointsViewMeta = Readonly<Record<string, PointViewMeta>>;
