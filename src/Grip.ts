import {booleans, expansions, extrusions, primitives, transforms} from '@jscad/modeling';
import {Geom2, Geom3, Geometry} from '@jscad/modeling/src/geometries/types';
import {MainBoard} from './MainBoard';
import {Centered, octagon} from './utls';
import {translateZ} from '@jscad/modeling/src/operations/transforms';
import {BatteryBoxHolder} from './BatteryBoxHolder';

const {rectangle, circle, sphere, polygon} = primitives;
const {translateX, translate, rotate, mirrorZ, rotateY, rotateZ, rotateX} = transforms;
const {expand} = expansions;
const {union, subtract} = booleans;
const {extrudeLinear} = extrusions;

const collisionAdjustSize = 0.00001;

// グリップの傾き 21.6度
// 電池ボックスの傾き 10度

export class Grip {
  public readonly board = new MainBoard();
  public readonly batteryBoxHolder = new BatteryBoxHolder();
  private readonly topWallThickness = 1;
  private readonly mainBoardTopMargin = 0.5;
  private readonly mainBoardBottomMargin = 0.5;
  private readonly thickness = 1;
  private readonly height =
    this.topWallThickness + this.board.height + this.mainBoardTopMargin + this.mainBoardBottomMargin + this.thickness;
  private readonly width = 30;
  private readonly radius = 6;
  private readonly length = 68.5;
  private readonly usbHoleWidth = 4.85 * 2;
  private readonly usbHoleHeight = 4;
  private readonly switchHoleWidth = 6;
  private readonly switchHoleHeight = 4;
  private readonly endThickness = 1.2;
  private readonly switchHoleTopFromUsbHoleBottom = 7.2;
  private readonly topWallLength = 15;

  private readonly batteryBoxRotateDegree = 10;
  private readonly mainRotateDegree = 21.6;

  // TODO sketchupモデルの結果値なので、理想的には完成形から逆算すべき
  private readonly jointEndHeight = 10.75;
  private readonly boardScrewHallDistanceFromEnd = 31.2;

  private get outlineBasicFaceHalf(): Geom2 {
    return this.makeBasicFace(this.height, this.width, this.radius);
  }

  private get outlineBasicInnerFaceHalf(): Geom2 {
    return translateX(
      -this.topWallThickness,
      this.makeBasicFace(
        this.height - this.thickness - this.topWallThickness,
        this.width - this.thickness * 2,
        this.radius - this.thickness,
      ),
    );
  }

  private get endWallHalf(): Geom3 {
    const usbHole = rectangle({
      size: [this.usbHoleHeight, this.usbHoleWidth / 2],
      center: [-this.usbHoleHeight / 2, this.usbHoleWidth / 4],
    });
    const switchHole = rectangle({
      size: [this.switchHoleHeight, this.switchHoleWidth / 2],
      center: [-this.switchHoleHeight / 2, this.switchHoleWidth / 4],
    });
    return extrudeLinear(
      {height: this.endThickness},
      subtract(
        this.outlineBasicFaceHalf,
        translateX(-this.topWallThickness, usbHole),
        translateX(-(this.topWallThickness + this.switchHoleTopFromUsbHoleBottom + this.usbHoleHeight), switchHole),
      ),
    );
  }

  private makeBasicFace(height: number, width: number, radius: number) {
    const widthWithoutRadius = width - radius * 2;
    const widthRect = rectangle({size: [height - radius, width / 2], center: [-(height - radius) / 2, width / 4]});
    const heightRect = rectangle({
      size: [height, widthWithoutRadius / 2],
      center: [-height / 2, widthWithoutRadius / 4],
    });
    const corner = circle({radius: radius, center: [-(height - radius), widthWithoutRadius / 2]});
    return union(widthRect, heightRect, corner);
  }

  public get halfWithBoard() {
    return union(this.half, this.transformMainBoard(this.board.half));
  }

  public get half() {
    console.log(this.height);
    return union(
      subtract(
        union(
          extrudeLinear({height: this.length}, subtract(this.outlineBasicFaceHalf, this.outlineBasicInnerFaceHalf)),
          this.endWallHalf,
          this.boardScrewHole.unionTargetHalf,
        ),
        this.boardScrewHole.subtractTarget,
        this.transformBatteryBoxHolder(expand({delta: 0.2}, this.batteryBoxHolder.outlineHalf)),
        this.topWallSubtractionHalf,
      ),
      // デバッグ時になにか追加したかったらここに追加
    );
  }

  private transformMainBoard<G extends Geometry>(g: G): G {
    const directionAdjusted = rotate([0, -Math.PI / 2, 0], g);
    return translate(
      [-this.board.maxZ - this.topWallThickness - this.mainBoardTopMargin, 0, this.endThickness],
      directionAdjusted,
    );
  }

  private transformBatteryBoxHolder(batteryBoxHolder: Geom3): Geom3 {
    return translate(
      [1.8, 0, 7.6],
      rotate([0, -(this.mainRotateDegree - this.batteryBoxRotateDegree) * (Math.PI / 180), 0], batteryBoxHolder),
    );
  }

  public get outlineHalf() {
    return union(
      extrudeLinear({height: this.length}, this.outlineBasicFaceHalf),
      this.transformBatteryBoxHolder(this.batteryBoxHolder.outlineHalf),
    );
  }

  private get topWallSubtractionHalf(): Geom3 {
    return translate(
      [-(this.topWallThickness * 1.1), 0, this.topWallLength],
      Centered.cuboid([this.topWallThickness * 1.2, this.width / 2 - this.thickness, 30]),
    );
  }

  public readonly boardScrewHole = new BoardScrewHall((g) =>
    translate([-this.height, 0, this.boardScrewHallDistanceFromEnd], g),
  );
}

class BoardScrewHall {
  public readonly height = 8;
  public readonly width = 8;
  public readonly embossmentTotalThickness = 3.4;

  public constructor(public readonly transform: (g: Geom3) => Geom3) {}

  public get mainHall(): Geom3 {
    const height = 10;
    return this.transform(
      translate(
        [-collisionAdjustSize, 0, 0],
        rotateY(Math.PI / 2, extrudeLinear({height: height + collisionAdjustSize}, octagon(1.6))),
      ),
    );
  }

  public get headHall(): Geom3 {
    const height = 2.3;
    return this.transform(
      translate(
        [-collisionAdjustSize, 0, 0],
        rotateY(Math.PI / 2, extrudeLinear({height: height + collisionAdjustSize}, octagon(3.2))),
      ),
    );
  }

  public get subtractTarget(): Geom3 {
    return union(this.mainHall, this.headHall);
  }

  public get half(): Geom3 {
    return this.transform(
      translate(
        [0, 0, -this.height / 2],
        Centered.cuboid([this.embossmentTotalThickness, this.width / 2, this.height]),
      ),
    );
  }

  public get supportSlopeHalf(): Geom3 {
    const face = polygon({
      points: [
        [0, 0],
        [this.embossmentTotalThickness, 0],
        [0, this.embossmentTotalThickness * 1.2],
      ],
    });
    return this.transform(
      translateZ(-this.height / 2, rotateX(-Math.PI / 2, extrudeLinear({height: this.width / 2}, face))),
    );
  }

  public get unionTargetHalf(): Geom3 {
    return union(this.half, this.supportSlopeHalf);
  }
}
