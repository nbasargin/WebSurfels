export class PointDataNode {

    visible = true;

    data: {
        positions: Float32Array,
        colors: Float32Array,
        normals: Float32Array,
    };

    buffers: {
        positions: WebGLBuffer;
        colors: WebGLBuffer;
        normals: WebGLBuffer;
    };


}
