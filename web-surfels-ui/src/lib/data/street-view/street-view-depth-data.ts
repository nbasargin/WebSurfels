import * as pako from 'pako';

export interface StreetViewDepthDataHeader {
    headerSize: number;
    numberOfPlanes: number;
    width: number;
    height: number;
    offset: number;
}

export class StreetViewDepthData {

    public readonly header: StreetViewDepthDataHeader;
    // todo: use low-level typed arrays, no need to copy data
    public readonly indices: Array<number>;
    public readonly planes: Array<{ normal: [number, number, number], distance: number }>;

    constructor(depthString: string) {
        const rawData = StreetViewDepthData.decodeDepthString(depthString);
        this.header = StreetViewDepthData.extractHeader(rawData);
        const {indices, planes} = StreetViewDepthData.extractPlanes(rawData, this.header);
        this.indices = indices;
        this.planes = planes;
    }

    private static decodeDepthString(depthString: string): DataView {
        // pad raw string with = until length is a multiple of 4
        while (depthString.length % 4 !== 0) {
            depthString += '=';
        }

        // Replace '-' by '+' and '_' by '/' (undo the base64 URL and Filename safe variant)
        depthString = depthString.replace(/-/g, '+');
        depthString = depthString.replace(/_/g, '/');

        // base 64 decode
        const str = atob(depthString);

        // inflate into uint8 array
        const inflated = pako.inflate(str);

        return new DataView(inflated.buffer);
    }

    private static extractHeader(data: DataView): StreetViewDepthDataHeader {
        return {
            headerSize: data.getUint8(0),
            numberOfPlanes: data.getUint16(1, true),
            width: data.getUint16(3, true),
            height: data.getUint16(5, true),
            offset: data.getUint8(7)
        };
    }

    private static extractPlanes(data: DataView, header: StreetViewDepthDataHeader) {
        const indices: Array<number> = [];
        for (let i = 0; i < header.width * header.height; i++) {
            indices.push(data.getUint8(header.offset + i));
        }

        const planes: Array<{ normal: [number, number, number], distance: number }> = [];
        for (let i = 0; i < header.numberOfPlanes; i++) {
            const offset = header.offset + header.width * header.height + i * 4 * 4;
            const nx = data.getFloat32(offset, true);
            const ny = data.getFloat32(offset + 4, true);
            const nz = data.getFloat32(offset + 8, true);
            const distance = data.getFloat32(offset + 12, true);
            planes.push({
                normal: [nx, ny, nz],
                distance: distance,
            })
        }

        return {indices, planes};
    }

}
