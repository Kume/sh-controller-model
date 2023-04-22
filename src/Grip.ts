import {booleans, expansions, extrusions, primitives, transforms} from '@jscad/modeling';
import {Geom2, Geom3, Geometry} from '@jscad/modeling/src/geometries/types';
import {MainBoard} from './MainBoard';
import {addColor, Cacheable, cashGetter, Centered, legacyCash, octagon} from './utls';
import {mirrorX, mirrorY, translateZ} from '@jscad/modeling/src/operations/transforms';
import {BatteryBoxHolder} from './BatteryBoxHolder';
import {Viewable, ViewerItem} from './types';
import {extrudeRotate} from '@jscad/modeling/src/operations/extrusions';
import {degToRad} from '@jscad/modeling/src/utils';
import {commonSizeValue} from './common';

const {rectangle, circle, sphere, polygon} = primitives;
const {translateX, translate, rotate, mirrorZ, rotateY, rotateZ, rotateX} = transforms;
const {expand} = expansions;
const {union, subtract} = booleans;
const {extrudeLinear} = extrusions;

const collisionAdjustSize = 0.00001;

// グリップの傾き 21.6度
// 電池ボックスの傾き 10度

export class Grip extends Cacheable implements Viewable {
  public readonly board = new MainBoard();
  public readonly topWallThickness = 1;
  public readonly mainBoardTopMargin = 0.5;
  public readonly mainBoardBottomMargin = 0.5;
  public readonly thickness = 1;
  public readonly sideThickness = 2;
  public readonly height =
    this.topWallThickness + this.board.height + this.mainBoardTopMargin + this.mainBoardBottomMargin + this.thickness;
  public readonly width = 30;
  public readonly radius = 6;
  public readonly length = 68.5;
  public readonly usbHoleWidth = 4.85 * 2;
  public readonly usbHoleHeight = 4;
  public readonly switchHoleWidth = 6;
  public readonly switchHoleHeight = 4;
  public readonly endThickness = 1.2;
  public readonly switchHoleTopFromUsbHoleBottom = 7.2;
  public readonly topWallLength = 15;

  public readonly mainRotateDegree = commonSizeValue.gripRotateDegree;

  // TODO sketchupモデルの結果値なので、理想的には完成形から逆算すべき
  public readonly jointEndHeight = 10.75;
  public readonly boardScrewHallDistanceFromEnd = 31.2;

  public readonly batteryBoxHolderMinZ = 14;
  public readonly batteryBoxHolder = new BatteryBoxHolder({
    minXDistanceFromGripBottom: this.height - this.batteryBoxHolderMinZ,
  });

  public constructor() {
    super();
  }

  public get displayName(): string {
    return 'Grip';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'half', model: () => this.half},
        {label: 'halfWithBoard', model: () => this.halfWithBoard},
        {label: 'halfWithBatteryBox', model: () => this.halfWithBatteryBox},
      ];
    });
  }

  public get outlineBasicFaceHalf(): Geom2 {
    return this.makeBasicFace(this.height, this.width, this.radius);
  }

  public get outlineBasicInnerFaceHalf(): Geom2 {
    return translateX(
      -this.topWallThickness,
      this.makeBasicFace(
        this.height - this.thickness - this.topWallThickness,
        this.width - this.sideThickness * 2,
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

  public get halfWithBoard(): Geom3[] {
    return [...this.half, ...this.board.half.map(this.transformMainBoard)];
  }

  public get halfWithBatteryBox(): Geom3[] {
    return [...this.halfWithBoard, ...this.batteryBoxHolder.halfWithBatteryBox.map(this.transformBatteryBoxHolder)];
  }

  public get half(): Geom3[] {
    const baseFace = subtract(this.outlineBasicFaceHalf, this.outlineBasicInnerFaceHalf);
    return [
      subtract(
        union(
          extrudeLinear({height: this.length}, baseFace),
          this.endWallHalf,
          this.boardScrewHole.unionTargetHalf,
          this.makeJointToGrip(baseFace),
        ),
        this.boardScrewHole.subtractTarget,
        this.transformBatteryBoxHolder(this.batteryBoxHolder.extraLooseOutlineHalf),
        this.topWallSubtractionHalf,
      ),
      // デバッグ時になにか追加したかったらここに追加
    ];
  }

  private transformMainBoard = <G extends Geometry>(g: G): G => {
    const directionAdjusted = mirrorX(rotate([0, -Math.PI / 2, 0], g));
    return translate(
      [-this.board.maxZ - this.topWallThickness - this.mainBoardTopMargin, 0, this.endThickness],
      directionAdjusted,
    );
  };

  private transformBatteryBoxHolder = (batteryBoxHolder: Geom3): Geom3 => {
    return translate(
      [
        -this.batteryBoxHolderMinZ,
        0,
        this.length + (this.height - this.batteryBoxHolderMinZ) * Math.sin(degToRad(this.mainRotateDegree)),
      ],
      rotateY(
        degToRad(commonSizeValue.batteryBoxRotateDegree - this.mainRotateDegree),
        translateZ(-this.batteryBoxHolder.baseLength, batteryBoxHolder),
      ),
    );
  };

  public get jointEndHalf(): Geom3 {
    return addColor(
      [0.8, 0, 0],
      subtract(
        translate(
          [-this.height, 0, this.length],
          rotateY(
            -degToRad(this.mainRotateDegree),
            translateX(
              this.height,
              extrudeLinear({height: 0.0001}, subtract(this.outlineBasicFaceHalf, this.outlineBasicInnerFaceHalf)),
            ),
          ),
        ),
        this.transformBatteryBoxHolder(this.batteryBoxHolder.extraLooseOutlineHalf),
      ),
    );
  }

  private makeJointToGrip = (face: Geom2): Geom3 => {
    return translate(
      [-this.height, 0, this.length],
      mirrorY(
        rotate(
          [degToRad(90), 0, 0],
          extrudeRotate({angle: degToRad(this.mainRotateDegree), segments: 90}, translate([this.height, 0], face)),
        ),
      ),
    );
  };

  @cashGetter
  public get outlineHalf() {
    return union(
      extrudeLinear({height: this.length}, this.outlineBasicFaceHalf),
      this.makeJointToGrip(this.outlineBasicFaceHalf),
      this.batteryBoxHolder.outlineHalf.map(this.transformBatteryBoxHolder),
    );
  }

  public get outline(): Geom3 {
    return union(this.outlineHalf, mirrorY(this.outlineHalf));
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

  public get mainHole(): Geom3 {
    const height = 10;
    return this.transform(
      translate(
        [-collisionAdjustSize, 0, 0],
        rotateY(Math.PI / 2, extrudeLinear({height: height + collisionAdjustSize}, octagon(1.6))),
      ),
    );
  }

  public get headHole(): Geom3 {
    const height = 2.3;
    return this.transform(
      translate(
        [-collisionAdjustSize, 0, 0],
        rotateY(Math.PI / 2, extrudeLinear({height: height + collisionAdjustSize}, octagon(3.2))),
      ),
    );
  }

  public get subtractTarget(): Geom3 {
    return union(this.mainHole, this.headHole);
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
