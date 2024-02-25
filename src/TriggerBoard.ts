import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {TactileSwitch} from './TactileSwitch';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {rotateY, rotateZ, translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {colors} from './common';
import {cuboid} from '@jscad/modeling/src/primitives';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {Screw} from './Screw';

export class TriggerBoard extends Cacheable implements Viewable {
  public readonly tactileSwitch = new TactileSwitch();

  public readonly width = 22;
  public readonly thickness = 1.5;
  public readonly topSwitchDistance = 7;
  public readonly switchDistanceLeftToRight = 14;
  public readonly switchDistanceTopToBottom = 17;
  public readonly length = this.topSwitchDistance + this.switchDistanceTopToBottom + 5;

  public readonly screwHoleDistance = 10;
  // public readonly screwHoleDistance = this.topSwitchDistance + this.switchDistanceTopToBottom / 2;
  public readonly screw = new Screw(7, 2.5, (g) => this.transformScrew(g));

  public get displayName(): string {
    return 'TriggerBoard';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'half', model: () => this.half},
        {label: 'full', model: () => this.full},
        {label: 'testBoard', model: () => this.testBoard},
      ];
    });
  }

  public get half(): Geom3[] {
    const connectorHeight = 6;
    return [
      addColor(colors.translucentBoard, this.boardHalf),
      this.transformTopSwitch(this.tactileSwitch.outline),
      this.transformBottomSwitch(this.tactileSwitch.outline),
      // connector
      addColor(
        [0.7, 0, 0],
        translate([15, 0, -connectorHeight - this.thickness], Centered.cuboid([4.5, 5, connectorHeight])),
      ),
    ];
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }

  public get looseOutlineHalf(): Geom3[] {
    return [
      addColor(colors.translucentBoard, this.boardHalf),
      this.transformTopSwitch(this.tactileSwitch.looseOctagonOutline),
      this.transformBottomSwitch(this.tactileSwitch.looseOctagonOutline),
    ];
  }

  public get boardHalf(): Geom3 {
    return subtract(
      translateZ(-this.thickness, Centered.cuboid([this.length, this.width / 2, this.thickness])),
      this.screw.looseOutline,
      this.transformTopSwitch(this.tactileSwitch.legHole),
      this.transformBottomSwitch(this.tactileSwitch.legHole),
    );
  }

  public transformTopSwitch(g: Geom3): Geom3 {
    return translate([this.topSwitchDistance, this.switchDistanceLeftToRight / 2, 0], g);
  }

  public transformBottomSwitch(g: Geom3): Geom3 {
    return translate([this.topSwitchDistance + this.switchDistanceTopToBottom, 0, 0], rotateZ(Math.PI / 2, g));
  }

  private transformScrew(g: Geom3): Geom3 {
    return translate([this.screwHoleDistance, 0, 0], g);
  }

  public get testBoard(): Geom3[] {
    const hagasuTokkakari = cuboid({size: [10, 1, 0.8], center: [this.length / 2, this.width / 2 - 0.5, -0.4]});
    const half = subtract(this.boardHalf, hagasuTokkakari);
    return [addColor([0, 0.6, 0], union(halfToFull([half])))];
  }
}
