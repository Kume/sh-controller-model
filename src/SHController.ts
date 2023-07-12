import {Geom3} from '@jscad/modeling/src/geometries/types';
import {ButtonPad} from './ButtonPad';
import {Trigger} from './Trigger';
import {mirrorX, mirrorY, mirrorZ, rotateY, translate, translateX} from '@jscad/modeling/src/operations/transforms';
import {degToRad} from '@jscad/modeling/src/utils';
import {Cacheable, halfToFull, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {ButtonPadJoint} from './ButtonPadJoint';

export class SHController extends Cacheable implements Viewable {
  public readonly buttonPadJoint = new ButtonPadJoint();
  public readonly buttonPad = new ButtonPad(this.buttonPadJoint);
  public readonly trigger = new Trigger(this.buttonPadJoint, this.buttonPad.jointRotationRad);

  public get displayName(): string {
    return 'SHController';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'full', model: () => this.full},
        {label: 'gripAndTriggerHalf', model: () => this.gripAndTriggerHalf},
        {label: 'gripAndTriggerHalfAndPad', model: () => this.gripAndTriggerHalfAndPad},
        {label: 'positionReferences', model: () => this.positionReferences},
      ];
    });
  }

  public get printItems(): ViewerItem[] {
    return [
      {label: 'triggerAndGrip', model: () => this.trigger.fullWithGrip},
      {label: 'triggerJoint', model: () => halfToFull(this.trigger.buttonFace.jointHalf)},
      {label: 'batteryHolder', model: () => this.trigger.grip.batteryBoxHolder.full},
      {label: 'joint', model: () => this.buttonPadJoint.outline},
      {label: 'buttonPad', model: () => this.buttonPad.full},
      {label: 'buttonPadCover', model: () => this.buttonPad.coverFull},
      {label: 'buttonPadBoard', model: () => this.buttonPad.board.testBoard},
      {label: 'triggerBoard', model: () => this.trigger.board.testBoard},
      {label: 'mainBoard', model: () => this.trigger.grip.board.testBoard},
      {label: 'buttonPadBoard_outline', model: () => this.buttonPad.board.outline},
      {label: 'triggerBoard_outline', model: () => this.trigger.board.full},
      {label: 'mainBoard_outline', model: () => this.trigger.grip.board.full},
    ];
  }

  public get full(): Geom3[] {
    return [
      ...this.buttonPad.fullWithCover.map(this.buttonPad.transformSelf).map(this.transformButtonPad),
      ...this.trigger.fullWithGrip,
      ...this.trigger.grip.batteryBoxHolder.full
        .map(this.trigger.grip.transformBatteryBoxHolder)
        .map(this.transformGrip),
    ];
  }

  public get outline(): Geom3[] {
    return [
      this.transformGrip(this.trigger.grip.outline),
      ...this.buttonPad.fullWithCover.map(this.buttonPad.transformSelf).map(this.transformButtonPad),
      ...halfToFull(this.trigger.outlineHalf2),
    ];
  }

  public get positionReferences(): Geom3[] {
    return [
      ...this.buttonPad.positionReferences.map(this.buttonPad.transformSelf).map(this.transformButtonPad),
      ...this.trigger.fullWithGrip,
      ...this.trigger.boardOutline,
      ...halfToFull(this.trigger.buttonFace.jointHalf),
    ];
  }

  public get gripAndTriggerHalf(): Geom3[] {
    return [
      ...this.trigger.grip.halfWithBatteryBox.map(this.transformGrip),
      ...this.trigger.half2,
      ...this.buttonPadJoint.outline.map(this.transformButtonPadJoint),
    ];
  }

  public get gripAndTriggerHalfAndPad(): Geom3[] {
    return [
      ...this.trigger.grip.halfWithBatteryBox.map(this.transformGrip),
      ...this.trigger.half2WithBoard,
      ...this.buttonPadJoint.outline.map(this.transformButtonPadJoint),
      mirrorY(this.buttonPad.fullWithCoverAndBoard.map(this.buttonPad.transformSelf).map(this.transformButtonPad)),
    ];
  }

  private transformGrip = (grip: Geom3): Geom3 => {
    grip = translate([this.trigger.grip.height, 0, -this.trigger.grip.length], grip);
    grip = rotateY(degToRad(90 + this.trigger.grip.mainRotateDegree), grip);
    grip = translate([0, 0, this.trigger.backHeight], grip);
    return grip;
  };

  private transformButtonPad = (pad: Geom3): Geom3 => {
    return mirrorZ(pad);
  };

  private transformButtonPadJoint = (joint: Geom3): Geom3 => {
    return translateX(this.buttonPad.wallThickness, mirrorZ(joint));
  };
}
