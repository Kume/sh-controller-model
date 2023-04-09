import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {cuboid, polygon, sphere} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {ButtonBoard} from './ButtonBoard';
import {rotateX, rotateY, rotateZ, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {addColor, Cacheable, Centered, halfToFull, legacyCash, rotateVec2} from './utls';
import {Viewable, ViewerItem} from './types';
import {SwitchJoyStick} from './SwitchJoyStick';
import {degToRad} from '@jscad/modeling/src/utils';
import {offset} from '@jscad/modeling/src/operations/expansions';
import {NatHolder} from './NatHolder';
import {Trigger} from './Trigger';
import {hull} from '@jscad/modeling/src/operations/hulls';

export class ButtonPad extends Cacheable implements Viewable {
  public readonly board = new ButtonBoard();
  public readonly stick = new SwitchJoyStick();

  public readonly width1 = 30;
  public readonly startWidth = 20;
  public readonly endWidth = 26;
  public readonly length = 80;
  public readonly thickness = 15;
  public readonly wallThickness = 1.5;

  public readonly buttonHamidashi = 2;
  public readonly boardZ = this.thickness - (this.board.switchesHalf[0].height - this.buttonHamidashi);
  public readonly boardDistanceFromStickCenter = 15;

  public readonly stickXOffset = 16;
  public readonly stickRotation = degToRad(26);

  public readonly outerColor = [0.8, 0.8, 0.8] as const;

  public readonly boardX = this.stickXOffset + this.boardDistanceFromStickCenter;

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
        {label: 'full', model: () => this.full},
        {label: 'boardAndStick', model: () => this.boardAndStick},
        {label: 'fullWithBoard', model: () => this.fullWithBoard},
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
    ];
  }

  public get full(): Geom3[] {
    return [
      addColor(
        this.outerColor,
        subtract(union(halfToFull(this.half)), ...this.stick.looseOutline.map(this.transformStick)),
      ),
    ];
  }

  public get fullWithBoard(): Geom3[] {
    return [...this.full, ...this.boardAndStick];
  }

  public get half(): Geom3[] {
    return [
      addColor(
        this.outerColor,
        subtract(
          extrudeLinear({height: this.thickness}, this.baseFaceHalf),
          extrudeLinear(
            {height: this.boardZ},
            subtract(offset({delta: -this.wallThickness}, this.baseFaceHalf), this.backWallArea),
          ),
          translateX(
            this.wallThickness,
            Centered.cuboid([this.length - this.wallThickness * 2, this.wallThickness, this.boardZ]),
          ),
          ...this.board.looseOutlineHalf.map(this.transformBoard),
          ...this.natHolder.full.map(this.transformNatHolder),
          ...this.dipForBoardHalf,
          this.fingerSubtraction,
        ),
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
        center: [this.boardX + this.board.screwHoleDistance - 5 - length / 2, 0, this.boardZ + thickness / 2],
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
    return translate([this.stickXOffset, 0, this.boardZ - this.board.thickness], rotateZ(this.stickRotation, g));
  };

  private transformNatHolder = (g: Geom3): Geom3 => {
    return translate([this.boardX + this.board.screwHoleDistance, 0, this.boardZ], g);
  };
}
