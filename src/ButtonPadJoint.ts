import {Cacheable, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {cuboid} from '@jscad/modeling/src/primitives';
import {NatHolder} from './NatHolder';
import {commonSizeValue} from './common';
import {mirrorZ, translate, translateZ} from '@jscad/modeling/src/operations/transforms';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {BatteryBoxTriggerJoint} from './BatteryBoxTriggerJoint';

const looseOutlineOffset = 0.5;

export class ButtonPadJoint extends Cacheable implements Viewable {
  public readonly screwBaseThickness = 2;
  public readonly height =
    commonSizeValue.buttonPadThickness -
    commonSizeValue.basicScrewHeadHeight -
    commonSizeValue.buttonPadScrewBaseThickness -
    this.screwBaseThickness;
  public readonly natHolder = new NatHolder({
    screwHoleType: 'octagon',
    topThickness: 1 + this.screwBaseThickness,
    totalHeight: this.height + this.screwBaseThickness,
    natEntryHoleLength:
      commonSizeValue.buttonPadSideScrewDistanceFromEdge - commonSizeValue.buttonPadWallThickness - looseOutlineOffset,
  });

  public readonly bottomNatHolder = new NatHolder({
    screwHoleType: 'octagon',
    topThickness: 1.5,
    totalHeight: 7,
  });
  // TODO 外側ギリギリになるように調整された値なので、計算で出す
  public readonly additionalLength = 2;
  public readonly width = this.natHolder.minimumOutlineWidth();
  public readonly wideWidth = this.width + 4;
  public readonly looseWidth = this.natHolder.minimumOutlineWidth(looseOutlineOffset);
  public readonly bottomHeight = commonSizeValue.triggerJointHeight - commonSizeValue.gripThickness;

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
    return this.makeHeadOutline(0.5);
  }

  public get headOutline(): Geom3[] {
    return this.makeHeadOutline();
  }

  public get outline(): Geom3[] {
    return [
      ...this.headOutline.map((g) => translate([this.natHolder.natEntryHoleLength, 0, this.height], g)),
      subtract(this.bottomOutline, this.bottomNatHolder.full.map(this.transformBottomNatHolder)),
    ];
  }

  public get bottomOutline(): Geom3[] {
    return this.makeBottomOutline();
  }

  private makeHeadOutline(offset = 0): Geom3[] {
    const bridgeWidth = 4 - offset;
    return [
      translateZ(
        this.screwBaseThickness,
        mirrorZ(
          subtract(
            offset > 0 ? this.natHolder.minimumLooseOutline : this.natHolder.minimumOutline,
            cuboid({
              size: [bridgeWidth, this.looseWidth, this.screwBaseThickness],
              center: [bridgeWidth / 2 + this.natHolder.screwHoleRadius, 0, this.screwBaseThickness / 2],
            }),
          ),
        ),
      ) as any as Geom3,
    ];
  }

  public makeBottomOutline(offset = 0): Geom3[] {
    const length = commonSizeValue.buttonPadJointLength - commonSizeValue.buttonPadWallThickness + offset;
    const height = this.bottomHeight - looseOutlineOffset + offset;
    const widePartHeight =
      height - BatteryBoxTriggerJoint.height - commonSizeValue.triggerJointSocketThickness - looseOutlineOffset;
    return [
      union(
        cuboid({
          size: [length, this.width + offset * 2, height],
          center: [length / 2, 0, -height / 2],
        }),
        cuboid({
          size: [length, this.wideWidth + offset * 2, widePartHeight],
          center: [length / 2, 0, -widePartHeight / 2],
        }),
      ),
    ];
  }

  private transformBottomNatHolder = (g: Geom3): Geom3 => {
    return translate(
      [commonSizeValue.buttonPadJointScrewDistance - commonSizeValue.buttonPadWallThickness, 0, -this.bottomHeight],
      g,
    );
  };
}
