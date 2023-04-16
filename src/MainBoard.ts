import {Geom3} from '@jscad/modeling/src/geometries/types';
import {booleans, primitives, transforms} from '@jscad/modeling';
import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {cylinder} from '@jscad/modeling/src/primitives';
import {mirrorZ} from '@jscad/modeling/src/operations/transforms';

const {cuboid, sphere} = primitives;
const {translateZ, translateX, translateY, translate} = transforms;
const {union, subtract} = booleans;

export class MainBoard extends Cacheable implements Viewable {
  public readonly xiao = new XiaoBoard();
  public readonly baseWidth = 22;
  public readonly baseHeight = 60;
  public readonly baseThickness = 1.5;

  public readonly legBottomHeight = 2;
  public readonly screwHoleDistance = 35;

  public get displayName(): string {
    return 'MainBoard';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'baseHalf', model: () => this.baseHalf},
        {label: 'half', model: () => this.half},
        {label: 'full', model: () => this.full},
      ];
    });
  }

  public get maxZ(): number {
    return this.xiao.height;
  }

  public get height(): number {
    return this.xiao.height + this.baseThickness + this.legBottomHeight;
  }

  public get baseHalf(): Geom3 {
    return addColor(
      [0, 0.6, 0, 0.9],
      subtract(
        Centered.cuboid([this.baseHeight, this.baseWidth / 2, this.baseThickness]),
        cylinder({
          radius: 1.7,
          height: this.baseThickness,
          center: [this.screwHoleDistance, 0, this.baseThickness / 2],
        }),
      ),
    );
  }

  private get legBottomHalf(): Geom3 {
    return addColor(
      [0.8, 0.8, 0.8],
      Centered.cuboid([this.xiao.boardHeight, this.xiao.legThickness, this.legBottomHeight]),
    );
  }

  public get half(): Geom3[] {
    return [
      this.baseHalf,
      ...this.xiao.half.map((g) => translateZ(-this.xiao.legLength, g)),
      translate([0, this.xiao.legDistanceFromCenter, this.baseThickness], this.legBottomHalf),
    ].map((g) => mirrorZ(g));
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }
}

class XiaoBoard {
  public readonly boardWidth = 17.5;
  public readonly boardHeight = 20.5;
  public readonly boardThickness = 1;

  public readonly usbLength = 7;
  public readonly usbHeight = 3;
  public readonly usbWidth = 8.6;
  public readonly usbProtrusion = 1.2;

  public readonly mainChipWidth = 12;
  public readonly mainChipHeight = 10.5;
  public readonly mainChipThickness = 1.5;
  public readonly mainChipDistanceFromBoardEnd = 7;

  public readonly legLength = 10.7;
  public readonly legThickness = 2;

  public get height(): number {
    return this.legLength + this.usbHeight + this.boardThickness;
  }

  public get legDistanceFromCenter(): number {
    return this.boardWidth / 2 - this.legThickness;
  }

  // 10.7 足の長さ

  public get baseHalf(): Geom3 {
    return addColor(
      [0.3, 0.3, 0.3],
      translateZ(-this.boardThickness, Centered.cuboid([this.boardHeight, this.boardWidth / 2, this.boardThickness])),
    );
  }

  public get usbHalf(): Geom3 {
    return addColor(
      [0.7, 0.7, 0.7],
      translateZ(
        -this.usbHeight - this.boardThickness,
        Centered.cuboid([this.usbLength, this.usbWidth / 2, this.usbHeight]),
      ),
    );
  }

  public get mainChipHalf(): Geom3 {
    return addColor(
      [0.9, 0.9, 0.9],
      translateZ(
        -this.mainChipThickness - this.boardThickness,
        Centered.cuboid([this.mainChipHeight, this.mainChipWidth / 2, this.mainChipThickness]),
      ),
    );
  }

  public get legHalf(): Geom3 {
    return addColor([0.1, 0.1, 0.1], Centered.cuboid([this.boardHeight, this.legThickness, this.legLength]));
  }

  public get half(): Geom3[] {
    return [
      this.baseHalf,
      translateX(-this.usbProtrusion, this.usbHalf),
      translateX(this.mainChipDistanceFromBoardEnd, this.mainChipHalf),
      translateY(this.legDistanceFromCenter, this.legHalf),
    ];
  }
}
