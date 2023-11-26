import {AngleSample} from './AngleSample';
import {Geometry} from '@jscad/modeling/src/geometries/types';
// @ts-ignore
import stlSerializer from '@jscad/stl-serializer';
import fs from 'fs';
import path from 'path';

function saveStl(fileName: string, geom: Geometry | Geometry[]) {
  const data = stlSerializer.serialize({binary: false}, geom);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  fs.writeFileSync(path.join('./out', fileName), data[0]);
  // eslint-disable-next-line no-console
  console.log(`output ${fileName}`);
}

const angle2 = new AngleSample(2);
const angle1_5 = new AngleSample(1.5);
const angle1 = new AngleSample(1);

saveStl('angle_sample_1.stl', angle1.all);
saveStl('angle_sample_1_5.stl', angle1_5.all);
saveStl('angle_sample_2.stl', angle2.all);
