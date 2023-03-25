import {Vec3} from '@jscad/modeling/src/maths/vec3';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {primitives} from '@jscad/modeling';
import {Vec2} from '@jscad/modeling/src/maths/vec2';
import {union} from '@jscad/modeling/src/operations/booleans';
import {mirrorX, mirrorY, mirrorZ} from '@jscad/modeling/src/operations/transforms';

export class Centered {
  public static cuboid(size: Vec3): Geom3 {
    return primitives.cuboid({size, center: [size[0] / 2, size[1] / 2, size[2] / 2]});
  }

  public static rectangle(size: Vec2): Geom2 {
    return primitives.rectangle({size, center: size.map((v) => v / 2) as [number, number]});
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

export function cashGetter<This extends Cacheable>(target: Function, context: ClassGetterDecoratorContext) {
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

export function measureTime<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassGetterDecoratorContext,
): (...args: Args) => Return {
  return function (this: This, ...args: Args) {
    const startTime = Date.now();
    const value = target.call(this, ...args);
    // @ts-ignore
    const className = this.constructor?.name;
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

export function halfToFullY(geom: Geom3, axis: 'x' | 'y' | 'z' = 'y'): Geom3 {
  switch (axis) {
    case 'x':
      return union(geom, mirrorX(geom));
    case 'y':
      return union(geom, mirrorY(geom));
    case 'z':
      return union(geom, mirrorZ(geom));
  }
}
