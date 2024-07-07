import {Geom3} from '@jscad/modeling/src/geometries/geom3';
import {cuboid, cylinder, rectangle} from '@jscad/modeling/src/primitives';
import {union} from '@jscad/modeling/src/operations/booleans';
import {addColor, Cacheable, octagon} from './utls';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {hull} from '@jscad/modeling/src/operations/hulls';

export class TactileSwitch extends Cacheable {
  public readonly baseRadius = 3.1;
  public readonly baseHeight = 3.5;
  public readonly switchHeight = 6;
  public readonly switchRadius = 1.6;
  public readonly looseSwitchRadius = 3.2;
  public readonly legHoleWidth = 1.2;
  public readonly legHoleLength = 3;
  public readonly legDistance = 6;
  public readonly looseOffset = 0.3;

  public readonly protrusion = 2;

  public readonly switchColor = [0.1, 0.1, 0.1] as const;

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
    const capHeight = 3;
    return union(
      this.transform(this.makeBaseOutline(this.looseOffset)),
      this.transform(
        hull(
          this.makeSwitchOutline(this.switchRadius + this.looseOffset, this.switchHeight + this.looseOffset),
          cylinder({
            radius: this.looseSwitchRadius,
            height: capHeight,
            center: [0, 0, this.baseHeight + this.switchHeight - capHeight / 2],
          }),
        ),
      ),
    );
  }

  public get looseOctagonOutline(): Geom3 {
    const capHeight = 3.5;
    const base = extrudeLinear(
      {height: this.baseHeight + this.looseOffset},
      octagon(this.baseRadius + this.looseOffset),
    );
    const sw = translateZ(
      this.baseHeight,
      hull(
        translateZ(this.switchHeight - capHeight, extrudeLinear({height: capHeight}, octagon(this.looseSwitchRadius))),
        extrudeLinear({height: this.switchHeight}, octagon(this.switchRadius + this.looseOffset)),
      ),
    );
    return this.transform(union(base, sw));
  }

  public get looseSquareToOctagonOutlineForButtonFace(): Geom3 {
    const capHeight = 3.5;
    const base = hull(
      extrudeLinear(
        {height: this.baseHeight + this.looseOffset},
        rectangle({size: [(this.baseRadius + this.looseOffset) * 2, (this.baseRadius + this.looseOffset) * 2]}),
      ),
      extrudeLinear(
        {height: 0.0001},
        rectangle({
          size: [(this.baseRadius + this.looseOffset) * 2, (this.baseRadius + this.looseOffset) * 2],
          center: [3, 0],
        }),
      ),
    );
    const sw = translateZ(
      this.baseHeight,
      hull(
        translateZ(this.switchHeight - capHeight, extrudeLinear({height: capHeight}, octagon(this.looseSwitchRadius))),
        extrudeLinear(
          {height: this.switchHeight},
          rectangle({size: [(this.switchRadius + this.looseOffset) * 2, (this.switchRadius + this.looseOffset) * 2]}),
        ),
      ),
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

  private makeSwitchOutline(radius = this.switchRadius, height = this.switchHeight): Geom3 {
    return addColor(this.switchColor, cylinder({radius, height, center: [0, 0, this.baseHeight + height / 2]}));
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
