import {addColor, Cacheable, Centered, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {TactileSwitch} from './TactileSwitch';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {rotateY, rotateZ, translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {colors} from './common';
import {cuboid} from '@jscad/modeling/src/primitives';

export class TriggerBoard extends Cacheable implements Viewable {
  private readonly tactileSwitch = new TactileSwitch();

  private readonly width = 22;
  private readonly thickness = 1.5;
  private readonly topSwitchDistance = 7;
  private readonly switchDistanceLeftToRight = 14;
  private readonly switchDistanceTopToBottom = 17;
  private readonly length = this.topSwitchDistance + this.switchDistanceTopToBottom + 5;

  public get displayName(): string {
    return 'TriggerBoard';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'half', model: () => this.half},
        // {label: 'outlineHalf', model: () => this.outlineHalf},
        // {label: 'testBoard', model: () => this.testBoard},
      ];
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
    return translateZ(-this.thickness, Centered.cuboid([this.length, this.width / 2, this.thickness]));
  }

  private transformTopSwitch(g: Geom3): Geom3 {
    return translate([this.topSwitchDistance, this.switchDistanceLeftToRight / 2, 0], g);
  }

  private transformBottomSwitch(g: Geom3): Geom3 {
    return translate([this.topSwitchDistance + this.switchDistanceTopToBottom, 0, 0], rotateZ(Math.PI / 2, g));
  }
}
