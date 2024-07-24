import {Geom3} from '@jscad/modeling/src/geometries/types';
import {addColor, Cacheable, cacheGetter, Centered, halfToFull} from '../utls';
import {Skeleton} from './Skeleton';
import {colors} from '../common';
import {translateZ} from '@jscad/modeling/src/operations/transforms';

export class TriggerBoard1_1 extends Cacheable {
  public readonly sk = Skeleton.Trigger.ButtonFace.Board;

  @cacheGetter
  public get full(): Geom3[] {
    return [
      ...addColor(
        colors.translucentBoard,
        translateZ(
          -this.sk.z.thickness,
          halfToFull([Centered.cuboid([this.sk.x.topToBottom.totalValue, this.sk.y.totalHalf, this.sk.z.thickness])]),
        ),
      ),
    ];
  }
}
