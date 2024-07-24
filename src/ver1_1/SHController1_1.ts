import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, halfToFull} from '../utls';
import {ButtonPad1_1} from './ButtonPad1_1';
import {Trigger1_1} from './Trigger1_1';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {Transform3D} from '../utils/Transform';
import {expand} from '@jscad/modeling/src/operations/expansions';
import {mirrorX, rotateY, rotateZ, translateX} from '@jscad/modeling/src/operations/transforms';
import {Skeleton} from './Skeleton';
import {cuboid} from '@jscad/modeling/src/primitives';

export class SHController1_1 extends Cacheable implements Viewable {
  public readonly trigger = new Trigger1_1();
  public readonly buttonPad = new ButtonPad1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'full', model: () => this.full},
      {label: 'gripHalf', model: () => this.gripHalf},
      {label: 'gripFull', model: () => this.gripFull},
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
    return [{label: 'BatteryBoxHolder1_1', model: () => this.batteryBoxHolderForPrint}];
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

  public get gripFull(): Geom3[] {
    return [subtract(union(this.trigger.grip.full), ...this.gripSubtractionFull)];
  }

  public get gripSubtractionFull(): Geom3[] {
    return [
      // ...halfToFull(this.trigger.grip.jointSubtructionHalf),
      ...this.transforms.batteryBoxHolderToGrip.applyGeoms(
        halfToFull([
          expand(
            {delta: 0.25},
            subtract(
              union(this.trigger.batteryBoxHolder.looseOutlineHalfBase),
              this.transforms.gripToBatteryBoxHolder.applyGeom(union(this.trigger.grip.makeEndJointOutlineHalf())),
            ),
          ),
        ]),
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
    return [...this.gripHalfWithBoard, ...this.transforms.batteryBoxHolderToGrip.applyGeoms(this.batteryBoxHolderHalf)];
  }

  public get gripFullWithBatteryBoxAndBoard(): Geom3[] {
    return [
      ...this.gripFullWithBoard,
      ...this.transforms.batteryBoxHolderToGrip.applyGeoms(this.trigger.batteryBoxHolder.full),
    ];
  }
}
