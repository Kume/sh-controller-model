import type {Geom3} from '@jscad/modeling/src/geometries/types';
import {booleans, expansions, geometries, primitives, transforms} from '@jscad/modeling';
import {Centered, degreeToRadian, measureTime} from './utls';
import {Geom2} from '@jscad/modeling/src/geometries/geom2';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {cube, polygon, rectangle} from '@jscad/modeling/src/primitives';
import {TactileSwitch} from './TactileSwitch';
import {mirrorY} from '@jscad/modeling/src/operations/transforms';

const {cuboid, sphere, line, arc} = primitives;
const {translateZ, translateX, translateY, translate, rotateX, rotate, rotateY, mirror} = transforms;
const {union, subtract} = booleans;
const {path2, geom2, geom3} = geometries;
const {offset, expand} = expansions;

const outlineLimitThickness = 50;
const solidThickness = 25;
const collisionAdjustSize = 0.001;

interface Wall {
  readonly soldFaceHalf: Geom2;
  readonly soldWallHalf: Geom3;
  readonly limit: Geom3;
}

interface TriggerFace {
  readonly solidHalf?: Geom3;
  readonly half: Geom3;
  readonly solidGeom2Half?: Geom2;
  readonly outlineLimitHalf: Geom3;
}

export class Trigger {
  public static readonly lengthSize = 50;
  public static readonly width = 50;

  public readonly width = Trigger.width;
  public readonly length = Trigger.lengthSize;
  public readonly buttonFace = new ButtonFace(this.width);
  public readonly underFace = new UnderFace(this.width);
  public readonly topFace = new TopFace(this.width, this.length);
  // public readonly length = 55;
  public readonly backHeight = 15;

  public readonly buttonFaceDegree = 34;

  public get half(): Geom3 {
    const {faces} = this;
    return union(
      ...faces.map(({face, transform}, index) => {
        return subtract(
          transform(face.half),
          ...faces.filter((_, i) => i !== index).map((i) => i.transform(i.face.outlineLimitHalf)),
        );
      }),
    );
    return union(
      // this.transformForButtonFace(Centered.cuboid([1, this.width / 2, 40])),
      // this.outlineLimitOfButtonFace,
      // this.outlineLimitOfUnderFace,
      // this.outlineLimitOfTop,
      // this.underSolidWallHalf,
      // this.solidHalf,
      // this.buttonSolidWallHalf,
      this.devSold,
    );
  }

  private get faces(): {face: TriggerFace; transform: (g: Geom3) => Geom3}[] {
    return [
      {face: this.buttonFace, transform: (g: Geom3) => this.transformForButtonFace(g)},
      {face: this.underFace, transform: (g: Geom3) => this.transformForUnderFace(g)},
      {face: this.topFace, transform: (g: Geom3) => g},
    ];
  }

  public get outline(): Geom3 {
    return union(this.outlineHalf, mirrorY(this.outlineHalf));
  }

  public get outlineHalf(): Geom3 {
    const {faces} = this;
    let result: Geom3 = geom3.create();
    for (const {face, transform} of faces) {
      if (face.solidHalf) {
        result = union(result, transform(face.solidHalf));
      }
    }
    for (const {face, transform} of faces) {
      result = subtract(result, transform(face.outlineLimitHalf));
    }
    result = subtract(
      result,
      translate(
        [50, this.width / 2, 12],
        rotate([0, -Math.PI / 2 - 0.15, 0], extrudeLinear({height: 50}, this.bottomSideCutFace)),
      ),
      this.underCutArea,
    );
    return result;
  }

  private get bottomSideCutFace(): Geom2 {
    const width = 5;
    const height = 24;
    let path = path2.create([
      [0, 0],
      [height, -10],
      [height, width],
      [0, width],
    ]);
    return geom2.fromPoints(path2.toPoints(path));
  }

  public get devSold(): Geom3 {
    const half = subtract(this.outlineHalf, this.devJointHalf, this.underCutArea);

    return union(half, mirror({normal: [0, 1, 0]}, half));
  }

  public get underCutArea(): Geom3 {
    return translate([0, this.width / 4, 15 + 31.5], cuboid({size: [100, this.width / 2, 30]}));
  }

  private transformForButtonFace(g: Geom3): Geom3 {
    // return translateX(this.length, rotateY(-degreeToRadian(90 - 56), g));
    return translateX(this.length, rotateY(-degreeToRadian(this.buttonFaceDegree), g));
  }

  private transformForUnderFace(g: Geom3): Geom3 {
    return translateZ(this.backHeight, rotateY(degreeToRadian(56), g));
  }

  public get backWallHalf(): Geom3 {
    return Centered.cuboid([10, this.width / 2, this.backHeight]);
  }

  public get devJointHalf(): Geom3 {
    return Centered.cuboid([20, 5, 8]);
  }
}

class TopFace implements TriggerFace {
  public constructor(public readonly width: number, public readonly length: number) {}
  public get solidHalf(): Geom3 {
    return Centered.cuboid([this.length, this.width / 2, solidThickness]);
  }

  public get half(): Geom3 {
    return cube({size: 0.1});
  }

  public get outlineLimitHalf(): Geom3 {
    return translateZ(
      -outlineLimitThickness,
      Centered.cuboid([this.length, this.width / 2 + collisionAdjustSize, outlineLimitThickness]),
    );
  }
}

/**
 * ボタンを配置する面
 */
class ButtonFace implements TriggerFace {
  private readonly tactileSwitch = new TactileSwitch();

  private readonly frontThickness = this.tactileSwitch.height - 2;

  private readonly topSwitchCenterDistance = 17;
  private readonly switchDistanceLeftToRight = 14;
  private readonly switchDistanceTopToBottom = 17;

  public constructor(public readonly width: number) {}
  public get solidHalf(): Geom3 {
    return extrudeLinear({height: 50}, this.solidGeom2Half);
  }

  public get solidGeom2Half(): Geom2 {
    return this.makeGeom2Half(0);
  }

  public get half(): Geom3 {
    const subtractX = solidThickness - this.frontThickness;
    const wall = extrudeLinear(
      {height: 50},
      subtract(this.solidGeom2Half, translateX(-solidThickness, Centered.rectangle([subtractX, 12]))),
    );
    return subtract(
      wall,
      this.transformTopSwitch(this.tactileSwitch.looseOctagonOutline),
      this.transformBottomSwitch(this.tactileSwitch.looseOctagonOutline),
    );
  }

  private transformTopSwitch(g: Geom3): Geom3 {
    return translate(
      [-this.frontThickness, this.switchDistanceLeftToRight / 2, this.topSwitchCenterDistance],
      rotateY(Math.PI / 2, g),
    );
  }

  private transformBottomSwitch(g: Geom3): Geom3 {
    return translate(
      [-this.frontThickness, 0, this.topSwitchCenterDistance + this.switchDistanceTopToBottom],
      rotateY(Math.PI / 2, g),
    );
  }

  public makeGeom2Half(offset: number): Geom2 {
    const cornerWidth = 10;
    const cornerHeight = 15;
    let path = path2.create([
      [0, 0],
      [0, this.width / 2 - cornerWidth],
    ]);

    path = path2.appendArc({endpoint: [-4, this.width / 2 - cornerWidth + 5], radius: [8, 8]}, path);
    path = path2.appendPoints([[-11, this.width / 2 - cornerWidth + 9]], path);

    path = path2.appendPoints(
      [
        [-cornerHeight, this.width / 2],
        [-solidThickness, this.width / 2],
        [-solidThickness, 0],
      ],
      path,
    );
    return geom2.fromPoints(path2.toPoints(path));
    // return geom2.fromPoints([
    //   [0, 0],
    //   [0, this.width / 2 - cornerWidth],
    //   [-cornerHeight, this.width / 2],
    //   [-solidThickness, this.width / 2],
    //   [-solidThickness, 0],
    // ]);
  }

  @measureTime
  public get outlineLimitHalf(): Geom3 {
    const outlineLimitBase = translateX(
      -outlineLimitThickness / 2,
      Centered.cuboid([outlineLimitThickness, this.width / 2 + collisionAdjustSize, 50]),
    );
    return subtract(outlineLimitBase, this.solidHalf);
  }
}

/**
 * 下の方の面
 */
class UnderFace implements TriggerFace {
  public readonly thickness = 1;

  public constructor(public readonly width: number) {}
  public get solidHalf(): Geom3 {
    return extrudeLinear({height: 50}, this.solidGeom2Half);
  }

  @measureTime
  public get half(): Geom3 {
    return extrudeLinear(
      {height: 50},
      subtract(
        this.solidGeom2Half,
        offset({delta: -1}, this.makeGeom2Half(0)),
        rectangle({
          size: [solidThickness - this.thickness * 2, this.thickness],
          center: [solidThickness / 2, this.thickness / 2],
        }),
        rectangle({
          size: [this.thickness, this.width - this.thickness],
          center: [solidThickness - this.thickness / 2, this.thickness / 2],
        }),
      ),
    );
  }

  public get solidGeom2Half(): Geom2 {
    return this.makeGeom2Half(0);
  }

  public makeGeom2Half(offset_: number): Geom2 {
    const radius = 8;
    let path = path2.create([
      [0, 0],
      [solidThickness, 0],
      [solidThickness, this.width / 2],
      [radius, this.width / 2],
    ]);
    path = path2.appendArc({endpoint: [0, this.width / 2 - radius], radius: [radius, radius]}, path);
    path = path2.appendPoints([[0, this.width / 2 - radius]], path);
    return geom2.fromPoints(path2.toPoints(path));
  }

  @measureTime
  public get outlineLimitHalf(): Geom3 {
    const limitLength = 60;
    const limitOffset = -10;
    const outlineLimitBase = translate(
      [-outlineLimitThickness / 2, 0, limitOffset],
      Centered.cuboid([outlineLimitThickness, this.width / 2 + collisionAdjustSize, limitLength]),
    );
    return subtract(
      outlineLimitBase,
      translateZ(limitOffset, extrudeLinear({height: limitLength}, this.solidGeom2Half)),
    );
  }
}
