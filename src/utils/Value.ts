import {Vec2, Vec3} from '../types';
import {Cacheable, cacheGetter, isReadonlyArray, zipArray} from '../utls';

export class FlexValue {
  public constructor(public readonly value = 1) {}
}

export type FlexibleVec2 = readonly [number | FlexValue, number | FlexValue];

export function flex(value?: number): FlexValue {
  return new FlexValue(value);
}

function itemAt<T>(items: readonly (readonly [string, unknown])[], values: readonly T[], name: string): T {
  return values[itemIndexAt(items, name)];
}

function itemIndexAt(items: readonly (readonly [string, unknown])[], name: string): number {
  const index = items.findIndex((item) => item[0] === name);
  if (index < 0) {
    throw new Error(`Item not found. name=${name}`);
  }
  return index;
}

function valuesTo<T>(items: readonly (readonly [string, unknown])[], values: readonly T[], to: string): T[] {
  return values.slice(0, itemIndexAt(items, to));
}

function splitValues<T>(
  items: readonly (readonly [string, unknown])[],
  values: readonly T[],
  names: readonly string[],
): T[][] {
  const chunks = [];
  let lastEnd = 0;
  for (const name of names) {
    const end = itemIndexAt(items, name) + 1;
    if (lastEnd >= end) {
      throw new Error('Invalid name order');
    }
    chunks.push(values.slice(lastEnd, end));
    lastEnd = end;
  }
  return chunks;
}

type SequentialVec2Item<Name extends string> = readonly [Name, FlexibleVec2 | FlexValue];

function fillFlex(values: readonly (number | FlexValue)[], total: number | undefined): number[] {
  if (values.every((value) => typeof value === 'number')) {
    return [...values] as number[];
  } else {
    if (total === undefined) {
      throw new Error();
    }
    const fixedDiff = values.reduce<number>(
      (prev, current) => (typeof current === 'number' ? prev - current : prev),
      total,
    );
    const flexTotal = values.reduce<number>(
      (prev, current) => (typeof current === 'number' ? prev : prev + current.value),
      0,
    );
    return values.map((value) => (typeof value === 'number' ? value : (fixedDiff * value.value) / flexTotal));
  }
}

function relativesToAbsolutes(relatives: readonly number[]): number[] {
  const absolutes: number[] = [];
  let current = 0;
  for (const relative of relatives) {
    current += relative;
    absolutes.push(current);
  }
  return absolutes;
}

export class SequentialVec2<Names extends string> extends Cacheable {
  public constructor(public readonly items: readonly SequentialVec2Item<Names>[], public readonly total?: Vec2) {
    super();
  }

  @cacheGetter
  public get vecs(): readonly Vec2[] {
    return zipArray(
      relativesToAbsolutes(
        fillFlex(
          this.items.map((item) => (isReadonlyArray(item[1]) ? item[1][0] : item[1])),
          this.total?.[0],
        ),
      ),
      relativesToAbsolutes(
        fillFlex(
          this.items.map((item) => (isReadonlyArray(item[1]) ? item[1][1] : item[1])),
          this.total?.[1],
        ),
      ),
    );
  }

  public vecAt(name: string): Vec2 {
    return itemAt(this.items, this.vecs, name);
  }

  public splitVecs(names: readonly Names[]): Vec2[][] {
    return splitValues(this.items, this.vecs, names);
  }
}

export function seqVec2<Names extends string>(items: readonly (readonly [string, Vec2])[]): SequentialVec2<Names>;
export function seqVec2<Names extends string>(
  items: readonly SequentialVec2Item<Names>[],
  total: Vec2,
): SequentialVec2<Names>;
export function seqVec2<Names extends string>(
  items: readonly SequentialVec2Item<Names>[],
  total?: Vec2,
): SequentialVec2<Names> {
  return new SequentialVec2(items, total);
}

type SequentialValueItem<Name extends string> = readonly [Name, number | FlexValue];

export class SequentialValue<Names extends string = string> extends Cacheable {
  public constructor(public readonly items: readonly SequentialValueItem<Names>[], public readonly total?: number) {
    super();
  }

  @cacheGetter
  public get values(): readonly number[] {
    return relativesToAbsolutes(
      fillFlex(
        this.items.map((item) => item[1]),
        this.total,
      ),
    );
  }

  public valueAt(name: Names): number {
    return itemAt(this.items, this.values, name);
  }

  public get totalValue(): number {
    return this.total ?? this.values.at(-1)!;
  }

  public splitValues(names: readonly Names[]): number[][] {
    return splitValues(this.items, this.values, names);
  }

  public totalFromTo(from: Names, to: Names): number {
    return this.valueAt(to) - this.valueAt(from);
  }
}

export function seqVal<Names extends string>(items: readonly (readonly [Names, number])[]): SequentialValue<Names>;
export function seqVal<Names extends string>(
  items: readonly SequentialValueItem<Names>[],
  total: number,
): SequentialValue<Names>;
export function seqVal<Names extends string>(items: readonly SequentialValueItem<Names>[], total?: number) {
  return new SequentialValue(items, total);
}
