import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Centered} from './utls';
import {cylinder} from '@jscad/modeling/src/primitives';

export class Screw {
  public constructor(
    public readonly length: number,
    public readonly headHeight: number,
    public readonly transform: (g: Geom3) => Geom3,
    public readonly radius = 3 / 2,
    public readonly headRadius = 5.5 / 2,
  ) {}

  public get outline(): Geom3[] {
    return [
      cylinder({radius: this.radius, height: this.length, center: [0, 0, -this.length / 2]}),
      cylinder({radius: this.headRadius, height: this.headHeight, center: [0, 0, this.headHeight / 2]}),
    ].map(this.transform);
  }

  public get looseOutline(): Geom3[] {
    return [
      cylinder({radius: this.radius + 0.1, height: this.length, center: [0, 0, -this.length / 2]}),
      cylinder({radius: this.headRadius + 0.35, height: this.headHeight, center: [0, 0, this.headHeight / 2]}),
    ].map(this.transform);
  }
}
