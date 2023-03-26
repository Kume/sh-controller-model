import {Geom3} from '@jscad/modeling/src/geometries/geom3';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {union} from '@jscad/modeling/src/operations/booleans';
import {Cacheable, octagon} from './utls';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {colorize} from '@jscad/modeling/src/colors';

export class TactileSwitch extends Cacheable {
  public readonly baseRadius = 2.75;
  public readonly baseHeight = 3.5;
  public readonly switchHeight = 6;
  public readonly switchRadius = 1.5;
  public readonly legHoleWidth = 1.2;
  public readonly legHoleLength = 3;
  public readonly legDistance = 6;

  public readonly switchColor = [0.1, 0.1, 0.1];

  public constructor(public readonly transform: (g: Geom3) => Geom3 = (g) => g) {
    super();
  }

  public get height(): number {
    return this.baseHeight + this.switchHeight;
  }

  public get outline(): Geom3 {
    return union(this.baseOutline, this.switchOutline, this.legHole);
  }

  public get looseOutline(): Geom3 {
    return union(this.transform(this.makeBaseOutline(0.2)), this.transform(this.makeSwitchOutline(0.2)));
  }

  public get looseOctagonOutline(): Geom3 {
    const offset = 0.2;
    const base = extrudeLinear({height: this.baseHeight + offset}, octagon(this.baseRadius + offset));
    const sw = translateZ(
      this.baseHeight,
      extrudeLinear({height: this.switchHeight}, octagon(this.switchRadius + offset)),
    );
    return this.transform(union(base, sw));
  }

  public get baseOutline(): Geom3 {
    return this.transform(this.makeBaseOutline());
  }

  private makeBaseOutline(offset = 0): Geom3 {
    const height = this.baseHeight + offset;
    return cylinder({radius: this.baseRadius + offset, height, center: [0, 0, height / 2]});
  }

  public get switchOutline(): Geom3 {
    return this.transform(this.makeSwitchOutline());
  }

  private makeSwitchOutline(offset = 0): Geom3 {
    const height = this.switchHeight + offset;
    return colorize(
      this.switchColor,
      cylinder({
        radius: this.switchRadius + offset,
        height,
        center: [0, 0, this.baseHeight + height / 2],
      }),
    );
  }

  public get legHole(): Geom3 {
    const holeSolid = cuboid({
      size: [this.legHoleWidth, this.legHoleWidth, this.legHoleLength],
      center: [0, 0, -this.legHoleLength / 2],
    });
    return this.transform(
      union(translateX(this.legDistance / 2, holeSolid), translateX(-this.legDistance / 2, holeSolid)),
    );
  }
}
