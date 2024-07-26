import geometries from '@jscad/modeling/src/geometries';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {
  mirrorZ,
  rotateY,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {circle, cuboid, sphere} from '@jscad/modeling/src/primitives';
import {degToRad} from '@jscad/modeling/src/utils';
import {Viewable, ViewerItem} from '../types';
import {addColor, Cacheable, cacheGetter, Centered, halfToFull, hexagon, vec2ArrayToWritable} from '../utls';
import {BatteryBoxHolder1_1} from './BatteryBoxHolder1_1';
import {Grip1_1} from './Grip1_1';
import {Skeleton} from './Skeleton';
import {TriggerBoard1_1} from './TriggerBoard1_1';
import {NatHolder} from '../NatHolder';
import {expand} from '@jscad/modeling/src/operations/expansions';
import {Screw} from '../Screw';

export class Trigger1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.Trigger;
  public readonly grip = new Grip1_1();
  public readonly batteryBoxHolder = new BatteryBoxHolder1_1();
  public readonly buttonFace = new ButtonFace1_1();
  public readonly joint = new Joint1_1();
  private readonly jointScrew = new Screw(6, 2.5, (g) =>
    this.sk.transformNatHolder.applyGeom(mirrorZ(translateZ(1.7, g))),
  );

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'innerHalf', model: () => this.innerHalf},
      {label: 'half', model: () => this.half},
      {label: 'frontHalf', model: () => this.frontHalf},
      {label: 'frontFull', model: () => this.frontFull},
      {label: 'backHalf', model: () => this.backHalf},
      {label: 'frontAndBackHalf', model: () => [...this.frontHalf, ...this.backHalf]},
      {
        label: 'frontBackAndJointHalf',
        model: () => [...this.frontHalf, ...this.backHalf, ...this.joint.sk.transformSelf.applyGeoms(this.joint.half)],
      },
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
    return [
      ...this.buttonFace.sk.transformSelf.applyGeoms(this.buttonFace.innerHalf),
      // 削り残し
      translateX(this.sk.x.gripSide, Centered.cuboid([10, this.sk.ButtonFace.Board.y.totalHalf + 0.5, 15])),

      ...this.sk.Joint.transformSelf.applyGeoms(this.joint.triggerFrontSubtructionHalf),
    ];
  }

  @cacheGetter
  public get half(): Geom3[] {
    return [subtract(this.outlineHalf, this.innerHalf), ...this.frontBackHalf];
  }

  @cacheGetter
  public get frontFull(): Geom3[] {
    return [
      subtract(
        union(halfToFull(this.frontHalf)),
        this.buttonFace.sk.transformSelf.applyGeoms(
          this.buttonFace.board.sk.transformSelf.applyGeoms(this.buttonFace.board.looseOutline),
        ),
      ),
    ];
  }

  @cacheGetter
  public get frontHalf(): Geom3[] {
    return [
      subtract(
        union(
          // 前半分
          intersect(this.outlineHalf, translateX(this.sk.x.gripSide, Centered.cuboid([99, 99, 99]))),

          // 側面外側
          intersect(
            this.outlineHalf,
            translateY(this.sk.y.frontGripJoint.valueAt('gripEnd') + 0.2, Centered.cuboid([99, 99, 99])),
          ),
        ),
        this.innerHalf,
      ),
      ...this.frontBackHalf,
    ];
  }

  private get frontBackHalf(): Geom3[] {
    const breidgeHeight = 11.5;
    return [
      addColor(
        [0.6, 0.6, 0.8],
        subtract(
          union(
            // ナットホルダー
            this.sk.transformNatHolder.applyGeom(
              cuboid({
                size: [
                  10,
                  (Skeleton.Trigger.ButtonFace.y.boardSpaceHalf + this.sk.y.innerSideThickness) * 2,
                  this.sk.other.natHolderThickness,
                ],
                center: [0, 0, this.sk.other.natHolderThickness / 2],
              }),
            ),
            // 足とナットホルダーの接続部分
            translate(
              [7, 0, breidgeHeight - 0.5],
              Centered.cuboid([2, this.sk.y.frontGripJoint.valueAt('gripStart') - this.sk.other.jointOffset, 2]),
            ),
            // サポート代わりの足
            translate(
              [5, 0, 0],
              Centered.cuboid([
                6,
                this.sk.y.frontGripJoint.valueAt('gripStart') - this.sk.other.jointOffset,
                breidgeHeight - 1,
              ]),
            ),
            translate(
              [7, 0, 0],
              translateZ(
                breidgeHeight - 1,
                union(
                  Centered.cuboid([2, 0.25, 0.5]),
                  translateY(
                    this.sk.y.frontGripJoint.valueAt('gripStart') - this.sk.other.jointOffset - 0.5,
                    Centered.cuboid([2, 0.5, 0.5]),
                  ),
                ),
              ),
            ),

            this.sk.transformNatHolder.applyGeom(
              translate(
                [-16, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf, 0],
                Centered.cuboid([20, this.sk.y.innerSideThickness, this.sk.other.natHolderThickness]),
              ),
            ),
            translate(
              [7, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf, breidgeHeight],
              Centered.cuboid([20, this.sk.y.innerSideThickness, 4]),
            ),
            // 上２つの穴を適当に埋める
            translate(
              [13, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf, breidgeHeight],
              Centered.cuboid([10, this.sk.y.innerSideThickness, 8]),
            ),

            // 側面内側
            hull(
              translate(
                [this.sk.x.gripSide - 4, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf, breidgeHeight],
                Centered.cuboid([1 + 4, this.sk.y.innerSideThickness, 1]),
              ),
              translate(
                [this.sk.x.gripSide, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf, this.sk.Joint.z.thickness + 4.5],
                Centered.cuboid([1, this.sk.y.innerSideThickness, 1]),
              ),
            ),
          ),
          this.sk.transformNatHolder.applyGeom(
            union(
              // ナット部分
              translateZ(1.5, extrudeLinear({height: 3}, hexagon(Skeleton.Common.Nat.radius))),
              // ネジ穴
              cuboid({size: [3.4, 3.4, 3]}),
              // グリップ側を突き抜けないように角を削る
              translate(
                [-14, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf - 0.2, 0],
                Centered.cuboid([20, this.sk.y.innerSideThickness + 0.2, 3]),
              ),
            ),
          ),
          // halfにする
          translateY(-99 / 2, cuboid({size: [99, 99, 99]})),
        ),
      ),
    ];
  }

  public get backHalf(): Geom3[] {
    const underAreaHeight = 10;
    return [
      addColor(
        [0.6, 0.8, 0.8],
        subtract(
          intersect(
            union(this.outlineHalf),
            // outlineをいい感じのサイズに切り取る
            Centered.cuboid([
              this.sk.x.gripSide - this.sk.other.jointOffset,
              this.sk.y.frontGripJoint.valueAt('gripEnd'),
              99,
            ]),
          ),
          extrudeLinear(
            {height: underAreaHeight},
            hull(
              translateX(
                this.sk.Joint.x.outline.valueAt('nanameEnd'),
                Centered.rectangle([
                  this.sk.x.gripSide - this.sk.Joint.x.outline.valueAt('nanameEnd'),
                  this.sk.y.frontGripJoint.valueAt('gripStart'),
                ]),
              ),
              Centered.rectangle([this.sk.x.gripSide, this.sk.y.frontGripJoint.valueAt('gripStart') - 4]),
            ),
          ),
          subtract(
            this.sk.transformNatHolder.applyGeom(
              translate(
                [-15, 0, -this.sk.other.jointOffset],
                union(
                  Centered.cuboid([30, Skeleton.Trigger.ButtonFace.y.boardSpaceHalf, 15]),
                  translateZ(3, Centered.cuboid([30, this.sk.y.frontGripJoint.valueAt('gripStart'), 15])),
                ),
              ),
            ),
            Centered.cuboid([99, this.sk.y.frontGripJoint.valueAt('gripStart'), underAreaHeight]),
          ),
          this.sk.Joint.transformSelf.applyGeoms(this.joint.triggerBckSubtructionHalf),
          this.jointScrew.octagonLooseOutline,
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
  public get frontAreaHalf(): Geom3[] {
    return [
      translateX(
        0,
        Centered.cuboid([Skeleton.Common.TactileSwitch.z.subterraneanHeight, Skeleton.Trigger.y.totalHalf, 99]),
      ),
    ];
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
  private readonly buttonFace = new ButtonFace1_1();

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'half', model: () => this.half},
      {label: 'triggerFrontSubtructionHalf', model: () => this.triggerFrontSubtructionHalf},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get full(): Geom3[] {
    return halfToFull(this.half);
  }

  public get half(): Geom3[] {
    return [addColor([0.6, 0.2, 0.2], subtract(union(this.outlineHalf), this.subtraction))];
  }

  public get outlineHalf(): Geom3[] {
    return [
      union(
        extrudeLinear({height: this.sk.z.layer1Thickenss}, union(this.layer1)),
        extrudeLinear({height: this.sk.z.thickness}, union(this.layer2)),
      ),

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
        {height: Skeleton.Common.Nat.z - 1 + 0.2},
        translate([0, 0], union(translate([...this.sk.point2ds.screw], hexagon(Skeleton.Common.Nat.radius + 0.2)))),
      ),
      cuboid({
        size: [3.4, 3.4, 99],
        center: [...this.sk.point2ds.screw, 0],
      }),

      extrudeLinear(
        {height: Skeleton.Common.Nat.z - 1 + 0.2},
        translate([...this.sk.point2ds.counterScrew], hexagon(Skeleton.Common.Nat.radius + 0.2)),
      ),
      cuboid({
        size: [3.4, 3.4, 99],
        center: [...this.sk.point2ds.counterScrew, 0],
      }),
    ];
  }

  public get layer1(): Geom2 {
    return subtract(this.layer1Outline, this.subtructionLayer1_2, this.subtructionLayer1);
  }

  public get subtructionLayer1() {
    return [
      // トリガーがブリッジを形成しやすくするための柱部分を切り取り
      translateX(this.sk.x.holeSeq.valueAt('holeEnd'), Centered.rectangle([99, 3])),
    ];
  }

  private get layer1Outline(): Geom2 {
    return union(
      Centered.rectangle([this.sk.x.total, this.sk.y.headHalf]),
      hull(
        translateX(
          this.sk.x.outline.valueAt('nanameEnd'),
          Centered.rectangle([
            this.sk.point2ds.counterScrew[0] - 1 - this.sk.x.outline.valueAt('nanameEnd'),
            this.sk.y.middleHalf,
          ]),
        ),
        Centered.rectangle([this.sk.x.outline.valueAt('nanameEnd'), this.sk.y.tailHalf]),
      ),
      translate(
        [this.sk.point2ds.counterScrew[0] - 1, this.sk.point2ds.counterScrew[1]],
        hexagon(Skeleton.Common.Nat.radius + 0.2 + 1 + 1),
      ),
    );
  }

  public get layer2(): Geom2 {
    return subtract(this.layer2Outline, this.subtructionLayer1_2, this.subtructionLayer2);
  }

  public get subtructionLayer2() {
    return [
      // トリガーがブリッジを形成しやすくするための柱部分を切り取り
      translateX(this.sk.x.holeSeq.valueAt('holeEnd') - 0.001, Centered.rectangle([99, 5])),
    ];
  }

  public get layer2Outline() {
    return union(
      Centered.rectangle([this.sk.x.total, this.sk.y.headHalf - 1]),
      hull(
        translateX(
          this.sk.x.outline.valueAt('nanameEnd'),
          Centered.rectangle([
            this.sk.point2ds.counterScrew[0] - this.sk.x.outline.valueAt('nanameEnd'),
            this.sk.y.middleHalf - 1,
          ]),
        ),
        Centered.rectangle([this.sk.x.outline.valueAt('nanameEnd'), this.sk.y.tailHalf - 1]),
      ),
      translate(
        [this.sk.point2ds.counterScrew[0], this.sk.point2ds.counterScrew[1]],
        hexagon(Skeleton.Common.Nat.radius + 0.2 + 1),
      ),
    );
  }

  public get subtructionLayer1_2() {
    return union(
      // 主にケーブルを通すための中央の穴
      hull(
        translateX(
          this.sk.x.holeSeq.valueAt('holeNanameEnd'),
          Centered.rectangle([this.sk.x.holeSeq.totalFromTo('holeNanameEnd', 'holeEnd'), this.sk.y.holeWidthHalf]),
        ),
        translateX(
          this.sk.x.holeSeq.valueAt('holeStart'),
          Centered.rectangle([this.sk.x.holeSeq.totalFromTo('holeStart', 'holeEnd'), this.sk.y.holeTailWidthHalf]),
        ),
      ),
    );
  }

  public get triggerFrontSubtructionHalf(): Geom3[] {
    const additionalArea = translateY(-9, Centered.rectangle([this.sk.x.total, 9]));
    const layer2Base = union(this.layer2Outline, additionalArea);
    const layer1Base = union(this.layer1Outline, additionalArea);

    const frontArea = union(
      this.sk.transformSelf
        .reversed()
        .applyGeoms(this.buttonFace.sk.transformSelf.applyGeoms(this.buttonFace.frontAreaHalf)),
    );

    return [
      subtract(
        union(
          extrudeLinear({height: this.sk.z.thickness}, expand({delta: 0.2, corners: 'edge'}, layer2Base)),

          intersect(
            hull(
              translateZ(
                -1,
                extrudeLinear(
                  {height: this.sk.z.layer1Thickenss + 0.1 + 1},
                  expand({delta: -1, corners: 'edge'}, layer1Base),
                ),
              ),
              extrudeLinear(
                {height: this.sk.z.layer1Thickenss + 0.1},
                expand({delta: 0.2, corners: 'edge'}, layer1Base),
              ),
            ),
            frontArea,
          ),

          subtract(
            hull(
              translateZ(
                -4.5,
                extrudeLinear(
                  {height: this.sk.z.layer1Thickenss + 0.1 + 3},
                  expand(
                    {delta: -4.5, corners: 'edge'},
                    subtract(
                      layer1Base,
                      translateX(this.sk.point2ds.counterScrew[0] - 1, Centered.rectangle([99, 99])),
                    ),
                  ),
                ),
              ),
              translateZ(
                0,
                extrudeLinear(
                  {height: this.sk.z.layer1Thickenss + 0.1},
                  expand({delta: 0.2, corners: 'edge'}, layer1Base),
                ),
              ),
            ),
            frontArea,
          ),
        ),

        // トリガーの先端部分のブリッジを支える柱部分
        translateZ(
          this.sk.z.layer1Thickenss + 0.1,
          extrudeLinear({height: 99}, expand({delta: 0.2, corners: 'edge'}, this.subtructionLayer2)),
        ),
        translateZ(
          -1,
          extrudeLinear(
            {height: this.sk.z.layer1Thickenss + 0.1 + 1},
            expand({delta: 0.2, corners: 'edge'}, this.subtructionLayer1),
          ),
        ),
      ),
    ];
  }

  public get triggerBckSubtructionHalf(): Geom3[] {
    const thicknessOffset = 0.15;
    return [
      translateZ(
        -thicknessOffset,
        extrudeLinear(
          {height: this.sk.z.layer1Thickenss + thicknessOffset * 2},
          expand({delta: Skeleton.Trigger.other.jointOffset, corners: 'edge'}, this.layer1Outline),
        ),
      ),
    ];
  }

  // @cacheGetter
  // public get screwPole(): Geom3 {
  //   return extrudeLinear({height: })
  // }
}
