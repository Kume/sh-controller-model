import {mirrorVec3ds, Transform2D, Transform3D} from '../utils/Transform';
import {degToRad} from '@jscad/modeling/src/utils';
import {PointViewMeta} from '../types';
import {flex, seqVal, seqVec2} from '../utils/Value';

type HalfValues<Keys extends string | number | symbol, ValueMap extends Record<Keys, unknown>> = Keys extends string
  ? ValueMap extends {readonly [P in Keys]: number}
    ? Record<`${Keys}Half`, number>
    : never
  : never;

function addHalf<ValueMap extends {[key: string]: unknown}, Keys extends keyof ValueMap & string>(
  map: ValueMap,
  keys: readonly Keys[],
): HalfValues<keyof ValueMap, ValueMap> {
  return {
    ...map,
    ...Object.fromEntries(keys.map((key) => [`${key}Half`, (map as any)[key] / 2])),
  } as unknown as HalfValues<keyof ValueMap, ValueMap>;
}

const colors = {
  board: [0.2, 0.7, 0.2],
} as const;

export class Skeleton {
  public static get children() {
    return {
      ButtonPad: this.ButtonPad,
      Trigger: this.Trigger,
      Grip: this.Grip,
      BatteryBoxHolder: this.BatteryBoxHolder,
    } as const;
  }

  /**
   * x: 軸の向き: スティックからボタン方向 領域: x>0
   * y: 左右対称
   * z: 軸の向き: スティック側が上 領域: z>0
   */
  public static readonly ButtonPad = class ButtonPad {
    public static readonly x = {
      total: 82,
      get stickSideToEnd() {
        return seqVal(
          [
            ['stick', 15],
            ['boardStart', 14],
            ['boardEnd', Skeleton.ButtonPad.Board.x.total],
            ['end', flex()],
          ],
          this.total,
        );
      },
      get cover() {
        return seqVal(
          [
            ['start', S.ButtonPad.other.sideThickness],
            ['stickSideEnd', 43],
            ['buttonSideStart', 3],
            ['end', flex()],
            ['baseEnd', S.ButtonPad.other.sideThickness],
          ],
          this.total,
        );
      },
      get natGroove() {
        return seqVal([
          ['start', 31],
          ['end', 25],
        ]);
      },
    } as const;
    public static readonly y = {
      start: 10,
      end: 13,
      natGrooveHalf: 10.5 / 2,
      get coverButtonSideWidthHalf() {
        return S.ButtonPad.Board.y.totalHalf + 0.5;
      },
      get coverStickSideWidthHalf() {
        return this.coverButtonSideWidthHalf + 3;
      },
    } as const;
    public static readonly z = {
      total: 12,
      topThickness: 1.5,
      get boardBottom() {
        return this.total - S.ButtonPad.Board.z.thickness - S.Common.TactileSwitch.z.subterraneanHeight;
      },
      get natGroove() {
        return S.ButtonPad.Board.z.natHolder.totalFromTo('boardTop', 'natEnd');
      },
      get stickBottom() {
        return this.boardBottom - 0.5
      }
    } as const;
    public static readonly other = {
      sideThickness: 1.5,
      edgeToScrew: 7.5,
    } as const;
    public static readonly transform2d = new Transform2D([
      ['rotate', degToRad(76)],
      ['translate', 16, -40],
    ] as const);
    public static readonly transform2ds = {
      counterScrew: Transform2D.join(
        // グローバル座標系をButtonPadの座標系に変換
        this.transform2d.reversed(),
        // ButtonPad座標系で反転
        new Transform2D([['mirror', 'y']]),
        // 一度グローバル座標系に戻す
        this.transform2d,
        // グローバル座標系で反転
        new Transform2D([['mirror', 'y']]),
        // もう一度ButtonPadの座標系に戻す
        this.transform2d.reversed(),
      ),
    };
    public static readonly transform3ds = {
      get stick() {
        return new Transform3D([
          ['rotate', 'z', degToRad(31)],
          ['translate', S.ButtonPad.x.stickSideToEnd.valueAt('stick'), 0, S.ButtonPad.z.stickBottom],
        ]);
      },
    };
    public static readonly transformSelf = this.transform2d.to3d();
    public static get point2ds() {
      const sideHalf = this.transform2d.reversed().applyVecs([
        [0, S.Grip.y.totalHalf],
        [0, -S.Grip.y.totalHalf],
      ]);
      const outlineHalf = [
        [this.x.total, 0],
        [this.x.total, this.y.end],
        ...sideHalf,
        [0, this.y.start],
        [0, 0],
      ] as const;
      // グローバル座標系でのネジの位置
      const globalScrew = [this.other.edgeToScrew, 0] as const;
      return {
        sideHalf,
        outlineHalf,
        screw: this.transform2d.reversed().applyVec(globalScrew),
        counterScrew: this.transform2ds.counterScrew.applyVec(globalScrew),
      } as const;
    }
    public static get points() {
      const outlineHalf = {
        top: this.point2ds.outlineHalf.map((point2d) => [...point2d, this.z.total] as const),
        bottom: this.point2ds.outlineHalf.map((point2d) => [...point2d, 0] as const),
      } as const;
      return {
        outlineHalf,
        outline: [
          ...outlineHalf.top,
          ...outlineHalf.bottom,
          ...mirrorVec3ds([...outlineHalf.top, ...outlineHalf.bottom], 'y'),
        ],
        screwHalf: {
          top: [...this.point2ds.screw, this.z.total],
          counter: [...this.point2ds.counterScrew, this.z.total],
        },
        get screw() {
          return {
            top: [this.screwHalf.top, ...mirrorVec3ds([this.screwHalf.top], 'y')],
            counter: [this.screwHalf.counter, ...mirrorVec3ds([this.screwHalf.counter], 'y')],
          };
        },
        /** 人差し指が引っかからないようにするためのナナメのくぼみを構成する点 */
        get fingerSubtractionHalf() {
          const xEnd = S.ButtonPad.x.total;
          const yOffset = S.ButtonPad.y.end;

          return {
            // カバーを削れるギリギリの範囲の薄い領域
            1: [
              // 底面中央付近
              [xEnd - 4, 4, 0],
              [xEnd - 17, 6, 0],

              // 底面横エッジギリギリ
              [xEnd - 2, yOffset + 1, 0],
              [xEnd - 20, yOffset + 2.5, 0],

              // 上の方(これのzを上げると削る角度が増える)
              [xEnd - 6, yOffset + 5, 3],
              [xEnd - 18, yOffset + 7, 3],
            ],

            2: [
              // 底面を丸くくり抜く形に5点配置
              [xEnd, yOffset, 0],
              [xEnd - 7, yOffset - 1, 0],
              [xEnd - 20, yOffset + 2.5, 0], // this.[1][3] と同様
              [xEnd - 26, yOffset + 8, 0],
              [xEnd - 32, yOffset + 15.8, 0], // ジョイント部分の接点と同一

              // 上の方(これのzを上げると削る角度が増える)
              [xEnd - 26, yOffset + 16, 11],
              [xEnd - 2, yOffset + 6, 11],
            ],
          } as const;
        },
      } as const;
    }
    public static get pointsViewMeta() {
      return {
        outline: {
          defaultVisible: true,
          radius: 1.5,
        },
        screw: {
          defaultVisible: true,
        },
        fingerSubtractionHalf: {
          color: [0.8, 0.8, 1],
          defaultVisible: true,
        },
      } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
    }
    public static get children() {
      return {
        Board: this.Board,
      };
    }
    public static readonly Board = {
      x: {
        get stickSideToEnd() {
          return seqVal([
            ['button1', 6],
            ['button2', 13],
            ['button3', 13],
            ['button4', 11],
            ['end', 5],
          ]);
        },
        get total() {
          return this.stickSideToEnd.totalValue;
        },
        screw: 32,
      },
      y: {
        total: 20,
        get totalHalf() {
          return this.total / 2;
        },
        buttonHalf: 7,
      },
      z: {
        thickness: 1.5,
        get natHolder() {
          return seqVal([
            ['boardTop', S.ButtonPad.Board.z.thickness],
            ['natStart', 1.5],
            ['natEnd', 3.4],
            ['screwHoleEnd', 2],
          ]);
        },
      },
      get transformSelf() {
        return new Transform3D([
          ['translate', S.ButtonPad.x.stickSideToEnd.valueAt('boardStart'), 0, S.ButtonPad.z.boardBottom],
        ]);
      },
      get point2ds() {
        return {
          board: [
            [0, this.y.totalHalf],
            [0, -this.y.totalHalf],
            [this.x.total, -this.y.totalHalf],
            [this.x.total, this.y.totalHalf],
          ],
          button1A: [this.x.stickSideToEnd.valueAt('button1'), this.y.buttonHalf],
          button2A: [this.x.stickSideToEnd.valueAt('button2'), this.y.buttonHalf],
          button3A: [this.x.stickSideToEnd.valueAt('button3'), this.y.buttonHalf],
          button1B: [this.x.stickSideToEnd.valueAt('button1'), -this.y.buttonHalf],
          button2B: [this.x.stickSideToEnd.valueAt('button2'), -this.y.buttonHalf],
          button3B: [this.x.stickSideToEnd.valueAt('button3'), -this.y.buttonHalf],
          button4: [this.x.stickSideToEnd.valueAt('button4'), 0],
          get buttonAs() {
            return [this.button1A, this.button2A, this.button3A] as const;
          },
          get buttonBs() {
            return [this.button1B, this.button2B, this.button3B] as const;
          },
          get buttons() {
            return [...this.buttonAs, ...this.buttonBs, this.button4];
          },
        } as const;
      },
      get points() {
        return {
          board: this.point2ds.board.map((p) => [...p, 0]),
          buttonTops: this.point2ds.buttons.map((p) => [...p, S.Common.TactileSwitch.z.total + this.z.thickness]),
        };
      },
      get pointsViewMeta() {
        return {
          board: {
            color: colors.board,
            defaultVisible: true,
          },
          buttonTops: {
            color: [0.2, 0.2, 0.2],
            defaultVisible: true,
          },
        } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
      },
    } as const;
  };
  static readonly Trigger = class Trigger {
    public static readonly x = {
      total: 50,
      /** トリガー部分を印刷用に分割する際、グリップ側をどこまで伸ばすか */
      gripSide: 20,
    } as const;
    public static readonly y = {
      totalHalf: 25,
      get total() {
        return this.totalHalf * 2;
      },
      bottomWidthHalf: 11,
      get frontGripJoint() {
        return seqVal([
          ['gripStart', 15],
          ['gripEnd', 2],
        ]);
      },
      get innerSideThickness() {
        return (
          this.frontGripJoint.valueAt('gripStart') - S.Trigger.ButtonFace.y.boardSpaceHalf - S.Trigger.other.jointOffset
        );
      },
    } as const;
    public static readonly z = {
      total: 32.5,
      back: 15,
      /** 前パーツの内部空間の後ろの高さ */
      frontInnerBackHight: 26.5,
      // frontInnerBackHight: 27,
    };
    public static readonly other = {
      hullSphereRadius: 3,
      hullSmallSphereRadius: 2,
      jointOffset: 0.3,
      natHolderThickness: 4.5,
    } as const;
    public static get transformSelf() {
      return new Transform3D([['mirror', 'z']]);
    }
    public static get transformNatHolder() {
      return new Transform3D([
        ['mirror', 'x'],
        ['mirror', 'z'],
        ['translate', 18, 0, S.Trigger.other.natHolderThickness + 4.5],
        ['rotate', 'y', S.Trigger.ButtonFace.other.rotateRad],
      ]);
    }
    public static get points() {
      return {
        // 凸包でトリガーの丸っこい形を作るためのポイント
        get hullHalf() {
          const topBaseX = S.Trigger.x.total + S.Trigger.z.total * Math.tan(S.Trigger.ButtonFace.other.rotateRad);
          // 山の頂上あたりの点
          return {
            get top() {
              const maxZ = S.Trigger.z.total;
              const baseY = S.Trigger.y.bottomWidthHalf;
              const offset = S.Trigger.other.hullSphereRadius;
              const smallOffset = S.Trigger.other.hullSmallSphereRadius;
              return {
                standard: [
                  // 前方 サイドの方の点を少し後ろにすることで、前方向きの三角形になる 少しでも指に引っかからないように
                  [topBaseX - 1, 0, maxZ - 1 - offset],
                  [topBaseX - 2, baseY - 3, maxZ - 1 - offset],

                  // 横幅を確保するための点
                  [topBaseX - 3, baseY, maxZ - 1 - offset],
                ],
                // ちょっと尖っった形状を作るために小さいスフィア化する想定の点
                small: [
                  // 床においたときの接地部分 置いたときに安定させるため、x軸z軸の値を同じにして地面と平行にさせる
                  [topBaseX - 3, 0, maxZ - smallOffset],
                  [topBaseX - 3, baseY - 5, maxZ - smallOffset],
                ],
              } as const;
            },
            // 横の膨らみを作るための点
            get side() {
              return [
                [topBaseX - 8, S.Trigger.y.totalHalf - 4, 12],
                [topBaseX - 10, S.Trigger.y.totalHalf, 0],
              ] as const;
            },
          } as const;
        },
      } as const;
    }
    public static get children() {
      return {
        ButtonFace: this.ButtonFace,
        Joint: this.Joint,
      };
    }
    static readonly ButtonFace = class ButtonFace {
      public static readonly x = {
        corner: 15,
        total: 25,
      } as const;
      public static readonly y = {
        corner: 18,
        get thickness() {
          return S.Common.TactileSwitch.z.subterraneanHeight;
        },
        get boardSpaceHalf() {
          return S.Trigger.ButtonFace.Board.y.totalHalf + 0.5;
        },
      } as const;
      public static readonly z = {
        get topToBottom() {
          return seqVal(
            [
              ['boardStart', 9],
              ['boardEnd', S.Trigger.ButtonFace.Board.x.topToBottom.totalValue],
              ['endWallStart', 0.5],
              ['yobo', flex()],
            ],
            this.total,
          );
        },
        total: 50,
      };
      public static readonly other = {
        rotateRad: degToRad(-34),
      };
      public static get transformSelf() {
        return new Transform3D([
          ['mirror', 'x'],
          ['rotate', 'y', this.other.rotateRad],
          ['translate', S.Trigger.x.total, 0, 0],
        ]);
      }
      public static get point2ds() {
        return {
          bottomOuterSeq: seqVec2(
            [
              ['start', [0, 0]],
              ['curveStart', [0, flex()]],
              ['curveEnd', [4, 10]],
              ['end', [flex(), this.y.corner - 10]],
            ],
            // トリガー部分のy軸端の部分まで含める
            [this.x.corner, S.Trigger.y.totalHalf],
          ),
          bottomInner: [
            [S.Trigger.ButtonFace.x.total, S.Trigger.y.totalHalf],
            [S.Trigger.ButtonFace.x.total, this.Board.y.totalHalf + 1],
            [S.Common.TactileSwitch.z.subterraneanHeight, this.Board.y.totalHalf + 1],
            [S.Common.TactileSwitch.z.subterraneanHeight, 0],
          ],
          get bottomOutline() {
            return [...this.bottomOuterSeq.vecs, ...this.bottomInner] as const;
          },
        } as const;
      }
      public static get points() {
        return {
          bottomOutline: this.point2ds.bottomOutline.map((p) => [...p, 0] as const),
        } as const;
      }
      public static get pointsViewMeta() {
        return {
          bottomOutline: {
            color: [0.5, 1, 0.5],
            defaultVisible: true,
          },
        } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
      }
      public static get children() {
        return {
          Board: this.Board,
        };
      }
      public static readonly Board = class TriggerBoard {
        public static readonly x = {
          get topToBottom() {
            return seqVal([
              ['topSwitch', 7],
              ['bottomSwitch', 17],
              ['bottom', 5],
            ]);
          },
          screw: 10,
          leg: 18,
        } as const;
        public static readonly y = {
          totalHalf: 11,
          bottomSwitch: 7,
        } as const;
        public static readonly z = {
          thickness: 1.5,
          leg: 2,
        };
        public static get transformSelf() {
          return new Transform3D([
            [
              'translate',
              S.Trigger.ButtonFace.z.topToBottom.valueAt('boardStart'),
              0,
              -S.Common.TactileSwitch.z.subterraneanHeight,
            ],
            ['rotate', 'y', degToRad(-90)],
          ]);
        }
        public static get point2ds() {
          return {
            rightSwitch: [this.x.topToBottom.valueAt('topSwitch'), this.y.bottomSwitch],
            leftSwitch: [this.x.topToBottom.valueAt('topSwitch'), -this.y.bottomSwitch],
            bottomSwitch: [this.x.topToBottom.valueAt('bottomSwitch'), 0],
            get switches() {
              return [this.rightSwitch, this.leftSwitch, this.bottomSwitch] as const;
            },
            board: [
              [0, this.y.totalHalf],
              [this.x.topToBottom.valueAt('bottom'), this.y.totalHalf],
              [this.x.topToBottom.valueAt('bottom'), -this.y.totalHalf],
              [0, -this.y.totalHalf],
            ],
          } as const;
        }
        public static get points() {
          return {
            switches: this.point2ds.switches.map((point) => [...point, 0] as const),
            switchesTop: this.point2ds.switches.map((point) => [...point, S.Common.TactileSwitch.z.total] as const),
            boardTop: this.point2ds.board.map((point) => [...point, 0] as const),
            boardBottom: this.point2ds.board.map((point) => [...point, -this.z.thickness] as const),
          } as const;
        }
        public static get pointsViewMeta() {
          return {
            switches: {
              color: [0.8, 0.4, 0.4],
              defaultVisible: true,
            },
            switchesTop: {
              color: [0.8, 0.4, 0.4],
              defaultVisible: true,
            },
            boardTop: {
              color: colors.board,
              defaultVisible: true,
            },
          } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
        }
      };
    };
    public static readonly Joint = {
      x: {
        get total() {
          return S.Trigger.Joint.point2ds.counterScrew[0] + S.Common.Nat.radius + S.Trigger.Joint.other.natOffset + 1;
        },
        get outline() {
          return seqVal(
            [
              ['nanameStart', 3],
              ['nanameEnd', 7],
              ['end', flex()],
            ],
            this.total,
          );
        },
        get holeSeq() {
          return seqVal(
            [
              ['holeStart', 12],
              ['holeNanameEnd', 8],
              ['holeEnd', flex()],
              ['end', (S.Common.Nat.radius + 1 + 0.2) * 2],
            ],
            this.total,
          );
        },
      },
      y: {
        headHalf: 10,
        middleHalf: 15.55,
        get tailHalf() {
          return this.middleHalf - 4;
        },
        holeWidthHalf: 13,
        holeTailWidthHalf: 10,
        triggerBridgeHalf: 3,
      },
      z: {
        screwPoll: 3,
        thickness: 2.5,
        layer1Thickenss: 1.2,
      },
      other: {
        screwPollRadius: 3.5,
        natOffset: 0.2,
      },
      get transformSelf() {
        return new Transform3D([
          ['translate', 0, 0, -this.z.thickness],
          ['mirror', 'z'],
        ]);
      },
      get point2ds() {
        const screw = S.ButtonPad.transform2d.applyVec(S.ButtonPad.point2ds.screw);
        const counterScrew = S.ButtonPad.transform2d.applyVec(S.ButtonPad.point2ds.counterScrew);
        return {
          screw,
          counterScrew,
        } as const;
      },
      get points() {
        return {
          screw: [...this.point2ds.screw, 0],
          counterScrew: [...this.point2ds.counterScrew, 0],
          counterScrew2: [this.point2ds.counterScrew[0], -this.point2ds.counterScrew[1], 0],
          get screws() {
            return [this.screw, this.counterScrew, this.counterScrew2];
          },
        } as const;
      },
      get pointsViewMeta() {
        return {
          screws: {
            color: [1, 0.4, 0.4],
            defaultVisible: true,
          },
        } as const;
      },
    } as const;
  };
  static readonly Grip = class Grip {
    public static readonly x = {
      endThickness: 1.2,
      topWall: 15,
      total: 75,
      endJointTotal: 9.5,
      // 強度的にはもう少し厚くしたいが、LEDの領域が削れるのでこれが上限
      endJointThickness: 1.5,
      get ledHole() {
        return seqVal([
          ['start', 3.5],
          ['end', S.Grip.other.ledHoleSize],
        ]);
      },
      get resetSwitchHole() {
        return seqVal([
          ['start', 2.7],
          ['end', S.Grip.other.resetSwitchHoleSize],
        ]);
      },
    } as const;
    public static get y() {
      return {
        total: this.End_Old1.y.total,
        totalHalf: this.End_Old1.y.totalHalf,
        get endWidthHalf() {
          return this.totalHalf - S.Grip.End.y.sideThickness;
        },
        get ledHole() {
          return seqVal([
            ['start', 4.5],
            ['end', S.Grip.other.ledHoleSize],
          ]);
        },
        get resetSwitchHole() {
          return seqVal([
            ['start', 4.2],
            ['end', S.Grip.other.resetSwitchHoleSize],
          ]);
        },
      } as const;
    }
    public static get z() {
      return {
        total: this.End_Old1.x.total,
        ledHole: 0.5,
        endJoint: 1.6,
      } as const;
    }
    public static get other() {
      return {
        ledHoleSize: 3,
        resetSwitchHoleSize: 2.6,
        radius: 6,
      } as const;
    }
    public static get transformSelf() {
      return new Transform3D([
        ['translate', -this.x.total + 6, 0, 0],
        ['rotate', 'y', degToRad(-24)],
        ['translate', 0, 0, -S.Trigger.z.back],
      ]);
    }
    public static get children() {
      return {
        End: this.End_Old1,
        Board: this.Board,
      };
    }
    public static readonly End_Old1 = {
      x: {
        topThickness: 1,
        get topToBottom() {
          return seqVal([
            ['topWallEnd', this.topThickness],
            ['boardStart', 0.5],
            ['boardEnd', S.Grip.Board.z.total],
            ['boardLegBottom', S.Grip.Board.z.legBottom],
            ['bottomWallStart', 0.5],
            ['bottom', 1],
          ]);
        },
        get total() {
          return this.topToBottom.totalValue;
        },
        get bottomToTopForHoles() {
          return seqVal(
            [
              ['switchHoleStart', flex()],
              ['switchHoleEnd', 4],
              ['usbHoleStart', 7.2],
              ['usbHoleEnd', 4],
              ['end', this.topThickness],
            ],
            this.total,
          );
        },
      },
      y: {
        total: 30,
        get totalHalf() {
          return this.total / 2;
        },
        usbHoleHalf: 4.85,
        switchHoleHalf: 3,
      },
      other: {
        radius: 6,
      },
      get transformSelf() {
        return new Transform3D([
          ['rotate', 'y', degToRad(-90)],
          ['mirror', 'x'],
        ]);
      },
      get point2ds() {
        return {
          outlineHalf: [
            [0, 0],
            [0, this.y.totalHalf - this.other.radius],
            [this.other.radius, this.y.totalHalf],
            [this.x.total, this.y.totalHalf],
            [this.x.total, 0],
          ],
        } as const;
      },
      get points() {
        return {
          bottomHalf: this.point2ds.outlineHalf.map((point) => [...point, 0] as const),
        };
      },
    } as const;

    public static readonly End = {
      x: {
        thickness: 1.2,
        base: 8,
      },
      y: {
        total: 30,
        get totalHalf() {
          return this.total / 2;
        },
        usbHoleHalf: 4.85,
        switchHoleHalf: 3,
        sideThickness: 1,
      },
      z: {
        ledWallThickness: 1,
        bottomThickness: 1.5,
        get bottomToTop() {
          return seqVal([
            ['start', -this.bottomThickness],
            ['gripEndBottomStart', this.bottomThickness],
            ['gripEndBottomEnd', 1],
            ['boardLegBottom', 0.5],
            ['boardBottom', S.Grip.Board.z.legBottom],
            ['boardTop', S.Grip.Board.z.total],
            ['ledWallBottom', 0.5],
            ['ledWallTop', this.ledWallThickness],
          ]);
        },
        get total() {
          return this.bottomToTop.totalFromTo('start', 'ledWallTop');
        },
        additionalForScrew: {
          total: 10,
          end: 4,
        },
        get bottomToTopForHoles() {
          return seqVal(
            [
              ['start', this.bottomToTop.valueAt('start')],
              ['switchHoleStart', flex()],
              ['switchHoleEnd', 4],
              ['usbHoleStart', 7.4],
              ['usbHoleEnd', 4],
              ['ledWallTop', this.ledWallThickness - 0.2],
            ],
            this.bottomToTop.valueAt('ledWallTop'),
          );
        },
      },
      other: {
        radius: 6,
      },
    } as const;

    public static readonly Board = {
      x: {
        total: 60,
        screw: 40,
      },
      y: addHalf(
        {
          total: 22,
        },
        ['total'],
      ),
      get z() {
        const bottomToTop = seqVal([
          ['boardTop', 1.5],
          ['xiaoTop', this.XiaoBoard.z.total],
        ]);
        return {
          bottomToTop,
          total: bottomToTop.totalValue,
          legBottom: 1.5,
        } as const;
      },
      get transformSelf() {
        return new Transform3D([
          ['translate', S.Grip.x.endThickness, 0, S.Grip.End_Old1.x.topToBottom.totalFromTo('boardEnd', 'bottom')],
        ]);
      },
      get point2ds() {
        return {
          outline: [
            [0, this.y.totalHalf],
            [this.x.total, this.y.totalHalf],
            [this.x.total, -this.y.totalHalf],
            [0, -this.y.totalHalf],
          ],
        } as const;
      },
      get points() {
        return {
          bottomOutline: this.point2ds.outline.map((point) => [...point, 0] as const),
        };
      },
      get pointsViewMeta() {
        return {
          bottomOutline: {
            color: colors.board,
            defaultVisible: true,
          },
        } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
      },
      XiaoBoard: {
        x: {
          total: 20.5,
          get chip() {
            return seqVal([
              ['start', 7],
              ['end', 10.5],
            ]);
          },
          get usb() {
            return seqVal([
              ['start', -1.2],
              ['end', 7],
            ]);
          },
        },
        y: {
          total: 17.5,
          get totalHalf() {
            return this.total / 2;
          },
          leg: 2,
          usb: 8.6,
          get usbHalf() {
            return this.usb / 2;
          },
          chip: 12,
          get chipHalf() {
            return this.chip / 2;
          },
        },
        z: {
          get bottomToTop() {
            return seqVal([
              ['legBottom', -3.5],
              ['legBase', 3.5],
              ['boardBottom', 11.2],
              ['boardTop', 1],
              ['usbTop', 3],
            ]);
          },
          chip: 1.5,
          get total() {
            return this.bottomToTop.totalValue;
          },
        },
        get transformSelf() {
          return new Transform3D([['translate', 0, 0, S.Grip.Board.z.bottomToTop.valueAt('boardTop')]]);
        },
        get point2ds() {
          return {
            outline: [
              [0, this.y.totalHalf],
              [this.x.total, this.y.totalHalf],
              [this.x.total, -this.y.totalHalf],
              [0, -this.y.totalHalf],
            ],
          };
        },
        get points() {
          return {
            bottomOutline: this.point2ds.outline.map((point) => [...point, 0] as const),
          };
        },
        get pointsViewMeta() {
          return {
            bottomOutline: {
              color: colors.board,
              defaultVisible: true,
            },
          } as const satisfies Partial<Record<keyof typeof this.points, PointViewMeta>>;
        },
      },
    } as const;
  };
  static readonly BatteryBoxHolder = {
    x: {
      get tailToHead() {
        const nanameStart = 38;
        return seqVal([
          ['batteryBoxStart', 5],
          ['nanameStart', nanameStart],
          ['batteryBoxEnd', S.BatteryBoxHolder.BatteryBox.x.total - nanameStart],
          ['head', 1],
        ]);
      },
      get total() {
        return this.tailToHead.totalValue;
      },
      tailJoint: 9,
      tailJointAdditional: 1,
      tailJointAdditionalStart: 3,
      jointSideNaname: 10,
      get coverTailToHead() {
        const radius = S.BatteryBoxHolder.other.radius;
        return seqVal(
          [
            ['nanameStart', flex()],
            ['twistStart', S.BatteryBoxHolder.z.bottomToTop.totalFromTo('batteryBoxBase', 'top') - radius],
            ['twistEnd', (radius * Math.PI) / 2],
            ['coverEnd', 3],
            ['head', 2.3],
          ],
          this.total,
        );
      },
      cableGroove: 1.7,
      get collisionAvoidanceHole() {
        return seqVal([
          ['holeStart', 9],
          ['holeEnd', 11],
        ]);
      },
      get tailToHeadForCableHook() {
        return seqVal(
          [
            ['hookStart', this.collisionAvoidanceHole.valueAt('holeEnd') + 3],
            ['hookNanameEnd', 4],
            ['hookCutoffStart', flex()],
            ['hookEnd', 3],
            ['nanameStart', 4],
          ],
          this.tailToHead.valueAt('nanameStart'),
        );
      },
      headJoint: {
        headLength: 1.2,
      },
    } as const,
    get y() {
      return {
        total: 30,
        topWidthHalf: this.BatteryBox.y.total / 2 + this.other.innerMargin + this.other.topThickness,
        get totalHalf() {
          return this.total / 2;
        },
        get cableGrooveSeq() {
          return seqVal(
            [
              ['grooveStart', 5.4],
              ['grooveEnd', 4],
              ['bottomGrooveEnd', flex()],
              ['end', 2.7],
            ],
            this.totalHalf,
          );
        },
        collisionAvoidanceHole: 13,

        get tailToHeadForCableHook() {
          return seqVal(
            [
              ['hookStart', flex()],
              ['hookEnd', 2],
              ['sideWallStart', 4.5],
              [
                'sideWallEnd',
                this.totalHalf -
                  Skeleton.BatteryBoxHolder.BatteryBox.y.total / 2 -
                  Skeleton.BatteryBoxHolder.other.innerMargin,
              ],
            ],
            this.totalHalf,
          );
        },
        headJoint: 2,
        tailJointAdditionalHalf: 7,
      } as const;
    },
    z: {
      get bottomToTop() {
        return seqVal([
          ['bottomWallEnd', 1.5],
          ['batteryBoxBottom', S.BatteryBoxHolder.other.innerMargin],
          ['batteryBoxCutoutStart', S.BatteryBoxHolder.BatteryBox.z.base - S.BatteryBoxHolder.BatteryBox.z.cutout],
          ['batteryBoxBase', S.BatteryBoxHolder.BatteryBox.z.cutout],
          ['batteryBoxTop', S.BatteryBoxHolder.BatteryBox.z.cover],
          ['topWallStart', S.BatteryBoxHolder.other.innerMargin],
          ['top', S.BatteryBoxHolder.other.topThickness],
        ]);
      },
      get total() {
        return this.bottomToTop.totalValue;
      },
      get headHeight() {
        // 回転 + 延長した後にボタンパッドの上と大体合うように調整
        return S.ButtonPad.z.total - 0.5;
      },
      tailJointAdditional: 1.6, // グリップにぶつからないように目で調整した
      cableGroove: 10.2,
      cableHook: 3,
      headJoint: {
        height: 2,
        offset: 1,
      },
    },
    other: {
      topThickness: 1.2,
      innerMargin: 0.4,
      get radius() {
        return S.BatteryBoxHolder.BatteryBox.other.radius + 1.5;
      },
      natOffset: 0.2,
    },
    get transformSelf() {
      return new Transform3D([
        ['translate', -this.x.total, 0, -this.z.total + this.z.headHeight],
        ['rotate', 'y', degToRad(-10)],
      ]);
    },
    get transformTailNat() {
      return new Transform3D([
        ['rotate', 'y', Math.PI / 2 - degToRad(14)],
        [
          'translate',
          this.x.tailToHead.valueAt('batteryBoxStart') - S.Common.Nat.z - this.other.natOffset - 0.7,
          0,
          this.z.bottomToTop.valueAt('bottomWallEnd') + 3 - 0.5,
        ],
      ]);
    },
    get points() {
      return {
        outlineCenter: [
          [0, 0, 0],
          [0, 0, this.z.total],
          [this.x.tailToHead.valueAt('nanameStart'), 0, 0],
          [this.x.total, 0, 5],
          [this.x.total, 0, this.z.total],
        ],
      } as const;
    },
    BatteryBox: {
      x: {total: 63},
      y: {
        total: 25,
        // カバー後方の飛び出してる部分
        cutoutHalf: 8.2 / 2,
      },
      z: {
        total: 15,
        cover: 5,
        // カバー部分を除いた高さ
        base: 10,
        // カバー後方の飛び出してる部分
        cutout: 3.5,
      },
      other: {radius: 2},
    },
  } as const;
  static readonly Common = {
    TactileSwitch: {
      z: {
        get seq() {
          return seqVal([
            ['baseTop', 3.5],
            ['switchTop', 6],
          ]);
        },
        /** スイッチの外装に埋め込まれている部分の高さ */
        get subterraneanHeight() {
          return this.seq.totalValue - 2;
        },
        get total() {
          return this.seq.valueAt('switchTop');
        },
      },
    },
    Nat: {
      z: 2.4,
      radius: 5.5 / 2,
    },
  } as const;
}

const S = Skeleton;
