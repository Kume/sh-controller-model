import {Geom3} from '@jscad/modeling/src/geometries/types';
import {rotateVec2} from '../utls';
import {
  mirrorX,
  mirrorY,
  mirrorZ,
  rotateX,
  rotateY,
  rotateZ,
  translate,
} from '@jscad/modeling/src/operations/transforms';

export type Vec3D = readonly [number, number, number];

export type TranslateTransform3DItem = readonly [type: 'translate', x: number, y: number, z: number];
export type RotateTransform3DItem = readonly [type: 'rotate', axis: 'x' | 'y' | 'z', rad: number];
export type MirrorTransform3DItem = readonly [type: 'mirror', axis: 'x' | 'y' | 'z'];
export type Transform3dItem = TranslateTransform3DItem | RotateTransform3DItem | MirrorTransform3DItem;

export class Transform3D<Items extends readonly Transform3dItem[] = readonly Transform3dItem[]> {
  public static join(...transforms: readonly Transform3D[]): Transform3D {
    return new Transform3D(transforms.flatMap((transform) => transform.items));
  }

  public constructor(public readonly items: Items) {}

  public applyVec(point: Vec3D): Vec3D {
    for (const item of this.items) {
      switch (item[0]) {
        case 'rotate':
          switch (item[1]) {
            case 'x': {
              const rotated = rotateVec2([point[1], point[2]], item[2]);
              point = [point[0], rotated[0], rotated[1]];
              break;
            }
            case 'y': {
              const rotated = rotateVec2([point[2], point[0]], item[2]);
              point = [rotated[1], point[1], rotated[0]];
              break;
            }
            case 'z': {
              const rotated = rotateVec2([point[0], point[1]], item[2]);
              point = [rotated[0], rotated[1], point[2]];
              break;
            }
          }
          break;
        case 'translate':
          point = [point[0] + item[1], point[1] + item[2], point[2] + item[3]];
          break;
        case 'mirror':
          switch (item[1]) {
            case 'x':
              point = [-point[0], point[1], point[2]];
              break;

            case 'y': {
              point = [point[0], -point[1], point[2]];
              break;
            }
            case 'z': {
              point = [point[0], point[1], -point[2]];
              break;
            }
          }
          break;
      }
    }
    return point;
  }

  public applyVecs(points: readonly Vec3D[]): readonly Vec3D[] {
    return points.map((point) => this.applyVec(point));
  }

  public applyGeom(geom: Geom3): Geom3 {
    for (const item of this.items) {
      geom = this.applyItemToGeom(item, geom);
    }
    return geom;
  }

  public applyGeoms(geoms: readonly Geom3[]): Geom3[] {
    return geoms.map((geom) => this.applyGeom(geom));
  }

  private applyItemToGeom(item: Transform3dItem, geom: Geom3): Geom3 {
    switch (item[0]) {
      case 'mirror':
        switch (item[1]) {
          case 'x':
            return mirrorX(geom);
          case 'y':
            return mirrorY(geom);
          case 'z':
            return mirrorZ(geom);
        }
        break;
      case 'rotate':
        switch (item[1]) {
          case 'x':
            return rotateX(item[2], geom);
          case 'y':
            return rotateY(item[2], geom);
          case 'z':
            return rotateZ(item[2], geom);
        }
        break;
      case 'translate': {
        const [_, ...vec3] = item;
        return translate(vec3, geom);
      }
    }
  }

  public reversed(): Transform3D {
    return new Transform3D(
      [...this.items].reverse().map((item) => {
        switch (item[0]) {
          case 'rotate':
            return ['rotate', item[1], -item[2]];
          case 'translate':
            return ['translate', -item[1], -item[2], -item[3]];
          case 'mirror':
            return item;
        }
      }),
    );
  }
}

export type Vec2D = readonly [number, number];

export type TranslateTransform2DItem = readonly [type: 'translate', x: number, y: number];
export type RotateTransform2DItem = readonly [type: 'rotate', radian: number];
export type MirrorTransform2DItem = readonly [type: 'mirror', axis: 'x' | 'y'];
export type Transform2dItem = TranslateTransform2DItem | RotateTransform2DItem | MirrorTransform2DItem;

export class Transform2D<Items extends readonly Transform2dItem[] = readonly Transform2dItem[]> {
  public static join(...transforms: readonly Transform2D[]): Transform2D {
    return new Transform2D(transforms.flatMap((transform) => transform.items));
  }

  public constructor(public readonly items: Items) {}

  public applyVec(point: Vec2D): Vec2D {
    for (const item of this.items) {
      switch (item[0]) {
        case 'rotate':
          point = rotateVec2(point, item[1]);
          break;
        case 'translate':
          point = [point[0] + item[1], point[1] + item[2]];
          break;
        case 'mirror':
          switch (item[1]) {
            case 'x':
              point = [-point[0], point[1]];
              break;
            case 'y':
              point = [point[0], -point[1]];
              break;
          }
          break;
      }
    }
    return point;
  }

  public applyVecs(points: readonly Vec2D[]): readonly Vec2D[] {
    return points.map((point) => this.applyVec(point));
  }

  public reversed(): Transform2D {
    return new Transform2D(
      [...this.items].reverse().map((item) => {
        switch (item[0]) {
          case 'rotate':
            return ['rotate', -item[1]];
          case 'translate':
            return ['translate', -item[1], -item[2]];
          case 'mirror':
            return item;
        }
      }),
    );
  }

  public to3d(): Transform3D {
    return new Transform3D(
      this.items.map((item) => {
        switch (item[0]) {
          case 'rotate':
            return ['rotate', 'z', item[1]];
          case 'translate':
            return ['translate', item[1], item[2], 0];
          case 'mirror':
            return item;
        }
      }),
    );
  }
}

export function mirrorVec2ds(vecs: readonly Vec2D[], axis: 'x' | 'y' = 'x'): Vec2D[] {
  switch (axis) {
    case 'x':
      return vecs.map((vec) => [-vec[0], vec[1]]);
    case 'y':
      return vecs.map((vec) => [vec[0], -vec[1]]);
  }
}

export function mirrorVec3ds(vecs: readonly Vec3D[], axis: 'x' | 'y' | 'z'): Vec3D[] {
  switch (axis) {
    case 'x':
      return vecs.map((vec) => [-vec[0], vec[1], vec[2]]);
    case 'y':
      return vecs.map((vec) => [vec[0], -vec[1], vec[2]]);
    case 'z':
      return vecs.map((vec) => [vec[0], vec[1], -vec[2]]);
  }
}
