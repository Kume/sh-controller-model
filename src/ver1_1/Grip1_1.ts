import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, Centered, halfToFull} from '../utls';
import {Skeleton} from './Skeleton';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {mirrorY, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {circle} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {MainBoard1_1} from './MainBoard1_1';

export class Grip1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Grip;
  public readonly board = new MainBoard1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'half', model: () => this.half},
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
            this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'bottom'),
          ],
          Centered.cuboid([
            this.sk.x.resetSwitchHole.totalFromTo('start', 'end'),
            this.sk.y.resetSwitchHole.totalFromTo('start', 'end'),
            this.sk.End.x.topToBottom.valueAt('topWallEnd'),
          ]),
        ),
      ),
      translate(
        [
          this.sk.x.ledHole.valueAt('start'),
          this.sk.y.ledHole.valueAt('start'),
          this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'bottom') + this.sk.z.ledHold,
        ],
        Centered.cuboid([
          this.sk.x.ledHole.totalFromTo('start', 'end'),
          this.sk.y.ledHole.totalFromTo('start', 'end'),
          // +2は上のジョイント部分にも穴を開けるため
          this.sk.End.x.topToBottom.valueAt('topWallEnd') + 2,
        ]),
      ),
    ];
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [subtract(union(this.outlineHalf), this.innerHalf)];
  }

  @cacheGetter
  public get outline(): Geom3[] {
    return [...halfToFull(this.outlineHalf)];
  }

  @cacheGetter
  public get outlineHalf(): Geom3[] {
    return [
      ...this.sk.End.transformSelf.applyGeoms([extrudeLinear({height: this.sk.x.total}, [...this.endOutlineHalf])]),
      translate([0, 0, this.sk.z.total], Centered.cuboid([this.sk.x.topWall + 4, this.sk.y.totalHalf, 3])),
    ];
  }

  @cacheGetter
  public get jointSubtructionHalf(): Geom3[] {
    return [
      translateZ(this.sk.z.total, Centered.cuboid([this.sk.x.resetSwitchHole.valueAt('end'), this.sk.y.totalHalf, 99])),
    ];
  }

  @cacheGetter
  public get innerHalf(): Geom3[] {
    const maxY = Skeleton.BatteryBoxHolder.BatteryBox.y.total / 2 + 0.4;
    return [
      translateX(
        this.sk.x.endThickness,
        this.sk.End.transformSelf.applyGeom(
          extrudeLinear({height: this.sk.x.total}, [
            // 基板全体が入るようにする空間
            translateX(
              this.sk.End.x.topToBottom.totalFromTo('boardEnd', 'bottom'),
              Centered.rectangle([
                this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'boardEnd'),
                this.sk.Board.y.totalHalf + 0.5,
              ]),
            ),
            // 電池ボックスと干渉しないようにするための空間
            translateX(
              this.sk.End.x.topToBottom.totalFromTo('boardEnd', 'bottom') + 4,
              Centered.rectangle([this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'boardEnd') - 4, maxY]),
            ),
            // 基板の足が入るようにするスペース
            translateX(
              this.sk.End.x.topToBottom.totalFromTo('bottomWallStart', 'bottom'),
              Centered.rectangle([
                this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'bottomWallStart'),
                this.sk.Board.y.totalHalf - 2,
              ]),
            ),
          ]),
        ),
      ),
      // 上面を基板が顔を出すように削る
      translate(
        [this.sk.x.topWall, 0, this.sk.End.x.topToBottom.totalFromTo('topWallEnd', 'bottom')],
        Centered.cuboid([100, maxY, this.sk.End.x.topToBottom.valueAt('topWallEnd')]),
      ),

      // USBの穴
      translateZ(
        this.sk.End.x.bottomToTopForHoles.valueAt('usbHoleStart'),
        Centered.cuboid([
          this.sk.x.endThickness,
          this.sk.End.y.usbHoleHalf,
          this.sk.End.x.bottomToTopForHoles.totalFromTo('usbHoleStart', 'usbHoleEnd'),
        ]),
      ),

      // 電源スイッチの穴
      translateZ(
        this.sk.End.x.bottomToTopForHoles.valueAt('switchHoleStart'),
        Centered.cuboid([
          this.sk.x.endThickness,
          this.sk.End.y.switchHoleHalf,
          this.sk.End.x.bottomToTopForHoles.totalFromTo('switchHoleStart', 'switchHoleEnd'),
        ]),
      ),
    ];
  }

  @cacheGetter
  public get endOutlineHalf(): readonly Geom2[] {
    const sk = this.sk.End;
    return [
      union([
        Centered.rectangle([sk.x.total, sk.y.totalHalf - sk.other.radius]),
        translateX(sk.other.radius, Centered.rectangle([sk.x.total - sk.other.radius, sk.y.totalHalf])),
        circle({radius: sk.other.radius, center: [sk.other.radius, sk.y.totalHalf - sk.other.radius]}),
      ]),
    ];
  }
}
