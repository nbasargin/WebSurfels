export class PointDataNode {

    visible = true;
    numPoints: number;

    buffers: {
        positions: WebGLBuffer;
        colors: WebGLBuffer;
        normals: WebGLBuffer;
    };


}
