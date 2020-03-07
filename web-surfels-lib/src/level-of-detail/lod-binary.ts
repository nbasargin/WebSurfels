import { PointCloudData } from '../data/point-cloud-data';
import { BoundingSphere } from '../utils/geometry';
import { LodNode } from './lod-node';

export class LodBinary {

    /**
     * Binary format version 1.
     * Each value is either a float32 or an uint32 and takes up exactly 4 bytes.
     * Endianness: little-endian, since data is usually generated & viewed on little-endian processors
     *
     * Type          Values
     * ----          ------
     * uint32        version = 1        |  nodeID  |  numChildNodes  |  numPoints
     * float32       bounding sphere x  |  y       |  z              |  radius
     * uint32        child node ids (number equals numChildNodes)
     *
     * float32       point positions (3 values per point: x, y, z)
     * float32       point sizes (1 value per point)
     * float32       point colors (3 values per point: r, g, b)
     * float32       point normals (3 values per point: nx, ny, nz)
     *
     * Header size in bytes: 4 * (8 + numChildNodes) // 8 + numChildNodes values with 4 bytes each
     */
    static readonly BINARY_VERSION = 1;

    /**
     * Converts a LodNode to binary representation.
     * Child node ids are included but not the data.
     * @param node
     */
    static toBinary(node: LodNode): ArrayBuffer {
        const nodeID = node.id;
        const numChildNodes = node.childIDs.length;
        const numPoints = node.data.sizes.length;
        const bs = node.boundingSphere;

        const headerByteSize = 4 * (8 + numChildNodes);
        const pointByteSize = 4 * (3 + 1 + 3 + 3); // positions (3), sizes (1), colors (3), normals (3)
        const bufferByteSize = headerByteSize + pointByteSize * numPoints;

        // buffer and views
        const buffer = new ArrayBuffer(bufferByteSize);
        const ints = new Uint32Array(buffer);
        const floats = new Float32Array(buffer);

        // set header
        ints[0] = 1; // version
        ints[1] = nodeID;
        ints[2] = numChildNodes;
        ints[3] = numPoints;
        floats[4] = bs.centerX;
        floats[5] = bs.centerY;
        floats[6] = bs.centerZ;
        floats[7] = bs.radius;
        // child ids
        let writePos = 8;
        for (const id of node.childIDs) {
            ints[writePos] = id;
            writePos++;
        }

        if (writePos !== headerByteSize / 4) {
            throw new Error('header size mismatch'); // debug only
        }

        // set body (point data)
        floats.set(node.data.positions, writePos);
        writePos += numPoints * 3;
        floats.set(node.data.sizes, writePos);
        writePos += numPoints;
        floats.set(node.data.colors, writePos);
        writePos += numPoints * 3;
        floats.set(node.data.normals, writePos);
        writePos += numPoints * 3;

        if (writePos !== bufferByteSize / 4) {
            throw new Error('total size mismatch'); // debug only
        }

        return buffer;
    }

    static fromBinary(buffer: ArrayBuffer): LodNode {
        const ints = new Uint32Array(buffer);
        const floats = new Float32Array(buffer);

        // process header
        if (ints[0] !== 1) {
            throw new Error('invalid version ' + ints[0]);
        }
        const id = ints[1];
        const numChildNodes = ints[2];
        const numPoints = ints[3];
        const boundingSphere: BoundingSphere = {
            centerX: floats[4],
            centerY: floats[5],
            centerZ: floats[6],
            radius: floats[7],
        };
        const childIDs: Array<number> = [];
        let readPos = 8;
        for (let i = 0; i < numChildNodes; i++) {
            childIDs.push(ints[readPos + i]);
        }
        readPos += numChildNodes;

        // read body (point data)
        const positions = floats.slice(readPos, readPos + numPoints * 3);
        readPos += numPoints * 3;
        const sizes = floats.slice(readPos, readPos + numPoints);
        readPos += numPoints;
        const colors = floats.slice(readPos, readPos + numPoints * 3);
        readPos += numPoints * 3;
        const normals = floats.slice(readPos, readPos + numPoints * 3);

        const data: PointCloudData = {positions, sizes, colors, normals};

        return {id, boundingSphere, data, childIDs, children: []};
    }

}
