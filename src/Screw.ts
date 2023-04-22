import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Centered, octagon} from './utls';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {translateZ} from '@jscad/modeling/src/operations/transforms';

export class Screw {
  public readonly looseHeadOutlineHeight = 10;

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

  public get squareHeadLooseOutline(): Geom3 {
    const height = this.looseHeadOutlineHeight;
    return this.transform(
      cuboid({size: [this.headRadius * 2 + 0.4, this.headRadius * 2 + 0.4, height], center: [0, 0, height / 2]}),
    );
  }

  public get headLooseOutline(): Geom3 {
    const height = this.looseHeadOutlineHeight;
    return this.transform(cylinder({radius: this.headRadius * 2 + 0.4, height, center: [0, 0, height / 2]}));
  }

  public get octagonBodyLooseOutline(): Geom3 {
    return this.transform(translateZ(-this.length, extrudeLinear({height: this.length}, octagon(this.radius + 0.1))));
  }
}
