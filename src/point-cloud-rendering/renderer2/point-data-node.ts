export class PointDataNode {

    visible = true;
    numPoints: number;

    buffers: {
        positions: WebGLBuffer;
        sizes: WebGLBuffer,
        colors: WebGLBuffer;
        normals: WebGLBuffer;
    };


}
