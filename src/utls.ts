import {Vec3} from '@jscad/modeling/src/maths/vec3';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {primitives} from '@jscad/modeling';
import {Vec2} from '@jscad/modeling/src/maths/vec2';

export class Centered {
  public static cuboid(size: Vec3): Geom3 {
    return primitives.cuboid({size, center: [size[0] / 2, size[1] / 2, size[2] / 2]});
  }

  public static rectangle(size: Vec2): Geom2 {
    return primitives.rectangle({size, center: size.map((v) => v / 2)});
  }
}

export function degreeToRadian(degree: number): number {
  return (degree * Math.PI) / 180;
}

export function octagon(size: number): Geom2 {
  const x1 = Math.sin(Math.PI / 8) * size;
  const x2 = Math.sin((Math.PI / 8) * 3) * size;
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
