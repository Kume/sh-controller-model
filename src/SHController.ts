import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Grip} from './Grip';
import {ButtonPad} from './ButtonPad';
import {Trigger} from './Trigger';
import {mirrorZ, rotateY, rotateZ, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {degToRad} from '@jscad/modeling/src/utils';
import {Cacheable, cashGetter, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';

export class SHController extends Cacheable implements Viewable {
  public readonly grip = new Grip();
  public readonly buttonPad = new ButtonPad();
  public readonly trigger = new Trigger();

  public get displayName(): string {
    return 'SHController';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'gripAndTriggerHalf', model: () => this.gripAndTriggerHalf},
        {label: 'positionReferences', model: () => this.positionReferences},
      ];
    });
  }

  public get outline(): Geom3[] {
    return [
      this.transformGrip(this.grip.outline),
      ...this.buttonPad.outline.map(this.buttonPad.transformSelf).map(this.transformButtonPad),
      this.trigger.outline,
    ];
  }

  public get positionReferences(): Geom3[] {
    return [
      this.transformGrip(this.grip.outline),
      ...this.buttonPad.positionReferences.map(this.buttonPad.transformSelf).map(this.transformButtonPad),
      this.trigger.outline,
    ];
  }

  public get gripAndTriggerHalf(): Geom3[] {
    return [...this.grip.halfWithBatteryBox.map(this.transformGrip), this.trigger.half];
  }

  private transformGrip = (grip: Geom3): Geom3 => {
    grip = translate([this.grip.height, 0, -this.grip.length], grip);
    grip = rotateY(degToRad(90 + this.grip.mainRotateDegree), grip);
    grip = translate([0, 0, this.trigger.backHeight], grip);
    return grip;
  };

  private transformButtonPad = (pad: Geom3): Geom3 => {
    pad = mirrorZ(pad);
    // pad = rotateZ(-degToRad(90 - 20), pad);
    // pad = translate([16, 40, 0], pad);
    return pad;
  };
}
