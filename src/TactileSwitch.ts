import {Geom3} from '@jscad/modeling/src/geometries/geom3';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {union} from '@jscad/modeling/src/operations/booleans';
import {Cacheable, cashGetter, measureTime, octagon, selfTransform} from './utls';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {translateX, translateZ} from '@jscad/modeling/src/operations/transforms';

export class TactileSwitch extends Cacheable {
  public readonly baseRadius = 2.75;
  public readonly baseHeight = 3.5;
  public readonly switchHeight = 6;
  public readonly switchRadius = 1.5;
  public readonly legHoleWidth = 1.2;
  public readonly legHoleLength = 3;
  public readonly legDistance = 6;

  public constructor(public readonly transform?: (g: Geom3) => Geom3) {
    super();
  }

  public get height(): number {
    return this.baseHeight + this.switchHeight;
  }

  public get outline(): Geom3 {
    return union(this.baseOutline, this.switchOutline);
  }

  public get looseOutline(): Geom3 {
    return union(this.makeBaseOutline(0.2), this.makeSwitchOutline(0.2));
  }

  @selfTransform
  public get looseOctagonOutline(): Geom3 {
    const offset = 0.2;
    const base = extrudeLinear({height: this.baseHeight + offset}, octagon(this.baseRadius + offset));
    const sw = translateZ(
      this.baseHeight,
      extrudeLinear({height: this.switchHeight}, octagon(this.switchRadius + offset)),
    );
    return union(base, sw);
  }

  @selfTransform
  public get baseOutline(): Geom3 {
    return this.makeBaseOutline();
  }

  private makeBaseOutline(offset: number = 0): Geom3 {
    const height = this.baseHeight + offset;
    return cylinder({radius: this.baseRadius + offset, height, center: [0, 0, height / 2]});
  }

  @selfTransform
  public get switchOutline(): Geom3 {
    return this.makeSwitchOutline();
  }

  private makeSwitchOutline(offset: number = 0): Geom3 {
    const height = this.switchHeight + offset;
    return cylinder({
      radius: this.switchRadius + offset,
      height,
      center: [0, 0, this.baseHeight + height / 2],
    });
  }

  @selfTransform
  public get legHole(): Geom3 {
    const holeSolid = cuboid({
      size: [this.legHoleWidth, this.legHoleWidth, this.legHoleLength],
      center: [0, 0, -this.legHoleLength / 2],
    });
    return union(translateX(this.legDistance / 2, holeSolid), translateX(-this.legDistance / 2, holeSolid));
  }
}
