import {Geom3} from '@jscad/modeling/src/geometries/geom3';

export interface Viewable {
  readonly displayName: string;
  readonly viewerItems: readonly ViewerItem[];
}

export interface ViewerItem {
  readonly label: string;
  readonly model: (() => Geom3) | (() => Geom3[]);
}
