// @ts-ignore
import stlSerializer from '@jscad/stl-serializer';
import {primitives, extrusions, booleans, transforms} from '@jscad/modeling';
import fs from 'fs';
import {Geom2, Geom3} from '@jscad/modeling/src/geometries/types';
import {Grip} from './Grip';

const {rectangle, circle} = primitives;
const {translateX} = transforms;
const {union, subtract} = booleans;
const {extrudeLinear} = extrusions;

const grip = new Grip();
const main = grip.outlineHalf;

const data = stlSerializer.serialize({binary: false}, main);
fs.writeFileSync('out/main.stl', data[0]);

if (process.env.npm_package_scripts_dev?.startsWith('ts-node-dev')) {
  // yarn dev で起動した場合のみ、ts-node-devでwatchするためにプログラムを終了させない。
  setTimeout(() => {}, 1000000000);
}
