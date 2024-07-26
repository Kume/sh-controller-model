import {Geom3} from '@jscad/modeling/src/geometries/types';
import {addColor, Cacheable, cacheGetter, Centered, halfToFull} from '../utls';
import {Skeleton} from './Skeleton';
import {colors} from '../common';
import {translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {TactileSwitch} from '../TactileSwitch';
import {Screw} from '../Screw';

export class TriggerBoard1_1 extends Cacheable {
  public readonly sk = Skeleton.Trigger.ButtonFace.Board;
  private readonly switches = this.sk.point2ds.switches.map(
    (point) => new TactileSwitch((g) => translate([...point, 0], g)),
  );
  private readonly screw = new Screw(6, 2.5, (g) => translate([this.sk.x.screw, 0, 5.5], g));

  @cacheGetter
  public get full(): Geom3[] {
    const connectorHeight = 6;
    const connectorLegHeight = 2.5;
    return [
      ...addColor(
        colors.translucentBoard,
        translateZ(
          -this.sk.z.thickness,
          halfToFull([Centered.cuboid([this.sk.x.topToBottom.totalValue, this.sk.y.totalHalf, this.sk.z.thickness])]),
        ),
      ),
      // connector
      addColor(
        [0.9, 0.9, 0.9],
        translate([15, 0, -connectorHeight - this.sk.z.thickness], Centered.cuboid([4.5, 5, connectorHeight])),
      ),
    ];
  }

  @cacheGetter
  public get looseOutline(): Geom3[] {
    return [
      ...this.switches.map((sw) => sw.looseSquareToOctagonOutlineForButtonFace),
      ...this.screw.octagonLooseOutline,
    ];
  }
}
