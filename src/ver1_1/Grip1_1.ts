import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {addColor, Cacheable, cacheGetter, Centered, chamfer, halfToFull} from '../utls';
import {Skeleton} from './Skeleton';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {
  mirrorX,
  mirrorY,
  rotateX,
  rotateY,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {circle, polygon} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {MainBoard1_1} from './MainBoard1_1';

export class Grip1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Grip;
  public readonly board = new MainBoard1_1();
  public readonly end = new GripEnd1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'half', model: () => this.half},
      {label: 'halfWithEnd', model: () => [...this.half, ...this.end.half]},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get full(): Geom3[] {
    return [subtract(union(halfToFull(this.half)), this.innerFull)];
  }

  public get innerFull(): Geom3[] {
    return [
      mirrorY(
        translate(
          [
            this.sk.x.resetSwitchHole.valueAt('start'),
            this.sk.y.resetSwitchHole.valueAt('start'),
            this.sk.End_Old1.x.topToBottom.totalFromTo('topWallEnd', 'bottom'),
          ],
          Centered.cuboid([
            this.sk.x.resetSwitchHole.totalFromTo('start', 'end'),
            this.sk.y.resetSwitchHole.totalFromTo('start', 'end'),
            // this.sk.End_Old1.x.topToBottom.valueAt('topWallEnd'),
            99,
          ]),
        ),
      ),
      translate(
        [
          this.sk.x.ledHole.valueAt('start'),
          this.sk.y.ledHole.valueAt('start'),
          this.sk.End_Old1.x.topToBottom.totalFromTo('topWallEnd', 'bottom') + this.sk.z.ledHold,
        ],
        Centered.cuboid([
          this.sk.x.ledHole.totalFromTo('start', 'end'),
          this.sk.y.ledHole.totalFromTo('start', 'end'),
          99,
        ]),
      ),
    ];
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [subtract(union(this.outlineHalf), this.innerHalf, this.end.subtractionForGripHalf)];
  }

  @cacheGetter
  public get outline(): Geom3[] {
    return [...halfToFull(this.outlineHalf)];
  }

  @cacheGetter
  public get outlineHalf(): Geom3[] {
    return [
      ...this.sk.End_Old1.transformSelf.applyGeoms([
        translateZ(
          this.sk.x.endThickness,
          extrudeLinear({height: this.sk.x.total - this.sk.x.endThickness}, [...this.endOutlineHalf]),
        ),
      ]),
      ...this.makeEndJointOutlineHalf(),
      // translate([0, 0, this.sk.z.total], Centered.cuboid([this.sk.x.topWall + 4, this.sk.y.totalHalf, 3])),
    ];
  }

  public makeEndJointOutlineHalf(): Geom3[] {
    return [
      translate(
        [this.sk.x.topWall + 1, 0, this.sk.z.total],
        subtract(
          // this.sk.z.endJoint の高さに盛り上げる
          this.geom3FromSidePlane(
            polygon({
              points: [
                [-this.sk.x.endJointTotal, 0],
                [0, 0],
                [-this.sk.x.endJointTotal + this.sk.x.endJointThickness + 0.5, this.sk.z.endJoint + 0.1],
                [-this.sk.x.endJointTotal, this.sk.z.endJoint + 0.1],
              ],
            }),
            this.sk.y.totalHalf,
          ),
        ),
      ),
    ];
  }

  @cacheGetter
  public get jointSubtructionHalf(): Geom3[] {
    return [
      // translateZ(this.sk.z.total, Centered.cuboid([this.sk.x.resetSwitchHole.valueAt('end'), this.sk.y.totalHalf, 99])),
    ];
  }

  @cacheGetter
  public get innerHalf(): Geom3[] {
    const maxY = Skeleton.BatteryBoxHolder.BatteryBox.y.total / 2 + 0.4;
    return [
      translateX(
        this.sk.x.endThickness,
        this.sk.End_Old1.transformSelf.applyGeom(
          extrudeLinear({height: this.sk.x.total}, [
            // 基板全体が入るようにする空間
            translateX(
              this.sk.End_Old1.x.topToBottom.totalFromTo('boardEnd', 'bottom'),
              Centered.rectangle([
                this.sk.End_Old1.x.topToBottom.totalFromTo('topWallEnd', 'boardEnd'),
                this.sk.Board.y.totalHalf + 0.5,
              ]),
            ),
            // 電池ボックスと干渉しないようにするための空間
            translateX(
              this.sk.End_Old1.x.topToBottom.totalFromTo('boardEnd', 'bottom') + 4,
              Centered.rectangle([this.sk.End_Old1.x.topToBottom.totalFromTo('topWallEnd', 'boardEnd') - 4, maxY]),
            ),
            // 基板の足が入るようにするスペース
            translateX(
              this.sk.End_Old1.x.topToBottom.totalFromTo('bottomWallStart', 'bottom'),
              Centered.rectangle([
                this.sk.End_Old1.x.topToBottom.totalFromTo('topWallEnd', 'bottomWallStart'),
                this.sk.Board.y.totalHalf - 2,
              ]),
            ),
            // GripEndのTapWallを差し込めるようにするスペース
            translateX(
              this.sk.End.z.bottomToTop.valueAt('ledWallBottom'),
              Centered.rectangle([this.sk.End.z.bottomToTop.totalFromTo('ledWallBottom', 'ledWallTop') + 0.2, 7]),
            ),
          ]),
        ),
      ),

      // ブリッジの長さを小さくできるようにナナメに切り取る
      translate(
        [this.sk.x.topWall + 1, 0, this.sk.z.total - 10],
        extrudeLinear(
          {height: 99},
          polygon({
            points: [
              [99, 0],
              [99, Skeleton.BatteryBoxHolder.BatteryBox.y.total / 2 + 0.4],
              [0, Skeleton.BatteryBoxHolder.BatteryBox.y.total / 2 + 0.4],
              [-this.sk.x.endJointTotal + this.sk.x.endJointThickness + 0.4, 7],
              [-this.sk.x.endJointTotal + this.sk.x.endJointThickness + 0.4, 0],
            ],
          }),
        ),
      ),
    ];
  }

  @cacheGetter
  public get endOutlineHalf(): readonly Geom2[] {
    const sk = this.sk.End_Old1;
    return [
      union([
        Centered.rectangle([sk.x.total, sk.y.totalHalf - sk.other.radius]),
        translateX(sk.other.radius, Centered.rectangle([sk.x.total - sk.other.radius, sk.y.totalHalf])),
        circle({radius: sk.other.radius, center: [sk.other.radius, sk.y.totalHalf - sk.other.radius]}),
      ]),
    ];
  }

  private geom3FromSidePlane(geom: Geom2, width: number, offset?: number): Geom3 {
    const result = mirrorY(rotateX(Math.PI / 2, extrudeLinear({height: width}, geom)));
    return offset != null ? translateY(offset, result) : result;
  }
}

export class GripEnd1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Grip.End;
  public readonly board = new MainBoard1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'half', model: () => this.half},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get half(): Geom3[] {
    return [addColor([0.5, 0.5, 0.8], subtract(this.outlineHalf, this.innerHalf))];
  }

  public get outlineHalf(): Geom3[] {
    return [
      subtract(
        union(
          this.endPlaneToGeom3(this.endOutlineHalf, this.sk.x.base),
          translate(
            [0, 0, this.sk.z.bottomToTop.valueAt('ledWallBottom')],
            Centered.cuboid([10, 7 - 0.3, this.sk.z.ledWallThickness]),
          ),
        ),
        // mirrorX(rotateY(-Math.PI / 2, chamfer(this.endOutlineHalf, 1))),
      ),
    ];
  }

  public endPlaneToGeom3(geom: Geom2, height: number): Geom3 {
    return mirrorX(rotateY(-Math.PI / 2, extrudeLinear({height}, geom)));
  }

  @cacheGetter
  public get innerHalf(): Geom3[] {
    const offset = 0.2;
    return [
      translate(
        [this.sk.x.thickness, 0, 0],
        mirrorX(rotateY(-Math.PI / 2, extrudeLinear({height: 99}, this.makeInnerEndFaceHalf(offset)))),
      ),

      // USBの穴
      translateZ(
        this.sk.z.bottomToTopForHoles.valueAt('usbHoleStart'),
        Centered.cuboid([
          this.sk.x.thickness,
          this.sk.y.usbHoleHalf,
          this.sk.z.bottomToTopForHoles.totalFromTo('usbHoleStart', 'usbHoleEnd'),
        ]),
      ),

      // 電源スイッチの穴
      translateZ(
        this.sk.z.bottomToTopForHoles.valueAt('switchHoleStart'),
        Centered.cuboid([
          this.sk.x.thickness,
          this.sk.y.switchHoleHalf,
          this.sk.z.bottomToTopForHoles.totalFromTo('switchHoleStart', 'switchHoleEnd'),
        ]),
      ),
    ];
  }

  public get subtractionForGripHalf(): Geom3[] {
    return [
      this.endPlaneToGeom3(
        subtract(
          Centered.rectangle([this.sk.z.bottomToTop.totalValue + 0.2, this.sk.y.totalHalf + 0.000001]),
          this.makeInnerEndFaceHalf(),
        ),
        this.sk.x.base,
      ),
    ];
  }

  public makeInnerEndFaceHalf(offset = 0): Geom2 {
    const radius = Skeleton.Grip.other.radius + offset;
    return translateX(
      -offset,
      intersect(
        union([
          translateX(
            radius,
            Centered.rectangle([
              this.sk.z.bottomToTop.totalFromTo('gripEndBottomStart', 'ledWallBottom') - radius + offset * 2,
              this.sk.y.totalHalf + offset,
            ]),
          ),
          Centered.rectangle([
            this.sk.z.bottomToTop.totalFromTo('gripEndBottomStart', 'ledWallBottom') + offset * 2,
            this.sk.y.totalHalf - radius,
          ]),
          circle({
            radius: radius,
            center: [radius, this.sk.y.totalHalf - radius - offset],
          }),
        ]),
        Centered.rectangle([
          this.sk.z.bottomToTop.totalFromTo('gripEndBottomStart', 'ledWallBottom') + offset * 2,
          this.sk.y.totalHalf - this.sk.y.sideThickness + offset,
        ]),
      ),
    );
  }

  @cacheGetter
  public get endOutlineHalf(): Geom2 {
    const sk = this.sk;
    return translateX(
      -this.sk.z.bottomThickness,
      union([
        Centered.rectangle([sk.z.total, sk.y.totalHalf - sk.other.radius]),
        translateX(sk.other.radius, Centered.rectangle([sk.z.total - sk.other.radius, sk.y.totalHalf])),
        circle({radius: sk.other.radius, center: [sk.other.radius, sk.y.totalHalf - sk.other.radius]}),
      ]),
    );
  }
}
