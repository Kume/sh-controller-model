import type {Geom3} from '@jscad/modeling/src/geometries/types';
import {booleans, geometries, primitives, transforms} from '@jscad/modeling';
import {Centered, degreeToRadian} from './utls';
import {Geom2} from '@jscad/modeling/src/geometries/geom2';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';

const {cuboid, sphere, line, arc} = primitives;
const {translateZ, translateX, translateY, translate, rotateX, rotateY, mirror} = transforms;
const {union, subtract} = booleans;
const {path2, geom2} = geometries;

const outlineLimitThickness = 50;
const solidThickness = 25;

interface Wall {
  readonly soldFaceHalf: Geom2;
  readonly soldWallHalf: Geom3;
  readonly limit: Geom3;
}

interface TriggerFace {
  readonly solidHalf: Geom3;
  readonly solidGeom2Half?: Geom2;
  readonly outlineLimitHalf: Geom3;
}

export class Trigger {
  public readonly width = 42;
  public readonly length = 50;
  public readonly buttonFace = new ButtonFace(this.width);
  public readonly underFace = new UnderFace(this.width);
  public readonly topFace = new TopFace(this.width, this.length);
  // public readonly length = 55;
  public readonly backHeight = 10;

  public readonly buttonFaceDegree = 34;

  public get half(): Geom3 {
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

  private get faces() {
    return [
      {face: this.buttonFace, transform: (g: Geom3) => this.transformForButtonFace(g)},
      {face: this.underFace, transform: (g: Geom3) => this.transformForUnderFace(g)},
      {face: this.topFace, transform: (g: Geom3) => g},
    ] as const;
  }

  public get solidHalf(): Geom3 {
    const {faces} = this;
    return union(
      ...faces.map(({face, transform}, index) =>
        subtract(
          transform(face.solidHalf),
          ...faces.filter((_, i) => i !== index).map((i) => i.transform(i.face.outlineLimitHalf)),
        ),
      ),
    );
  }

  public get devSold(): Geom3 {
    const underCutArea = translate([0, this.width / 4, 15 + 28], cuboid({size: [100, this.width / 2, 30]}));
    const half = subtract(this.solidHalf, this.devJointHalf, underCutArea);

    return union(half, mirror({normal: [0, 1, 0]}, half));
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

  public get outlineLimitHalf(): Geom3 {
    return translateZ(-outlineLimitThickness, Centered.cuboid([this.length, this.width / 2, outlineLimitThickness]));
  }
}

/**
 * ボタンを配置する面
 */
class ButtonFace implements TriggerFace {
  public constructor(public readonly width: number) {}
  public get solidHalf(): Geom3 {
    return extrudeLinear({height: 50}, this.solidGeom2Half);
  }

  public get solidGeom2Half(): Geom2 {
    return this.makeGeom2Half(0);
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

  public get outlineLimitHalf(): Geom3 {
    const outlineLimitBase = translateX(
      -outlineLimitThickness / 2,
      Centered.cuboid([outlineLimitThickness, this.width / 2, 50]),
    );
    return subtract(outlineLimitBase, this.solidHalf);
  }
}

/**
 * 下の方の面
 */
class UnderFace implements TriggerFace {
  public constructor(public readonly width: number) {}
  public get solidHalf(): Geom3 {
    return extrudeLinear({height: 50}, this.solidGeom2Half);
  }

  public get solidGeom2Half(): Geom2 {
    return this.makeGeom2Half(this.width);
  }

  public makeGeom2Half(offset: number): Geom2 {
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

  public get outlineLimitHalf(): Geom3 {
    const limitLength = 60;
    const limitOffset = -10;
    const outlineLimitBase = translate(
      [-outlineLimitThickness / 2, 0, limitOffset],
      Centered.cuboid([outlineLimitThickness, this.width / 2, limitLength]),
    );
    return subtract(
      outlineLimitBase,
      translateZ(limitOffset, extrudeLinear({height: limitLength}, this.solidGeom2Half)),
    );
  }
}
