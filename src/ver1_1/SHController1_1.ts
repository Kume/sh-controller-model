import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, halfToFull} from '../utls';
import {ButtonPad1_1} from './ButtonPad1_1';
import {Trigger1_1} from './Trigger1_1';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';

export class SHController1_1 extends Cacheable implements Viewable {
  public readonly trigger = new Trigger1_1();
  public readonly buttonPad = new ButtonPad1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'gripHalf', model: () => this.gripHalf},
      {label: 'gripFull', model: () => this.gripFull},
      {label: 'gripHalfWithBoard', model: () => this.gripHalfWithBoard},
      {label: 'gripHalfWithBatteryBoxAndBoard', model: () => this.gripHalfWithBatteryBoxAndBoard},
      {label: 'gripFullWithBatteryBoxAndBoard', model: () => this.gripFullWithBatteryBoxAndBoard},
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

  private transformBatteryBoxHolderToGrip(geoms: Geom3[]): Geom3[] {
    return this.trigger.grip.sk.transformSelf
      .reversed()
      .applyGeoms(this.trigger.batteryBoxHolder.sk.transformSelf.applyGeoms(geoms));
  }

  public get gripHalf(): Geom3[] {
    return [
      subtract(
        union(
          this.trigger.grip.half,
          this.transformBatteryBoxHolderToGrip(this.trigger.batteryBoxHolder.gripSideJointPartHalf),
        ),
        this.trigger.grip.jointSubtructionHalf,
        this.transformBatteryBoxHolderToGrip(this.trigger.batteryBoxHolder.looseOutlineHalf),
      ),
    ];
  }

  public get gripFull(): Geom3[] {
    return [
      subtract(
        union(
          this.trigger.grip.full,
          this.transformBatteryBoxHolderToGrip(halfToFull(this.trigger.batteryBoxHolder.gripSideJointPartHalf)),
        ),
        halfToFull(this.trigger.grip.jointSubtructionHalf),
        this.transformBatteryBoxHolderToGrip(halfToFull(this.trigger.batteryBoxHolder.looseOutlineHalf)),
      ),
    ];
  }

  public get batteryBoxHolderHalf(): Geom3[] {
    return [subtract(this.trigger.batteryBoxHolder.half)];
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
      ...this.trigger.grip.sk.transformSelf
        .reversed()
        .applyGeoms(this.trigger.batteryBoxHolder.sk.transformSelf.applyGeoms(this.batteryBoxHolderHalf)),
    ];
  }

  public get gripFullWithBatteryBoxAndBoard(): Geom3[] {
    return [
      ...this.gripFullWithBoard,
      ...this.trigger.grip.sk.transformSelf
        .reversed()
        .applyGeoms(this.trigger.batteryBoxHolder.sk.transformSelf.applyGeoms(this.trigger.batteryBoxHolder.full)),
    ];
  }
}
