import {addColor, Cacheable, cacheGetter, Centered, halfToFull, legacyCash} from './utls';
import {Viewable, ViewerItem} from './types';
import {Geom3} from '@jscad/modeling/src/geometries/types';
import {Trigger} from './Trigger';
import {ButtonPad} from './ButtonPad';
import {NatHolder} from './NatHolder';
import {commonSizeValue} from './common';
import {rotateZ, translate} from '@jscad/modeling/src/operations/transforms';
import {subtract, union} from '@jscad/modeling/src/operations/booleans';
import {cuboid} from '@jscad/modeling/src/primitives';
import {degToRad} from '@jscad/modeling/src/utils';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';

export class TriggerJoint extends Cacheable implements Viewable {
  private baseThickness = 2;
  private color = [0.5, 0.5, 0] as const;
  private looseOutlineOffset = 0.3;
  private screwBaseThickness = 2;
  private natHolderHeight =
    commonSizeValue.buttonPadThickness -
    commonSizeValue.basicScrewHeadHeight -
    commonSizeValue.buttonPadScrewBaseThickness -
    this.screwBaseThickness;
  private natHolder = new NatHolder({
    screwHoleType: 'octagon',
    topThickness: 1 + this.screwBaseThickness,
    totalHeight: this.natHolderHeight + this.screwBaseThickness,
    natEntryHoleLength:
      commonSizeValue.buttonPadSideScrewDistanceFromEdge -
      commonSizeValue.buttonPadWallThickness -
      this.looseOutlineOffset,
  });

  public constructor(public readonly trigger: Trigger, public readonly buttonPad: ButtonPad) {
    super();
  }

  public get displayName(): string {
    return 'TriggerJoint';
  }

  public get viewerItems(): ViewerItem[] {
    return legacyCash(this, 'viewerItem', () => {
      return [{label: 'outline', model: () => this.full}];
    });
  }

  public get full(): Geom3[] {
    return [
      addColor(
        this.color,
        subtract(
          union(
            this.natHolderTransforms.near(this.natHolderOutline),
            this.natHolderTransforms.farRight(this.natHolderOutline),
            this.natHolderTransforms.farLeft(this.natHolderOutline),
            halfToFull(this.trigger.buttonPadJointBaseHalf),
          ),
          cuboid({
            size: [10, this.trigger.width, 100],
            center: [10 / 2 + this.trigger.length - this.trigger.buttonFace.thickness, 0, 0],
          }),
        ),
      ),
    ];
  }

  private get natHolderTransforms() {
    const [x, y] = this.buttonPad.sideScrewTransformValues().translate;
    // const diffX = p[1][0] - p[0][0];
    // const diffY = p[1][1] - p[0][1];
    const zOffset = -this.natHolderHeight - this.baseThickness;
    return {
      near: (g: Geom3) => translate([commonSizeValue.buttonPadSideScrewDistanceFromEdge, 0, zOffset], g),
      farRight: (g: Geom3) =>
        translate(
          [
            commonSizeValue.buttonPadSideScrewDistanceFromEdge +
              Math.cos(Math.PI / 2 - this.buttonPad.jointRotationRad) * y * 2,
            Math.sin(Math.PI / 2 - this.buttonPad.jointRotationRad) * y * 2,
            zOffset,
          ],
          rotateZ(-this.buttonPad.jointRotationRad * 2, g),
        ),
      farLeft: (g: Geom3) =>
        translate(
          [
            commonSizeValue.buttonPadSideScrewDistanceFromEdge +
              Math.cos(Math.PI / 2 - this.buttonPad.jointRotationRad) * y * 2,
            -Math.sin(Math.PI / 2 - this.buttonPad.jointRotationRad) * y * 2,
            zOffset,
          ],
          rotateZ(this.buttonPad.jointRotationRad * 2, g),
        ),
    };
  }

  private get natHolderOutline(): Geom3 {
    const bridgeWidth = 4;
    return addColor(
      this.color,
      subtract(
        this.natHolder.minimumOutline,
        cuboid({
          size: [bridgeWidth, this.natHolder.minimumOutlineWidth(this.looseOutlineOffset), this.screwBaseThickness],
          center: [bridgeWidth / 2 + this.natHolder.screwHallRadius, 0, this.screwBaseThickness / 2],
        }),
      ),
    );
  }
}
