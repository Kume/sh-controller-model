import {Geom3} from '@jscad/modeling/src/geometries/geom3';
import {cylinder} from '@jscad/modeling/src/primitives';
import {union} from '@jscad/modeling/src/operations/booleans';
import {Cacheable, cashGetter, measureTime, octagon} from './utls';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {translateZ} from '@jscad/modeling/src/operations/transforms';

export class TactileSwitch extends Cacheable {
  public readonly baseRadius = 2.75;
  public readonly baseHeight = 3.5;
  public readonly switchHeight = 6;
  public readonly switchRadius = 1.5;

  public get height(): number {
    return this.baseHeight + this.switchHeight;
  }

  public get outline(): Geom3 {
    return union(this.baseOutline, this.switchOutline);
  }

  public get looseOutline(): Geom3 {
    return union(this.makeBaseOutline(0.2), this.makeSwitchOutline(0.2));
  }

  public get looseOctagonOutline(): Geom3 {
    const offset = 0.2;
    const base = extrudeLinear({height: this.baseHeight + offset}, octagon(this.baseRadius + offset));
    const sw = translateZ(
      this.baseHeight,
      extrudeLinear({height: this.switchHeight}, octagon(this.switchRadius + offset)),
    );
    return union(base, sw);
  }

  public get baseOutline(): Geom3 {
    return this.makeBaseOutline();
  }

  private makeBaseOutline(offset: number = 0): Geom3 {
    const height = this.baseHeight + offset;
    return cylinder({radius: this.baseRadius + offset, height, center: [0, 0, height / 2]});
  }

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
}
