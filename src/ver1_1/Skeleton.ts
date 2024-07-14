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
      Grip: this.Grip,
      Trigger: this.Trigger,
    } as const;
  }

  /**
   * x: 軸の向き: スティックからボタン方向 領域: x>0
   * y: 左右対称
   * z: 軸の向き: スティック側が上 領域: z>0
   */
  public static readonly ButtonPad = class ButtonPad {
    public static readonly y = {
      start: 10,
      end: 13,
    } as const;
    public static readonly x = {
      total: 82,
    } as const;
    public static readonly z = {
      total: 12,
      topThickness: 1.5,
    } as const;
    public static readonly other = {
      sideThickness: 1.5,
      edgeToScrew: 6.5,
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
  };
  static readonly Trigger = class Trigger {
    public static readonly x = {
      total: 50,
    } as const;
    public static readonly y = {
      totalHalf: 25,
      get total() {
        return this.totalHalf * 2;
      },
      bottomWidthHalf: 11,
    } as const;
    public static readonly z = {
      total: 32.5,
      back: 15,
    };
    public static readonly other = {
      hullSphereRadius: 3,
      hullSmallSphereRadius: 2,
    } as const;
    public static get transformSelf() {
      return new Transform3D([['mirror', 'z']]);
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
      };
    }
    static readonly ButtonFace = class ButtonFace {
      public static readonly x = {
        corner: 15,
        total: 25,
      } as const;
      public static readonly y = {
        corner: 18,
      } as const;
      public static readonly z = {
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
          topToBottom: seqVal([
            ['topSwitch', 7],
            ['bottomSwitch', 17],
            ['bottom', 5],
          ]),
        } as const;
        public static readonly y = {
          totalHalf: 11,
          bottomSwitch: 7,
        } as const;
        public static readonly z = {
          thickness: 1.5,
        };
        public static get transformSelf() {
          return new Transform3D([
            ['translate', 9, 0, -S.Common.TactileSwitch.z.subterraneanHeight],
            ['rotate', 'y', degToRad(-90)],
            // ['translate', S.Trigger.x.total, 0, 0],
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
  };
  static readonly Grip = class Grip {
    public static readonly x = {
      endThickness: 1.2,
      total: 75,
    } as const;
    public static get y() {
      return {
        total: this.End.y.total,
        totalHalf: this.End.y.totalHalf,
      } as const;
    }
    public static get z() {
      return {
        total: this.End.x.total,
      } as const;
    }
    public static get transformSelf() {
      return new Transform3D([
        ['translate', -this.x.total, 0, -S.Trigger.z.back],
        ['rotate', 'y', degToRad(-24)],
      ]);
    }
    public static get children() {
      return {
        End: this.End,
        Board: this.Board,
      };
    }
    public static readonly End = {
      x: {
        topThickness: 1,
        get topToBottom() {
          return seqVal([
            ['topWallEnd', this.topThickness],
            ['boardStart', 0.5],
            ['boardEnd', S.Grip.Board.z.total],
            ['boardLegBottom', 2],
            ['bottomWallStart', 0.5],
            ['bottom', 1],
          ]);
        },
        get total() {
          return this.topToBottom.totalValue;
        },
      },
      y: {
        total: 30,
        get totalHalf() {
          return this.total / 2;
        },
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

    public static readonly Board = {
      x: {
        total: 60,
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
        } as const;
      },
      get transformSelf() {
        return new Transform3D([
          ['translate', S.Grip.x.endThickness, 0, S.Grip.End.x.topToBottom.totalFromTo('boardEnd', 'bottom')],
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
        },
        y: addHalf(
          {
            total: 17.5,
          },
          ['total'],
        ),
        z: {
          bottomToTop: seqVal([
            ['boardBottom', 10.7],
            ['boardTop', 1.5],
            ['chipTop', 1.5],
          ]),
          get total() {
            return this.bottomToTop.totalValue;
          },
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
  static readonly Common = {
    TactileSwitch: {
      z: {
        seq: seqVal([
          ['baseTop', 3.5],
          ['switchTop', 6],
        ]),
        /** スイッチの外装に埋め込まれている部分の高さ */
        get subterraneanHeight() {
          return this.seq.totalValue - 2;
        },
        get total() {
          return this.seq.valueAt('switchTop');
        },
      },
    } as const,
  };
}

const S = Skeleton;
