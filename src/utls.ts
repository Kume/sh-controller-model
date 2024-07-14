import {Vec3} from '@jscad/modeling/src/maths/vec3';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {primitives} from '@jscad/modeling';
import {Vec2} from '@jscad/modeling/src/maths/vec2';
import {mirrorX, mirrorY, mirrorZ, translateZ} from '@jscad/modeling/src/operations/transforms';
import {colorize, RGB} from '@jscad/modeling/src/colors';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {expand} from '@jscad/modeling/src/operations/expansions';
import {subtract} from '@jscad/modeling/src/operations/booleans';

export class Centered {
  public static cuboid(size: Vec3): Geom3 {
    return primitives.cuboid({size, center: [size[0] / 2, size[1] / 2, size[2] / 2]});
  }

  public static rectangle(size: Vec2): Geom2 {
    return primitives.rectangle({size, center: size.map((v) => v / 2) as [number, number]});
  }

  public static extrudeLinear(height: number, g: Geom2): Geom3 {
    return translateZ(-height / 2, extrudeLinear({height}, g));
  }
}

export function degreeToRadian(degree: number): number {
  return (degree * Math.PI) / 180;
}

type XGonSizeType = 'max' | 'min';

export function octagon(size: number, sizeType: XGonSizeType = 'min'): Geom2 {
  const [x1, x2] =
    sizeType === 'min'
      ? [(Math.sin(Math.PI / 8) * size) / Math.cos(Math.PI / 8), size]
      : [Math.sin(Math.PI / 8) * size, Math.cos(Math.PI / 8) * size];
  return primitives.polygon({
    points: [
      [-x1, x2],
      [-x2, x1],
      [-x2, -x1],
      [-x1, -x2],
      [x1, -x2],
      [x2, -x1],
      [x2, x1],
      [x1, x2],
    ],
  });
}

export function hexagon(size: number, sizeType: XGonSizeType = 'min'): Geom2 {
  const [unit, x1, x2] =
    sizeType === 'min'
      ? [size / Math.cos(Math.PI / 6), size, (Math.sin(Math.PI / 6) / Math.cos(Math.PI / 6)) * size]
      : [size, Math.cos(Math.PI / 6) * size, Math.sin(Math.PI / 6) * size];
  return primitives.polygon({
    points: [
      [x1, x2],
      [0, unit],
      [-x1, x2],
      [-x1, -x2],
      [0, -unit],
      [x1, -x2],
    ],
  });
}

export class Cacheable {
  private __cache: Map<string | symbol, any> = new Map();
  public getValue(key: string | symbol): any {
    return this.__cache.get(key);
  }
  public setValue(key: string | symbol, value: any): void {
    this.__cache.set(key, value);
  }
}

export function cacheGetter<This extends Cacheable>(target: () => unknown, context: ClassGetterDecoratorContext) {
  return function (this: This) {
    const cachedValue = this.getValue(context.name);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const value = target.call(this);
    this.setValue(context.name, value);
    return value;
  };
}

export function legacyCash<T>(casheable: Cacheable, name: string, getValue: () => T): T {
  const cachedValue = casheable.getValue(name);
  if (cachedValue !== undefined) {
    return cachedValue;
  }
  const value = getValue();
  casheable.setValue(name, value);
  return value;
}

export function measureTime<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassGetterDecoratorContext,
): (...args: Args) => Return {
  return function (this: This, ...args: Args) {
    const startTime = Date.now();
    const value = target.call(this, ...args);
    // @ts-ignore
    const className: string = this.constructor?.name ?? '';
    // eslint-disable-next-line no-console
    console.log(`time ${className}.${context.name.toString()} ${Date.now() - startTime}ms`);
    return value;
  };
}

export function selfTransform<This extends {transform: ((g: Geom3) => Geom3) | undefined}>(
  target: () => Geom3,
  context: ClassGetterDecoratorContext | ClassMethodDecoratorContext,
) {
  return function (this: This): Geom3 {
    return this.transform?.(target.call(this)) ?? target.call(this);
  };
}

export function halfToFull(geoms: Geom3[], axis: 'x' | 'y' | 'z' = 'y'): Geom3[] {
  switch (axis) {
    case 'x':
      return geoms.flatMap((geom) => [geom, mirrorX(geom)]);
    case 'y':
      return geoms.flatMap((geom) => [geom, mirrorY(geom)]);
    case 'z':
      return geoms.flatMap((geom) => [geom, mirrorZ(geom)]);
  }
}

export function addColor(color: readonly [number, number, number, number?], g: Geom3): Geom3;
export function addColor(color: readonly [number, number, number, number?], g: Geom3[]): Geom3[];
export function addColor(color: readonly [number, number, number, number?], g: Geom3 | Geom3[]): Geom3 | Geom3[] {
  return Array.isArray(g) ? g.map((i) => colorize(color as RGB, i)) : colorize(color as RGB, g);
}

export function rotateVec2([x, y]: readonly [number, number], radian: number): [number, number] {
  return [x * Math.cos(radian) - y * Math.sin(radian), x * Math.sin(radian) + y * Math.cos(radian)];
}

export function chamfer(face: Geom2, length: number): Geom3[] {
  return [
    subtract(
      extrudeLinear({height: length}, expand({delta: 0.001}, face)),
      hull(
        extrudeLinear({height: 0.001}, expand({delta: -length}, face)),
        translateZ(length, extrudeLinear({height: 0.001}, face)),
      ),
    ),
  ];
}

export function isReadonlyArray<T>(value: readonly T[] | unknown): value is readonly T[] {
  return Array.isArray(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && value.constructor === Object;
}

export function zipArray<T1, T2>(...items: [readonly T1[], readonly T2[]]): [T1, T2][] {
  if (items[0].length !== items[1].length) {
    throw new Error('Zipping array length mismatch');
  }
  const result: [T1, T2][] = [];
  for (let i = 0; i < items[0].length; i++) {
    result.push([items[0][i], items[1][i]]);
  }
  return result;
}

export function vec2ArrayToWritable(vecs: readonly (readonly [number, number])[]): [number, number][] {
  return vecs.map((vec) => [...vec]);
}
