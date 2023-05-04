import {Cacheable, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {cuboid} from '@jscad/modeling/src/primitives';
import {NatHolder} from './NatHolder';
import {commonSizeValue} from './common';
import {translate} from '@jscad/modeling/src/operations/transforms';

export class ButtonPadJoint extends Cacheable implements Viewable {
  public readonly natHolder = new NatHolder({screwHoleType: 'square', topThickness: 1, totalHeight: 5});
  public readonly screwBaseThickness = 1.5;
  public readonly height =
    commonSizeValue.buttonPadThickness -
    commonSizeValue.basicScrewHeadHeight -
    commonSizeValue.buttonPadScrewBaseThickness -
    this.screwBaseThickness;
  // TODO 外側ギリギリになるように調整された値なので、計算で出す
  public readonly additionalLength = 2;
  public readonly width = this.natHolder.minOuterWidth;

  public constructor(public readonly bottomHeight: number) {
    super();
  }

  public get displayName(): string {
    return 'ButtonPadJoint';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [
        {label: 'outline', model: () => this.outline},
        {label: 'headOutline', model: () => this.headOutline},
        {label: 'bottomOutline', model: () => this.bottomOutline},
      ];
    });
  }

  public get looseHeadOutline(): Geom3[] {
    return this.makeHeadOutline(0.3);
  }

  public get headOutline(): Geom3[] {
    return this.makeHeadOutline();
  }

  public get outline(): Geom3[] {
    return [
      ...this.headOutline.map((g) => translate([this.width / 2 + this.additionalLength, 0, this.height], g)),
      ...this.bottomOutline,
    ];
  }

  public get bottomOutline(): Geom3[] {
    return this.makeBottomOutline();
  }

  private makeHeadOutline(offset = 0): Geom3[] {
    return [
      cuboid({size: [6, this.width, this.screwBaseThickness], center: [0, 0, this.screwBaseThickness / 2]}),
      cuboid({
        size: [this.width + this.additionalLength + offset, this.width + offset * 2, this.height],
        center: [-(this.additionalLength - offset) / 2, 0, -this.height / 2],
      }),
    ];
  }

  public makeBottomOutline(offset = 0): Geom3[] {
    const length = this.width + this.additionalLength + offset;
    return [
      cuboid({
        size: [length, this.width + offset * 2, this.bottomHeight],
        center: [length / 2, 0, -this.bottomHeight / 2],
      }),
    ];
  }
}
