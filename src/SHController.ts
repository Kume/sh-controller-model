import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Grip} from './Grip';
import {ButtonPad} from './ButtonPad';
import {Trigger} from './Trigger';
import {union} from '@jscad/modeling/src/operations/booleans';
import {mirrorZ, rotateY, rotateZ, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {degToRad} from '@jscad/modeling/src/utils';

export class SHController {
  public readonly grip = new Grip();
  public readonly buttonPad = new ButtonPad();
  public readonly trigger = new Trigger();

  public get outline(): Geom3 {
    return union(
      this.transformGrip(this.grip.outline),
      this.transformButtonPad(this.buttonPad.outline),
      this.trigger.outline,
    );
  }

  private transformGrip(grip: Geom3): Geom3 {
    grip = translateZ(-this.grip.length, grip);
    grip = rotateY(degToRad(90 + 28), grip);
    grip = translate([-8, 0, 0], grip); // TODO 計算で出す
    return grip;
  }

  private transformButtonPad(pad: Geom3): Geom3 {
    pad = mirrorZ(pad);
    pad = rotateZ(-degToRad(90 - 20), pad);
    pad = translate([20, 40, 0], pad);
    return pad;
  }
}
