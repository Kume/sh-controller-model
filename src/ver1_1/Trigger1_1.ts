import geometries from '@jscad/modeling/src/geometries';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {subtract} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {rotateY, translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {cuboid, sphere} from '@jscad/modeling/src/primitives';
import {degToRad} from '@jscad/modeling/src/utils';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, Centered, halfToFull, vec2ArrayToWritable} from '../utls';
import {BatteryBoxHolder1_1} from './BatteryBoxHolder1_1';
import {Grip1_1} from './Grip1_1';
import {Skeleton} from './Skeleton';

export class Trigger1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger;
  public readonly grip = new Grip1_1();
  public readonly batteryBoxHolder = new BatteryBoxHolder1_1();
  public readonly buttonFace = new ButtonFace();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'half', model: () => this.half},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  @cacheGetter
  public get outline(): Geom3[] {
    return [...halfToFull(this.outlineHalf)];
  }

  @cacheGetter
  public get innerHalf(): Geom3[] {
    return [...this.buttonFace.sk.transformSelf.applyGeoms(this.buttonFace.innerHalf)];
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [subtract(this.outlineHalf, this.innerHalf)];
  }

  @cacheGetter
  public get outlineHalf(): Geom3[] {
    return [
      subtract(
        hull(
          subtract(
            this.buttonFace.sk.transformSelf.applyGeoms(this.buttonFace.outlineHalf),
            // buttonFace.outlineHalfは余分な形状を含んでいるので、凸包に使うのにちょうどよい部分だけ残すように斜めにカットする
            rotateY(degToRad(10), cuboid({size: [26 * 2, this.sk.y.total, 100]})),
          ),
          // [extrudeLinear({height: 1}, [...this.grip.endOutlineHalf])],
          translateZ(this.sk.z.back, rotateY(Math.PI / 2, [extrudeLinear({height: 1}, [...this.grip.endOutlineHalf])])),
          ...this.sk.points.hullHalf.top.standard.map((point) =>
            sphere({center: [...point], radius: this.sk.other.hullSphereRadius, segments: 64}),
          ),
          ...this.sk.points.hullHalf.top.small.map((point) =>
            sphere({center: [...point], radius: this.sk.other.hullSmallSphereRadius, segments: 64}),
          ),
          ...this.sk.points.hullHalf.side.map((point) => sphere({center: [...point]})),
        ),

        // z軸、y軸のマイナス方向にはみ出た部分をカットする
        cuboid({size: [100, 100, 100], center: [0, 0, -50]}),
        cuboid({size: [100, 100, 100], center: [0, -50, 0]}),
      ),
    ];
  }
}

class ButtonFace extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger.ButtonFace;

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'outlineHalf', model: () => this.outlineHalf},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get innerHalf(): Geom3[] {
    return [
      // ボードとそれを組み入れるために必要な最低限の空間
      translate(
        [Skeleton.Common.TactileSwitch.z.subterraneanHeight, 0, 0],
        Centered.cuboid([
          this.sk.Board.z.thickness + Skeleton.Common.TactileSwitch.z.total,
          this.sk.Board.y.totalHalf + 0.5,
          this.sk.z.topToBottom.valueAt('endWallStart'),
        ]),
      ),
    ];
  }

  public get outlineHalf(): Geom3[] {
    return [extrudeLinear({height: this.sk.z.total}, this.bottomFace)];
  }

  @cacheGetter
  public get bottomFace() {
    const [toCurveStart, toCurveEnd, toEnd] = this.sk.point2ds.bottomOuterSeq.splitVecs([
      'curveStart',
      'curveEnd',
      'end',
    ]);

    let path = geometries.path2.create(vec2ArrayToWritable(toCurveStart));
    for (const point of toCurveEnd) {
      path = geometries.path2.appendArc({endpoint: [...point], radius: [12, 12], segments: 128, clockwise: true}, path);
    }
    path = geometries.path2.appendPoints(vec2ArrayToWritable([...toEnd, ...this.sk.point2ds.bottomInner]), path);

    return geometries.geom2.fromPoints(geometries.path2.toPoints(path).reverse());
  }
}

class Joint extends Cacheable implements Viewable {
  public get viewerItems(): ViewerItem[] {
    return [];
  }

  public get displayName() {
    return this.constructor.name;
  }

  // public get outlineHalf() {

  // }

  // @cacheGetter
  // public get screwPole(): Geom3 {
  //   return extrudeLinear({height: })
  // }
}
