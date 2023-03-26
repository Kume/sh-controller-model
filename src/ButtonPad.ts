import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {polygon} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {subtract} from '@jscad/modeling/src/operations/booleans';
import {ButtonBoard} from './ButtonBoard';
import {rotateZ, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {addColor, Cacheable, Centered, halfToFull, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {SwitchJoyStick} from './SwitchJoyStick';
import {degToRad} from '@jscad/modeling/src/utils';
import {offset} from '@jscad/modeling/src/operations/expansions';
import {NatHolder} from './NatHolder';

export class ButtonPad extends Cacheable implements Viewable {
  public readonly board = new ButtonBoard();
  public readonly stick = new SwitchJoyStick();

  public readonly width1 = 40;
  public readonly width2 = 50;
  public readonly length = 80;
  public readonly thickness = 20;
  public readonly wallThickness = 1.5;

  public readonly buttonHamidashi = 2;
  public readonly boardZ = this.thickness - (this.board.switchesHalf[0].height - this.buttonHamidashi);
  public readonly boardDistanceFromStickCenter = 15;

  public readonly stickXOffset = 16;
  public readonly stickRotation = degToRad(26);

  public readonly boardX = this.stickXOffset + this.boardDistanceFromStickCenter;

  public readonly natHolder = new NatHolder({
    screwHoleType: 'square',
    topThickness: 1,
    totalHeight: this.board.switchesHalf[0].height - this.buttonHamidashi - this.wallThickness,
  });

  public get displayName(): string {
    return 'ButtonPad';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'half', model: () => this.half},
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
    ];
  }

  public get boardAndStick(): Geom3[] {
    return [...this.stick.outline.map(this.transformStick), ...this.board.outline.map(this.transformBoard)];
  }

  public get outlineHalf(): Geom3[] {
    return [
      extrudeLinear({height: this.thickness}, this.baseFaceHalf),
      ...this.board.outlineHalf.map(this.transformBoard),
    ];
  }

  public get full(): Geom3[] {
    return [...halfToFull(this.half)];
  }

  public get fullWithBoard(): Geom3[] {
    return [...this.full, ...this.boardAndStick];
  }

  public get half(): Geom3[] {
    return [
      addColor(
        [0.8, 0.8, 0.8],
        subtract(
          extrudeLinear({height: this.thickness}, this.baseFaceHalf),
          extrudeLinear({height: this.boardZ}, offset({delta: -this.wallThickness}, this.baseFaceHalf)),
          translateX(
            this.wallThickness,
            Centered.cuboid([this.length - this.wallThickness * 2, this.wallThickness, this.boardZ]),
          ),
          ...this.board.looseOutlineHalf.map(this.transformBoard),
          ...this.stick.looseOutline.map(this.transformStick),
          this.transformNatHolder(this.natHolder.full),
        ),
      ),
    ];
  }

  public get baseFaceHalf(): Geom2 {
    return polygon({
      points: [
        [0, 0],
        [this.length, 0],
        [this.length, this.width1 / 2],
        [30, this.width2 / 2],
        [10, this.width1 / 2],
        [0, this.width1 / 2 - 10],
      ],
    });
  }

  public transformBoard = (g: Geom3): Geom3 => {
    return translate([this.boardX, 0, this.boardZ], g);
  };

  private transformStick = (g: Geom3): Geom3 => {
    return translate([this.stickXOffset, 0, this.boardZ - this.board.thickness], rotateZ(this.stickRotation, g));
  };

  private transformNatHolder = (g: Geom3): Geom3 => {
    return translate([this.boardX + 30, 0, this.boardZ], g);
  };
}
