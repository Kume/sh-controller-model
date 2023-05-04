import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {cuboid, cylinder, polygon, rectangle, sphere} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {ButtonBoard} from './ButtonBoard';
import {
  mirrorZ,
  rotateX,
  rotateY,
  rotateZ,
  transform,
  translate,
  translateX,
  translateY,
  translateZ,
} from '@jscad/modeling/src/operations/transforms';
import {addColor, Cacheable, Centered, halfToFull, legacyCash, rotateVec2} from './utls';
import {Viewable, ViewerItem} from './types';
import {SwitchJoyStick} from './SwitchJoyStick';
import {degToRad} from '@jscad/modeling/src/utils';
import {offset} from '@jscad/modeling/src/operations/expansions';
import {NatHolder} from './NatHolder';
import {Trigger} from './Trigger';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {Screw} from './Screw';
import {colors, commonSizeValue} from './common';
import {ButtonPadJoint} from './ButtonPadJoint';

export class ButtonPad extends Cacheable implements Viewable {
  public readonly board = new ButtonBoard();
  public readonly stick = new SwitchJoyStick();
  public readonly sideScrew = new Screw(7, commonSizeValue.basicScrewHeadHeight, (g) => this.transformSideScrew(g));
  public readonly sideScrewBaseThickness = commonSizeValue.buttonPadScrewBaseThickness;
  /* 左右を入れ替えた際に逆サイド用のネジ穴がどこに来るかの位置確認用 */
  public readonly ghostSideScrew = new Screw(7, 2.5, (g) => this.transformGhostSideScrew(g));
  public readonly sideScrewDistanceFromEdge = commonSizeValue.buttonPadSideScrewDistanceFromEdge;

  public readonly width1 = 30;
  public readonly startWidth = 20;
  public readonly endWidth = 26;
  public readonly length = 80;
  public readonly thickness = commonSizeValue.buttonPadThickness;
  public readonly wallThickness = 1.5;
  public readonly coverThickness = 1.5;

  public readonly buttonHamidashi = 2;
  public readonly boardZ = this.thickness - (this.board.switchesHalf[0].height - this.board.switchesHalf[0].protrusion);
  public readonly boardDistanceFromStickCenter = 13.5;

  public readonly stickXOffset = 16;
  public readonly stickRotation = degToRad(30);

  public readonly outerColor = [0.8, 0.8, 0.8] as const;

  public readonly boardX = this.stickXOffset + this.boardDistanceFromStickCenter;

  public readonly boardBottomZ = this.boardZ - this.board.thickness;
  public readonly coverScrew = new Screw(7, 2.5, (g) => this.transformCoverScrew(g));
  public readonly coverScrewDistance = this.boardX + this.board.screwHoleDistance;
  public readonly coverMaxHeight = this.thickness - this.sideScrew.headHeight - this.sideScrewBaseThickness;

  public constructor(public readonly joint: ButtonPadJoint) {
    super();
  }

  /* ナナメに取り付けるための自身の変形を定義 */
  public readonly selfTransformParams = {
    rotationDegree: -76,
    translate: {
      x: 16,
      y: 40,
      z: 0,
    },
  } as const;

  public readonly natHolder = new NatHolder({
    screwHoleType: 'square',
    topThickness: 1,
    totalHeight: this.board.switchesHalf[0].height - this.buttonHamidashi - this.wallThickness,
  });

  public get displayName(): string {
    return 'ButtonPad';
  }

  public transformSelf = (g: Geom3): Geom3 => {
    const {
      rotationDegree,
      translate: {x, y, z},
    } = this.selfTransformParams;
    return translate([x, y, z], rotateZ(degToRad(rotationDegree), g));
  };

  public reverseTransformSelf = (g: Geom3): Geom3 => {
    const {
      rotationDegree,
      translate: {x, y, z},
    } = this.selfTransformParams;
    return rotateZ(degToRad(-rotationDegree), translate([-x, -y, -z], g));
  };

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'half', model: () => this.half},
        {label: 'coverHalf', model: () => this.coverHalf},
        {label: 'halfWithCover', model: () => this.halfWithCover},
        {label: 'full', model: () => this.full},
        {label: 'coverFull', model: () => this.coverFull},
        {label: 'boardAndStick', model: () => this.boardAndStick},
        {label: 'fullWithBoard', model: () => this.fullWithBoard},
        {label: 'positionReferences', model: () => this.positionReferences},
      ];
    });
  }

  public get outline(): Geom3[] {
    return [
      ...halfToFull(this.outlineHalf),
      ...this.stick.outline.map((g) => this.transformStick(g)),
      ...this.board.outline.map(this.transformBoard),
      // this.fingerSubtraction,
      // this.virtualTrigger,
    ];
  }

  /* 指の部分を削るための空間 */
  public get fingerSubtraction(): Geom3 {
    const [, [x2, y2]] = this.gripJointPoints;
    return addColor(
      [1, 0, 0],
      hull([
        sphere({radius: 0.01, center: [this.length, this.endWidth / 2, 0]}),
        sphere({radius: 0.01, center: [x2 + 6, this.endWidth / 2, 0]}),
        sphere({radius: 0.01, center: [x2, y2, 0]}),
        sphere({radius: 0.01, center: [x2 + 6, y2, 11]}),
      ]),
    );
  }

  public get boardAndStick(): Geom3[] {
    return [...this.stick.outline.map(this.transformStick), ...this.board.outline.map(this.transformBoard)];
  }

  public get outlineHalf(): Geom3[] {
    return [
      subtract(extrudeLinear({height: this.thickness}, this.baseFaceHalf), this.fingerSubtraction),
      ...this.board.outlineHalf.map(this.transformBoard),
      ...this.positionReferencesHalf,
    ];
  }

  public get full(): Geom3[] {
    return [
      addColor(
        this.outerColor,
        subtract(union(halfToFull(this.half)), ...this.stick.looseOutlineFotTopJoint.map(this.transformStick)),
      ),
    ];
  }

  public get fullWithCover(): Geom3[] {
    return [...this.full, ...this.coverFull];
  }

  public get positionReferencesHalf(): Geom3[] {
    return [
      ...addColor(colors.red, this.sideScrew.outline),
      ...addColor(colors.translucentRed, this.ghostSideScrew.outline),
      ...addColor([0, 0, 0.4, 0.5], this.joint.headOutline.map(this.transformJoint)),
      ...addColor([0, 0, 0.4, 0.5], this.joint.headOutline.map(this.transformGhostJoint)),
    ];
  }

  public get positionReferences(): Geom3[] {
    return halfToFull(this.positionReferencesHalf);
  }

  public get fullWithBoard(): Geom3[] {
    return [...this.full, ...this.positionReferences, ...this.boardAndStick];
  }

  public get half(): Geom3[] {
    const innerAreaFace = subtract(offset({delta: -this.wallThickness}, this.baseFaceHalf), this.backWallArea);
    return [
      addColor(
        this.outerColor,
        subtract(
          extrudeLinear({height: this.thickness}, this.baseFaceHalf),
          extrudeLinear({height: this.boardZ}, innerAreaFace),
          extrudeLinear(
            {height: this.coverMaxHeight},
            subtract(
              innerAreaFace,
              rectangle({size: [this.length, this.board.width + 1.5 * 2], center: [this.length / 2, 0]}),
            ),
          ),
          translateX(
            this.wallThickness,
            Centered.cuboid([this.length - this.wallThickness * 2, this.wallThickness, this.boardZ]),
          ),
          ...this.board.looseOutlineHalf.map(this.transformBoard),
          ...this.natHolder.full.map(this.transformNatHolder),
          ...this.dipForBoardHalf,
          this.fingerSubtraction,
          this.sideScrew.headAndSquareBodyLooseOutline,
        ),
      ),
    ];
  }

  public get halfWithCover(): Geom3[] {
    return [
      ...this.half,
      ...this.board.outlineHalf.map(this.transformBoard),
      ...this.coverHalf,
      ...this.coverScrew.outline,
    ];
  }

  public get coverHalf(): Geom3[] {
    const offsetValue = 0.3;
    const length = this.length - (this.wallThickness + offsetValue) * 2;
    const endThickness = 2;
    const baseFace = subtract(
      union(
        subtract(
          offset({delta: -this.wallThickness - offsetValue}, this.baseFaceHalf),
          offset({delta: offsetValue}, this.backWallArea),
        ),
        rectangle({
          size: [length, this.wallThickness + offsetValue],
          center: [length / 2 + offsetValue + this.wallThickness, (this.wallThickness + offsetValue) / 2],
        }),
      ),
      translateX(this.boardX, Centered.rectangle([15, this.board.width / 2])),
      translateX(this.boardX, Centered.rectangle([26, this.board.width / 4])),
    );
    return [
      addColor(
        [0.1, 0.0, 0.2, 0.7],
        subtract(
          union(
            extrudeLinear({height: this.coverThickness}, baseFace),
            cylinder({
              radius: 4,
              height: this.boardBottomZ,
              center: [this.coverScrewDistance, 0, this.boardBottomZ / 2],
            }),
            // スティックの底のカバー
            extrudeLinear(
              {height: this.boardZ},
              intersect(
                baseFace,
                Centered.rectangle([this.boardX - offsetValue, this.board.width / 2 + 1.5 + offsetValue]),
              ),
            ),
            // 両サイドの盛り上がり
            extrudeLinear(
              {height: this.coverMaxHeight},
              intersect(
                baseFace,
                translate([0, this.board.width / 2 + 1.5 + offsetValue], Centered.rectangle([this.length, 15])),
              ),
            ),
            // 前方左右の壁
            translate(
              [this.boardX, this.board.width / 2, 0],
              Centered.cuboid([this.gripJointPoints[1][0] - this.boardX - offsetValue, 1.5 + offsetValue, this.boardZ]),
            ),
            // 後方の壁
            cuboid({
              size: [endThickness, this.board.width / 2, this.boardZ],
              center: [
                length - endThickness / 2 + this.wallThickness + offsetValue,
                this.board.width / 4,
                this.boardZ / 2,
              ],
            }),
            // 後方左右の壁
            extrudeLinear(
              {height: this.boardBottomZ},
              intersect(
                baseFace,
                translate(
                  [this.gripJointPoints[1][0] - 1.5, this.board.width / 2, 0],
                  Centered.rectangle([this.length - this.gripJointPoints[1][0], 10]),
                ),
              ),
            ),
          ),
          this.coverScrew.headAndSquareBodyLooseOutline,
          ...this.joint.looseHeadOutline.map(this.transformJoint),
        ),
      ),
    ];
  }

  public get coverFull(): Geom3[] {
    return [
      subtract(
        union(...halfToFull(this.coverHalf)),
        ...this.stick.looseOutline.map(this.transformStick),
        ...this.stick.cableLooseOutline.map(this.transformStick),
      ),
    ];
  }

  public get backWallArea(): Geom2 {
    const [, [x2, y2]] = this.gripJointPoints;
    return polygon({
      points: [
        [x2, y2],
        [x2, this.endWidth / 2 - 2],
        [this.length, this.endWidth / 2 - 2],
        [this.length, this.endWidth / 2],
      ],
    });
  }

  public get baseFaceHalf(): Geom2 {
    const [[x1, y1], [x2, y2]] = this.gripJointPoints;
    return polygon({
      points: [
        [0, 0],
        [this.length, 0],
        [this.length, this.endWidth / 2],
        [x2, y2],
        [x1, y1],
        [0, this.startWidth / 2],
      ],
    });
  }

  public get gripJointPoints(): [[number, number], [number, number]] {
    const {rotationDegree, translate} = this.selfTransformParams;
    const p1 = rotateVec2([-translate.x, -(translate.y - 15)], -degToRad(rotationDegree));
    const p2 = rotateVec2([-translate.x, -(translate.y + 15)], -degToRad(rotationDegree));
    return [
      [p1[0], -p1[1]],
      [p2[0], -p2[1]],
    ];
  }

  public get dipForBoardHalf(): Geom3[] {
    const thickness = this.natHolder.natHallHeight + this.natHolder.props.topThickness;
    const length = 15;
    return [
      cuboid({
        size: [length, 10.5, thickness],
        center: [this.coverScrewDistance - 5 - length / 2, 0, this.boardZ + thickness / 2],
      }),
    ];
  }

  /* グリップとの接合部の目印 */
  public get gripJointRef(): Geom3 {
    return addColor([1, 0, 0], this.reverseTransformSelf(cuboid({size: [1, 30, 10], center: [0, 0, 0]})));
  }

  public get virtualTrigger(): Geom3 {
    return addColor([1, 0, 0], this.reverseTransformSelf(Centered.cuboid([Trigger.lengthSize, Trigger.width, 10])));
  }

  public transformBoard = (g: Geom3): Geom3 => {
    return translate([this.boardX, 0, this.boardZ], g);
  };

  private transformStick = (g: Geom3): Geom3 => {
    return translate([this.stickXOffset, 0, this.boardBottomZ + 1], rotateZ(this.stickRotation, g));
  };

  private transformNatHolder = (g: Geom3): Geom3 => {
    return translate([this.coverScrewDistance, 0, this.boardZ], g);
  };

  private transformSideScrew = (g: Geom3): Geom3 => {
    return translate(this.sideScrewTransformValues().translate, g);
  };

  private transformJoint = (g: Geom3): Geom3 => {
    return translateZ(
      -this.sideScrewBaseThickness - this.joint.screwBaseThickness,
      this.transformSideScrew(rotateZ(-this.jointRotationRad, g)),
    );
  };

  private transformGhostJoint = (g: Geom3): Geom3 => {
    return translateZ(
      -this.sideScrewBaseThickness - this.joint.screwBaseThickness,
      this.transformGhostSideScrew(rotateZ(-this.jointRotationRad * 3, g)),
    );
  };

  private get jointRotationRad(): number {
    const [[x1, y1], [x2, y2]] = this.gripJointPoints;
    return Math.atan2(x2 - x1, y2 - y1);
  }

  private sideScrewTransformValues() {
    const [[x1, y1], [x2, y2]] = this.gripJointPoints;
    const theta = this.jointRotationRad;
    return {
      theta,
      translate: [
        (x1 + x2) / 2 + Math.cos(theta) * this.sideScrewDistanceFromEdge,
        (y1 + y2) / 2 - Math.sin(theta) * this.sideScrewDistanceFromEdge,
        this.thickness - this.sideScrew.headHeight,
      ] as [number, number, number],
    };
  }

  private transformGhostSideScrew = (g: Geom3): Geom3 => {
    const {theta, translate: translateValue} = this.sideScrewTransformValues();
    const ghostDistance = Math.cos(theta) * translateValue[1] * 4;
    return translate(
      [
        translateValue[0] + Math.sin(theta) * ghostDistance,
        -translateValue[1] + Math.cos(theta) * ghostDistance,
        translateValue[2],
      ],
      g,
    );
  };

  private transformCoverScrew = (g: Geom3): Geom3 =>
    translate([this.coverScrewDistance, 0, this.boardBottomZ - 1], mirrorZ(g));
}
