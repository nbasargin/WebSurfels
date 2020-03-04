import { promises as fs} from 'fs';

import { Geometry, OctreeLodBuilder, PointCloudData, PointCloudDataGenerator, Timing } from 'web-surfels';
import { BinaryData } from './file-io/binary-data';

console.log(Timing.measure(), 'starting');

const data = PointCloudDataGenerator.generateSphere(10, 1, true);
console.log(Timing.measure(), 'generated sphere');

const bb = Geometry.getBoundingBox(data.positions);
const octree = new OctreeLodBuilder(bb, 32, 10);
octree.addData(data);
console.log(Timing.measure(), 'octree created');

const lod = octree.buildLod();
console.log(Timing.measure(), 'lod computed'); // bounding sphere is lod.boundingSphere


function checkBuffer(data: PointCloudData, buffer: Buffer) {
    // need to slice node buffer since it can contain unrelated data
    const view = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
    const sliced = view.slice(0, buffer.length).buffer;
    const decoded = BinaryData.fromBinary(sliced);
    for (let i = 0; i < decoded.colors.length; i++) {
        if (decoded.positions[i] !== data.positions[i]) {
            console.log('mismatch in positions', decoded.positions[i], data.positions[i]);
            return false;
        }
        if (decoded.colors[i] !== data.colors[i]) {
            console.log('mismatch in colors', decoded.colors[i], data.colors[i]);
            return false;
        }
        if (decoded.normals[i] !== data.normals[i]) {
            console.log('mismatch in normals', decoded.normals[i], data.normals[i]);
            return false;
        }
    }
    for (let i = 0; i < decoded.sizes.length; i++) {
        if (decoded.sizes[i] !== data.sizes[i]) {
            console.log('mismatch in sizes', decoded.sizes[i], data.sizes[i]);
            return false;
        }
    }
    return true;
}

const binaryData = BinaryData.toBinary(data);
let buffer: Buffer;

fs.mkdir('./lod', {recursive: true}).then(() => {
    buffer = Buffer.from(binaryData);
    if (!checkBuffer(data, buffer)) {
        console.log('node buffer is NOT ok');
        return;
    }
    console.log('writing serialized data to file');
    return fs.writeFile('./lod/test.dat', buffer);
}).catch(e => {
    console.log('error writing file', e);
}).finally(() => {
    console.log('done writing');
}).then(() => {
    console.log('reading file');
    return fs.readFile('./lod/test.dat');
}).then(file => {
    console.log('file was read');
    if (!checkBuffer(data, file)) {
        console.log('file buffer is NOT ok');
        return;
    }
    console.log('files seems to be ok');
});
