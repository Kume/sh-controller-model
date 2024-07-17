import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Viewable, ViewerItem} from '../types';
import {addColor, Cacheable, cacheGetter, Centered, halfToFull} from '../utls';
import {Skeleton} from './Skeleton';
import {subtract} from '@jscad/modeling/src/operations/booleans';
import {translate, translateZ} from '@jscad/modeling/src/operations/transforms';

export class MainBoard1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Grip.Board;
  public readonly xiaoBoard = new XiaoBoard();

  public get viewerItems(): ViewerItem[] {
    return [{label: 'full', model: () => this.full}];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [
      // 基板
      addColor(
        [0, 0.6, 0, 0.9],
        subtract(Centered.cuboid([this.sk.x.total, this.sk.y.totalHalf, this.sk.z.bottomToTop.valueAt('boardTop')])),
      ),

      ...this.sk.XiaoBoard.transformSelf.applyGeoms(this.xiaoBoard.half),

      // // xiaoの足
      // addColor(
      //   [0.8, 0.8, 0.8],
      //   translate(
      //     [0, this.sk.XiaoBoard.y.totalHalf - this.sk.XiaoBoard.y.leg, -this.sk.z.legBottom],
      //     Centered.cuboid([this.sk.XiaoBoard.x.total, this.sk.XiaoBoard.y.leg, this.sk.z.legBottom]),
      //   ),
      // ),
    ];
  }
}

export class XiaoBoard extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Grip.Board.XiaoBoard;

  public get viewerItems(): ViewerItem[] {
    return [{label: 'half', model: () => this.half}];
  }

  public get displayName() {
    return this.constructor.name;
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [
      // 基板
      addColor(
        [0.3, 0.3, 0.3],
        translateZ(
          this.sk.z.bottomToTop.valueAt('boardBottom'),
          Centered.cuboid([
            this.sk.x.total,
            this.sk.y.totalHalf,
            this.sk.z.bottomToTop.totalFromTo('boardBottom', 'boardTop'),
          ]),
        ),
      ),

      // チップ
      addColor(
        [0.9, 0.9, 0.9],
        translate(
          [this.sk.x.chip.valueAt('start'), 0, this.sk.z.bottomToTop.valueAt('boardTop')],
          Centered.cuboid([this.sk.x.chip.totalFromTo('start', 'end'), this.sk.y.chipHalf, this.sk.z.chip]),
        ),
      ),

      // USBジャック
      addColor(
        [0.7, 0.7, 0.7],
        translate(
          [this.sk.x.usb.valueAt('start'), 0, this.sk.z.bottomToTop.valueAt('boardTop')],
          Centered.cuboid([
            this.sk.x.usb.totalFromTo('start', 'end'),
            this.sk.y.usbHalf,
            this.sk.z.bottomToTop.totalFromTo('boardTop', 'usbTop'),
          ]),
        ),
      ),

      // 足
      addColor(
        [0.1, 0.1, 0.1],
        translate(
          [0, this.sk.y.totalHalf - this.sk.y.leg, this.sk.z.bottomToTop.valueAt('legBottom')],
          Centered.cuboid([
            this.sk.x.total,
            this.sk.y.leg,
            this.sk.z.bottomToTop.totalFromTo('legBottom', 'boardBottom'),
          ]),
        ),
      ),
    ];
  }
}
