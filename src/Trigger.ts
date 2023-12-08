import type {Geom3} from '@jscad/modeling/src/geometries/types';
import {booleans, expansions, geometries, primitives, transforms} from '@jscad/modeling';
import {addColor, Cacheable, cacheGetter, Centered, degreeToRadian, halfToFull, legacyCash, measureTime} from './utls';
import {Geom2} from '@jscad/modeling/src/geometries/geom2';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {cube, polygon, rectangle} from '@jscad/modeling/src/primitives';
import {TactileSwitch} from './TactileSwitch';
import {mirrorY, mirrorZ, rotateX, rotateZ, transform} from '@jscad/modeling/src/operations/transforms';
import {Viewable, ViewerItem} from './types';
import {Grip} from './Grip';
import {degToRad} from '@jscad/modeling/src/utils';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {TriggerBoard} from './TriggerBoard';
import {commonSizeValue} from './common';
import {NatHolder} from './NatHolder';
import {Screw} from './Screw';
import {ButtonPadJoint} from './ButtonPadJoint';
import {BatteryBoxTriggerJoint} from './BatteryBoxTriggerJoint';
import {Mat4} from 'regl';
import {intersect} from '@jscad/modeling/src/operations/booleans';

const {cuboid, sphere, line, arc} = primitives;
const {translateZ, translateX, translateY, translate, rotate, rotateY, mirror} = transforms;
const {union, subtract} = booleans;
const {path2, geom2, geom3} = geometries;
const {offset, expand} = expansions;

const outlineLimitThickness = 50;
const solidThickness = 25;
const collisionAdjustSize = 0.001;

interface TriggerFace {
  readonly solidHalf?: Geom3;
  readonly half: Geom3;
  readonly solidGeom2Half?: Geom2;
  readonly outlineLimitHalf: Geom3;
}

export class Trigger extends Cacheable implements Viewable {
  public static readonly lengthSize = 50;
  public static readonly width = 50;

  public readonly screw = new Screw(7, 2.5, (g) => this.transformScrew(g));

  public readonly width = Trigger.width;
  public readonly length = Trigger.lengthSize;
  public readonly gripJointLength = 20;
  public readonly gripJointPoleLength = 12.5;
  public readonly gripJointPoleWidth = 5;
  public readonly buttonPadJointBaseThickness = 2.5;
  public readonly buttonPadJointScrewPositionXYZ = [
    24,
    // 6.8はflash printでブリッジがいい感じになる幅に調整した結果
    this.width / 2 - 6.8,
    this.buttonPadJointBaseThickness + 6.5,
  ] as const;
  public readonly underFace = new UnderFace(this.width);
  public readonly topFace = new TopFace(this.width, this.length);
  // public readonly length = 55;
  public readonly backHeight = commonSizeValue.triggerJointHeight;
  public readonly maxZ = 31.5;

  public readonly buttonFaceDegree = commonSizeValue.triggerButtonFaceRotateDegree;

  public readonly natHolder = new NatHolder({
    totalHeight: 7,
    topThickness: 1,
    natEntryHoleLength: 10,
    screwHoleType: 'square',
  });
  public readonly sideScrew = new Screw(7, 2.5, (g) =>
    translate([this.buttonPadJointScrewPositionXYZ[0], this.buttonPadJointScrewPositionXYZ[1], 2], rotateX(Math.PI, g)),
  );

  public get innerSmallWidth(): number {
    return this.grip.width - this.grip.sideThickness * 2;
  }

  public constructor(public readonly buttonPadJoint: ButtonPadJoint, public readonly jointRotation: number) {
    super();
  }

  public get displayName(): string {
    return 'Trigger';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'outlineHalf2', model: () => this.outlineHalf2},
        {label: 'innerArea2', model: () => this.innerArea2},
        {label: 'halfWithGripAndReferenceObject', model: () => this.halfWithGripAndReferenceObject},
        {label: 'half', model: () => this.half},
        {label: 'half2', model: () => this.half2},
        {label: 'half3', model: () => this.half3},
        {label: 'full3', model: () => this.full3},
        {label: 'half2WithBoard', model: () => this.half2WithBoard},
        {label: 'buttonPadJointBaseHalf', model: () => this.buttonPadJointBaseHalf},
        {
          label: 'half3WithButtonPadJointBaseHalf',
          model: () => [...this.half3, ...addColor([0.3, 0.3, 0.3], this.buttonPadJointBaseHalf)],
        },
        {label: 'fullWithGrip', model: () => this.fullWithGrip},
        {label: 'halfGrip3', model: () => this.halfGrip3},
        {label: 'jointHalf', model: () => this.buttonFace.jointHalf},
      ];
    });
  }

  public get buttonFace(): ButtonFace {
    return legacyCash(this, 'buttonFace', () => {
      return new ButtonFace(this.width, this.innerSmallWidth, this.grip.width + 1, this.jointRotation);
    });
  }

  public get board(): TriggerBoard {
    return this.buttonFace.board;
  }

  public get grip(): Grip {
    return legacyCash(this, 'grip', () => {
      return new Grip(this.buttonPadJoint);
    });
  }

  public get half(): Geom3 {
    const {faces} = this;
    return union(
      ...faces.map(({face, transform}, index) => {
        return subtract(
          transform(face.half),
          ...faces.filter((_, i) => i !== index).map((i) => i.transform(i.face.outlineLimitHalf)),
        );
      }),
    );
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

  @cacheGetter
  public get buttonPadJointFace(): Geom2 {
    return subtract(
      union(
        translate([1, 0], Centered.rectangle([this.length - this.buttonFace.thickness - 1, this.grip.width / 2])),
        hull(
          translate(
            [this.length - this.buttonFace.thickness - 7 - 2, 0],
            Centered.rectangle([5, this.grip.width / 2 + 1]),
          ),
          translate(
            [this.length - this.buttonFace.thickness - 6 - 2, 0],
            Centered.rectangle([6 + 2, this.grip.width / 2]),
          ),
        ),
        // サイドの出っ張り（ネジ穴部分）
        translate([12, 0], Centered.rectangle([22, this.grip.width / 2 + 6])),
      ),
      // 穴の手前側の形状
      hull(
        translate([13.5 - 3, 0], Centered.rectangle([14.5 + 3 * 2, this.grip.width / 2 - 8])),
        translate([15, 0], Centered.rectangle([13, this.grip.width / 2 - 5])),
      ),

      // 穴を先端方向に拡張する
      translate([15, 0], Centered.rectangle([19, this.grip.width / 2 - 8])),

      // 先端方向のくぼみ
      translate([this.length - this.buttonFace.thickness - 11, 0], Centered.rectangle([11, 3])),
    );
  }

  public buttonPadJointBaseHalfWithoutScrewHole(offset = 0): Geom3[] {
    // ナナメに削るためにナナメに変形する行列
    // prettier-ignore
    const mat: Mat4 = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      -Math.sin(degToRad(this.buttonFaceDegree)), 0, 1, 0,
      0, 0, 0, 1
    ];
    const face = offset ? expand({delta: offset}, this.buttonPadJointFace) : this.buttonPadJointFace;
    const thickness = this.buttonPadJointBaseThickness + offset;
    return [
      subtract(
        intersect(
          extrudeLinear({height: thickness}, face),
          union(
            transform(mat, extrudeLinear({height: thickness}, face)),

            // ナナメに削ってはいけないエリア
            Centered.cuboid([this.length - 14, this.width, thickness + 1]),
          ),
        ),
        translate(
          [this.length - 13.5, 0, this.buttonPadJointBaseThickness - 1],
          Centered.cuboid([2, this.buttonFace.board.width / 2 + 2, 1]),
        ),
      ),
    ];
  }

  @cacheGetter
  public get buttonPadJointBaseHalf(): Geom3[] {
    return [
      subtract(
        this.buttonPadJointBaseHalfWithoutScrewHole(),
        this.sideScrew.headLooseOutline,
        this.sideScrew.bodyLooseOutline,
        translate([this.length - 2, 0, -10], Centered.cuboid([10, this.width / 2, 10])),
      ),
    ];
  }

  public get boardOutline(): Geom3[] {
    return halfToFull(this.buttonFace.boardHalf).map(this.transformForButtonFace);
  }

  public get halfWithGripAndReferenceObject(): Geom3[] {
    return [
      ...this.half2,
      ...this.buttonFace.boardHalf.map(this.transformForButtonFace),
      ...this.buttonFace.jointHalf.map(this.transformForButtonFace),
      ...this.grip.halfWithBatteryBox.map(this.transformGrip),
    ];
  }

  public get halfWithGrip(): Geom3[] {
    return [...this.half2, ...this.grip.half.map(this.transformGrip)];
  }

  public get halfWithGrip2(): Geom3[] {
    return [...this.half3, ...this.grip.half.map(this.transformGrip)];
  }

  public get fullWithGrip(): Geom3[] {
    return halfToFull(this.halfWithGrip);
  }

  public get fullWithGrip2(): Geom3[] {
    return halfToFull(this.halfWithGrip2);
  }

  public get full3(): Geom3[] {
    return [
      subtract(
        union(halfToFull(this.half3)),

        // 本当はhalfの時点でsubtractしたいが、丸め誤差かなにかでFlashPrintのスライサがおかしな判定をするため、このタイミングで行う
        halfToFull(this.buttonFace.boardLooseOutlineHalf.map(this.transformForButtonFace)),
        this.buttonFace.screwHole.map(this.transformForButtonFace),
      ),
    ];
  }

  public get halfGrip3(): Geom3[] {
    return [...this.gripJoint3Half, ...this.grip.half.map(this.transformGrip)];
  }

  public get gripJoint3OutlineHalf(): Geom3[] {
    const angleSize = 6;
    return [
      hull(
        Centered.cuboid([this.gripJointLength, this.grip.width / 2, this.backHeight - angleSize]),
        Centered.cuboid([this.gripJointLength, this.grip.width / 2 - angleSize, this.backHeight]),
      ),
    ];
  }

  public get gripJoint3Half(): Geom3[] {
    const angleSize = 6;
    return [
      hull(
        Centered.cuboid([this.gripJointLength, this.grip.width / 2, this.backHeight - angleSize]),
        Centered.cuboid([this.gripJointLength, this.grip.width / 2 - angleSize, this.backHeight]),
      ),
    ];
  }

  public get poleForGripJoint3Half(): Geom3[] {
    return [Centered.cuboid([this.gripJointLength, this.gripJointPoleWidth / 2, this.backHeight + 0.5])];
  }

  private get faces(): {face: TriggerFace; transform: (g: Geom3) => Geom3}[] {
    return legacyCash(this, 'faces', () => [
      {face: this.buttonFace, transform: (g: Geom3) => this.transformForButtonFace(g)},
      {face: this.underFace, transform: (g: Geom3) => this.transformForUnderFace(g)},
      {face: this.topFace, transform: (g: Geom3) => g},
    ]);
  }

  public get outline(): Geom3 {
    return union(this.outlineHalf, mirrorY(this.outlineHalf));
  }

  public get outlineHalf(): Geom3 {
    let result: Geom3 = geom3.create();
    for (const {face, transform} of this.faces) {
      if (face.solidHalf) {
        result = union(result, transform(face.solidHalf));
      }
    }
    result = this.subtractFacesOutlineLimit(result);
    result = this.subtractExtraCatArea(result);
    return result;
  }

  private subtractFacesOutlineLimit(geom: Geom3): Geom3 {
    for (const {face, transform} of this.faces) {
      geom = subtract(geom, transform(face.outlineLimitHalf));
    }
    return geom;
  }

  private subtractExtraCatArea(geom: Geom3): Geom3 {
    return subtract(
      geom,
      translate(
        [50, this.width / 2, 12],
        rotate([0, -Math.PI / 2 - 0.15, 0], extrudeLinear({height: 50}, this.bottomSideCutFace)),
      ),
      this.underCutArea,
    );
  }

  public get half2(): Geom3[] {
    return [
      subtract(
        this.outlineHalf2,
        this.innerArea2,
        this.buttonFace.boardLooseOutlineHalf.map(this.transformForButtonFace),
        this.screw.squareHeadLooseOutline,
        this.screw.octagonBodyLooseOutline,
      ),
      ...this.buttonFace.additionalPartsHalf.map(this.transformForButtonFace),
      ...this.jointSocket,
      // Centered.cuboid([
      //   commonSizeValue.buttonPadSideScrewDistanceFromEdge + 6,
      //   12 / 2,
      //   this.backHeight - this.grip.thickness,
      // ]),
    ];
  }

  @cacheGetter
  public get half3(): Geom3[] {
    return [
      subtract(
        union(
          subtract(
            this.outlineHalf2,
            expand({delta: 0.5}, this.gripJoint3OutlineHalf),
            this.buttonFace.spaceForInsert.map(this.transformForButtonFace),
            // this.buttonFace.boardLooseOutlineHalf.map(this.transformForButtonFace),
            // this.buttonFace.screwHole.map(this.transformForButtonFace),
          ),
          ...this.poleForGripJoint3Half,
        ),

        // expand({delta: 0.5}, this.buttonPadJointBaseHalfWithoutScrewHole),
        this.buttonPadJointBaseHalfWithoutScrewHole(0.5),

        [...this.natHolder.natHall, this.natHolder.screwHole].map((g) =>
          translate([...this.buttonPadJointScrewPositionXYZ], rotateX(Math.PI, rotateZ(0, g))),
        ),

        translate(
          [12 - 0.5, this.buttonPadJointScrewPositionXYZ[1] - 3.2 / 2, this.buttonPadJointBaseThickness + 0.5],
          Centered.cuboid([23, 3.2, 0.5]),
        ),

        // 後ろをちょっと削る
        cuboid({size: [2, this.grip.width + 2, this.backHeight * 2 + 2]}),

        // 空洞の他で削りきれなかった部分を削る
        hull(
          cuboid({size: [14, this.grip.width + 1, 35], center: [14 / 2 + this.gripJointPoleLength, 0, 0]}),
          cuboid({size: [2, this.grip.width + 1, 41], center: [14 / 2 + this.gripJointPoleLength, 0, 0]}),
        ),
      ),

      // 位置確認時に有効化
      ...this.buttonFace.boardHalf.map(this.transformForButtonFace),
    ];
  }

  public get half2WithBoard(): Geom3[] {
    return [...this.half2, ...this.buttonFace.boardHalf.map(this.transformForButtonFace)];
  }

  public get jointSocket(): Geom3[] {
    const width = this.grip.width - this.grip.sideThickness * 2;
    const thickness = commonSizeValue.triggerJointSocketThickness;
    return [
      subtract(
        union(
          translateZ(
            this.backHeight - this.grip.thickness,
            rotateX(
              -Math.PI / 2,
              extrudeLinear(
                {height: width / 2 - 2},
                polygon({
                  points: [
                    [1, 0],
                    [1, 1],
                    [0, 0],
                  ],
                }),
              ),
            ),
          ),
          translate(
            [thickness, 0, this.backHeight - thickness - this.grip.thickness],
            subtract(
              Centered.cuboid([commonSizeValue.buttonPadJointLength - thickness, width / 2, thickness]),
              // ジョイント部分を嵌め込む溝
              translateX(
                commonSizeValue.buttonPadWallThickness - 1,
                Centered.cuboid([commonSizeValue.buttonPadJointLength, this.buttonPadJoint.looseWidth / 2, thickness]),
              ),
              translate(
                [
                  commonSizeValue.buttonPadJointLength - BatteryBoxTriggerJoint.hookLength - 0.3,
                  this.buttonPadJoint.looseWidth / 2,
                  0,
                ],
                Centered.cuboid([5, 2, thickness]),
              ),
            ),
          ),
        ),
      ),
    ];
  }

  public get outlineHalf2(): Geom3[] {
    const buttonFaceAdditionalLimitation = addColor(
      [0.8, 0, 0],
      rotateY(degToRad(10), Centered.cuboid([26, this.width / 2, 40])),
    );
    const buttonFace = this.transformForButtonFace(this.buttonFace.solidHalf);
    const sphereRadius = 1;
    const buttonFaceBottomEndX =
      this.length - Math.tan(degToRad(this.buttonFaceDegree)) * this.maxZ - Math.sin(degToRad(this.buttonFaceDegree));

    return [
      subtract(
        hull(
          this.transformGrip(this.grip.jointEndHalf),
          this.subtractFacesOutlineLimit(subtract(buttonFace, buttonFaceAdditionalLimitation)),
          sphere({center: [buttonFaceBottomEndX, 0, this.maxZ - sphereRadius]}),
          sphere({center: [buttonFaceBottomEndX, 28 / 2, this.maxZ - sphereRadius]}),
          sphere({center: [buttonFaceBottomEndX - 3, 0, this.maxZ - sphereRadius]}),
          sphere({center: [buttonFaceBottomEndX - 3, 28 / 2, this.maxZ - sphereRadius]}),
          sphere({center: [buttonFaceBottomEndX - 8, this.width / 2 - 4, 12]}),
          sphere({center: [15, this.width / 2 - sphereRadius, 0]}),
          sphere({center: [0, this.innerSmallWidth / 2, 0], radius: 0.00001}),
          sphere({center: [0, this.innerSmallWidth / 2 + this.grip.sideThickness, 0], radius: 0.00001}),
        ),
        translate([-10, -10, -10], Centered.cuboid([100, 10, 100])),
        translateZ(-10, Centered.cuboid([100, 100, 10])),
      ),
    ];
  }

  public get innerArea2(): Geom3[] {
    return [
      translate(
        [-5, 0, this.backHeight - this.grip.height],
        rotateY(Math.PI / 2, extrudeLinear({height: 35}, this.grip.outlineBasicInnerFaceHalf)),
      ),
      translateX(commonSizeValue.buttonPadJointLength, Centered.cuboid([16, this.innerSmallWidth / 2, 24.2])),
      subtract(
        this.transformForButtonFace(this.buttonFace.innerAreaHalf),
        translateZ(this.maxZ - 1.5, Centered.cuboid([100, 100, 100])),
      ),
    ];
  }

  public get innerArea3(): Geom3[] {
    return [
      translate(
        [-5, 0, this.backHeight - this.grip.height],
        rotateY(Math.PI / 2, extrudeLinear({height: 35}, this.grip.outlineBasicInnerFaceHalf)),
      ),
      // translateX(commonSizeValue.buttonPadJointLength, Centered.cuboid([16, this.innerSmallWidth / 2, 24.2])),
      // subtract(
      //   this.transformForButtonFace(this.buttonFace.innerAreaHalf),
      //   translateZ(this.maxZ - 1.5, Centered.cuboid([100, 100, 100])),
      // ),
    ];
  }

  private get bottomSideCutFace(): Geom2 {
    const width = 5;
    const height = 24;
    const path = path2.create([
      [0, 0],
      [height, -10],
      [height, width],
      [0, width],
    ]);
    return geom2.fromPoints(path2.toPoints(path));
  }

  public get devSold(): Geom3 {
    const half = subtract(this.outlineHalf, this.devJointHalf, this.underCutArea);

    return union(half, mirror({normal: [0, 1, 0]}, half));
  }

  public get underCutArea(): Geom3 {
    return translate([0, this.width / 4, 15 + 31.5], cuboid({size: [100, this.width / 2, 30]}));
  }

  private transformForButtonFace = (g: Geom3): Geom3 => {
    // return translateX(this.length, rotateY(-degreeToRadian(90 - 56), g));
    return translateX(this.length, rotateY(-degToRad(this.buttonFaceDegree), g));
  };

  private transformForUnderFace(g: Geom3): Geom3 {
    return translateZ(this.backHeight, rotateY(degreeToRadian(56), g));
  }

  public get backWallHalf(): Geom3 {
    return Centered.cuboid([10, this.width / 2, this.backHeight]);
  }

  public get devJointHalf(): Geom3 {
    return Centered.cuboid([20, 5, 8]);
  }

  private transformGrip = (grip: Geom3): Geom3 => {
    grip = translate([this.grip.height, 0, -this.grip.length], grip);
    grip = rotateY(degToRad(90 + this.grip.mainRotateDegree), grip);
    grip = translate([0, 0, this.backHeight], grip);
    return grip;
  };

  private transformScrew = (g: Geom3): Geom3 => {
    return translate([commonSizeValue.buttonPadJointScrewDistance, 0, this.backHeight], g);
  };
}

class TopFace implements TriggerFace {
  public constructor(public readonly width: number, public readonly length: number) {}
  public get solidHalf(): Geom3 {
    return Centered.cuboid([this.length, this.width / 2, solidThickness]);
  }

  public get half(): Geom3 {
    return cube({size: 0.1});
  }

  public get outlineLimitHalf(): Geom3 {
    return translateZ(
      -outlineLimitThickness,
      Centered.cuboid([this.length, this.width / 2 + collisionAdjustSize, outlineLimitThickness]),
    );
  }
}

/**
 * ボタンを配置する面
 */
class ButtonFace implements TriggerFace {
  private readonly tactileSwitch = new TactileSwitch();
  public readonly board = new TriggerBoard();

  private readonly frontThickness = this.tactileSwitch.height - 2;
  public readonly thickness = 1.5;

  private readonly topSwitchCenterDistance = 17;
  private readonly switchDistanceLeftToRight = 14;
  private readonly switchDistanceTopToBottom = 17;
  // ボードがunderfaceにギリギリくっつかない程度に調整 (目視)
  private readonly boardDistance = 9;
  public readonly boardX = this.board.tactileSwitch.height - this.board.tactileSwitch.protrusion;

  public readonly jointMainThickness = 1.5;

  public readonly natHolder = new NatHolder({
    totalHeight: this.boardX - this.thickness - this.jointMainThickness,
    topThickness: 1,
    screwHoleType: 'octagon',
  });

  public readonly jointNatHolder = new NatHolder({
    totalHeight: this.boardX - this.thickness - this.jointMainThickness,
    topThickness: 1,
    natEntryHoleLength: 5,
    screwHoleType: 'octagon',
  });

  public constructor(
    public readonly width: number,
    public readonly innerSmallWidth: number,
    public readonly innerSpaceWidth: number,
    public readonly jointRotation: number,
  ) {}
  public get solidHalf(): Geom3 {
    return extrudeLinear({height: 50}, this.solidGeom2Half);
  }

  public get jointHalf(): Geom3[] {
    const offset = 0.3;
    return [
      addColor(
        [0.5, 0.2, 0.5],
        union(
          subtract(
            translate(
              [-this.boardX, 0, this.boardDistance],
              subtract(
                union(
                  Centered.cuboid([this.jointMainThickness, this.board.width / 2, this.board.length]),
                  Centered.cuboid([
                    this.boardX - this.thickness,
                    this.board.width / 2,
                    this.board.screwHoleDistance - this.natHolder.minOuterWidth / 2 - offset,
                  ]),
                  translateZ(
                    this.board.screwHoleDistance + this.natHolder.minOuterWidth / 2 + offset,
                    Centered.cuboid([
                      this.boardX - this.thickness,
                      this.board.width / 2,
                      this.board.length - this.board.screwHoleDistance - this.natHolder.minOuterWidth / 2 - offset * 2,
                    ]),
                  ),
                ),
                // 角の部分が衝突してるので削る
                translate(
                  [this.boardX - this.thickness - 2, 0, this.board.length],
                  rotateY(Math.PI / 6, Centered.cuboid([3, this.board.width / 2, 1])),
                ),
                // ネジ穴部分を削る
                // 今の印刷想定だと丸く削るとうまく印刷できないので、四角く削る
                translate(
                  [0, 0, this.board.screwHoleDistance - this.natHolder.minOuterWidth / 2 - offset],
                  Centered.cuboid([
                    this.jointMainThickness,
                    this.board.screw.radius + offset,
                    this.natHolder.minOuterWidth + offset * 2,
                  ]),
                ),
              ),
            ),
            this.transformBoard(this.board.transformTopSwitch(this.board.tactileSwitch.looseOctagonOutline)),
            this.transformBoard(this.board.transformBottomSwitch(this.board.tactileSwitch.looseOctagonOutline)),
          ),
          translate(
            [0, 10, 0],
            rotateY(
              degToRad(commonSizeValue.triggerButtonFaceRotateDegree),
              rotateZ(Math.PI + Math.PI / 2 - this.jointRotation, mirrorZ(this.jointNatHolder.minimumLooseOutline)),
            ),
          ),
        ),
      ),
    ];
  }

  public get solidGeom2Half(): Geom2 {
    return this.makeGeom2Half(0);
  }

  public get half(): Geom3 {
    const subtractX = solidThickness - this.frontThickness;
    const wall = extrudeLinear(
      {height: 50},
      subtract(this.solidGeom2Half, translateX(-solidThickness, Centered.rectangle([subtractX, 12]))),
    );
    return subtract(
      wall,
      this.transformTopSwitch(this.tactileSwitch.looseOctagonOutline),
      this.transformBottomSwitch(this.tactileSwitch.looseOctagonOutline),
    );
  }

  public get innerAreaHalf(): Geom3 {
    const height = this.topSwitchCenterDistance + this.switchDistanceTopToBottom + 5;
    const thickness =
      this.tactileSwitch.height + this.thickness + this.tactileSwitch.height - 1 - this.jointMainThickness; // 基板を差し込むために必要な最低限部品の高さの合計と追加の余白分の高さの合計値
    return extrudeLinear(
      {height},
      translateX(-(1.5 + thickness), Centered.rectangle([thickness, this.innerSmallWidth / 2])),
    );
  }

  public get boardHalf(): Geom3[] {
    return this.board.half.map(this.transformBoard);
  }

  public get boardLooseOutlineHalf(): Geom3[] {
    return this.board.looseOutlineHalf.map(this.transformBoard);
  }

  public get spaceForInsert(): Geom3[] {
    const thickness = 14;
    const length = this.board.length + this.boardDistance + 1;
    return [
      hull(
        cuboid({
          size: [thickness, this.innerSpaceWidth / 2 - 3, length],
          center: [-this.boardX - thickness / 2, (this.innerSpaceWidth / 2 - 3) / 4, length / 2],
        }),
        cuboid({
          size: [thickness, this.innerSpaceWidth / 2, length - 8],
          center: [-this.boardX - thickness / 2, this.innerSpaceWidth / 4, length / 2],
        }),
      ),
    ];
  }

  public get screwHole(): Geom3[] {
    const screw = new Screw(7, commonSizeValue.basicScrewHeadHeight, (g) =>
      translate([-this.boardX + 2, 0, this.boardDistance + this.board.screwHoleDistance], rotateY(Math.PI / 2, g)),
    );
    return [...screw.octagonLooseOutline, screw.octagonDriverHoleOutline];
  }

  public get additionalPartsHalf(): Geom3[] {
    const height = this.boardX - this.thickness - this.jointMainThickness;
    const screwHoleZ = this.boardDistance + this.board.screwHoleDistance;
    return [
      subtract(
        cuboid({
          size: [height, this.innerSmallWidth / 2, this.natHolder.minOuterWidth],
          center: [-height / 2 - this.thickness, this.innerSmallWidth / 4, screwHoleZ],
        }),
        this.natHolder.full.map((g) =>
          translate([-height - this.thickness, 0, screwHoleZ], rotateX(Math.PI, rotateY(Math.PI / 2, g))),
        ),

        // 印刷時に角でブリッジを形成しないように角を削る
        translate(
          [-this.boardX + this.jointMainThickness, 0, screwHoleZ + this.natHolder.minOuterWidth / 2 - 1],
          rotateY(
            degToRad(commonSizeValue.triggerButtonFaceRotateDegree + commonSizeValue.gripRotateDegree),
            cuboid({size: [1, this.innerSmallWidth / 2, 3], center: [-0.5, this.innerSmallWidth / 4, 3 / 2]}),
          ),
        ),
      ),
    ];
  }

  private transformTopSwitch(g: Geom3): Geom3 {
    return translate(
      [-this.frontThickness, this.switchDistanceLeftToRight / 2, this.topSwitchCenterDistance],
      rotateY(Math.PI / 2, g),
    );
  }

  private transformBottomSwitch(g: Geom3): Geom3 {
    return translate(
      [-this.frontThickness, 0, this.topSwitchCenterDistance + this.switchDistanceTopToBottom],
      rotateY(Math.PI / 2, g),
    );
  }

  private transformBoard = (g: Geom3): Geom3 => {
    return translate([-this.boardX, 0, this.boardDistance], mirrorZ(rotateY(Math.PI / 2, g)));
  };

  public makeGeom2Half(offset: number, thickness = solidThickness): Geom2 {
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
        [-thickness, this.width / 2],
        [-thickness, 0],
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

  @measureTime
  public get outlineLimitHalf(): Geom3 {
    const outlineLimitBase = translateX(
      -outlineLimitThickness / 2,
      Centered.cuboid([outlineLimitThickness, this.width / 2 + collisionAdjustSize, 50]),
    );
    return subtract(outlineLimitBase, this.solidHalf);
  }
}

/**
 * 下の方の面
 */
class UnderFace implements TriggerFace {
  public readonly thickness = 1;

  public constructor(public readonly width: number) {}
  public get solidHalf(): Geom3 {
    return extrudeLinear({height: 50}, this.solidGeom2Half);
  }

  @measureTime
  public get half(): Geom3 {
    return extrudeLinear(
      {height: 50},
      subtract(
        this.solidGeom2Half,
        offset({delta: -1}, this.makeGeom2Half(0)),
        rectangle({
          size: [solidThickness - this.thickness * 2, this.thickness],
          center: [solidThickness / 2, this.thickness / 2],
        }),
        rectangle({
          size: [this.thickness, this.width - this.thickness],
          center: [solidThickness - this.thickness / 2, this.thickness / 2],
        }),
      ),
    );
  }

  public get solidGeom2Half(): Geom2 {
    return this.makeGeom2Half(0);
  }

  public makeGeom2Half(offset_: number): Geom2 {
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

  @measureTime
  public get outlineLimitHalf(): Geom3 {
    const limitLength = 60;
    const limitOffset = -10;
    const outlineLimitBase = translate(
      [-outlineLimitThickness / 2, 0, limitOffset],
      Centered.cuboid([outlineLimitThickness, this.width / 2 + collisionAdjustSize, limitLength]),
    );
    return subtract(
      outlineLimitBase,
      translateZ(limitOffset, extrudeLinear({height: limitLength}, this.solidGeom2Half)),
    );
  }
}
