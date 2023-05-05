import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Centered} from './utls';
import {commonSizeValue} from './common';
import {rotateX, rotateY, translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {polygon} from '@jscad/modeling/src/primitives';

export class BatteryBoxTriggerJoint {
  public static readonly width = 2;
  public static readonly height = 5;
  public static readonly hookLength = 5;
  public readonly width = BatteryBoxTriggerJoint.width;
  public readonly widthForPrint = this.width - 0.3;
  public readonly tailLength = 20;
  public readonly tailheight = 4;

  public get main(): Geom3[] {
    return [
      union(
        translateZ(
          -BatteryBoxTriggerJoint.height,
          subtract(
            Centered.cuboid([commonSizeValue.buttonPadJointLength, this.widthForPrint, BatteryBoxTriggerJoint.height]),
            // tailとのつなぎ目の部分をなだらかにするために削る
            rotateX(
              Math.PI / 2,
              translateZ(
                -this.widthForPrint,
                extrudeLinear(
                  {height: this.widthForPrint},
                  polygon({
                    points: [
                      [0, 0],
                      [2, 0],
                      [0, 1],
                    ],
                  }),
                ),
              ),
            ),
          ),
        ),
        // フック
        translate(
          [
            commonSizeValue.buttonPadJointLength - BatteryBoxTriggerJoint.hookLength,
            0,
            -BatteryBoxTriggerJoint.height - commonSizeValue.triggerJointSocketThickness,
          ],
          Centered.cuboid([
            BatteryBoxTriggerJoint.hookLength,
            this.widthForPrint,
            commonSizeValue.triggerJointSocketThickness,
          ]),
        ),
        // 付け根の部分
        translate(
          [-this.tailLength, 0, -this.tailheight],
          Centered.cuboid([this.tailLength, this.widthForPrint, this.tailheight]),
        ),
      ),
    ];
  }
}
