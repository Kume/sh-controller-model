import {Cacheable, cacheGetter, Centered, chamfer, halfToFull, vec2ArrayToWritable} from '../utls';
import {Viewable, ViewerItem} from '../types';
import {SwitchJoyStick} from '../SwitchJoyStick';
import {Skeleton} from './Skeleton';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {cuboid, cylinder, polygon, rectangle, sphere} from '@jscad/modeling/src/primitives';
import {extrudeLinear} from '@jscad/modeling/src/operations/extrusions';
import {intersect, subtract, union} from '@jscad/modeling/src/operations/booleans';
import {hull} from '@jscad/modeling/src/operations/hulls';
import {ButtonPadBoard1_1} from './ButtonPadBoard1_1';
import {Screw} from '../Screw';
import {mirrorX, mirrorY, mirrorZ, translate, translateX, translateZ} from '@jscad/modeling/src/operations/transforms';
import {expand} from '@jscad/modeling/src/operations/expansions';

export class ButtonPad1_1 extends Cacheable implements Viewable {
  public readonly board = new ButtonPadBoard1_1();
  public readonly stick = new SwitchJoyStick();
  public readonly sk = Skeleton.ButtonPad;
  public readonly sideScrew = new Screw(12, 3.5, (g) =>
    translate([...this.sk.point2ds.screw, this.sk.z.total - 3.5], g),
  );

  public get viewerItems(): ViewerItem[] {
    return [
      {label: 'outline', model: () => this.outline},
      {label: 'outlineHalf', model: () => this.outlineHalf},
      {label: 'half', model: () => this.half},
      {label: 'coverHalf', model: () => this.coverHalf},
      {label: 'halfWithCover', model: () => [...this.half, ...this.coverHalf]},
      {label: 'full', model: () => this.full},
      {label: 'coverFull', model: () => this.coverFull},
    ];
  }

  public get displayName() {
    return this.constructor.name;
  }

  public get outline(): Geom3[] {
    return [subtract(union(...halfToFull(this.outlineHalf)))];
  }

  public get full(): Geom3[] {
    return [
      subtract(
        union(...halfToFull(this.half)),
        this.sk.transform3ds.stick.applyGeom(union(this.stick.looseOutlineFotTopJoint)),
      ),
    ];
  }

  public get half(): Geom3[] {
    return [subtract(union(this.outlineHalf), this.innerHalf)];
  }

  public get coverFull(): Geom3[] {
    return [
      subtract(
        union(halfToFull(this.coverHalf)),
        this.sk.transform3ds.stick.applyGeom(union(this.stick.looseOutlineFotTopJoint)),

        // 印刷できない極薄の壁になってしまう部分を削っておく
        translate([0, 3.5, this.sk.z.stickBottom], Centered.cuboid([3, 3, 99])),
        translate([10.8, -14, this.sk.z.stickBottom], Centered.cuboid([2, 3, 99])),
      ),
    ];
  }

  public get coverHalf(): Geom3[] {
    const offset = 0.3;
    const grooveDepth = 1.5;
    const grooveWidth = 2;
    return [
      subtract(
        union(
          extrudeLinear(
            {height: this.sk.z.boardBottom},
            union(
              expand({delta: -offset}, this.coverAreaHalf2d),
              translate(
                [this.sk.x.cover.valueAt('start') + offset, 0],
                Centered.rectangle([this.sk.x.cover.totalFromTo('start', 'end') - offset * 2, offset]),
              ),
            ),
          ),
          extrudeLinear(
            {height: this.sk.z.boardBottom + this.sk.Board.z.thickness},
            intersect(
              union(
                Centered.rectangle([
                  this.sk.x.stickSideToEnd.valueAt('boardStart') - 7,
                  this.sk.y.coverStickSideWidthHalf - offset,
                ]),
                translate(
                  [0, this.sk.y.coverButtonSideWidthHalf],
                  Centered.rectangle([
                    this.sk.x.cover.valueAt('stickSideEnd') - offset,
                    this.sk.y.coverStickSideWidthHalf - this.sk.y.coverButtonSideWidthHalf - offset,
                  ]),
                ),
              ),
              expand({delta: -this.sk.other.sideThickness}, this.outline2dForExpandHalf),
            ),
          ),
        ),
        this.board.sk.transformSelf.applyGeoms(this.board.looseOutlineForCover),
        this.fingerSubtractionHalf,

        // コネクタ用の穴
        translate([this.sk.x.stickSideToEnd.valueAt('boardStart') + 14.5, 0, 0], Centered.cuboid([12, 3.5, 99])),
        // スティックのコネクタ用の穴
        translate([this.sk.x.stickSideToEnd.valueAt('boardStart'), 0, 0], Centered.cuboid([14.5, 6, 99])),

        // ボタン1,2,3の足を避けるための溝
        translate(
          [
            this.sk.x.stickSideToEnd.valueAt('boardStart'),
            this.sk.Board.y.buttonHalf - grooveWidth / 2,
            this.sk.z.boardBottom - grooveDepth,
          ],
          Centered.cuboid([
            this.sk.Board.x.stickSideToEnd.totalFromTo('button1', 'button3') + 10,
            grooveWidth,
            grooveDepth,
          ]),
        ),

        // ボタン4の足を避けるための溝
        translate(
          [
            this.sk.x.stickSideToEnd.valueAt('boardStart') +
              this.sk.Board.x.stickSideToEnd.valueAt('button4') -
              grooveWidth / 2,
            0,
            this.sk.z.boardBottom - grooveDepth,
          ],
          Centered.cuboid([grooveWidth, 5, grooveDepth]),
        ),

        // TriggerJointのポールを避ける溝
        mirrorY(
          cuboid({
            size: [
              (Skeleton.Trigger.Joint.other.screwPollRadius + 0.3) * 2,
              (Skeleton.Trigger.Joint.other.screwPollRadius + 0.3) * 2,
              this.sk.z.boardBottom + this.sk.Board.z.thickness,
            ],
            center: [...this.sk.point2ds.counterScrew, (this.sk.z.boardBottom + this.sk.Board.z.thickness) / 2],
          }),
          // カバーを取り外すときに使う取っ掛かり
          cuboid({
            size: [(Skeleton.Trigger.Joint.other.screwPollRadius + 0.3) * 2, 9, 2],
            center: [...this.sk.point2ds.counterScrew, this.sk.z.boardBottom - 2 / 2],
          }),
        ),
      ),
    ];
  }

  public get outlineHalf(): Geom3[] {
    return [
      subtract(
        extrudeLinear({height: this.sk.z.total}, this.outline2dHalf),
        this.fingerSubtractionHalf,
        this.sideScrew.headAndSquareBodyLooseOutline,
        cylinder({
          radius: Skeleton.Trigger.Joint.other.screwPollRadius + 0.3,
          height: Skeleton.Trigger.Joint.z.screwPoll + 0.2,
          center: [...this.sk.point2ds.screw, (Skeleton.Trigger.Joint.z.screwPoll + 0.2) / 2],
        }),
        mirrorY(
          cuboid({
            size: [
              (Skeleton.Trigger.Joint.other.screwPollRadius + 0.3) * 2,
              (Skeleton.Trigger.Joint.other.screwPollRadius + 0.3) * 2,
              this.sk.z.boardBottom + this.sk.Board.z.thickness,
            ],
            center: [...this.sk.point2ds.counterScrew, (this.sk.z.boardBottom + this.sk.Board.z.thickness) / 2],
          }),
        ),

        // 面取り
        chamfer(this.outline2dForExpandHalf, 0.8),
        translateZ(this.sk.z.total, mirrorZ(chamfer(this.outline2dForExpandHalf, 0.8))),
      ),
    ];
  }

  @cacheGetter
  public get outline2dHalf(): Geom2 {
    return polygon({points: vec2ArrayToWritable(this.sk.point2ds.outlineHalf)});
  }

  @cacheGetter
  public get outline2dForExpandHalf(): Geom2 {
    return union(this.outline2dHalf, translate([0, -3], Centered.rectangle([this.sk.x.total, 3])));
  }

  private get innerHalf(): Geom3[] {
    return [
      ...this.board.sk.transformSelf.applyGeoms(this.board.looseOutline),
      intersect(
        extrudeLinear({height: this.sk.z.boardBottom + this.sk.Board.z.thickness}, this.coverAreaHalf2d),
        extrudeLinear({height: 99}, expand({delta: -this.sk.other.sideThickness}, this.outline2dForExpandHalf)),
      ),
      translate(
        [this.sk.x.natGroove.valueAt('start'), 0, this.sk.z.boardBottom + Skeleton.ButtonPad.Board.z.thickness],
        Centered.cuboid([
          this.sk.x.natGroove.totalFromTo('start', 'end'),
          this.sk.y.natGrooveHalf,
          this.sk.z.natGroove,
        ]),
      ),
    ];
  }

  @cacheGetter
  public get coverAreaHalf2d(): Geom2 {
    return intersect(
      translateX(
        this.sk.x.cover.valueAt('start'),
        union(
          Centered.rectangle([this.sk.x.cover.totalFromTo('start', 'end'), this.sk.y.coverButtonSideWidthHalf]),
          hull(
            Centered.rectangle([
              this.sk.x.cover.totalFromTo('start', 'buttonSideStart'),
              this.sk.y.coverButtonSideWidthHalf,
            ]),
            Centered.rectangle([
              this.sk.x.cover.totalFromTo('start', 'stickSideEnd'),
              this.sk.y.coverStickSideWidthHalf,
            ]),
          ),
        ),
      ),
      expand({delta: -this.sk.other.sideThickness}, this.outline2dForExpandHalf),
    );
  }

  @cacheGetter
  public get fingerSubtractionHalf(): Geom3[] {
    return [
      hull(this.sk.points.fingerSubtractionHalf['1'].map((point) => sphere({radius: 0.01, center: [...point]}))),
      hull(this.sk.points.fingerSubtractionHalf['2'].map((point) => sphere({radius: 0.01, center: [...point]}))),
    ];
  }
}
