import { Geometry, OctreeLodBuilder, PointCloudDataGenerator, Timing } from 'web-surfels';

console.log(Timing.measure(), 'starting');

const data = PointCloudDataGenerator.generateSphere(10000, 1, true);
console.log(Timing.measure(), 'generated sphere');

const bb = Geometry.getBoundingBox(data.positions);
const octree = new OctreeLodBuilder(bb, 32, 10);
octree.addData(data);
console.log(Timing.measure(), 'octree created');

const lod = octree.buildLod();
console.log(Timing.measure(), 'lod computed, bounding sphere is', lod.boundingSphere);
