import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Cacheable, cashGetter, Centered} from './utls';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {TactileSwitch} from './TactileSwitch';
import {
  mirrorX,
  rotateZ,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {cylinder} from '@jscad/modeling/src/primitives';

export class ButtonBoard extends Cacheable {
  public readonly width = 20;
  public readonly buttonYDistance = 14;
  public readonly buttonXDistance = 13;
  public readonly buttonXDistance2 = 9;
  public readonly buttonXDistanceFromEdge = 4;
  public readonly screwHoleDistance = 20;
  public readonly length = 50;
  public readonly thickness = 1.5;

  public get outline(): Geom3 {
    return union(this.outlineHalf, mirrorX(this.outlineHalf));
  }

  public get outlineHalf(): Geom3 {
    return union(this.boardHalf, ...this.switchesHalf.map((sw) => sw.outline));
  }

  public get screwHole(): Geom3 {
    return translateX(
      this.screwHoleDistance,
      cylinder({height: this.thickness, radius: 1.6, center: [0, 0, -this.thickness / 2]}),
    );
  }

  @cashGetter
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
}
