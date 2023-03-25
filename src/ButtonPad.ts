import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {polygon} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {union} from '@jscad/modeling/src/operations/booleans';
import {ButtonBoard} from './ButtonBoard';
import {translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {halfToFullY} from './utls';

export class ButtonPad {
  public readonly board = new ButtonBoard();

  public readonly width1 = 40;
  public readonly width2 = 50;
  public readonly length = 80;
  public readonly thickness = 20;

  public readonly boardZ = this.thickness - (this.board.switchesHalf[0].height - 2);

  public get outline(): Geom3 {
    return halfToFullY(this.outlineHalf);
  }

  public get outlineHalf(): Geom3 {
    return union(
      extrudeLinear({height: this.thickness}, this.baseFaceHalf),
      translate([30, 0, this.boardZ], this.board.outlineHalf),
    );
  }

  public get baseFaceHalf(): Geom2 {
    return polygon({
      points: [
        [0, 0],
        [this.length, 0],
        [this.length, this.width1 / 2],
        [30, this.width2 / 2],
        [10, this.width1 / 2],
      ],
    });
  }
}
