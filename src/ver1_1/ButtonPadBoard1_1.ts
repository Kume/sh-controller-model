import {mirrorZ, translate} from '@jscad/modeling/src/operations/transforms';
import {TactileSwitch} from '../TactileSwitch';
import {Viewable, ViewerItem} from '../types';
import {Cacheable, Centered} from '../utls';
import {Skeleton} from './Skeleton';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Screw} from '../Screw';
import {NatHolder} from '../NatHolder';

export class ButtonPadBoard1_1 extends Cacheable implements Viewable {
  public readonly sk = Skeleton.ButtonPad.Board;
  private readonly buttons = this.sk.point2ds.buttons.map(
    (point) => new TactileSwitch((g) => translate([...point, this.sk.z.thickness], g)),
  );
  private readonly screw = new Screw(6, 2.5, (g) => translate([this.sk.x.screw, 0, -1], mirrorZ(g)));
  public readonly natHolder = new NatHolder({
    screwHoleType: 'square',
    topThickness: this.sk.z.natHolder.totalFromTo('boardTop', 'natStart'),
    totalHeight: this.sk.z.natHolder.totalFromTo('boardTop', 'screwHoleEnd'),
  });

  public get viewerItems(): ViewerItem[] {
    return [{label: 'looseOutline', model: () => this.looseOutline}];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get looseOutline(): Geom3[] {
    return [
      ...this.buttons.map((button) => button.looseOutline),

      ...translate([this.sk.x.screw, 0, this.sk.z.thickness], this.natHolder.full),
      // ...this.screw.looseOutline,
    ];
  }

  public get looseOutlineForCover(): Geom3[] {
    return [this.screw.headAndSquareBodyLooseOutline];
  }
}
