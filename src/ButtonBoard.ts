import {Geom3} from '@jscad/modeling/src/geometries/types';
import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {TactileSwitch} from './TactileSwitch';
import {mirrorX, mirrorY, rotateZ, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {cuboid, cylinder} from '@jscad/modeling/src/primitives';
import {Viewable, ViewerItem} from './types';

export class ButtonBoard extends Cacheable implements Viewable {
  public readonly chip = new Chip();

  public readonly width = 20;
  public readonly buttonYDistance = 14;
  public readonly buttonXDistance = 13;
  public readonly buttonXDistance2 = 9;
  public readonly buttonXDistanceFromEdge = 6;
  public readonly screwHoleDistance = 20;
  public readonly length = this.buttonXDistanceFromEdge + this.buttonXDistance * 2 + this.buttonXDistance2 + 5;
  public readonly thickness = 1.5;

  public get displayName(): string {
    return 'ButtonBoard';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'outlineHalf', model: () => this.outlineHalf},
        {label: 'testBoard', model: () => this.testBoard},
      ];
    });
  }

  public get outline(): Geom3[] {
    return [...halfToFull(this.outlineHalf), addColor([0, 0, 0], this.transformChip(this.chip.outline))];
  }

  public get outlineHalf(): Geom3[] {
    return [addColor([0, 0.6, 0], this.boardHalf), ...this.switchesHalf.map((sw) => sw.outline)];
  }

  public get looseOutlineHalf(): Geom3[] {
    // TODO ボードのオフセットを考慮
    return [addColor([0, 0.6, 0], this.boardHalf), ...this.switchesHalf.map((sw) => sw.looseOutline)];
  }

  public get screwHole(): Geom3 {
    return translateX(
      this.screwHoleDistance,
      cylinder({height: this.thickness, radius: 1.6, center: [0, 0, -this.thickness / 2]}),
    );
  }

  public get switchesHalf(): readonly TactileSwitch[] {
    const translateY = this.buttonYDistance / 2;
    const xStart = this.buttonXDistanceFromEdge;
    return [
      new TactileSwitch((g) => translate([xStart, translateY, 0], g)),
      new TactileSwitch((g) => translate([xStart + this.buttonXDistance, translateY, 0], g)),
      new TactileSwitch((g) => translate([xStart + this.buttonXDistance * 2, translateY, 0], g)),
      new TactileSwitch((g) =>
        translate([xStart + this.buttonXDistance * 2 + this.buttonXDistance2, 0, 0], rotateZ(Math.PI / 2, g)),
      ),
    ];
  }

  public get boardHalf(): Geom3 {
    const base = translateZ(-this.thickness, Centered.cuboid([this.length, this.width / 2, this.thickness]));

    return subtract(base, this.screwHole, ...this.switchesHalf.map((sw) => sw.legHole));
  }

  private transformChip(chip: Geom3): Geom3 {
    return translate([30, 0, 0], chip);
  }

  public get testBoard(): Geom3[] {
    const hagasuTokkakari = cuboid({size: [10, 1, 0.8], center: [this.length / 2, this.width / 2 - 0.5, -0.4]});
    const half = subtract(this.boardHalf, ...this.switchesHalf.map((s) => s.looseOutline), hagasuTokkakari);
    return [addColor([0, 0.6, 0], union(halfToFull([half])))];
  }
}

class Chip {
  public readonly width = 8;
  public readonly height = 8;
  public readonly thickness = 0.9;

  public get outline(): Geom3 {
    return cuboid({size: [this.height, this.width, this.thickness], center: [0, 0, this.thickness / 2]});
  }
}
