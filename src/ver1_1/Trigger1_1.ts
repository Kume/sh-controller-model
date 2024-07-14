import geometries from '@jscad/modeling/src/geometries';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, cacheGetter, Centered, halfToFull, vec2ArrayToWritable} from '../utls';
import {Skeleton} from './Skeleton';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {cuboid, sphere} from '@jscad/modeling/src/primitives';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {mirrorY, mirrorZ, rotateY, translateZ} from '@jscad/modeling/src/operations/transforms';
import {degToRad} from '@jscad/modeling/src/utils';
import {Grip1_1} from './Grip1_1';

export class Trigger1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger;
  public readonly grip = new Grip1_1();
  public readonly buttonFace = new ButtonFace();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'outlineHalf', model: () => this.outlineHalf},
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
    return [{label: 'outlineHalf', model: () => this.outlineHalf}];
  }

  public get displayName() {
    return this.constructor.name;
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
