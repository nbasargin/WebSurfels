import { PointCloudData } from 'web-surfels';

export class BinaryData {

    // positions (3), sizes (1), colors (3), normals (3) saved as floats;  4 bytes per float
    private static BYTES_PER_POINT = (3 + 1 + 3 + 3) * 4;

    public static toBinary(data: PointCloudData): ArrayBuffer {
        const numPoints = data.positions.length / 3;

        const buffer = new ArrayBuffer(numPoints * BinaryData.BYTES_PER_POINT);
        const view = new Float32Array(buffer);

        // for now: write data directly into buffer, no header etc
        let offset = 0;
        view.set(data.positions);
        offset += numPoints * 3;
        view.set(data.sizes, offset);
        offset += numPoints;
        view.set(data.colors, offset);
        offset += numPoints * 3;
        view.set(data.normals, offset);
        return buffer;
    }

    public static fromBinary(buffer: ArrayBuffer): PointCloudData {
        const numPoints = buffer.byteLength / BinaryData.BYTES_PER_POINT;
        const view = new Float32Array(buffer);
        let offset = 0;
        const positions = view.slice(offset, offset + numPoints * 3);
        offset += numPoints * 3;
        const sizes = view.slice(offset, offset + numPoints);
        offset += numPoints;
        const colors = view.slice(offset, offset + numPoints * 3);
        offset += numPoints * 3;
        const normals = view.slice(offset, offset + numPoints * 3);
        return {positions, sizes, colors, normals};
    }
}
