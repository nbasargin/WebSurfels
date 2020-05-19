import { PointCloudData } from '../point-cloud-data';
import { DummyData } from '../dummy-data';
import { LodBinary } from './lod-binary';
import { LodNode } from './lod-node';

describe('Binary Lod', () => {
    const points = 115;
    let data: PointCloudData;
    let node: LodNode;

    beforeAll(() => {
        data = DummyData.generateSphere(points, 0.1, true);
        node = {
            id: 42,
            boundingSphere: {
                centerX: 1.1,
                centerY: 1.2,
                centerZ: 1.3,
                radius: 0.123,
            },
            data: data,
            childIDs: [43, 44, 45],
            children: []
        };
    });

    test('toBinary creates output of correct size and version', () => {
        const binary = LodBinary.toBinary(node);
        expect(binary.byteLength).toBe(4 * (8 + 3) + 4 * points * (3 + 1 + 3 + 3));
        const view = new DataView(binary);
        expect(view.getInt32(0, true)).toBe(1);
    });

    test('fromBinary decodes toBinary correctly', () => {
        const binary = LodBinary.toBinary(node);
        const decoded = LodBinary.fromBinary(binary);

        // header
        expect(decoded.id).toBe(node.id);
        expect(decoded.boundingSphere.centerX).toBeCloseTo(node.boundingSphere.centerX);
        expect(decoded.boundingSphere.centerY).toBeCloseTo(node.boundingSphere.centerY);
        expect(decoded.boundingSphere.centerZ).toBeCloseTo(node.boundingSphere.centerZ);
        expect(decoded.boundingSphere.radius).toBeCloseTo(node.boundingSphere.radius);
        expect(decoded.childIDs.length).toEqual(node.childIDs.length);
        for (let i = 0; i < decoded.childIDs.length; i++) {
            expect(decoded.childIDs[i]).toEqual(node.childIDs[i]);
        }

        // data
        expect(decoded.data.positions.length).toEqual(node.data.positions.length);
        expect(decoded.data.sizes.length).toEqual(node.data.sizes.length);
        expect(decoded.data.colors.length).toEqual(node.data.colors.length);
        expect(decoded.data.normals.length).toEqual(node.data.normals.length);

        for (let i = 0; i < decoded.data.positions.length; i++) {
            expect(decoded.data.positions[i]).toEqual(node.data.positions[i]);
            expect(decoded.data.colors[i]).toEqual(node.data.colors[i]);
            expect(decoded.data.normals[i]).toEqual(node.data.normals[i]);
        }
        for (let i = 0; i < decoded.data.sizes.length; i++) {
            expect(decoded.data.sizes[i]).toEqual(node.data.sizes[i]);
        }
    });

});
