import geometries from '@jscad/modeling/src/geometries';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {rotateY, translate, translateX, translateY, translateZ} from '@jscad/modeling/src/operations/transforms';
import {circle, cuboid, sphere} from '@jscad/modeling/src/primitives';
import {degToRad} from '@jscad/modeling/src/utils';
import {Viewable, ViewerItem} from '../types';
import {addColor, Cacheable, cacheGetter, Centered, halfToFull, hexagon, vec2ArrayToWritable} from '../utls';
import {BatteryBoxHolder1_1} from './BatteryBoxHolder1_1';
import {Grip1_1} from './Grip1_1';
import {Skeleton} from './Skeleton';
import {TriggerBoard1_1} from './TriggerBoard1_1';
import {NatHolder} from '../NatHolder';

export class Trigger1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger;
  public readonly grip = new Grip1_1();
  public readonly batteryBoxHolder = new BatteryBoxHolder1_1();
  public readonly buttonFace = new ButtonFace1_1();
  public readonly joint = new Joint1_1();
  private readonly natHolder = new NatHolder({
    totalHeight: 7,
    screwHoleType: 'octagon',
    topThickness: 2,
  });

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'half', model: () => this.half},
      {label: 'frontHalf', model: () => this.frontHalf},
      {
        label: 'halfWithJointAndBoard',
        model: () => [
          ...this.half,
          ...this.joint.sk.transformSelf.applyGeoms(this.joint.half),
          ...this.buttonFace.sk.transformSelf.applyGeoms(
            this.buttonFace.board.sk.transformSelf.applyGeoms(this.buttonFace.board.full),
          ),
        ],
      },
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
    return [subtract(this.outlineHalf, this.innerHalf), ...this.frontBackHalf];
  }

  @cacheGetter
  public get frontHalf(): Geom3[] {
    return [
      subtract(
        union(
          intersect(this.outlineHalf, translateX(this.sk.x.gripSide, Centered.cuboid([99, 99, 99]))),
          intersect(
            this.outlineHalf,
            translateY(this.sk.y.frontGripJoint.valueAt('gripStart'), Centered.cuboid([99, 99, 99])),
          ),
        ),
        this.innerHalf,
      ),
      ...this.frontBackHalf,
    ];
  }

  private get frontBackHalf(): Geom3[] {
    return [
      addColor(
        [0.6, 0.6, 0.8],
        subtract(
          union(
            this.sk.transformNatHolder.applyGeom(cuboid({size: [10, 10, 6], center: [0, 0, 4]})),
            //   Centered.cuboid([22, 15, 12]),
            //   rotateY(this.sk.ButtonFace.other.rotateRad, Centered.cuboid([23, 15, 11])),
          ),
          // Centered.cuboid([30, 13, 10]),
          translateX(-99 + 6, Centered.cuboid([99, 99, 99])),
          this.sk.transformNatHolder.applyGeom(union(this.natHolder.full)),
          translateY(-99 / 2, cuboid({size: [99, 99, 99]})),
        ),
      ),
    ];
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

class ButtonFace1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger.ButtonFace;
  public readonly board = new TriggerBoard1_1();

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

class Joint1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger.Joint;

  public get viewerItems(): ViewerItem[] {
    return [{label: 'half', model: () => this.half}];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get half(): Geom3[] {
    return [addColor([0.6, 0.2, 0.2], subtract(union(this.outlineHalf), this.subtraction))];
  }

  public get outlineHalf(): Geom3[] {
    return [
      union(extrudeLinear({height: this.sk.z.thickness}, union(this.layer1))),

      translateZ(
        this.sk.z.thickness,
        extrudeLinear(
          {height: this.sk.z.screwPoll},
          union(
            circle({radius: this.sk.other.screwPollRadius, center: [...this.sk.point2ds.screw]}),
            circle({radius: this.sk.other.screwPollRadius, center: [...this.sk.point2ds.counterScrew]}),
          ),
        ),
      ),
    ];
  }

  public get subtraction(): Geom3[] {
    return [
      extrudeLinear(
        {height: Skeleton.Common.Nat.z + 0.2},
        translate([0, 0], union(translate([...this.sk.point2ds.screw], hexagon(Skeleton.Common.Nat.radius + 0.2)))),
      ),
      cuboid({
        size: [3.4, 3.4, 99],
        center: [...this.sk.point2ds.screw, 0],
      }),

      extrudeLinear(
        {height: Skeleton.Common.Nat.z + 0.2},
        translate([...this.sk.point2ds.counterScrew], hexagon(Skeleton.Common.Nat.radius + 0.2)),
      ),
      cuboid({
        size: [3.4, 3.4, 99],
        center: [...this.sk.point2ds.counterScrew, 0],
      }),
    ];
  }

  public get layer1(): Geom2 {
    return union(
      Centered.rectangle([this.sk.x.total, this.sk.y.headHalf]),
      Centered.rectangle([this.sk.point2ds.counterScrew[0], this.sk.y.middleHalf]),
      translate([...this.sk.point2ds.counterScrew], hexagon(Skeleton.Common.Nat.radius + 0.2 + 1)),
    );
  }

  // @cacheGetter
  // public get screwPole(): Geom3 {
  //   return extrudeLinear({height: })
  // }
}
