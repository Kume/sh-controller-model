import {addColor, Cacheable, Centered, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {TactileSwitch} from './TactileSwitch';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {rotateY, rotateZ, translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {colors} from './common';
import {cuboid} from '@jscad/modeling/src/primitives';
import {subtract} from '@jscad/modeling/src/operations/booleans';
import {Screw} from './Screw';

export class TriggerBoard extends Cacheable implements Viewable {
  public readonly tactileSwitch = new TactileSwitch();

  public readonly width = 22;
  public readonly thickness = 1.5;
  public readonly topSwitchDistance = 7;
  public readonly switchDistanceLeftToRight = 14;
  public readonly switchDistanceTopToBottom = 17;
  public readonly length = this.topSwitchDistance + this.switchDistanceTopToBottom + 5;

  public readonly screwHoleDistance = this.topSwitchDistance + this.switchDistanceTopToBottom / 2;
  public readonly screw = new Screw(7, 2.5, (g) => this.transformScrew(g));

  public get displayName(): string {
    return 'TriggerBoard';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [{label: 'half', model: () => this.half}];
    });
  }

  public get half(): Geom3[] {
    return [
      addColor(colors.translucentBoard, this.boardHalf),
      this.transformTopSwitch(this.tactileSwitch.outline),
      this.transformBottomSwitch(this.tactileSwitch.outline),
    ];
  }

  public get boardHalf(): Geom3 {
    return subtract(
      translateZ(-this.thickness, Centered.cuboid([this.length, this.width / 2, this.thickness])),
      this.screw.outline,
    );
  }

  private transformTopSwitch(g: Geom3): Geom3 {
    return translate([this.topSwitchDistance, this.switchDistanceLeftToRight / 2, 0], g);
  }

  private transformBottomSwitch(g: Geom3): Geom3 {
    return translate([this.topSwitchDistance + this.switchDistanceTopToBottom, 0, 0], rotateZ(Math.PI / 2, g));
  }

  private transformScrew(g: Geom3): Geom3 {
    return translate([this.screwHoleDistance, 0, 0], g);
  }
}
