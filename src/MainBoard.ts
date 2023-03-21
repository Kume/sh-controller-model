import {Geom3} from '@jscad/modeling/src/geometries/types';
import {booleans, primitives, transforms} from '@jscad/modeling';
import {Centered} from './utls';

const {cuboid, sphere} = primitives;
const {translateZ, translateX, translateY, translate} = transforms;
const {union} = booleans;

export class MainBoard {
  private readonly xiao = new XiaoBoard();
  private readonly baseWidth = 22;
  private readonly baseHeight = 67.3;
  private readonly baseThickness = 1.5;

  private readonly legBottomHeight = 2;

  public get maxZ(): number {
    return this.xiao.height;
  }

  public get height(): number {
    return this.xiao.height + this.baseThickness + this.legBottomHeight;
  }

  public get baseHalf(): Geom3 {
    return Centered.cuboid([this.baseHeight, this.baseWidth / 2, this.baseThickness]);
  }

  private get legBottomHalf(): Geom3 {
    return Centered.cuboid([this.xiao.boardHeight, this.xiao.legThickness, this.legBottomHeight]);
  }

  public get half(): Geom3 {
    return union(
      this.baseHalf,
      translateZ(-this.xiao.legLength, this.xiao.half),
      translate([0, this.xiao.legDistanceFromCenter, this.baseThickness], this.legBottomHalf),
    );
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
    return translateZ(
      -this.boardThickness,
      Centered.cuboid([this.boardHeight, this.boardWidth / 2, this.boardThickness]),
    );
  }

  public get usbHalf(): Geom3 {
    return translateZ(
      -this.usbHeight - this.boardThickness,
      Centered.cuboid([this.usbLength, this.usbWidth / 2, this.usbHeight]),
    );
  }

  public get mainChipHalf(): Geom3 {
    return translateZ(
      -this.mainChipThickness - this.boardThickness,
      Centered.cuboid([this.mainChipHeight, this.mainChipWidth / 2, this.mainChipThickness]),
    );
  }

  public get legHalf(): Geom3 {
    return Centered.cuboid([this.boardHeight, this.legThickness, this.legLength]);
  }

  public get half(): Geom3 {
    return union(
      this.baseHalf,
      translateX(-this.usbProtrusion, this.usbHalf),
      translateX(this.mainChipDistanceFromBoardEnd, this.mainChipHalf),
      translateY(this.legDistanceFromCenter, this.legHalf),
    );
  }
}
