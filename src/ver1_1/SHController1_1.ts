import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, Centered, halfToFull} from '../utls';
import {ButtonPad1_1} from './ButtonPad1_1';
import {Trigger1_1} from './Trigger1_1';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {Transform3D} from '../utils/Transform';
import {expand} from '@jscad/modeling/src/operations/expansions';
import {
  center,
  mirrorX,
  mirrorY,
  mirrorZ,
  rotateY,
  rotateZ,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {Skeleton} from './Skeleton';
import {cuboid, rectangle} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';

export class SHController1_1 extends Cacheable implements Viewable {
  public readonly trigger = new Trigger1_1();
  public readonly buttonPad = new ButtonPad1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'full', model: () => this.full},
      {label: 'gripHalf', model: () => this.gripHalf},
      {label: 'gripFull', model: () => this.gripFull},
      {label: 'gripEndFull', model: () => this.gripEndFull},
      {label: 'printGrip', model: () => this.printGrip},
      {label: 'gripSubtructionFull', model: () => this.gripSubtractionFull},
      {label: 'batteryBoxHolderHalf', model: () => this.batteryBoxHolderHalf},
      {label: 'batteryBoxHolderFull', model: () => this.batteryBoxHolderFull},
      {label: 'batteryBoxHolderForPrint', model: () => this.batteryBoxHolderForPrint},
      {label: 'batteryBoxHolderSubtractionHalf', model: () => this.batteryBoxHolderSubtractionHalf},
      {label: 'gripHalfWithBoard', model: () => this.gripHalfWithBoard},
      {label: 'gripHalfWithBatteryBoxAndBoard', model: () => this.gripHalfWithBatteryBoxAndBoard},
      {label: 'gripFullWithBatteryBoxAndBoard', model: () => this.gripFullWithBatteryBoxAndBoard},
    ];
  }

  public get printItems(): ViewerItem[] {
    return [
      {label: 'BatteryBoxHolder1_1', model: () => this.batteryBoxHolderForPrint},
      {label: 'Trigger1_1', model: () => this.trigger.frontFull},
      {label: 'TriggerJoint1_1', model: () => this.trigger.joint.full},
      {label: 'Grip1_1', model: () => this.printGrip},
      {label: 'GripEnd1_1', model: () => this.gripEndFull},
      {label: 'ButtonPad1_1', model: () => this.buttonPad.full},
      {label: 'ButtonPadCover1_1', model: () => this.buttonPad.coverFull},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  @cacheGetter
  public get outline(): Geom3[] {
    return [
      ...this.buttonPad.sk.transformSelf.applyGeoms(this.buttonPad.outline),
      ...this.trigger.sk.transformSelf.applyGeoms(this.trigger.outline),
      ...this.trigger.grip.sk.transformSelf.applyGeoms(this.trigger.grip.outline),
      ...this.trigger.batteryBoxHolder.sk.transformSelf.applyGeoms(this.trigger.batteryBoxHolder.outlineHalf),
    ];
  }

  @cacheGetter
  public get full(): Geom3[] {
    return [
      ...this.buttonPad.sk.transformSelf.applyGeoms(this.buttonPad.outline),
      ...this.trigger.sk.transformSelf.applyGeoms(this.trigger.outline),
      ...this.trigger.grip.sk.transformSelf.applyGeoms(this.gripFull),
      ...this.trigger.batteryBoxHolder.sk.transformSelf.applyGeoms(this.batteryBoxHolderFull),
    ];
  }

  @cacheGetter
  private get transforms() {
    return {
      batteryBoxHolderToGrip: Transform3D.join(
        this.trigger.batteryBoxHolder.sk.transformSelf,
        this.trigger.grip.sk.transformSelf.reversed(),
      ),
      gripToBatteryBoxHolder: Transform3D.join(
        this.trigger.grip.sk.transformSelf,
        this.trigger.batteryBoxHolder.sk.transformSelf.reversed(),
      ),
    } as const;
  }

  public get gripHalf(): Geom3[] {
    return [
      subtract(
        union(this.trigger.grip.half),
        this.trigger.grip.jointSubtructionHalf,
        this.transforms.batteryBoxHolderToGrip.applyGeoms(this.trigger.batteryBoxHolder.looseOutlineHalfBase),
      ),
    ];
  }

  public get printGrip(): Geom3[] {
    // expandで縮める都合の付け足し
    const addingForExpaned = rectangle({size: [Skeleton.Grip.z.total, 10], center: [Skeleton.Grip.z.total / 2, 0]});
    const glueOutline = union([...this.trigger.grip.endOutlineHalf, addingForExpaned]);
    return [
      subtract(
        union(halfToFull(this.trigger.sk.transformSelf.applyGeoms(this.trigger.backHalf))),
        subtract(
          union(
            this.trigger.grip.sk.transformSelf.applyGeoms([
              ...this.transforms.batteryBoxHolderToGrip.applyGeoms(
                halfToFull([expand({delta: 0.4}, union(this.trigger.batteryBoxHolder.looseOutlineHalfBase))]),
              ),
            ]),
          ),
          // 必要以上に削ってしまうのを防ぐ
          cuboid({size: [1, 99, 0.6], center: [0, 0, -0.6 / 2]}),
        ),
      ),
      subtract(
        this.trigger.grip.sk.transformSelf.applyGeom(union(this.gripFull)),
        // グリップ部分に侵入しないように切り取り
        cuboid({size: [99, 99, 99], center: [99 / 2, 0, 0]}),
      ),

      // 折れそうなところを補強
      ...halfToFull([translate([-4, Skeleton.Grip.Board.y.totalHalf + 0.5, -9 - 4], Centered.cuboid([4, 2, 9]))]),

      // 角を急にならないようにする補助部分
      translate(
        [-3, 0, -Skeleton.Trigger.z.back - 1],
        union(
          halfToFull([
            mirrorZ(
              rotateY(
                Math.PI / 2,
                extrudeLinear(
                  {height: 6},
                  subtract(
                    glueOutline,
                    expand({delta: -1}, glueOutline),
                    translateY(-10, Centered.rectangle([99, 10])),
                    translateX(10, Centered.rectangle([99, 99])),
                  ),
                ),
              ),
            ),
          ]),
        ),
      ),
    ];
  }

  public get gripFull(): Geom3[] {
    return [subtract(union(this.trigger.grip.full), ...this.gripSubtractionFull)];
  }

  public get gripEndFull(): Geom3[] {
    return [
      subtract(
        union(halfToFull(this.trigger.grip.end.half)),
        this.gripSubtractionFull,
        this.transforms.batteryBoxHolderToGrip.applyGeom(
          union(
            this.trigger.batteryBoxHolder.screw.squareLooseOutline,
            this.trigger.batteryBoxHolder.screw.squareBridgeSupport,
            this.trigger.batteryBoxHolder.screw.squareHeadLooseOutlineYobi,
          ),
        ),
        this.trigger.grip.innerFull,
      ),
    ];
  }

  public get gripSubtractionFull(): Geom3[] {
    return [
      // ...halfToFull(this.trigger.grip.jointSubtructionHalf),
      ...this.transforms.batteryBoxHolderToGrip.applyGeoms(
        halfToFull([expand({delta: 0.3}, union(this.trigger.batteryBoxHolder.looseOutlineHalfBase))]),
      ),
    ];
  }

  public get batteryBoxHolderSubtractionHalf(): Geom3[] {
    return [
      this.transforms.gripToBatteryBoxHolder.applyGeom(
        expand({delta: 0.3}, subtract(union(this.trigger.grip.makeEndJointOutlineHalf()), this.trigger.grip.innerHalf)),
      ),
    ];
  }

  @cacheGetter
  public get batteryBoxHolderHalf(): Geom3[] {
    return [subtract(this.trigger.batteryBoxHolder.half, this.batteryBoxHolderSubtractionHalf)];
  }

  @cacheGetter
  public get batteryBoxHolderFull(): Geom3[] {
    return [subtract(union(this.trigger.batteryBoxHolder.full))];
  }

  public get batteryBoxHolderForPrint(): Geom3[] {
    const base = translateX(
      -Skeleton.BatteryBoxHolder.z.tailJointAdditional,
      rotateY(-Math.PI / 2, this.batteryBoxHolderFull),
    );
    return [
      union(
        base,
        rotateZ(Math.PI, base),
        cuboid({
          size: [
            Skeleton.BatteryBoxHolder.z.tailJointAdditional * 2,
            Skeleton.BatteryBoxHolder.y.tailJointAdditionalHalf * 2,
            0.2,
          ],
          center: [0, 0, Skeleton.BatteryBoxHolder.x.tailJointAdditionalStart + 0.1],
        }),
      ),
    ];
  }

  public get gripHalfWithBoard(): Geom3[] {
    const board = this.trigger.grip.board;
    return [...this.gripHalf, ...board.sk.transformSelf.applyGeoms(board.full)];
  }

  public get gripFullWithBoard(): Geom3[] {
    const board = this.trigger.grip.board;
    return [...this.gripFull, ...board.sk.transformSelf.applyGeoms(board.full)];
  }

  public get gripHalfWithBatteryBoxAndBoard(): Geom3[] {
    return [
      ...this.gripHalfWithBoard,
      ...this.trigger.grip.end.half,
      ...this.transforms.batteryBoxHolderToGrip.applyGeoms(this.batteryBoxHolderHalf),
    ];
  }

  public get gripFullWithBatteryBoxAndBoard(): Geom3[] {
    return [
      ...this.gripFullWithBoard,
      ...this.transforms.batteryBoxHolderToGrip.applyGeoms(this.trigger.batteryBoxHolder.full),
    ];
  }
}
